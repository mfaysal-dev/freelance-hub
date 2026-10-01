"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { APP } from "@/app-config";
import { uid } from "@/lib/utils";

export type WidgetSize = "s" | "m" | "l" | "xl";
export type WidgetInstance = { id: string; type: string; size: WidgetSize };
export type ThemeMode = "light" | "dark" | "system";

export type UIState = {
  theme: ThemeMode;
  accent: number;
  layout: WidgetInstance[];
  dismissed: string[];
  setTheme: (t: ThemeMode) => void;
  setAccent: (h: number) => void;
  setLayout: (l: WidgetInstance[]) => void;
  addWidget: (type: string, size: WidgetSize) => void;
  removeWidget: (id: string) => void;
  resizeWidget: (id: string, size: WidgetSize) => void;
  resetLayout: () => void;
  dismiss: (id: string) => void;
  restoreDismissed: () => void;
  replaceUI: (p: Partial<Pick<UIState, "theme" | "accent" | "layout" | "dismissed">>) => void;
};

export const defaultLayout = (): WidgetInstance[] =>
  APP.defaultLayout.map((w) => ({ ...w, id: uid() }));

export const useUI = create<UIState>()(
  persist(
    (set) => ({
      theme: "system",
      accent: APP.defaultAccent,
      layout: defaultLayout(),
      dismissed: [],
      setTheme: (theme) => set({ theme }),
      setAccent: (accent) => set({ accent }),
      setLayout: (layout) => set({ layout }),
      addWidget: (type, size) => set((s) => ({ layout: [...s.layout, { id: uid(), type, size }] })),
      removeWidget: (id) => set((s) => ({ layout: s.layout.filter((w) => w.id !== id) })),
      resizeWidget: (id, size) => set((s) => ({ layout: s.layout.map((w) => (w.id === id ? { ...w, size } : w)) })),
      resetLayout: () => set({ layout: defaultLayout() }),
      dismiss: (id) => set((s) => ({ dismissed: [...new Set([...s.dismissed, id])] })),
      restoreDismissed: () => set({ dismissed: [] }),
      replaceUI: (p) => set(p),
    }),
    { name: `${APP.storageKey}-ui`, version: 1 },
  ),
);
