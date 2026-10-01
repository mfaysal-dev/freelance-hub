"use client";
import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlarmClock, BarChart3, CheckSquare, Clock, FileText, Sparkles, Timer, TrendingUp, Users, Wallet, AlertTriangle, Hourglass } from "lucide-react";
import type { WidgetDef } from "@/components/kit/dashboard";
import { AssistantBrief, type Insight } from "@/components/kit/assistant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCrm } from "@/lib/crm/store";
import { hoursByDay, invoiceState, invoiceTotal, kpis, projectHealth, revenueByMonth } from "@/lib/crm/logic";
import { hours, money } from "@/lib/crm/money";
import { cn, diffDays, formatDate, parseISO, todayISO } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { TimerPanel } from "./timer";
import { STATUS_META, useCrmUI } from "./ui-state";

const tooltipStyle = { background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12, color: "var(--color-foreground)" };

function KpiWidget() {
  const data = useCrm();
  const k = useMemo(() => kpis(data, new Date()), [data]);
  const cur = data.business.currency;
  const items = [
    { label: "Collected this month", value: money(k.paidThis, cur), sub: k.paidPrev ? `${k.paidThis >= k.paidPrev ? "▲" : "▼"} vs ${money(k.paidPrev, cur, { compact: true })} last month` : "—", icon: TrendingUp, tone: "text-success" },
    { label: "Outstanding", value: money(k.outstanding, cur), sub: k.overdueCount ? `${money(k.overdue, cur)} overdue` : "Nothing overdue", icon: Wallet, tone: k.overdueCount ? "text-danger" : "text-muted-foreground" },
    { label: "Unbilled work", value: money(k.unbilled, cur), sub: "Ready to invoice", icon: Hourglass, tone: "text-muted-foreground" },
    { label: "Hours (7 days)", value: hours(k.weekMinutes), sub: `${k.activeProjects} active projects`, icon: Clock, tone: "text-muted-foreground" },
  ];
  const statuses = ["backlog", "in_progress", "review", "done"] as const;
  const counts = statuses.map((st) => ({ st, n: data.projects.filter((p) => p.status === st).length }));
  const totalP = Math.max(1, data.projects.length);
  const nextDeadline = data.projects.filter((p) => p.status !== "done" && p.deadline && p.deadline >= todayISO()).sort((a, b) => (a.deadline! < b.deadline! ? -1 : 1))[0];
  const in14 = data.invoices.filter((v) => v.status === "sent" && v.dueDate >= todayISO() && diffDays(parseISO(v.dueDate), new Date()) <= 14);
  const expected = in14.reduce((a, v) => a + invoiceTotal(v), 0);
  return (
    <div className="flex h-full flex-col gap-4">
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((x, i) => (
        <div key={x.label} className={cn("relative overflow-hidden rounded-2xl p-4", i === 0 ? "bg-primary text-primary-foreground" : "bg-muted/60")}>
          <x.icon className={cn("size-4", i === 0 ? "opacity-80" : "text-primary")} />
          <p className="tabular mt-3 font-display text-2xl font-bold tracking-tight">{x.value}</p>
          <p className={cn("text-xs", i === 0 ? "opacity-80" : "text-muted-foreground")}>{x.label}</p>
          <p className={cn("mt-1 text-[11px]", i === 0 ? "opacity-80" : x.tone)}>{x.sub}</p>
          {i === 0 && <div className="pointer-events-none absolute -bottom-8 -right-8 size-28 rounded-full bg-white/15" />}
        </div>
      ))}
    </div>
      <div className="rounded-2xl border p-4">
        <div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">Project pipeline</span><span className="text-muted-foreground">{data.projects.length} projects</span></div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
          {counts.map(({ st, n }) => n > 0 && <div key={st} style={{ width: `${(n / totalP) * 100}%`, background: STATUS_META[st].color }} title={`${STATUS_META[st].label}: ${n}`} />)}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {counts.map(({ st, n }) => <span key={st} className="flex items-center gap-1.5"><span className="size-2 rounded-full" style={{ background: STATUS_META[st].color }} />{STATUS_META[st].label} <b className="text-foreground">{n}</b></span>)}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
          <AlarmClock className="size-4 shrink-0 text-primary" />
          <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Next deadline</p><p className="truncate text-sm font-medium">{nextDeadline ? `${nextDeadline.name} · ${formatDate(nextDeadline.deadline!)}` : "None scheduled"}</p></div>
        </div>
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3">
          <Wallet className="size-4 shrink-0 text-primary" />
          <div className="min-w-0"><p className="text-[11px] text-muted-foreground">Expected in next 14 days</p><p className="tabular truncate text-sm font-medium">{money(expected, cur)} · {in14.length} invoice{in14.length === 1 ? "" : "s"}</p></div>
        </div>
      </div>
    </div>
  );
}

function RevenueWidget() {
  const data = useCrm();
  const rows = revenueByMonth(data, new Date(), 6);
  const cur = data.business.currency;
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ left: -6, right: 6, top: 8 }}>
          <defs>
            <linearGradient id="rv" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} /></linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--color-muted-foreground)" tickFormatter={(v) => money(Number(v), cur, { compact: true })} width={56} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [money(Number(v), cur), n === "paid" ? "Collected" : "Invoiced"]} />
          <Area type="monotone" dataKey="billed" stroke="var(--color-chart-3)" strokeWidth={2} strokeDasharray="5 4" fill="none" />
          <Area type="monotone" dataKey="paid" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#rv)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function DeadlinesWidget() {
  const data = useCrm();
  const { setView, setFocusProject } = useCrmUI();
  const rows = data.projects.filter((p) => p.status !== "done" && p.deadline).map((p) => projectHealth(data, p)).sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)).slice(0, 5);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No upcoming deadlines.</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((h) => (
        <li key={h.project.id}>
          <button onClick={() => { setFocusProject(h.project.id); setView("projects"); }} className="w-full rounded-xl p-1.5 text-left hover:bg-muted/50">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full" style={{ background: h.client?.color }} />
              <span className="flex-1 truncate text-sm font-medium">{h.project.name}</span>
              <Badge tone={h.risk === "late" || h.risk === "risk" ? "danger" : h.risk === "watch" ? "warning" : "default"}>{h.daysLeft! < 0 ? `${-h.daysLeft!}d late` : h.daysLeft === 0 ? "today" : `${h.daysLeft}d`}</Badge>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${h.progress * 100}%`, background: h.risk === "risk" || h.risk === "late" ? "var(--color-danger)" : "var(--color-primary)" }} /></div>
              <span className="tabular text-[10px] text-muted-foreground">{h.tasksDone}/{h.tasksTotal}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}

function InvoicesWidget() {
  const data = useCrm();
  const setStatus = useCrm((s) => s.setInvoiceStatus);
  const rows = data.invoices.filter((v) => v.status !== "paid").sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)).slice(0, 5);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">All invoices paid 🎉</p>;
  return (
    <ul className="space-y-2">
      {rows.map((v) => {
        const st = invoiceState(v);
        const c = data.clients.find((x) => x.id === v.clientId);
        const d = diffDays(parseISO(v.dueDate), new Date());
        return (
          <li key={v.id} className="flex items-center gap-2.5 rounded-xl p-1.5 hover:bg-muted/50">
            <div className={cn("grid size-8 place-items-center rounded-lg", st === "overdue" ? "bg-danger/12 text-danger" : st === "draft" ? "bg-muted text-muted-foreground" : "bg-warning/20 text-[color-mix(in_oklch,var(--color-warning)_60%,black)] dark:text-warning")}>
              {st === "overdue" ? <AlertTriangle className="size-4" /> : <FileText className="size-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{c?.company ?? c?.name}</p>
              <p className="text-[11px] text-muted-foreground">{v.number} · {st === "draft" ? "draft" : st === "overdue" ? <span className="text-danger">{-d}d overdue</span> : `due in ${d}d`}</p>
            </div>
            <span className="tabular text-sm font-semibold">{money(invoiceTotal(v), data.business.currency, { compact: true })}</span>
            {st !== "draft" && <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => { setStatus(v.id, "paid"); toast(`${v.number} marked paid 💸`); }}>Paid</Button>}
          </li>
        );
      })}
    </ul>
  );
}

function TasksWidget() {
  const data = useCrm();
  const updateTask = useCrm((s) => s.updateTask);
  const today = todayISO();
  const rows = data.tasks.filter((t) => !t.done && t.due).sort((a, b) => (a.due! < b.due! ? -1 : 1)).slice(0, 6);
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">No tasks with due dates.</p>;
  return (
    <ul className="space-y-1">
      {rows.map((t) => {
        const p = data.projects.find((x) => x.id === t.projectId);
        const late = t.due! < today;
        return (
          <li key={t.id} className="flex items-start gap-2.5 rounded-xl p-1.5 hover:bg-muted/50">
            <input type="checkbox" className="mt-0.5 size-4 cursor-pointer accent-[var(--color-primary)]" aria-label={`Complete ${t.title}`} onChange={() => { updateTask(t.id, { done: true }); toast("Task done ✅", t.title); }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-tight">{t.title}</p>
              <p className="truncate text-[11px] text-muted-foreground">{p?.name}</p>
            </div>
            <span className={cn("shrink-0 text-[11px]", late ? "font-semibold text-danger" : t.due === today ? "font-semibold text-primary" : "text-muted-foreground")}>{late ? "overdue" : t.due === today ? "today" : formatDate(t.due!)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function HoursWidget() {
  const data = useCrm();
  const rows = hoursByDay(data, new Date(), 14);
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ left: -24, right: 4, top: 8 }}>
          <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="var(--color-border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" />
          <YAxis tickLine={false} axisLine={false} fontSize={10} stroke="var(--color-muted-foreground)" unit="h" />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.5 }} labelFormatter={(_, p) => (p?.[0]?.payload?.date ? formatDate(p[0].payload.date, { weekday: "short", month: "short", day: "numeric" }) : "")} formatter={(v, n) => [`${v}h`, n === "billable" ? "Billable" : "Total"]} />
          <Bar dataKey="hours" fill="color-mix(in oklch, var(--color-primary) 30%, var(--color-muted))" radius={[6, 6, 2, 2]} maxBarSize={22} />
          <Bar dataKey="billable" fill="var(--color-primary)" radius={[6, 6, 2, 2]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ClientsWidget() {
  const data = useCrm();
  const rows = data.clients.map((c) => ({ c, total: data.invoices.filter((v) => v.clientId === c.id && v.status === "paid").reduce((a, v) => a + invoiceTotal(v), 0) })).sort((a, b) => b.total - a.total).slice(0, 5);
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <ul className="space-y-3">
      {rows.map(({ c, total }) => (
        <li key={c.id} className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-white" style={{ background: c.color }}>{(c.company ?? c.name).slice(0, 2).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-sm"><span className="truncate font-medium">{c.company ?? c.name}</span><span className="tabular font-semibold">{money(total, data.business.currency, { compact: true })}</span></div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(total / max) * 100}%`, background: c.color }} /></div>
          </div>
          <Badge tone={c.status === "lead" ? "info" : c.status === "active" ? "success" : "default"}>{c.status}</Badge>
        </li>
      ))}
    </ul>
  );
}

export function useWidgetRegistry(insights: Insight[]): WidgetDef[] {
  const { setView, openInvoice } = useCrmUI();
  return [
    { type: "kpis", title: "Business pulse", description: "Collected, outstanding, unbilled, hours.", icon: BarChart3, defaultSize: "l", render: () => <KpiWidget /> },
    { type: "assistant", title: "Assistant brief", description: "Overdue invoices, risks and follow-ups.", icon: Sparkles, defaultSize: "s", render: (s) => <AssistantBrief insights={insights} limit={s === "s" ? 2 : 4} /> },
    { type: "revenue", title: "Revenue", description: "Collected vs invoiced, last 6 months.", icon: TrendingUp, defaultSize: "l", render: () => <RevenueWidget /> },
    { type: "timer", title: "Time tracker", description: "Start/stop a timer for any project.", icon: Timer, defaultSize: "s", render: () => <TimerPanel compact /> },
    { type: "deadlines", title: "Deadlines", description: "Upcoming deadlines with progress & risk.", icon: AlarmClock, defaultSize: "s", render: () => <DeadlinesWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("projects")}>Board</Button> },
    { type: "invoices", title: "Open invoices", description: "Drafts, sent and overdue invoices.", icon: FileText, defaultSize: "s", render: () => <InvoicesWidget />, action: <Button size="sm" variant="ghost" onClick={() => openInvoice()}>New</Button> },
    { type: "tasks", title: "Up next", description: "Tasks by due date across projects.", icon: CheckSquare, defaultSize: "s", render: () => <TasksWidget /> },
    { type: "hours", title: "Hours · 14 days", description: "Total vs billable hours per day.", icon: Clock, defaultSize: "m", render: () => <HoursWidget /> },
    { type: "clients", title: "Top clients", description: "Lifetime revenue by client.", icon: Users, defaultSize: "m", render: () => <ClientsWidget />, action: <Button size="sm" variant="ghost" onClick={() => setView("clients")}>All</Button> },
  ];
}

