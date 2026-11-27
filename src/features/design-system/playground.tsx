"use client";

import {
  Bell,
  Bot,
  CircleCheck,
  CircleExclamationPoint,
  CirclePause,
  DollarSign,
  Ellipsis,
  FolderKanban,
  Gamepad2,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BarChart } from "@/components/charts/bar-chart";
import { ChartCard } from "@/components/charts/chart-card";
import { TimeSeriesChart } from "@/components/charts/time-series-chart";
import { StatCard } from "@/components/data/stat-card";
import { ComingSoonButton, ComingSoonPanel } from "@/components/feedback/coming-soon";
import { DemoBadge } from "@/components/feedback/demo-badge";
import { ChartSkeleton, EmptyState, ErrorState, ListSkeleton, LoadingState } from "@/components/feedback/states";
import { Avatar, AvatarGroup } from "@/components/ui/avatar";
import { Badge, StatusDot, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Switch } from "@/components/ui/checkbox";
import { DataTable, type Column } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { describedBy, Field } from "@/components/ui/field";
import { Input, SearchInput, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Kbd, Progress } from "@/components/ui/primitives";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { formatCurrency, formatShortDate } from "@/lib/utils/format";
import { DsGroup, DsSection } from "./foundations";
import { sampleCcu, sampleGames, sampleRevenue, sampleTasks, type SampleTask } from "./sample-data";

const PRIORITY: Record<SampleTask["priority"], { tone: BadgeTone; label: string }> = {
  low: { tone: "neutral", label: "Low" },
  medium: { tone: "info", label: "Medium" },
  high: { tone: "warning", label: "High" },
  critical: { tone: "critical", label: "Critical" },
};

const STATUS: Record<SampleTask["status"], { tone: BadgeTone; label: string }> = {
  todo: { tone: "neutral", label: "To do" },
  in_progress: { tone: "accent", label: "In progress" },
  done: { tone: "good", label: "Done" },
};

const taskColumns: Column<SampleTask>[] = [
  { id: "title", header: "Task", cell: (t) => <span className="font-medium text-fg">{t.title}</span>, sortValue: (t) => t.title },
  { id: "project", header: "Project", cell: (t) => t.project, sortValue: (t) => t.project },
  {
    id: "priority",
    header: "Priority",
    cell: (t) => <Badge tone={PRIORITY[t.priority].tone} dot>{PRIORITY[t.priority].label}</Badge>,
    sortValue: (t) => ["low", "medium", "high", "critical"].indexOf(t.priority),
  },
  { id: "status", header: "Status", cell: (t) => <Badge tone={STATUS[t.status].tone}>{STATUS[t.status].label}</Badge> },
  { id: "due", header: "Due", cell: (t) => <span className="tabular">{formatShortDate(t.due)}</span>, sortValue: (t) => t.due, align: "right" },
];

const RANGES = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
] as const;

export function ComponentsPlayground() {
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && name.trim().length < 3 ? "Name must be at least 3 characters." : undefined;

  return (
    <div className="space-y-6">
      <DsSection id="buttons" title="Buttons" description="One primary action per view. Unbuilt features use ComingSoonButton — never a decorative button.">
        <DsGroup label="Variants">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary"><Plus aria-hidden />Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger"><Trash2 aria-hidden />Danger</Button>
          </div>
        </DsGroup>
        <DsGroup label="Sizes & states">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Edit"><Pencil /></Button>
            <Button variant="primary" loading>Saving</Button>
            <Button disabled>Disabled</Button>
            <ComingSoonButton availability="Phase 2">Sync Roblox data</ComingSoonButton>
          </div>
        </DsGroup>
      </DsSection>

      <DsSection id="forms" title="Form controls" description="Labels always visible; errors announced and tied to their field.">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field htmlFor="ds-name" label="Project name" required error={nameError} hint="Shown on cards and in search.">
            <Input
              id="ds-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sky Racers 2"
              aria-invalid={!!nameError}
              aria-describedby={describedBy("ds-name")}
            />
          </Field>
          <Field htmlFor="ds-status" label="Status">
            <Select
              id="ds-status"
              defaultValue="in_development"
              options={[
                { value: "planning", label: "Planning" },
                { value: "in_development", label: "In development" },
                { value: "testing", label: "Testing" },
                { value: "released", label: "Released" },
              ]}
            />
          </Field>
          <Field htmlFor="ds-desc" label="Description" className="md:col-span-2">
            <Textarea id="ds-desc" placeholder="What is this project about?" rows={3} />
          </Field>
          <Field htmlFor="ds-search" label="Search">
            <SearchInput id="ds-search" placeholder="Search tasks…" />
          </Field>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Checkbox defaultChecked /> Notify assignee
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Switch defaultChecked /> Show completed tasks
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setSubmitted(true)}>Validate</Button>
          <Button variant="ghost" onClick={() => { setSubmitted(false); setName(""); }}>Reset</Button>
        </div>
      </DsSection>

      <DsSection id="badges" title="Badges & status" description="Status always pairs color with an icon or label — never color alone.">
        <DsGroup label="Tones">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>Neutral</Badge>
            <Badge tone="accent">Accent</Badge>
            <Badge tone="good" icon={<CircleCheck />}>Completed</Badge>
            <Badge tone="warning" icon={<CirclePause />}>Waiting</Badge>
            <Badge tone="serious">Serious</Badge>
            <Badge tone="critical" icon={<CircleExclamationPoint />}>Error</Badge>
            <Badge tone="info">Info</Badge>
            <DemoBadge />
          </div>
        </DsGroup>
        <DsGroup label="Agent states">
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-fg-2">
            <span className="flex items-center gap-2"><StatusDot tone="accent" pulse label="Working" />Working</span>
            <span className="flex items-center gap-2"><StatusDot tone="warning" label="Waiting" />Waiting</span>
            <span className="flex items-center gap-2"><StatusDot tone="good" label="Completed" />Completed</span>
            <span className="flex items-center gap-2"><StatusDot tone="critical" label="Error" />Error</span>
            <span className="flex items-center gap-2"><StatusDot tone="neutral" label="Offline" />Offline</span>
          </div>
        </DsGroup>
        <DsGroup label="Avatars & progress">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Avatar name="Alex Martin" size="sm" />
              <Avatar name="Sam Lee" size="md" />
              <Avatar name="Jordan Kim" size="lg" />
            </div>
            <AvatarGroup people={[{ name: "Alex Martin" }, { name: "Sam Lee" }, { name: "Jordan Kim" }, { name: "Robin Diaz" }, { name: "Chris Noel" }, { name: "Max Bell" }]} />
            <div className="w-56 space-y-2">
              <Progress value={68} label="Project progress" />
              <Progress value={32} tone="warning" label="Budget used" />
            </div>
          </div>
        </DsGroup>
      </DsSection>

      <DsSection id="stat-cards" title="Stat cards" description="Label · value · delta vs a named period · trend. Up isn't always good (costs).">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total revenue" value="$48.2K" source="demo" icon={DollarSign} delta={0.124} deltaLabel="vs last 30 days" trend={sampleRevenue.slice(-12).map((r) => r.robux ?? 0)} />
          <StatCard label="Total CCU" value="3,841" source="demo" icon={Gamepad2} delta={0.087} deltaLabel="vs last 30 days" trend={sampleCcu.slice(-12).map((r) => r.ccu ?? 0)} />
          <StatCard label="Advertising costs" value="$2.9K" source="demo" icon={Bell} delta={0.21} deltaLabel="vs last month" upIsGood={false} />
          <StatCard label="Active projects" value="4" source="live" icon={FolderKanban} hint="2 due this month" />
        </div>
      </DsSection>

      <DsSection id="charts" title="Charts" description="Thin marks, recessive axes, one shared tooltip, a table view for every chart.">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl value={range} onValueChange={setRange} options={RANGES} aria-label="Time range" />
          <span className="text-xs text-fg-3">Filters sit in one row above the charts they scope.</span>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title="Revenue overview" description="Daily revenue, last 30 days" source="demo">
            <TimeSeriesChart
              label="Daily revenue by source over the last 30 days"
              data={sampleRevenue}
              series={[{ key: "robux", label: "Game passes & products" }, { key: "devex", label: "Premium payouts" }]}
              formatValue={(v) => formatCurrency(v, { compact: v >= 10_000 })}
            />
          </ChartCard>
          <ChartCard title="CCU overview" description="Peak concurrent users per day" source="demo">
            <TimeSeriesChart label="Peak concurrent users per day" data={sampleCcu} series={[{ key: "ccu", label: "Peak CCU" }]} variant="line" />
          </ChartCard>
          <ChartCard title="Game performance" description="Visits, last 30 days" source="demo" className="xl:col-span-2">
            <BarChart label="Visits per game over the last 30 days" data={sampleGames} series={[{ key: "visits", label: "Visits" }]} height={220} />
          </ChartCard>
        </div>
      </DsSection>

      <DsSection id="tables" title="Data table" description="Sortable columns (click a header), pagination, row hover.">
        <div className="overflow-hidden rounded-md border border-line">
          <DataTable columns={taskColumns} rows={sampleTasks} getRowId={(t) => t.id} pageSize={5} caption="Sample tasks" initialSort={{ id: "due", direction: "asc" }} />
        </div>
      </DsSection>

      <DsSection id="overlays" title="Modals, menus, tooltips, tabs, notifications">
        <div className="flex flex-wrap items-center gap-2">
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            trigger={<Button>Open modal</Button>}
            title="Create project"
            description="Projects group tasks, members and a target release date."
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button variant="primary" onClick={() => { setModalOpen(false); toast.success("Project created", { description: "Showcase only — nothing was saved." }); }}>
                  Create project
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field htmlFor="ds-modal-name" label="Name" required>
                <Input id="ds-modal-name" placeholder="e.g. Sky Racers 2" />
              </Field>
              <Field htmlFor="ds-modal-desc" label="Description">
                <Textarea id="ds-modal-desc" rows={3} />
              </Field>
            </div>
          </Modal>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label="More actions"><Ellipsis />Menu</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>Project</DropdownMenuLabel>
              <DropdownMenuItem shortcut="E"><Pencil aria-hidden />Edit</DropdownMenuItem>
              <DropdownMenuItem><Users aria-hidden />Manage members</DropdownMenuItem>
              <DropdownMenuItem><Bot aria-hidden />Assign an agent</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive><Trash2 aria-hidden />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip content="Tooltips explain, they never hold the only copy of information.">
            <Button variant="outline">Hover me</Button>
          </Tooltip>

          <Button variant="outline" onClick={() => toast.success("Task completed", { description: "Fix datastore save on leave" })}>Success toast</Button>
          <Button variant="outline" onClick={() => toast.error("Agent error", { description: "Build agent stopped: timeout after 30 min" })}>Error toast</Button>
          <span className="ml-2 flex items-center gap-1 text-xs text-fg-3">
            Global search: <Kbd>Ctrl</Kbd><Kbd>K</Kbd>
          </span>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All tasks</TabsTrigger>
            <TabsTrigger value="mine">My tasks</TabsTrigger>
            <TabsTrigger value="progress">In progress</TabsTrigger>
            <TabsTrigger value="done">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><p className="text-[13px] text-fg-3">Tabs switch views inside a page without leaving it.</p></TabsContent>
          <TabsContent value="mine"><p className="text-[13px] text-fg-3">Only tasks assigned to you.</p></TabsContent>
          <TabsContent value="progress"><p className="text-[13px] text-fg-3">Tasks currently being worked on.</p></TabsContent>
          <TabsContent value="done"><p className="text-[13px] text-fg-3">Finished tasks.</p></TabsContent>
        </Tabs>
      </DsSection>

      <DsSection id="states" title="Empty, loading & error states" description="Every data block has all three.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-line">
            <EmptyState compact icon={FolderKanban} title="No projects yet" description="Create your first project to start tracking work." action={<Button variant="primary" size="sm"><Plus aria-hidden />New project</Button>} />
          </div>
          <div className="rounded-md border border-line">
            <ErrorState compact description="Roblox didn't respond. We'll retry automatically." action={<Button size="sm">Retry now</Button>} />
          </div>
          <div className="rounded-md border border-line">
            <LoadingState label="Loading agents…" className="h-full" />
          </div>
          <ChartSkeleton height={120} />
          <div className="rounded-lg border border-line bg-surface"><ListSkeleton rows={3} /></div>
          <ComingSoonPanel title="Retention cohorts" description="Day 1 / 7 / 30 retention per game, from Roblox Open Cloud Analytics." availability="Phase 2" />
        </div>
      </DsSection>
    </div>
  );
}
