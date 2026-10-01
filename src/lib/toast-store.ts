"use client";
import { create } from "zustand";
import { uid } from "@/lib/utils";

export type Toast = { id: string; title: string; description?: string; tone?: "default" | "success" | "danger" };
type S = { toasts: Toast[]; push: (t: Omit<Toast, "id">) => void; remove: (id: string) => void };

export const useToasts = create<S>((set) => ({
  toasts: [],
  push: (t) => {
    const id = uid();
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3800);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = (title: string, description?: string, tone: Toast["tone"] = "success") =>
  useToasts.getState().push({ title, description, tone });
