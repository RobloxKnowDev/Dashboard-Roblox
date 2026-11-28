import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { lang } from "next/root-params";
import { Toaster } from "@/components/ui/toaster";
import { siteConfig } from "@/config/site";
import { I18nProvider } from "@/i18n/client";
import { isLocale, LOCALES } from "@/i18n/config";
import { messages } from "@/i18n/messages";
import "../globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Every page is prerendered once per language (the proxy picks which one). */
export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ lang: locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await lang();
  const t = messages[isLocale(locale) ? locale : "en"];
  return {
    title: {
      default: siteConfig.name,
      template: `%s · ${siteConfig.name}`,
    },
    description: t.shell.description,
    // Private application: never index.
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#0c0c0e",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await lang();
  if (!isLocale(locale)) notFound();

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="min-h-full">
        <I18nProvider locale={locale}>
          {children}
          <Toaster />
        </I18nProvider>
      </body>
    </html>
  );
}
