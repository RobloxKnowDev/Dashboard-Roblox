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
import { useMemo, useState } from "react";
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
import { useFormat, useT } from "@/i18n/client";
import { DsGroup, DsSection } from "./foundations";
import { sampleCcu, sampleGames, sampleRevenue, sampleTasks, type SampleTask } from "./sample-data";

const PRIORITY_TONE: Record<SampleTask["priority"], BadgeTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "critical",
};

const STATUS_TONE: Record<SampleTask["status"], BadgeTone> = {
  todo: "neutral",
  in_progress: "accent",
  done: "good",
};

const RANGES = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "12m", label: "12M" },
] as const;

export function ComponentsPlayground() {
  const t = useT();
  const f = useFormat();
  const ds = t.designSystem;
  const [range, setRange] = useState<(typeof RANGES)[number]["value"]>("30d");
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const nameError = submitted && name.trim().length < 3 ? ds.forms.nameError : undefined;

  const taskColumns = useMemo<Column<SampleTask>[]>(() => [
    { id: "title", header: ds.tables.task, cell: (task) => <span className="font-medium text-fg">{task.title}</span>, sortValue: (task) => task.title },
    { id: "project", header: ds.tables.project, cell: (task) => task.project, sortValue: (task) => task.project },
    {
      id: "priority",
      header: ds.tables.priority,
      cell: (task) => <Badge tone={PRIORITY_TONE[task.priority]} dot>{t.common.status.priority[task.priority]}</Badge>,
      sortValue: (task) => ["low", "medium", "high", "critical"].indexOf(task.priority),
    },
    { id: "status", header: ds.tables.status, cell: (task) => <Badge tone={STATUS_TONE[task.status]}>{t.common.status.task[task.status]}</Badge> },
    { id: "due", header: ds.tables.due, cell: (task) => <span className="tabular">{f.formatShortDate(task.due)}</span>, sortValue: (task) => task.due, align: "right" },
  ], [t, f, ds]);

  return (
    <div className="space-y-6">
      <DsSection id="buttons" title={ds.buttons.title} description={ds.buttons.description}>
        <DsGroup label={ds.buttons.variants}>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary"><Plus aria-hidden />{ds.buttons.primary}</Button>
            <Button variant="secondary">{ds.buttons.secondary}</Button>
            <Button variant="outline">{ds.buttons.outline}</Button>
            <Button variant="ghost">{ds.buttons.ghost}</Button>
            <Button variant="danger"><Trash2 aria-hidden />{ds.buttons.danger}</Button>
          </div>
        </DsGroup>
        <DsGroup label={ds.buttons.sizesStates}>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">{ds.buttons.small}</Button>
            <Button size="md">{ds.buttons.medium}</Button>
            <Button size="lg">{ds.buttons.large}</Button>
            <Button size="icon" aria-label={t.common.actions.edit}><Pencil /></Button>
            <Button variant="primary" loading>{t.common.actions.saving}</Button>
            <Button disabled>{ds.buttons.disabled}</Button>
            <ComingSoonButton availability="Phase 2">{ds.buttons.syncRoblox}</ComingSoonButton>
          </div>
        </DsGroup>
      </DsSection>

      <DsSection id="forms" title={ds.forms.title} description={ds.forms.description}>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field htmlFor="ds-name" label={ds.forms.projectName} required error={nameError} hint={ds.forms.nameHint}>
            <Input
              id="ds-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={ds.forms.namePlaceholder}
              aria-invalid={!!nameError}
              aria-describedby={describedBy("ds-name")}
            />
          </Field>
          <Field htmlFor="ds-status" label={ds.forms.status}>
            <Select
              id="ds-status"
              defaultValue="in_development"
              options={[
                { value: "planning", label: ds.forms.statusOptions.planning },
                { value: "in_development", label: ds.forms.statusOptions.in_development },
                { value: "testing", label: ds.forms.statusOptions.testing },
                { value: "released", label: ds.forms.statusOptions.released },
              ]}
            />
          </Field>
          <Field htmlFor="ds-desc" label={ds.forms.descriptionLabel} className="md:col-span-2">
            <Textarea id="ds-desc" placeholder={ds.forms.descriptionPlaceholder} rows={3} />
          </Field>
          <Field htmlFor="ds-search" label={ds.forms.search}>
            <SearchInput id="ds-search" placeholder={ds.forms.searchPlaceholder} />
          </Field>
          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Checkbox defaultChecked /> {ds.forms.notifyAssignee}
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-fg-2">
              <Switch defaultChecked /> {ds.forms.showCompleted}
            </label>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => setSubmitted(true)}>{ds.forms.validate}</Button>
          <Button variant="ghost" onClick={() => { setSubmitted(false); setName(""); }}>{ds.forms.reset}</Button>
        </div>
      </DsSection>

      <DsSection id="badges" title={ds.badges.title} description={ds.badges.description}>
        <DsGroup label={ds.badges.tones}>
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{ds.badges.neutral}</Badge>
            <Badge tone="accent">{ds.badges.accent}</Badge>
            <Badge tone="good" icon={<CircleCheck />}>{t.common.status.agent.completed}</Badge>
            <Badge tone="warning" icon={<CirclePause />}>{t.common.status.agent.waiting}</Badge>
            <Badge tone="serious">{ds.badges.serious}</Badge>
            <Badge tone="critical" icon={<CircleExclamationPoint />}>{t.common.status.agent.error}</Badge>
            <Badge tone="info">{ds.badges.info}</Badge>
            <DemoBadge />
          </div>
        </DsGroup>
        <DsGroup label={ds.badges.agentStates}>
          <div className="flex flex-wrap items-center gap-5 text-[13px] text-fg-2">
            <span className="flex items-center gap-2"><StatusDot tone="accent" pulse label={t.common.status.agent.working} />{t.common.status.agent.working}</span>
            <span className="flex items-center gap-2"><StatusDot tone="warning" label={t.common.status.agent.waiting} />{t.common.status.agent.waiting}</span>
            <span className="flex items-center gap-2"><StatusDot tone="good" label={t.common.status.agent.completed} />{t.common.status.agent.completed}</span>
            <span className="flex items-center gap-2"><StatusDot tone="critical" label={t.common.status.agent.error} />{t.common.status.agent.error}</span>
            <span className="flex items-center gap-2"><StatusDot tone="neutral" label={t.common.status.agent.offline} />{t.common.status.agent.offline}</span>
          </div>
        </DsGroup>
        <DsGroup label={ds.badges.avatarsProgress}>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Avatar name="Alex Martin" size="sm" />
              <Avatar name="Sam Lee" size="md" />
              <Avatar name="Jordan Kim" size="lg" />
            </div>
            <AvatarGroup people={[{ name: "Alex Martin" }, { name: "Sam Lee" }, { name: "Jordan Kim" }, { name: "Robin Diaz" }, { name: "Chris Noel" }, { name: "Max Bell" }]} />
            <div className="w-56 space-y-2">
              <Progress value={68} label={ds.badges.projectProgress} />
              <Progress value={32} tone="warning" label={ds.badges.budgetUsed} />
            </div>
          </div>
        </DsGroup>
      </DsSection>

      <DsSection id="stat-cards" title={ds.statCards.title} description={ds.statCards.description}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label={ds.statCards.totalRevenue} value="$48.2K" source="demo" icon={DollarSign} delta={0.124} deltaLabel={ds.statCards.vsLast30} trend={sampleRevenue.slice(-12).map((r) => r.robux ?? 0)} />
          <StatCard label={ds.statCards.totalCcu} value="3,841" source="demo" icon={Gamepad2} delta={0.087} deltaLabel={ds.statCards.vsLast30} trend={sampleCcu.slice(-12).map((r) => r.ccu ?? 0)} />
          <StatCard label={ds.statCards.adCosts} value="$2.9K" source="demo" icon={Bell} delta={0.21} deltaLabel={ds.statCards.vsLastMonth} upIsGood={false} />
          <StatCard label={ds.statCards.activeProjects} value="4" source="live" icon={FolderKanban} hint={ds.statCards.dueThisMonth} />
        </div>
      </DsSection>

      <DsSection id="charts" title={ds.charts.title} description={ds.charts.description}>
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl value={range} onValueChange={setRange} options={RANGES} aria-label={t.common.ranges.ariaLabel} />
          <span className="text-xs text-fg-3">{ds.charts.filtersNote}</span>
        </div>
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <ChartCard title={ds.charts.revenueTitle} description={ds.charts.revenueDescription} source="demo">
            <TimeSeriesChart
              label={ds.charts.revenueLabel}
              data={sampleRevenue}
              series={[{ key: "robux", label: ds.charts.gamePasses }, { key: "devex", label: ds.charts.premiumPayouts }]}
              formatValue={(v) => f.formatCurrency(v, { compact: v >= 10_000 })}
            />
          </ChartCard>
          <ChartCard title={ds.charts.ccuTitle} description={ds.charts.ccuDescription} source="demo">
            <TimeSeriesChart label={ds.charts.ccuLabel} data={sampleCcu} series={[{ key: "ccu", label: ds.charts.peakCcu }]} variant="line" />
          </ChartCard>
          <ChartCard title={ds.charts.gamesTitle} description={ds.charts.gamesDescription} source="demo" className="xl:col-span-2">
            <BarChart label={ds.charts.gamesLabel} data={sampleGames} series={[{ key: "visits", label: ds.charts.visits }]} height={220} />
          </ChartCard>
        </div>
      </DsSection>

      <DsSection id="tables" title={ds.tables.title} description={ds.tables.description}>
        <div className="overflow-hidden rounded-md border border-line">
          <DataTable columns={taskColumns} rows={sampleTasks} getRowId={(task) => task.id} pageSize={5} caption={ds.tables.caption} initialSort={{ id: "due", direction: "asc" }} />
        </div>
      </DsSection>

      <DsSection id="overlays" title={ds.overlays.title}>
        <div className="flex flex-wrap items-center gap-2">
          <Modal
            open={modalOpen}
            onOpenChange={setModalOpen}
            trigger={<Button>{ds.overlays.openModal}</Button>}
            title={ds.overlays.modalTitle}
            description={ds.overlays.modalDescription}
            footer={
              <>
                <Button variant="ghost" onClick={() => setModalOpen(false)}>{t.common.actions.cancel}</Button>
                <Button variant="primary" onClick={() => { setModalOpen(false); toast.success(ds.overlays.projectCreated, { description: ds.overlays.showcaseOnly }); }}>
                  {ds.overlays.createProject}
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field htmlFor="ds-modal-name" label={ds.overlays.name} required>
                <Input id="ds-modal-name" placeholder={ds.forms.namePlaceholder} />
              </Field>
              <Field htmlFor="ds-modal-desc" label={ds.overlays.description}>
                <Textarea id="ds-modal-desc" rows={3} />
              </Field>
            </div>
          </Modal>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button aria-label={ds.overlays.moreActions}><Ellipsis />{ds.overlays.menu}</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{ds.overlays.menuLabel}</DropdownMenuLabel>
              <DropdownMenuItem shortcut="E"><Pencil aria-hidden />{t.common.actions.edit}</DropdownMenuItem>
              <DropdownMenuItem><Users aria-hidden />{ds.overlays.manageMembers}</DropdownMenuItem>
              <DropdownMenuItem><Bot aria-hidden />{ds.overlays.assignAgent}</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive><Trash2 aria-hidden />{t.common.actions.delete}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip content={ds.overlays.tooltip}>
            <Button variant="outline">{ds.overlays.hoverMe}</Button>
          </Tooltip>

          <Button variant="outline" onClick={() => toast.success(ds.overlays.taskCompleted, { description: "Fix datastore save on leave" })}>{ds.overlays.successToast}</Button>
          <Button variant="outline" onClick={() => toast.error(ds.overlays.agentError, { description: ds.overlays.agentErrorDescription })}>{ds.overlays.errorToast}</Button>
          <span className="ml-2 flex items-center gap-1 text-xs text-fg-3">
            {ds.overlays.globalSearch} <Kbd>Ctrl</Kbd><Kbd>K</Kbd>
          </span>
        </div>

        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">{ds.overlays.tabs.all}</TabsTrigger>
            <TabsTrigger value="mine">{ds.overlays.tabs.mine}</TabsTrigger>
            <TabsTrigger value="progress">{ds.overlays.tabs.progress}</TabsTrigger>
            <TabsTrigger value="done">{ds.overlays.tabs.done}</TabsTrigger>
          </TabsList>
          <TabsContent value="all"><p className="text-[13px] text-fg-3">{ds.overlays.tabsBody.all}</p></TabsContent>
          <TabsContent value="mine"><p className="text-[13px] text-fg-3">{ds.overlays.tabsBody.mine}</p></TabsContent>
          <TabsContent value="progress"><p className="text-[13px] text-fg-3">{ds.overlays.tabsBody.progress}</p></TabsContent>
          <TabsContent value="done"><p className="text-[13px] text-fg-3">{ds.overlays.tabsBody.done}</p></TabsContent>
        </Tabs>
      </DsSection>

      <DsSection id="states" title={ds.states.title} description={ds.states.description}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-line">
            <EmptyState compact icon={FolderKanban} title={ds.states.noProjects} description={ds.states.noProjectsDescription} action={<Button variant="primary" size="sm"><Plus aria-hidden />{ds.states.newProject}</Button>} />
          </div>
          <div className="rounded-md border border-line">
            <ErrorState compact description={ds.states.robloxError} action={<Button size="sm">{ds.states.retryNow}</Button>} />
          </div>
          <div className="rounded-md border border-line">
            <LoadingState label={ds.states.loadingAgents} className="h-full" />
          </div>
          <ChartSkeleton height={120} />
          <div className="rounded-lg border border-line bg-surface"><ListSkeleton rows={3} /></div>
          <ComingSoonPanel title={ds.states.retentionTitle} description={ds.states.retentionDescription} availability="Phase 2" />
        </div>
      </DsSection>
    </div>
  );
}
