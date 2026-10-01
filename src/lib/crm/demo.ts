import type { Client, CrmData, Invoice, Project, Task, TimeEntry } from "./types";
import { addDays, seeded, todayISO, uid } from "@/lib/utils";

export const DEFAULT_BUSINESS = { name: "Northlight Studio", email: "hello@northlight.studio", address: "House 12, Road 5, Dhanmondi, Dhaka 1205", currency: "USD", defaultRate: 40, terms: 14 };

export function emptyData(): CrmData {
  return { business: { ...DEFAULT_BUSINESS, name: "My Studio", email: "", address: "" }, clients: [], projects: [], tasks: [], entries: [], invoices: [], timer: null, isDemo: false };
}

export function demoData(now: Date = new Date()): CrmData {
  const rnd = seeded(11);
  const d = (n: number) => todayISO(addDays(now, n));
  const clients: Client[] = [
    { id: "c-nimbus", name: "Ayesha Rahman", company: "Nimbus Labs", email: "ayesha@nimbuslabs.io", color: "#6366f1", status: "active", rate: 45, lastContact: d(-4), createdAt: d(-160), notes: "SaaS analytics startup. Prefers Loom updates on Fridays." },
    { id: "c-bikes", name: "Tanvir Hasan", company: "Dhaka Bikes", email: "tanvir@dhakabikes.com", color: "#10b981", status: "active", rate: 35, lastContact: d(-9), createdAt: d(-90) },
    { id: "c-kacchi", name: "Rafiq Uddin", company: "Kacchi House", email: "rafiq@kacchihouse.com", color: "#f97316", status: "active", rate: 30, lastContact: d(-26), createdAt: d(-60), notes: "Pays late — send reminders early." },
    { id: "c-bloom", name: "Sara Lee", company: "Bloom & Co", email: "sara@bloomco.design", color: "#ec4899", status: "lead", rate: 50, lastContact: d(-8), createdAt: d(-10), notes: "Referral from Ayesha. Brand identity + website." },
    { id: "c-arcadia", name: "Marco Bianchi", company: "Arcadia Travel", email: "marco@arcadia.travel", color: "#0ea5e9", status: "past", rate: 40, lastContact: d(-70), createdAt: d(-200) },
  ];
  const projects: Project[] = [
    { id: "p-dash", clientId: "c-nimbus", name: "Analytics dashboard redesign", status: "in_progress", deadline: d(5), billing: "hourly", createdAt: d(-40), description: "Redesign of the core analytics views + design system." },
    { id: "p-shop", clientId: "c-bikes", name: "E-commerce storefront", status: "in_progress", deadline: d(20), billing: "fixed", budget: 3200, createdAt: d(-35) },
    { id: "p-menu", clientId: "c-kacchi", name: "Online menu & ordering site", status: "review", deadline: d(2), billing: "fixed", budget: 900, createdAt: d(-30) },
    { id: "p-brand", clientId: "c-bloom", name: "Brand identity", status: "backlog", deadline: d(45), billing: "fixed", budget: 2400, createdAt: d(-5) },
    { id: "p-land", clientId: "c-arcadia", name: "Summer campaign landing page", status: "done", deadline: d(-60), billing: "hourly", createdAt: d(-120) },
    { id: "p-mobile", clientId: "c-nimbus", name: "Mobile app UI kit", status: "backlog", billing: "hourly", createdAt: d(-3) },
  ];
  const t = (projectId: string, title: string, done: boolean, due?: number, priority: Task["priority"] = "med"): Task => ({ id: uid(), projectId, title, done, due: due === undefined ? undefined : d(due), priority });
  const tasks: Task[] = [
    t("p-dash", "Audit existing dashboards", true, -20), t("p-dash", "Wireframes for overview page", true, -12), t("p-dash", "Design tokens & color system", true, -8),
    t("p-dash", "High-fidelity overview screen", false, -1, "high"), t("p-dash", "Charts component library", false, 2, "high"), t("p-dash", "Filters & date picker", false, 3),
    t("p-dash", "Responsive tablet layouts", false, 4), t("p-dash", "Handoff in Figma + docs", false, 5, "low"),
    t("p-shop", "Product listing page", true, -10), t("p-shop", "Cart & checkout flow", true, -4), t("p-shop", "bKash / Nagad payment integration", false, 6, "high"),
    t("p-shop", "Order confirmation emails", false, 12), t("p-shop", "Launch checklist", false, 18, "low"),
    t("p-menu", "Menu CMS", true, -15), t("p-menu", "Ordering form", true, -6), t("p-menu", "Client review fixes", false, 1, "high"),
    t("p-brand", "Discovery workshop", false, 7), t("p-brand", "Moodboards", false, 14),
    t("p-land", "Landing page build", true, -65), t("p-land", "A/B variants", true, -62),
  ];
  const entries: TimeEntry[] = [];
  const notes: Record<string, string[]> = {
    "p-dash": ["Overview screen design", "Design system tokens", "Client call + revisions", "Chart explorations", "Figma components"],
    "p-shop": ["Checkout flow", "Product grid", "Payment API research", "Bug fixes"],
    "p-menu": ["Menu CMS setup", "Ordering form", "Review fixes"],
    "p-land": ["Landing build", "Copy tweaks"],
  };
  for (let i = 60; i >= 0; i--) {
    const day = addDays(now, -i);
    if (day.getDay() === 5 && rnd() < 0.7) continue; // Fridays mostly off
    for (const pid of ["p-dash", "p-shop", "p-menu"]) {
      const created = projects.find((p) => p.id === pid)!.createdAt;
      if (todayISO(day) < created || (pid === "p-menu" && i < 3)) continue;
      if (rnd() < (pid === "p-dash" ? 0.75 : 0.45)) {
        const n = notes[pid];
        entries.push({ id: uid(), projectId: pid, date: todayISO(day), minutes: Math.round((45 + rnd() * 180) / 15) * 15, note: n[Math.floor(rnd() * n.length)], billable: rnd() > 0.08 });
      }
    }
  }
  for (let i = 0; i < 12; i++) entries.push({ id: uid(), projectId: "p-land", date: d(-120 + i * 4), minutes: 180, note: notes["p-land"][i % 2], billable: true, invoiceId: "i-1" });

  const inv = (id: string, number: string, clientId: string, issue: number, due: number, items: [string, number, number][], status: Invoice["status"], paid?: number): Invoice => ({
    id, number, clientId, issueDate: d(issue), dueDate: d(due), items: items.map(([description, qty, rate]) => ({ id: uid(), description, qty, rate })), status, taxPct: 0, paidDate: paid === undefined ? undefined : d(paid), sentDate: status !== "draft" ? d(issue) : undefined,
  });
  const invoices: Invoice[] = [
    inv("i-1", "INV-0001", "c-arcadia", -100, -86, [["Summer campaign landing page — 36h", 36, 40]], "paid", -88),
    inv("i-2", "INV-0002", "c-nimbus", -140, -126, [["Discovery & UX audit", 1, 1800]], "paid", -125),
    inv("i-3", "INV-0003", "c-nimbus", -95, -81, [["Design sprint #1", 32, 45]], "paid", -80),
    inv("i-4", "INV-0004", "c-bikes", -34, -20, [["Storefront — 40% deposit", 1, 1280]], "paid", -22),
    inv("i-5", "INV-0005", "c-nimbus", -45, -31, [["Dashboard redesign — sprint 2", 38, 45]], "paid", -33),
    inv("i-6", "INV-0006", "c-kacchi", -26, -12, [["Menu site — 50% upfront", 1, 450]], "sent"),
    inv("i-7", "INV-0007", "c-nimbus", -16, 2, [["Dashboard redesign — sprint 3", 30, 45]], "sent"),
    inv("i-8", "INV-0008", "c-bikes", -5, 9, [["Storefront — milestone 2 (checkout)", 1, 960]], "draft"),
    inv("i-9", "INV-0009", "c-nimbus", -9, 5, [["Design system consultation", 6, 45]], "paid", 0),
    inv("i-10", "INV-0010", "c-nimbus", -118, -104, [["UX research & personas", 1, 1650]], "paid", -106),
    inv("i-11", "INV-0011", "c-arcadia", -72, -58, [["Campaign A/B variants", 22, 40]], "paid", -60),
  ];
  // Mark older dashboard entries as invoiced so only recent work is unbilled
  for (const e of entries) if (e.projectId === "p-dash" && e.date < d(-14)) e.invoiceId = "i-7";
  return { business: { ...DEFAULT_BUSINESS }, clients, projects, tasks, entries, invoices, timer: null, isDemo: true };
}
