"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Business, Client, CrmData, Invoice, Project, ProjectStatus, Task, TimeEntry } from "./types";
import { demoData, emptyData } from "./demo";
import { nextInvoiceNumber, projectRate, unbilled } from "./logic";
import { hours } from "./money";
import { addDays, todayISO, uid } from "@/lib/utils";

type Actions = {
  upsertClient: (c: Omit<Client, "id" | "createdAt"> & { id?: string }) => void;
  deleteClient: (id: string) => void;
  logContact: (id: string) => void;
  upsertProject: (p: Omit<Project, "id" | "createdAt"> & { id?: string }) => void;
  setProjectStatus: (id: string, status: ProjectStatus) => void;
  shiftDeadline: (id: string, days: number) => void;
  deleteProject: (id: string) => void;
  addTask: (t: Omit<Task, "id">) => void;
  updateTask: (id: string, p: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  rescheduleOverdue: (projectId: string) => void;
  addEntry: (e: Omit<TimeEntry, "id">) => void;
  updateEntry: (id: string, p: Partial<TimeEntry>) => void;
  deleteEntry: (id: string) => void;
  startTimer: (projectId: string, note?: string, taskId?: string) => void;
  stopTimer: () => TimeEntry | null;
  upsertInvoice: (i: Omit<Invoice, "id"> & { id?: string }) => string;
  setInvoiceStatus: (id: string, status: Invoice["status"]) => void;
  deleteInvoice: (id: string) => void;
  invoiceUnbilled: (projectId: string) => string | null;
  setBusiness: (b: Partial<Business>) => void;
  clearDemo: () => void;
  loadDemo: () => void;
  importData: (d: unknown) => void;
};

export const useCrm = create<CrmData & Actions>()(
  persist(
    (set, get) => ({
      ...demoData(),
      upsertClient: (c) => set((s) => (c.id && s.clients.some((x) => x.id === c.id)
        ? { clients: s.clients.map((x) => (x.id === c.id ? { ...x, ...c, id: x.id } : x)) }
        : { clients: [...s.clients, { ...c, id: uid(), createdAt: todayISO(), lastContact: c.lastContact ?? todayISO() }] })),
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      logContact: (id) => set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, lastContact: todayISO() } : c)) })),
      upsertProject: (p) => set((s) => (p.id && s.projects.some((x) => x.id === p.id)
        ? { projects: s.projects.map((x) => (x.id === p.id ? { ...x, ...p, id: x.id } : x)) }
        : { projects: [...s.projects, { ...p, id: uid(), createdAt: todayISO() }] })),
      setProjectStatus: (id, status) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, status } : p)) })),
      shiftDeadline: (id, days) => set((s) => ({ projects: s.projects.map((p) => (p.id === id ? { ...p, deadline: todayISO(addDays(p.deadline && p.deadline > todayISO() ? new Date(p.deadline + "T00:00") : new Date(), days)) } : p)) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.filter((p) => p.id !== id), tasks: s.tasks.filter((t) => t.projectId !== id) })),
      addTask: (t) => set((s) => ({ tasks: [...s.tasks, { ...t, id: uid() }] })),
      updateTask: (id, p) => set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...p } : t)) })),
      deleteTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
      rescheduleOverdue: (projectId) => set((s) => ({ tasks: s.tasks.map((t) => (t.projectId === projectId && !t.done && t.due && t.due < todayISO() ? { ...t, due: todayISO(addDays(new Date(), 1)) } : t)) })),
      addEntry: (e) => set((s) => ({ entries: [{ ...e, id: uid() }, ...s.entries] })),
      updateEntry: (id, p) => set((s) => ({ entries: s.entries.map((e) => (e.id === id ? { ...e, ...p } : e)) })),
      deleteEntry: (id) => set((s) => ({ entries: s.entries.filter((e) => e.id !== id) })),
      startTimer: (projectId, note = "", taskId) => { if (get().timer) get().stopTimer(); set({ timer: { projectId, note, taskId, startedAt: Date.now() } }); },
      stopTimer: () => {
        const t = get().timer;
        if (!t) return null;
        const minutes = Math.max(1, Math.round((Date.now() - t.startedAt) / 60000));
        const entry: TimeEntry = { id: uid(), projectId: t.projectId, taskId: t.taskId, date: todayISO(), minutes, note: t.note || "Focused work", billable: true };
        set((s) => ({ timer: null, entries: [entry, ...s.entries] }));
        return entry;
      },
      upsertInvoice: (i) => {
        const id = i.id ?? uid();
        set((s) => (s.invoices.some((x) => x.id === id) ? { invoices: s.invoices.map((x) => (x.id === id ? { ...x, ...i, id } : x)) } : { invoices: [...s.invoices, { ...i, id }] }));
        return id;
      },
      setInvoiceStatus: (id, status) => set((s) => ({ invoices: s.invoices.map((v) => (v.id === id ? { ...v, status, paidDate: status === "paid" ? todayISO() : undefined, sentDate: status === "sent" ? todayISO() : v.sentDate } : v)) })),
      deleteInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((v) => v.id !== id), entries: s.entries.map((e) => (e.invoiceId === id ? { ...e, invoiceId: undefined } : e)) })),
      invoiceUnbilled: (projectId) => {
        const s = get();
        const u = unbilled(s).find((x) => x.project.id === projectId);
        if (!u) return null;
        const id = uid();
        const rate = projectRate(u.project, s.clients);
        const inv: Invoice = { id, number: nextInvoiceNumber(s.invoices), clientId: u.project.clientId, issueDate: todayISO(), dueDate: todayISO(addDays(new Date(), s.business.terms)), status: "draft", taxPct: 0,
          items: [{ id: uid(), description: `${u.project.name} — ${hours(u.minutes)} of work`, qty: Math.round((u.minutes / 60) * 100) / 100, rate }] };
        const ids = new Set(u.entries.map((e) => e.id));
        set({ invoices: [...s.invoices, inv], entries: s.entries.map((e) => (ids.has(e.id) ? { ...e, invoiceId: id } : e)) });
        return id;
      },
      setBusiness: (b) => set((s) => ({ business: { ...s.business, ...b } })),
      clearDemo: () => set((s) => ({ ...emptyData(), business: { ...emptyData().business, currency: s.business.currency } })),
      loadDemo: () => set({ ...demoData() }),
      importData: (d) => {
        const x = d as Partial<CrmData>;
        if (!x || !Array.isArray(x.clients) || !Array.isArray(x.projects)) throw new Error("Backup is missing clients/projects");
        set({ ...emptyData(), ...x, isDemo: Boolean(x.isDemo) });
      },
    }),
    { name: "freelane-data", version: 1 },
  ),
);

export function exportCrm(): CrmData {
  const s = useCrm.getState();
  return { business: s.business, clients: s.clients, projects: s.projects, tasks: s.tasks, entries: s.entries, invoices: s.invoices, timer: s.timer, isDemo: s.isDemo };
}
