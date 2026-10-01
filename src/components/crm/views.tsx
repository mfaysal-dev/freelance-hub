"use client";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DndContext, PointerSensor, KeyboardSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AlarmClock, Clock, Copy, FileText, Mail, Pencil, Play, Plus, Printer, Trash2, Users, Check, Briefcase, Phone, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty";
import { Segmented } from "@/components/ui/segmented";
import { useCrm } from "@/lib/crm/store";
import type { Project, ProjectStatus, Task } from "@/lib/crm/types";
import { followUpText, invoiceState, invoiceTotal, projectHealth, projectRate, reminderText } from "@/lib/crm/logic";
import { hours, money } from "@/lib/crm/money";
import { cn, diffDays, formatDate, parseISO, todayISO } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { STATUS_META, useCrmUI } from "./ui-state";
import { TimerPanel } from "./timer";

async function copy(text: string, msg: string) {
  try { await navigator.clipboard.writeText(text); toast(msg); } catch { toast("Couldn't access clipboard", undefined, "danger"); }
}

export function ClientsView() {
  const data = useCrm();
  const { openClient, openProject } = useCrmUI();
  const [filter, setFilter] = useState<"all" | "lead" | "active" | "past">("all");
  const list = data.clients.filter((c) => filter === "all" || c.status === filter);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented id="cf" value={filter} onChange={setFilter} options={[{ value: "all", label: "All" }, { value: "lead", label: "Leads" }, { value: "active", label: "Active" }, { value: "past", label: "Past" }]} />
        <Button onClick={() => openClient()}><Plus /> New client</Button>
      </div>
      {list.length === 0 ? <EmptyState icon={Users} title="No clients here" hint="Add your first client to start tracking projects and invoices." action={<Button onClick={() => openClient()}><Plus /> Add client</Button>} /> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((c, i) => {
            const paid = data.invoices.filter((v) => v.clientId === c.id && v.status === "paid").reduce((a, v) => a + invoiceTotal(v), 0);
            const open = data.invoices.filter((v) => v.clientId === c.id && v.status === "sent").reduce((a, v) => a + invoiceTotal(v), 0);
            const projects = data.projects.filter((p) => p.clientId === c.id);
            const since = c.lastContact ? diffDays(new Date(), parseISO(c.lastContact)) : null;
            return (
              <motion.div key={c.id} className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}>
                <Card className="group flex h-full flex-col p-5">
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white" style={{ background: c.color }}>{(c.company ?? c.name).slice(0, 2).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold">{c.company ?? c.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{c.company ? c.name : ""}{c.email ? `${c.company ? " · " : ""}${c.email}` : ""}</p>
                    </div>
                    <Badge tone={c.status === "lead" ? "info" : c.status === "active" ? "success" : "default"}>{c.status}</Badge>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-muted/60 p-2"><p className="tabular text-sm font-semibold">{money(paid, data.business.currency, { compact: true })}</p><p className="text-[10px] text-muted-foreground">Paid</p></div>
                    <div className="rounded-xl bg-muted/60 p-2"><p className="tabular text-sm font-semibold">{money(open, data.business.currency, { compact: true })}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                    <div className="rounded-xl bg-muted/60 p-2"><p className="tabular text-sm font-semibold">{money(c.rate, data.business.currency)}/h</p><p className="text-[10px] text-muted-foreground">Rate</p></div>
                  </div>
                  {c.notes && <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">{c.notes}</p>}
                  <div className="mt-3 flex flex-wrap gap-1">{projects.map((p) => <span key={p.id} className="rounded-full bg-muted px-2 py-0.5 text-[11px]">{p.name}</span>)}</div>
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-4">
                    <span className={cn("mr-auto flex basis-full items-center gap-1 pb-1 text-[11px] sm:basis-auto sm:pb-0", since !== null && since > (c.status === "lead" ? 5 : 21) && c.status !== "past" ? "font-medium text-danger" : "text-muted-foreground")}><CalendarCheck className="size-3" />{since === null ? "Never contacted" : since === 0 ? "Contacted today" : `Last contact ${since}d ago`}</span>
                    <Button size="icon-sm" variant="ghost" aria-label="Copy follow-up message" title="Copy follow-up message" onClick={() => copy(followUpText(c, data), "Follow-up copied")}><Copy /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Log contact today" title="Log contact today" onClick={() => { data.logContact(c.id); toast(`Logged contact with ${c.name}`); }}><Phone /></Button>
                    {c.email && <a href={`mailto:${c.email}`} aria-label={`Email ${c.name}`} className="grid size-7 place-items-center rounded-lg hover:bg-muted"><Mail className="size-4" /></a>}
                    <Button size="icon-sm" variant="ghost" aria-label="New project" title="New project" onClick={() => openProject({ clientId: c.id })}><Briefcase /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Edit client" onClick={() => openClient(c)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete client" onClick={() => { if (confirm(`Delete ${c.name}? Projects and invoices are kept.`)) data.deleteClient(c.id); }}><Trash2 /></Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProjectCard({ p, onOpen }: { p: Project; onOpen: () => void }) {
  const data = useCrm();
  const h = projectHealth(data, p);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: p.id });
  return (
    <div ref={setNodeRef} style={{ transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined }} className={cn("touch-none", isDragging && "z-50")} {...attributes} {...listeners}>
      <div onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()} className={cn("cursor-grab rounded-2xl border bg-card p-3.5 shadow-sm transition hover:border-primary/40 hover:shadow-md active:cursor-grabbing", isDragging && "rotate-2 shadow-2xl ring-2 ring-primary/40")}>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: h.client?.color }} />
          <span className="truncate text-[11px] text-muted-foreground">{h.client?.company ?? h.client?.name}</span>
          {(h.risk === "risk" || h.risk === "late") && <Badge tone="danger" className="ml-auto">{h.risk === "late" ? "Late" : "At risk"}</Badge>}
          {h.risk === "watch" && <Badge tone="warning" className="ml-auto">Watch</Badge>}
        </div>
        <p className="mt-1.5 font-medium leading-snug">{p.name}</p>
        {h.tasksTotal > 0 && <div className="mt-2.5 flex items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${h.progress * 100}%` }} /></div><span className="tabular text-[10px] text-muted-foreground">{h.tasksDone}/{h.tasksTotal}</span></div>}
        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-muted-foreground">
          {p.deadline && <span className={cn("flex items-center gap-1", h.daysLeft! < 0 && p.status !== "done" && "text-danger")}><AlarmClock className="size-3" />{formatDate(p.deadline)}</span>}
          <span className="flex items-center gap-1"><Clock className="size-3" />{hours(h.minutes)}</span>
          <span className="ml-auto">{p.billing === "fixed" ? money(p.budget ?? 0, data.business.currency, { compact: true }) : `${money(projectRate(p, data.clients), data.business.currency)}/h`}</span>
        </div>
      </div>
    </div>
  );
}

function Column({ status, children, count }: { status: ProjectStatus; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("flex min-h-64 flex-col rounded-3xl border border-dashed border-transparent bg-muted/40 p-3 transition", isOver && "border-primary/50 bg-primary-soft/40")}>
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="size-2.5 rounded-full" style={{ background: STATUS_META[status].color }} />
        <span className="text-sm font-semibold">{STATUS_META[status].label}</span>
        <span className="rounded-full bg-card px-2 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2.5">{children}</div>
    </div>
  );
}

function ProjectDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const data = useCrm();
  const { openProject, setView } = useCrmUI();
  const p = data.projects.find((x) => x.id === id);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [prio, setPrio] = useState<Task["priority"]>("med");
  if (!p) return null;
  const h = projectHealth(data, p);
  const tasks = data.tasks.filter((t) => t.projectId === p.id).sort((a, b) => Number(a.done) - Number(b.done) || (a.due ?? "z").localeCompare(b.due ?? "z"));
  return (
    <Dialog open={!!p} onClose={onClose} title={p.name} description={`${h.client?.company ?? h.client?.name} · ${STATUS_META[p.status].label}`} className="max-w-2xl">
      <div className="space-y-5 pb-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { l: "Deadline", v: p.deadline ? (h.daysLeft! < 0 ? `${-h.daysLeft!}d late` : `${h.daysLeft}d left`) : "—" },
            { l: "Progress", v: `${Math.round(h.progress * 100)}%` },
            { l: "Logged", v: hours(h.minutes) },
            { l: p.billing === "fixed" ? "Budget used" : "Value", v: p.billing === "fixed" ? `${Math.round((h.budgetUsed ?? 0) * 100)}%` : money(h.value, data.business.currency, { compact: true }) },
          ].map((x) => <div key={x.l} className="rounded-xl bg-muted/60 p-3"><p className="text-[10px] text-muted-foreground">{x.l}</p><p className="tabular font-display text-lg font-semibold">{x.v}</p></div>)}
        </div>
        {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
        <div>
          <p className="mb-2 text-sm font-semibold">Tasks</p>
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li key={t.id} className="group flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/50">
                <input type="checkbox" checked={t.done} onChange={() => data.updateTask(t.id, { done: !t.done })} className="size-4 cursor-pointer accent-[var(--color-primary)]" aria-label={`Toggle ${t.title}`} />
                <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>{t.title}</span>
                {t.priority === "high" && !t.done && <Badge tone="danger">high</Badge>}
                {t.due && <span className={cn("text-[11px]", !t.done && t.due < todayISO() ? "font-semibold text-danger" : "text-muted-foreground")}>{formatDate(t.due)}</span>}
                <button aria-label="Delete task" onClick={() => data.deleteTask(t.id)} className="opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100"><Trash2 className="size-3.5 text-muted-foreground" /></button>
              </li>
            ))}
            {tasks.length === 0 && <li className="text-sm text-muted-foreground">No tasks yet.</li>}
          </ul>
          <form className="mt-2 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); if (!title.trim()) return; data.addTask({ projectId: p.id, title: title.trim(), done: false, due: due || undefined, priority: prio }); setTitle(""); setDue(""); }}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" className="min-w-40 flex-1" aria-label="New task" />
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="w-40" aria-label="Due date" />
            <Select value={prio} onChange={(e) => setPrio(e.target.value as Task["priority"])} className="w-24" aria-label="Priority"><option value="low">Low</option><option value="med">Med</option><option value="high">High</option></Select>
            <Button type="submit" variant="soft"><Plus /></Button>
          </form>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
          <Button variant="ghost" className="mr-auto text-danger" onClick={() => { if (confirm(`Delete project "${p.name}"?`)) { data.deleteProject(p.id); onClose(); } }}><Trash2 /> Delete</Button>
          <Button variant="outline" onClick={() => { data.startTimer(p.id); toast("Timer started", p.name, "default"); onClose(); setView("time"); }}><Play /> Track time</Button>
          <Button variant="outline" onClick={() => { onClose(); openProject(p); }}><Pencil /> Edit</Button>
        </div>
      </div>
    </Dialog>
  );
}

export function ProjectsView() {
  const data = useCrm();
  const { openProject, focusProject, setFocusProject } = useCrmUI();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor));
  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const status = e.over.id as ProjectStatus;
    const p = data.projects.find((x) => x.id === e.active.id);
    if (p && p.status !== status) { data.setProjectStatus(p.id, status); toast(`Moved to ${STATUS_META[status].label}`, p.name); }
  };
  const statuses = Object.keys(STATUS_META) as ProjectStatus[];
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Drag cards between columns · click to open tasks</p>
        <Button onClick={() => openProject()}><Plus /> New project</Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statuses.map((s) => {
            const items = data.projects.filter((p) => p.status === s);
            return (
              <Column key={s} status={s} count={items.length}>
                {items.map((p) => <ProjectCard key={p.id} p={p} onOpen={() => setFocusProject(p.id)} />)}
                {items.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Drop projects here</p>}
              </Column>
            );
          })}
        </div>
      </DndContext>
      <ProjectDetail id={focusProject} onClose={() => setFocusProject(null)} />
    </div>
  );
}

export function TimeView() {
  const data = useCrm();
  const setEntryDlg = useCrmUI((s) => s.setEntryDlg);
  const [range, setRange] = useState<"7" | "30" | "all">("7");
  const from = range === "all" ? "" : todayISO(new Date(Date.now() - (Number(range) - 1) * 86400000));
  const rows = useMemo(() => data.entries.filter((e) => e.date >= from).sort((a, b) => (a.date < b.date ? 1 : -1)), [data.entries, from]);
  const total = rows.reduce((a, e) => a + e.minutes, 0);
  const billable = rows.filter((e) => e.billable).reduce((a, e) => a + e.minutes, 0);
  const groups = new Map<string, typeof rows>();
  for (const r of rows.slice(0, 300)) groups.set(r.date, [...(groups.get(r.date) ?? []), r]);
  return (
    <div className="space-y-5">
      <Card className="p-5"><TimerPanel /></Card>
      <div className="flex flex-wrap items-center gap-3">
        <Segmented id="tr" value={range} onChange={setRange} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "all", label: "All" }]} />
        <Badge tone="primary">{hours(total)} total</Badge>
        <Badge tone="success">{total ? Math.round((billable / total) * 100) : 0}% billable</Badge>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setEntryDlg(true)}><Plus /> Manual entry</Button>
      </div>
      {groups.size === 0 ? <EmptyState icon={Clock} title="No time logged" hint="Start the timer or add a manual entry." /> : (
        <Card className="divide-y overflow-hidden">
          {[...groups.entries()].map(([date, items]) => (
            <div key={date}>
              <div className="flex justify-between bg-muted/60 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"><span>{formatDate(date, { weekday: "short", month: "short", day: "numeric" })}</span><span>{hours(items.reduce((a, e) => a + e.minutes, 0))}</span></div>
              {items.map((e) => {
                const p = data.projects.find((x) => x.id === e.projectId);
                const c = data.clients.find((x) => x.id === p?.clientId);
                return (
                  <div key={e.id} className="group flex items-center gap-3 px-5 py-2.5">
                    <span className="size-2 rounded-full" style={{ background: c?.color }} />
                    <div className="min-w-0 flex-1"><p className="truncate text-sm">{e.note}</p><p className="truncate text-[11px] text-muted-foreground">{p?.name} · {c?.company ?? c?.name}</p></div>
                    {e.invoiceId ? <Badge tone="success"><Check className="size-3" />invoiced</Badge> : !e.billable ? <Badge>non-billable</Badge> : null}
                    <span className="tabular w-16 text-right text-sm font-medium">{hours(e.minutes)}</span>
                    <Button size="icon-sm" variant="ghost" className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Delete entry" onClick={() => { data.deleteEntry(e.id); toast("Entry deleted"); }}><Trash2 /></Button>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

export function InvoicesView() {
  const data = useCrm();
  const { openInvoice, print } = useCrmUI();
  const [tab, setTab] = useState<"all" | "draft" | "sent" | "overdue" | "paid">("all");
  const list = data.invoices.filter((v) => tab === "all" || invoiceState(v) === tab).sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1));
  const cur = data.business.currency;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented id="it" value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "draft", label: "Drafts" }, { value: "sent", label: "Sent" }, { value: "overdue", label: "Overdue" }, { value: "paid", label: "Paid" }]} />
        <Button onClick={() => openInvoice()}><Plus /> New invoice</Button>
      </div>
      {list.length === 0 ? <EmptyState icon={FileText} title="No invoices" hint="Create one manually, or let the assistant turn unbilled hours into a draft." /> : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[110px_1fr_110px_110px_100px_220px] gap-3 border-b bg-muted/50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground md:grid"><span>Number</span><span>Client</span><span>Issued</span><span>Due</span><span className="text-right">Amount</span><span /></div>
          <ul className="divide-y">
            {list.map((v) => {
              const st = invoiceState(v);
              const c = data.clients.find((x) => x.id === v.clientId);
              return (
                <li key={v.id} className="grid grid-cols-2 items-center gap-2 px-5 py-3 md:grid-cols-[110px_1fr_110px_110px_100px_220px] md:gap-3">
                  <span className="font-mono text-sm">{v.number}</span>
                  <span className="flex items-center gap-2 justify-self-end md:justify-self-start"><span className="size-2 rounded-full" style={{ background: c?.color }} /><span className="truncate text-sm font-medium">{c?.company ?? c?.name}</span></span>
                  <span className="text-xs text-muted-foreground">{formatDate(v.issueDate)}</span>
                  <span className="justify-self-end text-xs md:justify-self-start"><Badge tone={st === "paid" ? "success" : st === "overdue" ? "danger" : st === "draft" ? "default" : "warning"}>{st === "paid" ? `paid ${v.paidDate ? formatDate(v.paidDate) : ""}` : st === "overdue" ? `overdue · ${formatDate(v.dueDate)}` : st === "draft" ? "draft" : `due ${formatDate(v.dueDate)}`}</Badge></span>
                  <span className="tabular text-sm font-semibold md:text-right">{money(invoiceTotal(v), cur, { cents: true })}</span>
                  <div className="flex justify-end gap-1">
                    {st === "draft" && <Button size="sm" variant="soft" onClick={() => { data.setInvoiceStatus(v.id, "sent"); toast(`${v.number} marked as sent`); }}>Mark sent</Button>}
                    {(st === "sent" || st === "overdue") && <Button size="sm" variant="soft" onClick={() => { data.setInvoiceStatus(v.id, "paid"); toast(`${v.number} paid 💸`); }}>Mark paid</Button>}
                    {st === "overdue" && <Button size="icon-sm" variant="ghost" aria-label="Copy reminder" title="Copy reminder" onClick={() => copy(reminderText(v, c, data), "Reminder copied")}><Copy /></Button>}
                    <Button size="icon-sm" variant="ghost" aria-label="Print or save PDF" title="Print / PDF" onClick={() => print(v.id)}><Printer /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Edit invoice" onClick={() => openInvoice(v)}><Pencil /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete invoice" onClick={() => { if (confirm(`Delete ${v.number}?`)) data.deleteInvoice(v.id); }}><Trash2 /></Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
