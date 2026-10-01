"use client";
import { create } from "zustand";
import type { Client, Invoice, Project } from "@/lib/crm/types";

type S = {
  view: string; setView: (v: string) => void;
  clientDlg: Client | null | undefined; openClient: (c?: Client | null) => void; closeClient: () => void;
  projectDlg: (Partial<Project> & { id?: string }) | null | undefined; openProject: (p?: Partial<Project> | null) => void; closeProject: () => void;
  invoiceDlg: Partial<Invoice> | null | undefined; openInvoice: (i?: Partial<Invoice> | null) => void; closeInvoice: () => void;
  entryDlg: boolean; setEntryDlg: (o: boolean) => void;
  printId: string | null; print: (id: string) => void; clearPrint: () => void;
  focusProject: string | null; setFocusProject: (id: string | null) => void;
};
export const useCrmUI = create<S>((set) => ({
  view: "dashboard",
  setView: (view) => { set({ view }); if (typeof window !== "undefined") window.scrollTo({ top: 0 }); },
  clientDlg: undefined, openClient: (c) => set({ clientDlg: c ?? null }), closeClient: () => set({ clientDlg: undefined }),
  projectDlg: undefined, openProject: (p) => set({ projectDlg: p ?? null }), closeProject: () => set({ projectDlg: undefined }),
  invoiceDlg: undefined, openInvoice: (i) => set({ invoiceDlg: i ?? null }), closeInvoice: () => set({ invoiceDlg: undefined }),
  entryDlg: false, setEntryDlg: (entryDlg) => set({ entryDlg }),
  printId: null,
  print: (id) => { set({ printId: id }); setTimeout(() => window.print(), 120); },
  clearPrint: () => set({ printId: null }),
  focusProject: null, setFocusProject: (focusProject) => set({ focusProject }),
}));

export const STATUS_META = {
  backlog: { label: "Backlog", color: "#94a3b8" },
  in_progress: { label: "In progress", color: "#3b82f6" },
  review: { label: "In review", color: "#f59e0b" },
  done: { label: "Done", color: "#10b981" },
} as const;
