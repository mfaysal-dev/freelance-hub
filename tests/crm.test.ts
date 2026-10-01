import { describe, expect, it } from "vitest";
import { generateInsights, invoiceState, invoiceTotal, kpis, nextInvoiceNumber, projectHealth, reminderText, unbilled } from "@/lib/crm/logic";
import { demoData, emptyData } from "@/lib/crm/demo";
import { money, hours } from "@/lib/crm/money";
import type { CrmData, Invoice } from "@/lib/crm/types";

const NOW = new Date(2026, 9, 15, 10, 0);

function base(): CrmData {
  const d = emptyData();
  d.business.name = "Test Studio";
  d.clients = [{ id: "c1", name: "Ayesha Rahman", company: "Nimbus", color: "#000", status: "active", rate: 50, lastContact: "2026-10-10", createdAt: "2026-01-01" }];
  d.projects = [{ id: "p1", clientId: "c1", name: "Dashboard", status: "in_progress", deadline: "2026-10-19", billing: "hourly", createdAt: "2026-09-01" }];
  return d;
}
const inv = (p: Partial<Invoice>): Invoice => ({ id: "i1", number: "INV-0001", clientId: "c1", issueDate: "2026-09-01", dueDate: "2026-09-15", items: [{ id: "x", description: "Work", qty: 10, rate: 50 }], status: "sent", taxPct: 10, ...p });

describe("money", () => {
  it("formats currency and hours", () => {
    expect(money(1234.5, "USD", { cents: true })).toBe("$1,234.50");
    expect(money(1500, "BDT")).toBe("৳1,500");
    expect(hours(135)).toBe("2h 15m");
  });
});

describe("invoices", () => {
  it("totals with tax and derives state", () => {
    expect(invoiceTotal(inv({}))).toBe(550);
    expect(invoiceState(inv({}), NOW)).toBe("overdue");
    expect(invoiceState(inv({ dueDate: "2026-10-20" }), NOW)).toBe("sent");
    expect(invoiceState(inv({ status: "paid" }), NOW)).toBe("paid");
  });
  it("numbers invoices sequentially", () => {
    expect(nextInvoiceNumber([inv({ number: "INV-0009" }), inv({ number: "INV-0012" })])).toBe("INV-0013");
  });
  it("flags overdue invoices with a reminder action", () => {
    const d = base();
    d.invoices = [inv({})];
    const i = generateInsights(d, NOW).find((x) => x.id.startsWith("inv-overdue-i1"));
    expect(i?.tone).toBe("alert");
    expect(i?.actions[0].action.kind).toBe("copy");
    expect(reminderText(d.invoices[0], d.clients[0], d, NOW)).toContain("30 days ago");
  });
});

describe("projects & time", () => {
  it("computes unbilled hourly work", () => {
    const d = base();
    d.entries = [
      { id: "e1", projectId: "p1", date: "2026-10-10", minutes: 180, note: "", billable: true },
      { id: "e2", projectId: "p1", date: "2026-10-11", minutes: 60, note: "", billable: false },
      { id: "e3", projectId: "p1", date: "2026-10-12", minutes: 120, note: "", billable: true, invoiceId: "i9" },
    ];
    const u = unbilled(d);
    expect(u[0].minutes).toBe(180);
    expect(u[0].amount).toBe(150);
    expect(kpis(d, NOW).unbilled).toBe(150);
  });
  it("marks a near deadline with little progress as at-risk", () => {
    const d = base();
    d.tasks = [
      { id: "t1", projectId: "p1", title: "A", done: true, priority: "med" },
      { id: "t2", projectId: "p1", title: "B", done: false, priority: "med", due: "2026-10-12" },
      { id: "t3", projectId: "p1", title: "C", done: false, priority: "med" },
    ];
    const h = projectHealth(d, d.projects[0], NOW);
    expect(h.daysLeft).toBe(4);
    expect(h.risk).toBe("risk");
    expect(h.overdueTasks).toHaveLength(1);
    const ids = generateInsights(d, NOW).map((i) => i.id);
    expect(ids.some((x) => x.startsWith("risk-p1"))).toBe(true);
    expect(ids.some((x) => x.startsWith("tasks-p1"))).toBe(true);
  });
  it("suggests following up with cold leads", () => {
    const d = base();
    d.clients.push({ id: "c2", name: "Sara Lee", color: "#000", status: "lead", rate: 40, lastContact: "2026-10-01", createdAt: "2026-09-25" });
    const f = generateInsights(d, NOW).find((i) => i.id.startsWith("follow-c2"));
    expect(f?.tone).toBe("warn");
    expect(f?.actions.map((a) => a.action.kind)).toEqual(["copy", "logContact"]);
  });
  it("demo data produces a rich set of insights", () => {
    const d = demoData(NOW);
    const ins = generateInsights(d, NOW);
    expect(ins.length).toBeGreaterThanOrEqual(5);
    expect(ins.some((i) => i.id.startsWith("unbilled-p-dash"))).toBe(true);
  });
});
