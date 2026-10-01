import type { Client, CrmData, Invoice, Project, Task, TimeEntry } from "./types";
import { money, hours } from "./money";
import { addDays, diffDays, monthKey, monthLabel, parseISO, shiftMonth, todayISO } from "@/lib/utils";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function invoiceSubtotal(inv: Invoice) {
  return sum(inv.items.map((i) => i.qty * i.rate));
}
export function invoiceTotal(inv: Invoice) {
  return Math.round(invoiceSubtotal(inv) * (1 + inv.taxPct / 100) * 100) / 100;
}

export type InvState = "draft" | "sent" | "overdue" | "paid";
export function invoiceState(inv: Invoice, now: Date = new Date()): InvState {
  if (inv.status === "paid") return "paid";
  if (inv.status === "draft") return "draft";
  return inv.dueDate < todayISO(now) ? "overdue" : "sent";
}

export function projectRate(p: Project, clients: Client[]) {
  return p.rate ?? clients.find((c) => c.id === p.clientId)?.rate ?? 0;
}

export function projectMinutes(entries: TimeEntry[], projectId: string) {
  return sum(entries.filter((e) => e.projectId === projectId).map((e) => e.minutes));
}

export function unbilled(data: CrmData) {
  const rows = new Map<string, { project: Project; minutes: number; amount: number; entries: TimeEntry[] }>();
  for (const e of data.entries) {
    if (!e.billable || e.invoiceId) continue;
    const p = data.projects.find((x) => x.id === e.projectId);
    if (!p || p.billing !== "hourly") continue;
    const r = rows.get(p.id) ?? { project: p, minutes: 0, amount: 0, entries: [] };
    r.minutes += e.minutes;
    r.amount += (e.minutes / 60) * projectRate(p, data.clients);
    r.entries.push(e);
    rows.set(p.id, r);
  }
  return [...rows.values()].sort((a, b) => b.amount - a.amount);
}

export type ProjectHealth = { project: Project; client?: Client; minutes: number; tasksDone: number; tasksTotal: number; progress: number; daysLeft: number | null; value: number; budgetUsed: number | null; risk: "ok" | "watch" | "risk" | "late"; overdueTasks: Task[] };

export function projectHealth(data: CrmData, p: Project, now: Date = new Date()): ProjectHealth {
  const tasks = data.tasks.filter((t) => t.projectId === p.id);
  const done = tasks.filter((t) => t.done).length;
  const minutes = projectMinutes(data.entries, p.id);
  const rate = projectRate(p, data.clients);
  const value = (minutes / 60) * rate;
  const progress = tasks.length ? done / tasks.length : p.status === "done" ? 1 : 0;
  const daysLeft = p.deadline ? diffDays(parseISO(p.deadline), now) : null;
  const budgetUsed = p.budget ? value / p.budget : null;
  let risk: ProjectHealth["risk"] = "ok";
  if (p.status !== "done" && daysLeft !== null) {
    if (daysLeft < 0) risk = "late";
    else if (daysLeft <= 7 && progress < 0.7) risk = "risk";
    else if (daysLeft <= 14 && progress < 0.5) risk = "watch";
  }
  const overdueTasks = tasks.filter((t) => !t.done && t.due && t.due < todayISO(now));
  return { project: p, client: data.clients.find((c) => c.id === p.clientId), minutes, tasksDone: done, tasksTotal: tasks.length, progress, daysLeft, value, budgetUsed, risk, overdueTasks };
}

export function revenueByMonth(data: CrmData, now: Date = new Date(), months = 6) {
  return Array.from({ length: months }, (_, i) => {
    const key = monthKey(shiftMonth(now, -(months - 1 - i)));
    const paid = sum(data.invoices.filter((v) => v.status === "paid" && v.paidDate?.startsWith(key)).map(invoiceTotal));
    const billed = sum(data.invoices.filter((v) => v.status !== "draft" && v.issueDate.startsWith(key)).map(invoiceTotal));
    return { month: monthLabel(key), key, paid, billed };
  });
}

export function hoursByDay(data: CrmData, now: Date = new Date(), days = 14) {
  return Array.from({ length: days }, (_, i) => {
    const d = addDays(now, -(days - 1 - i));
    const iso = todayISO(d);
    const mins = sum(data.entries.filter((e) => e.date === iso).map((e) => e.minutes));
    const bill = sum(data.entries.filter((e) => e.date === iso && e.billable).map((e) => e.minutes));
    return { date: iso, label: d.toLocaleDateString("en-US", { weekday: "narrow" }) + d.getDate(), hours: +(mins / 60).toFixed(1), billable: +(bill / 60).toFixed(1) };
  });
}

export function kpis(data: CrmData, now: Date = new Date()) {
  const open = data.invoices.filter((v) => v.status === "sent");
  const overdue = open.filter((v) => invoiceState(v, now) === "overdue");
  const key = monthKey(now);
  const prevKey = monthKey(shiftMonth(now, -1));
  const paidThis = sum(data.invoices.filter((v) => v.status === "paid" && v.paidDate?.startsWith(key)).map(invoiceTotal));
  const paidPrev = sum(data.invoices.filter((v) => v.status === "paid" && v.paidDate?.startsWith(prevKey)).map(invoiceTotal));
  const weekAgo = todayISO(addDays(now, -6));
  const weekMinutes = sum(data.entries.filter((e) => e.date >= weekAgo && e.date <= todayISO(now)).map((e) => e.minutes));
  return {
    outstanding: sum(open.map(invoiceTotal)), overdue: sum(overdue.map(invoiceTotal)), overdueCount: overdue.length,
    paidThis, paidPrev, unbilled: sum(unbilled(data).map((u) => u.amount)), weekMinutes,
    activeProjects: data.projects.filter((p) => p.status === "in_progress" || p.status === "review").length,
  };
}

export function nextInvoiceNumber(invoices: Invoice[]) {
  const max = Math.max(0, ...invoices.map((i) => Number(i.number.replace(/\D/g, "")) || 0));
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export function reminderText(inv: Invoice, client: Client | undefined, data: CrmData, now: Date = new Date()) {
  const late = diffDays(now, parseISO(inv.dueDate));
  const amt = money(invoiceTotal(inv), data.business.currency, { cents: true });
  const first = client?.name.split(" ")[0] ?? "there";
  return late > 0
    ? `Hi ${first},\n\nI hope you're doing well! A quick reminder that invoice ${inv.number} for ${amt} was due on ${parseISO(inv.dueDate).toDateString()} (${late} day${late === 1 ? "" : "s"} ago). Could you let me know when I can expect payment? Happy to resend the invoice if helpful.\n\nThanks so much,\n${data.business.name}`
    : `Hi ${first},\n\nJust a friendly heads-up that invoice ${inv.number} for ${amt} is due on ${parseISO(inv.dueDate).toDateString()}. Let me know if you need anything from my side.\n\nBest,\n${data.business.name}`;
}

export function followUpText(client: Client, data: CrmData) {
  const first = client.name.split(" ")[0];
  return client.status === "lead"
    ? `Hi ${first},\n\nFollowing up on our conversation — I'd love to help with your project. Would a quick 15-minute call this week work to go over scope and timeline?\n\nBest,\n${data.business.name}`
    : `Hi ${first},\n\nHope all is well! Just checking in — is there anything coming up where I could help? I have some availability opening up in the next few weeks.\n\nCheers,\n${data.business.name}`;
}

/* ---------------- Assistant rules ---------------- */

export type CrmAction =
  | { kind: "copy"; text: string; label: string }
  | { kind: "markPaid"; invoiceId: string }
  | { kind: "markSent"; invoiceId: string }
  | { kind: "invoiceUnbilled"; projectId: string }
  | { kind: "shiftDeadline"; projectId: string; days: number }
  | { kind: "rescheduleTasks"; projectId: string }
  | { kind: "logContact"; clientId: string }
  | { kind: "stopTimer" }
  | { kind: "view"; view: string };

export type RawInsight = { id: string; tone: "alert" | "warn" | "tip" | "win"; title: string; body: string; metric?: string; actions: { label: string; action: CrmAction }[] };

export function generateInsights(data: CrmData, now: Date = new Date()): RawInsight[] {
  const cur = data.business.currency;
  const m = (n: number) => money(Math.round(n), cur);
  const today = todayISO(now);
  const out: RawInsight[] = [];
  const clientOf = (id: string) => data.clients.find((c) => c.id === id);

  for (const inv of data.invoices) {
    const st = invoiceState(inv, now);
    const c = clientOf(inv.clientId);
    if (st === "overdue") {
      const late = diffDays(now, parseISO(inv.dueDate));
      out.push({ id: `inv-overdue-${inv.id}-${Math.floor(late / 7)}`, tone: "alert", title: `${inv.number} from ${c?.company ?? c?.name ?? "client"} is ${late} days overdue`, body: `${m(invoiceTotal(inv))} outstanding since ${parseISO(inv.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}. A polite nudge usually does the trick — I drafted one for you.`, metric: m(invoiceTotal(inv)),
        actions: [{ label: "Copy reminder", action: { kind: "copy", text: reminderText(inv, c, data, now), label: "Reminder copied — paste it into your email" } }, { label: "Mark paid", action: { kind: "markPaid", invoiceId: inv.id } }] });
    } else if (st === "sent") {
      const left = diffDays(parseISO(inv.dueDate), now);
      if (left <= 3) out.push({ id: `inv-due-${inv.id}`, tone: "warn", title: `${inv.number} is due ${left === 0 ? "today" : `in ${left} day${left === 1 ? "" : "s"}`}`, body: `${m(invoiceTotal(inv))} from ${c?.company ?? c?.name}. A friendly heads-up before the due date improves on-time payment.`, actions: [{ label: "Copy heads-up", action: { kind: "copy", text: reminderText(inv, c, data, now), label: "Heads-up copied" } }, { label: "Mark paid", action: { kind: "markPaid", invoiceId: inv.id } }] });
    } else if (st === "draft" && diffDays(now, parseISO(inv.issueDate)) >= 3) {
      out.push({ id: `inv-draft-${inv.id}`, tone: "tip", title: `${inv.number} has been a draft for ${diffDays(now, parseISO(inv.issueDate))} days`, body: `${m(invoiceTotal(inv))} for ${c?.company ?? c?.name} isn't earning you anything sitting in drafts.`, actions: [{ label: "Mark as sent", action: { kind: "markSent", invoiceId: inv.id } }, { label: "Open invoices", action: { kind: "view", view: "invoices" } }] });
    }
  }

  for (const u of unbilled(data)) {
    if (u.amount < 200 && u.minutes < 300) continue;
    const c = clientOf(u.project.clientId);
    out.push({ id: `unbilled-${u.project.id}-${Math.floor(u.minutes / 300)}`, tone: "tip", title: `${hours(u.minutes)} unbilled on ${u.project.name}`, body: `That's ${m(u.amount)} of work for ${c?.company ?? c?.name} not yet invoiced. Turn it into a draft invoice in one click.`, metric: m(u.amount), actions: [{ label: `Create ${m(u.amount)} invoice`, action: { kind: "invoiceUnbilled", projectId: u.project.id } }] });
  }

  for (const p of data.projects.filter((x) => x.status !== "done")) {
    const h = projectHealth(data, p, now);
    if (h.risk === "late") out.push({ id: `late-${p.id}-${today}`, tone: "alert", title: `${p.name} is ${-h.daysLeft!} days past its deadline`, body: `${h.tasksDone}/${h.tasksTotal} tasks done. Agree a new date with ${h.client?.name ?? "the client"} so expectations stay aligned.`, actions: [{ label: "Push deadline 7 days", action: { kind: "shiftDeadline", projectId: p.id, days: 7 } }, { label: "Copy update", action: { kind: "copy", text: `Hi ${h.client?.name.split(" ")[0] ?? "there"},\n\nQuick update on ${p.name}: we're ${Math.round(h.progress * 100)}% through. To deliver the quality you expect I'd like to propose a new delivery date of ${addDays(now, 7).toDateString()}. Does that work for you?\n\nThanks,\n${data.business.name}`, label: "Status update copied" } }] });
    else if (h.risk === "risk") out.push({ id: `risk-${p.id}-${today}`, tone: "alert", title: `${p.name} deadline at risk`, body: `${h.daysLeft} day${h.daysLeft === 1 ? "" : "s"} left with ${Math.round(h.progress * 100)}% of tasks done (${h.tasksTotal - h.tasksDone} remaining). Consider trimming scope or giving the client an early heads-up.`, metric: `${h.daysLeft}d`, actions: [{ label: "Open projects", action: { kind: "view", view: "projects" } }, { label: "Push deadline 7 days", action: { kind: "shiftDeadline", projectId: p.id, days: 7 } }] });
    else if (h.risk === "watch") out.push({ id: `watch-${p.id}-${today}`, tone: "warn", title: `Keep an eye on ${p.name}`, body: `${h.daysLeft} days left, ${Math.round(h.progress * 100)}% of tasks complete.`, actions: [{ label: "Open projects", action: { kind: "view", view: "projects" } }] });
    if (h.overdueTasks.length) out.push({ id: `tasks-${p.id}-${today}`, tone: "warn", title: `${h.overdueTasks.length} overdue task${h.overdueTasks.length > 1 ? "s" : ""} in ${p.name}`, body: h.overdueTasks.slice(0, 3).map((t) => `• ${t.title}`).join("\n"), actions: [{ label: "Reschedule to tomorrow", action: { kind: "rescheduleTasks", projectId: p.id } }] });
    if (p.billing === "fixed" && h.budgetUsed !== null && h.budgetUsed >= 0.9 && h.progress < 0.95) out.push({ id: `burn-${p.id}`, tone: "warn", title: `${p.name} has used ${Math.round(h.budgetUsed * 100)}% of its budget`, body: `Logged time is worth ${m(h.value)} against a ${m(p.budget!)} fixed fee, with ${Math.round((1 - h.progress) * 100)}% of tasks still open. Time to discuss a change request?`, actions: [{ label: "Open projects", action: { kind: "view", view: "projects" } }] });
  }

  for (const c of data.clients) {
    if (c.status === "past") continue;
    const since = c.lastContact ? diffDays(now, parseISO(c.lastContact)) : 999;
    const limit = c.status === "lead" ? 5 : 21;
    if (since >= limit) out.push({ id: `follow-${c.id}-${c.lastContact ?? "never"}`, tone: c.status === "lead" ? "warn" : "tip", title: c.status === "lead" ? `Lead ${c.name} is going cold (${since === 999 ? "never contacted" : `${since} days`})` : `Check in with ${c.name}${c.company ? ` (${c.company})` : ""}`, body: c.status === "lead" ? "Leads convert best when you follow up within a week. Here's a short, no-pressure message." : `It's been ${since} days since you last talked. Staying top-of-mind brings repeat work.`, actions: [{ label: "Copy message", action: { kind: "copy", text: followUpText(c, data), label: "Follow-up copied" } }, { label: "Log follow-up", action: { kind: "logContact", clientId: c.id } }] });
  }

  if (data.timer && Date.now() - data.timer.startedAt > 3 * 3600_000) out.push({ id: `timer-${data.timer.startedAt}`, tone: "warn", title: "Your timer has been running 3+ hours", body: "Forgot to stop it? Stop now and adjust the entry if needed.", actions: [{ label: "Stop timer", action: { kind: "stopTimer" } }] });

  const k = kpis(data, now);
  if (k.paidThis > 0 && k.paidThis > k.paidPrev) out.push({ id: `rev-up-${monthKey(now)}`, tone: "win", title: `Best month so far: ${m(k.paidThis)} collected`, body: k.paidPrev ? `Up ${Math.round((k.paidThis / k.paidPrev - 1) * 100)}% on last month. Nice work!` : "Momentum!", actions: [] });
  const from90 = todayISO(addDays(now, -90));
  const byClient = new Map<string, number>();
  for (const v of data.invoices.filter((x) => x.status === "paid" && (x.paidDate ?? "") >= from90)) byClient.set(v.clientId, (byClient.get(v.clientId) ?? 0) + invoiceTotal(v));
  const total = sum([...byClient.values()]);
  for (const [cid, amt] of byClient) if (total > 0 && amt / total > 0.6 && byClient.size > 0) {
    out.push({ id: `concentration-${cid}-${monthKey(now)}`, tone: "tip", title: `${Math.round((amt / total) * 100)}% of recent revenue comes from ${clientOf(cid)?.company ?? clientOf(cid)?.name}`, body: "Healthy freelance businesses keep any single client under ~50%. Consider nurturing a lead this month.", actions: [{ label: "Open clients", action: { kind: "view", view: "clients" } }] });
  }
  const recentPaid = data.invoices.filter((v) => v.status === "paid" && v.paidDate && diffDays(now, parseISO(v.paidDate)) <= 3);
  for (const v of recentPaid) out.push({ id: `paid-${v.id}`, tone: "win", title: `${v.number} paid — ${m(invoiceTotal(v))} 💸`, body: `${clientOf(v.clientId)?.company ?? clientOf(v.clientId)?.name} paid on ${parseISO(v.paidDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`, actions: [] });
  return out;
}
