# Captures one application window to a PNG (used by share.mjs --window).
# PrintWindow with PW_RENDERFULLCONTENT also captures GPU-rendered viewports
# (Roblox Studio, Blender) even when the window is behind others.
param(
  [string]$Process = "",
  [string]$Title = "",
  [Parameter(Mandatory = $true)][string]$Out
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class DashboardCapture {
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int cmd);
  [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
}
"@

[DashboardCapture]::SetProcessDPIAware() | Out-Null

$window = Get-Process | Where-Object {
  $_.MainWindowHandle -ne 0 -and (
    ($Process -ne "" -and $_.ProcessName -like "$Process*") -or
    ($Title -ne "" -and $_.MainWindowTitle -like "*$Title*")
  )
} | Sort-Object -Property StartTime -Descending | Select-Object -First 1

if (-not $window) {
  Write-Error "Window not found (process '$Process', title '$Title'). Is the application open?"
  exit 2
}

$handle = $window.MainWindowHandle
if ([DashboardCapture]::IsIconic($handle)) {
  [DashboardCapture]::ShowWindow($handle, 9) | Out-Null
  Start-Sleep -Milliseconds 500
}

$rect = New-Object DashboardCapture+RECT
[DashboardCapture]::GetWindowRect($handle, [ref]$rect) | Out-Null
$width = $rect.Right - $rect.Left
$height = $rect.Bottom - $rect.Top
if ($width -le 0 -or $height -le 0) {
  Write-Error "The window has no visible size."
  exit 3
}

$bitmap = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$hdc = $graphics.GetHdc()
$ok = [DashboardCapture]::PrintWindow($handle, $hdc, 2)
$graphics.ReleaseHdc($hdc)
$graphics.Dispose()
if (-not $ok) {
  $bitmap.Dispose()
  Write-Error "PrintWindow failed."
  exit 4
}
$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Output "$($window.ProcessName) ${width}x${height}"
