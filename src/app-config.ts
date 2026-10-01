import type { WidgetSize } from "@/lib/ui-store";

export const APP = {
  name: "Freelane",
  tagline: "Clients, projects & cash flow",
  storageKey: "freelane",
  defaultAccent: 45,
  defaultLayout: [
    { type: "kpis", size: "l" },
    { type: "assistant", size: "s" },
    { type: "revenue", size: "l" },
    { type: "timer", size: "s" },
    { type: "deadlines", size: "s" },
    { type: "invoices", size: "s" },
    { type: "tasks", size: "s" },
    { type: "hours", size: "m" },
    { type: "clients", size: "m" },
  ] as { type: string; size: WidgetSize }[],
};
