"use client";
import { useEffect, useState } from "react";
import { Plus, Printer, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { useCrm } from "@/lib/crm/store";
import type { ClientStatus, Invoice, InvoiceItem, Project, ProjectStatus } from "@/lib/crm/types";
import { invoiceSubtotal, nextInvoiceNumber } from "@/lib/crm/logic";
import { money } from "@/lib/crm/money";
import { addDays, cn, todayISO, uid } from "@/lib/utils";
import { toast } from "@/lib/toast-store";
import { STATUS_META, useCrmUI } from "./ui-state";

const COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#84cc16", "#f59e0b", "#f97316", "#ef4444", "#ec4899", "#a855f7", "#64748b"];

export function ClientDialog() {
  const { clientDlg: initial, closeClient } = useCrmUI();
  const open = initial !== undefined;
  const { upsertClient, business } = useCrm();
  const [f, setF] = useState({ name: "", company: "", email: "", phone: "", rate: "", status: "active" as ClientStatus, notes: "", color: COLORS[0] });
  useEffect(() => {
    if (!open) return;
    setF({ name: initial?.name ?? "", company: initial?.company ?? "", email: initial?.email ?? "", phone: initial?.phone ?? "", rate: String(initial?.rate ?? business.defaultRate), status: initial?.status ?? "active", notes: initial?.notes ?? "", color: initial?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)] });
  }, [open, initial, business.defaultRate]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim()) return;
    upsertClient({ id: initial?.id, name: f.name.trim(), company: f.company.trim() || undefined, email: f.email.trim() || undefined, phone: f.phone.trim() || undefined, rate: Number(f.rate) || 0, status: f.status, notes: f.notes.trim() || undefined, color: f.color, lastContact: initial?.lastContact });
    toast(initial ? "Client updated" : "Client added");
    closeClient();
  };
  return (
    <Dialog open={open} onClose={closeClient} title={initial ? "Edit client" : "New client"}>
      <form onSubmit={save} className="grid grid-cols-2 gap-3 pb-3">
        <div className="col-span-2"><Segmented id="cstat" value={f.status} onChange={(v) => setF({ ...f, status: v })} options={[{ value: "lead", label: "Lead" }, { value: "active", label: "Active" }, { value: "past", label: "Past" }]} /></div>
        <Field label="Contact name" htmlFor="c-n"><Input id="c-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus required /></Field>
        <Field label="Company" htmlFor="c-co"><Input id="c-co" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></Field>
        <Field label="Email" htmlFor="c-e"><Input id="c-e" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Phone" htmlFor="c-p"><Input id="c-p" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label={`Hourly rate (${business.currency})`} htmlFor="c-r"><Input id="c-r" type="number" min="0" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field>
        <div><p className="mb-1.5 text-xs font-medium text-muted-foreground">Color</p><div className="flex flex-wrap gap-1.5">{COLORS.map((c) => <button type="button" key={c} onClick={() => setF({ ...f, color: c })} aria-label={`Color ${c}`} className={cn("size-6 rounded-full ring-offset-2 ring-offset-card", f.color === c && "ring-2 ring-foreground/50")} style={{ background: c }} />)}</div></div>
        <Field label="Notes" htmlFor="c-no" className="col-span-2"><Textarea id="c-no" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} className="min-h-16" /></Field>
        <div className="col-span-2 flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={closeClient}>Cancel</Button><Button type="submit">Save client</Button></div>
      </form>
    </Dialog>
  );
}

export function ProjectDialog() {
  const { projectDlg: initial, closeProject } = useCrmUI();
  const open = initial !== undefined;
  const { upsertProject, clients, business } = useCrm();
  const [f, setF] = useState({ name: "", clientId: "", status: "backlog" as ProjectStatus, deadline: "", billing: "hourly" as Project["billing"], budget: "", rate: "", description: "" });
  useEffect(() => {
    if (!open) return;
    setF({ name: initial?.name ?? "", clientId: initial?.clientId ?? clients.find((c) => c.status !== "past")?.id ?? "", status: initial?.status ?? "backlog", deadline: initial?.deadline ?? "", billing: initial?.billing ?? "hourly", budget: initial?.budget ? String(initial.budget) : "", rate: initial?.rate ? String(initial.rate) : "", description: initial?.description ?? "" });
  }, [open, initial, clients]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || !f.clientId) return toast("Name and client are required", undefined, "danger");
    upsertProject({ id: initial?.id, name: f.name.trim(), clientId: f.clientId, status: f.status, deadline: f.deadline || undefined, billing: f.billing, budget: Number(f.budget) || undefined, rate: Number(f.rate) || undefined, description: f.description.trim() || undefined });
    toast(initial?.id ? "Project updated" : "Project created");
    closeProject();
  };
  return (
    <Dialog open={open} onClose={closeProject} title={initial?.id ? "Edit project" : "New project"}>
      {clients.length === 0 ? <p className="pb-4 text-sm text-muted-foreground">Add a client first.</p> : (
        <form onSubmit={save} className="grid grid-cols-2 gap-3 pb-3">
          <Field label="Project name" htmlFor="p-n" className="col-span-2"><Input id="p-n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus required /></Field>
          <Field label="Client" htmlFor="p-c"><Select id="p-c" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>{clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}</Select></Field>
          <Field label="Status" htmlFor="p-s"><Select id="p-s" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as ProjectStatus })}>{Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</Select></Field>
          <Field label="Deadline" htmlFor="p-d"><Input id="p-d" type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></Field>
          <Field label="Billing" htmlFor="p-b"><Select id="p-b" value={f.billing} onChange={(e) => setF({ ...f, billing: e.target.value as Project["billing"] })}><option value="hourly">Hourly</option><option value="fixed">Fixed fee</option></Select></Field>
          {f.billing === "fixed" ? <Field label={`Fixed fee (${business.currency})`} htmlFor="p-bu"><Input id="p-bu" type="number" min="0" value={f.budget} onChange={(e) => setF({ ...f, budget: e.target.value })} /></Field>
            : <Field label="Rate override (optional)" htmlFor="p-r"><Input id="p-r" type="number" min="0" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} placeholder="client rate" /></Field>}
          <Field label="Description" htmlFor="p-de" className="col-span-2"><Textarea id="p-de" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} className="min-h-16" /></Field>
          <div className="col-span-2 flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={closeProject}>Cancel</Button><Button type="submit">Save project</Button></div>
        </form>
      )}
    </Dialog>
  );
}

export function EntryDialog() {
  const { entryDlg, setEntryDlg } = useCrmUI();
  const { projects, addEntry } = useCrm();
  const active = projects.filter((p) => p.status !== "done");
  const [f, setF] = useState({ projectId: "", date: todayISO(), h: "1", m: "0", note: "", billable: true });
  useEffect(() => { if (entryDlg) setF({ projectId: active[0]?.id ?? "", date: todayISO(), h: "1", m: "0", note: "", billable: true }); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entryDlg]);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const minutes = (Number(f.h) || 0) * 60 + (Number(f.m) || 0);
    if (!f.projectId || minutes <= 0) return toast("Pick a project and duration", undefined, "danger");
    addEntry({ projectId: f.projectId, date: f.date, minutes, note: f.note.trim() || "Work session", billable: f.billable });
    toast("Time logged");
    setEntryDlg(false);
  };
  return (
    <Dialog open={entryDlg} onClose={() => setEntryDlg(false)} title="Log time manually">
      <form onSubmit={save} className="grid grid-cols-2 gap-3 pb-3">
        <Field label="Project" htmlFor="e-p" className="col-span-2"><Select id="e-p" value={f.projectId} onChange={(e) => setF({ ...f, projectId: e.target.value })}>{active.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></Field>
        <Field label="Date" htmlFor="e-d"><Input id="e-d" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2"><Field label="Hours" htmlFor="e-h"><Input id="e-h" type="number" min="0" value={f.h} onChange={(e) => setF({ ...f, h: e.target.value })} /></Field><Field label="Min" htmlFor="e-m"><Input id="e-m" type="number" min="0" max="59" step="5" value={f.m} onChange={(e) => setF({ ...f, m: e.target.value })} /></Field></div>
        <Field label="What did you work on?" htmlFor="e-n" className="col-span-2"><Input id="e-n" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        <label className="col-span-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={f.billable} onChange={(e) => setF({ ...f, billable: e.target.checked })} className="size-4 accent-[var(--color-primary)]" /> Billable</label>
        <div className="col-span-2 flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setEntryDlg(false)}>Cancel</Button><Button type="submit">Log time</Button></div>
      </form>
    </Dialog>
  );
}

export function InvoiceDialog() {
  const { invoiceDlg: initial, closeInvoice, print } = useCrmUI();
  const open = initial !== undefined;
  const { invoices, clients, business, upsertInvoice } = useCrm();
  const [f, setF] = useState<Omit<Invoice, "id">>({ number: "", clientId: "", issueDate: todayISO(), dueDate: todayISO(), items: [], status: "draft", taxPct: 0 });
  useEffect(() => {
    if (!open) return;
    setF({
      number: initial?.number ?? nextInvoiceNumber(invoices), clientId: initial?.clientId ?? clients[0]?.id ?? "", issueDate: initial?.issueDate ?? todayISO(),
      dueDate: initial?.dueDate ?? todayISO(addDays(new Date(), business.terms)), items: initial?.items ?? [{ id: uid(), description: "", qty: 1, rate: clients[0]?.rate ?? business.defaultRate }],
      status: initial?.status ?? "draft", taxPct: initial?.taxPct ?? 0, notes: initial?.notes ?? `Payment due within ${business.terms} days. Bank transfer / Payoneer / Wise accepted.`, paidDate: initial?.paidDate, sentDate: initial?.sentDate,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initial]);
  const setItem = (id: string, p: Partial<InvoiceItem>) => setF({ ...f, items: f.items.map((i) => (i.id === id ? { ...i, ...p } : i)) });
  const save = (andPrint = false) => {
    if (!f.clientId || f.items.length === 0) return toast("Pick a client and add at least one item", undefined, "danger");
    const id = upsertInvoice({ ...f, id: initial?.id, items: f.items.filter((i) => i.description.trim() || i.rate) });
    toast(initial?.id ? "Invoice saved" : `${f.number} created`);
    closeInvoice();
    if (andPrint) print(id);
  };
  const sub = invoiceSubtotal({ ...f, id: "" });
  return (
    <Dialog open={open} onClose={closeInvoice} title={initial?.id ? `Edit ${f.number}` : "New invoice"} className="max-w-3xl">
      <div className="space-y-4 pb-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Number" htmlFor="i-n"><Input id="i-n" value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} /></Field>
          <Field label="Client" htmlFor="i-c"><Select id="i-c" value={f.clientId} onChange={(e) => setF({ ...f, clientId: e.target.value })}>{clients.map((c) => <option key={c.id} value={c.id}>{c.company ?? c.name}</option>)}</Select></Field>
          <Field label="Issue date" htmlFor="i-i"><Input id="i-i" type="date" value={f.issueDate} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
          <Field label="Due date" htmlFor="i-d"><Input id="i-d" type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field>
        </div>
        <div>
          <div className="hidden grid-cols-[1fr_80px_110px_110px_32px] gap-2 px-1 text-[11px] font-medium text-muted-foreground sm:grid"><span>Description</span><span>Qty</span><span>Rate</span><span className="text-right">Amount</span><span /></div>
          <div className="mt-1 space-y-2">
            {f.items.map((i) => (
              <div key={i.id} className="grid grid-cols-[1fr_70px_90px_32px] items-center gap-2 sm:grid-cols-[1fr_80px_110px_110px_32px]">
                <Input value={i.description} onChange={(e) => setItem(i.id, { description: e.target.value })} placeholder="Design work, development…" aria-label="Item description" />
                <Input type="number" min="0" step="any" value={i.qty} onChange={(e) => setItem(i.id, { qty: Number(e.target.value) })} aria-label="Quantity" />
                <Input type="number" min="0" step="any" value={i.rate} onChange={(e) => setItem(i.id, { rate: Number(e.target.value) })} aria-label="Rate" />
                <span className="tabular hidden text-right text-sm font-medium sm:block">{money(i.qty * i.rate, business.currency, { cents: true })}</span>
                <Button size="icon-sm" variant="ghost" aria-label="Remove item" onClick={() => setF({ ...f, items: f.items.filter((x) => x.id !== i.id) })}><Trash2 /></Button>
              </div>
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" onClick={() => setF({ ...f, items: [...f.items, { id: uid(), description: "", qty: 1, rate: clients.find((c) => c.id === f.clientId)?.rate ?? business.defaultRate }] })}><Plus /> Add line</Button>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4 border-t pt-4">
          <div className="grid flex-1 grid-cols-[100px_1fr] gap-3">
            <Field label="Tax %" htmlFor="i-t"><Input id="i-t" type="number" min="0" step="0.5" value={f.taxPct} onChange={(e) => setF({ ...f, taxPct: Number(e.target.value) })} /></Field>
            <Field label="Notes" htmlFor="i-no"><Input id="i-no" value={f.notes ?? ""} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
          </div>
          <div className="text-right"><p className="text-xs text-muted-foreground">Total</p><p className="tabular font-display text-2xl font-bold">{money(sub * (1 + f.taxPct / 100), business.currency, { cents: true })}</p></div>
        </div>
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={closeInvoice}>Cancel</Button>
          <Button variant="outline" onClick={() => save(true)}><Printer /> Save & print / PDF</Button>
          <Button onClick={() => save()}>Save invoice</Button>
        </div>
      </div>
    </Dialog>
  );
}
