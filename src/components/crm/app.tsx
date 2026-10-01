"use client";
import { useMemo } from "react";
import { Briefcase, Clock, FileText, LayoutDashboard, Play, Plus, Users, Feather, Square } from "lucide-react";
import { AppShell, type NavItem } from "@/components/kit/shell";
import { Dashboard } from "@/components/kit/dashboard";
import { useAssistant, type Insight } from "@/components/kit/assistant";
import type { Command } from "@/components/kit/command-palette";
import { Field, Input, Select } from "@/components/ui/input";
import { useCrm, exportCrm } from "@/lib/crm/store";
import { generateInsights, kpis, type CrmAction } from "@/lib/crm/logic";
import { CURRENCIES, money } from "@/lib/crm/money";
import { greeting } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { useWidgetRegistry } from "./widgets";
import { ClientsView, InvoicesView, ProjectsView, TimeView } from "./views";
import { ClientDialog, EntryDialog, InvoiceDialog, ProjectDialog } from "./dialogs";
import { PrintRoot } from "./invoice-doc";
import { useCrmUI } from "./ui-state";

const NAV: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: Briefcase },
  { id: "clients", label: "Clients", icon: Users },
  { id: "time", label: "Time", icon: Clock },
  { id: "invoices", label: "Invoices", icon: FileText },
];

export default function CrmApp() {
  const data = useCrm();
  const ui = useCrmUI();
  const setAssistantOpen = useAssistant((s) => s.setOpen);

  const insights: Insight[] = useMemo(() => {
    const exec = (a: CrmAction) => {
      const st = useCrm.getState();
      switch (a.kind) {
        case "copy": navigator.clipboard?.writeText(a.text).then(() => toast(a.label), () => toast("Couldn't access clipboard", undefined, "danger")); return;
        case "markPaid": return st.setInvoiceStatus(a.invoiceId, "paid");
        case "markSent": return st.setInvoiceStatus(a.invoiceId, "sent");
        case "invoiceUnbilled": { const id = st.invoiceUnbilled(a.projectId); if (id) { setAssistantOpen(false); ui.openInvoice(useCrm.getState().invoices.find((i) => i.id === id)); } return; }
        case "shiftDeadline": return st.shiftDeadline(a.projectId, a.days);
        case "rescheduleTasks": return st.rescheduleOverdue(a.projectId);
        case "logContact": return st.logContact(a.clientId);
        case "stopTimer": st.stopTimer(); return;
        case "view": setAssistantOpen(false); return ui.setView(a.view);
      }
    };
    const done = (a: CrmAction) => ({ markPaid: "Invoice marked paid 💸", markSent: "Invoice marked as sent", invoiceUnbilled: "Draft invoice created from unbilled time", shiftDeadline: "Deadline moved", rescheduleTasks: "Overdue tasks moved to tomorrow", logContact: "Follow-up logged", stopTimer: "Timer stopped", copy: undefined, view: undefined } as Record<CrmAction["kind"], string | undefined>)[a.kind];
    return generateInsights(data, new Date()).map((r) => ({ ...r, actions: r.actions.map((x) => ({ label: x.label, run: () => exec(x.action), resolves: !["view", "copy"].includes(x.action.kind), done: done(x.action) })) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, setAssistantOpen]);

  const registry = useWidgetRegistry(insights);
  const k = useMemo(() => kpis(data, new Date()), [data]);

  const commands: Command[] = useMemo(() => [
    { id: "new-inv", label: "New invoice", group: "Create", icon: FileText, run: () => ui.openInvoice() },
    { id: "new-proj", label: "New project", group: "Create", icon: Briefcase, run: () => ui.openProject() },
    { id: "new-client", label: "New client", group: "Create", icon: Users, run: () => ui.openClient() },
    { id: "log-time", label: "Log time manually", group: "Create", icon: Plus, run: () => ui.setEntryDlg(true) },
    data.timer
      ? { id: "stop", label: "Stop timer", group: "Timer", icon: Square, run: () => { const e = useCrm.getState().stopTimer(); if (e) toast("Timer stopped"); } }
      : { id: "start", label: "Start timer (first active project)", group: "Timer", icon: Play, run: () => { const p = data.projects.find((x) => x.status === "in_progress"); if (p) { useCrm.getState().startTimer(p.id); toast("Timer started", p.name, "default"); } } },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [data.timer, data.projects]);

  const scanSteps = [
    `Checking ${data.invoices.length} invoices for due dates`,
    `Reviewing ${data.projects.filter((p) => p.status !== "done").length} active projects & ${data.tasks.filter((t) => !t.done).length} open tasks`,
    `Totting up ${data.entries.filter((e) => !e.invoiceId && e.billable).length} unbilled time entries`,
    `Scanning ${data.clients.length} clients for follow-ups`,
    "Drafting suggestions",
  ];

  const intro = (
    <div>
      <p className="text-sm text-muted-foreground">{greeting()}, {data.business.name.split(" ")[0]} ☕</p>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{k.overdueCount ? `${money(k.overdue, data.business.currency)} is waiting on you` : "Your freelance cockpit"}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{k.activeProjects} active projects · {money(k.outstanding, data.business.currency)} outstanding · {money(k.unbilled, data.business.currency)} ready to invoice</p>
    </div>
  );

  return (
    <AppShell nav={NAV} view={ui.view} onView={ui.setView} logo={Feather} insights={insights} scanSteps={scanSteps} commands={commands} assistantName="Freelane Copilot"
      hooks={{ exportData: exportCrm, importData: data.importData, clearDemo: data.clearDemo, loadDemo: data.loadDemo, isDemo: data.isDemo }}
      settingsExtra={
        <div>
          <h3 className="mb-2 text-sm font-semibold">Business details (shown on invoices)</h3>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Business name" htmlFor="b-n"><Input id="b-n" defaultValue={data.business.name} onBlur={(e) => data.setBusiness({ name: e.target.value })} /></Field>
            <Field label="Email" htmlFor="b-e"><Input id="b-e" defaultValue={data.business.email} onBlur={(e) => data.setBusiness({ email: e.target.value })} /></Field>
            <Field label="Address" htmlFor="b-a" className="col-span-2"><Input id="b-a" defaultValue={data.business.address} onBlur={(e) => data.setBusiness({ address: e.target.value })} /></Field>
            <Field label="Currency" htmlFor="b-c"><Select id="b-c" value={data.business.currency} onChange={(e) => data.setBusiness({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.symbol.trim()} · {c.name}</option>)}</Select></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Default rate" htmlFor="b-r"><Input id="b-r" type="number" defaultValue={data.business.defaultRate} onBlur={(e) => data.setBusiness({ defaultRate: Number(e.target.value) || 0 })} /></Field>
              <Field label="Terms (days)" htmlFor="b-t"><Input id="b-t" type="number" defaultValue={data.business.terms} onBlur={(e) => data.setBusiness({ terms: Number(e.target.value) || 14 })} /></Field>
            </div>
          </div>
        </div>
      }>
      {ui.view === "dashboard" && <Dashboard registry={registry} intro={intro} />}
      {ui.view === "projects" && <ProjectsView />}
      {ui.view === "clients" && <ClientsView />}
      {ui.view === "time" && <TimeView />}
      {ui.view === "invoices" && <InvoicesView />}
      <ClientDialog />
      <ProjectDialog />
      <InvoiceDialog />
      <EntryDialog />
      <PrintRoot />
    </AppShell>
  );
}
