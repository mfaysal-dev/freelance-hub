"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useCrm } from "@/lib/crm/store";
import { invoiceState, invoiceSubtotal, invoiceTotal } from "@/lib/crm/logic";
import { money } from "@/lib/crm/money";
import type { Invoice } from "@/lib/crm/types";
import { formatDate } from "@/lib/utils";
import { useCrmUI } from "./ui-state";

export function InvoiceDoc({ inv }: { inv: Invoice }) {
  const { business, clients } = useCrm();
  const c = clients.find((x) => x.id === inv.clientId);
  const cur = business.currency;
  const st = invoiceState(inv);
  const fmt = (n: number) => money(n, cur, { cents: true });
  return (
    <div className="mx-auto max-w-[800px] bg-white p-10 text-[13px] leading-relaxed text-zinc-800" style={{ fontFamily: "var(--font-body), system-ui, sans-serif" }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2"><div className="size-8 rounded-lg bg-zinc-900" /><p className="text-xl font-bold text-zinc-900" style={{ fontFamily: "var(--font-display-face)" }}>{business.name}</p></div>
          <p className="mt-2 whitespace-pre-line text-zinc-500">{business.address}</p>
          <p className="text-zinc-500">{business.email}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tracking-tight text-zinc-900" style={{ fontFamily: "var(--font-display-face)" }}>Invoice</p>
          <p className="mt-1 font-mono text-zinc-500">{inv.number}</p>
          <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${st === "paid" ? "bg-emerald-100 text-emerald-700" : st === "overdue" ? "bg-red-100 text-red-700" : st === "draft" ? "bg-zinc-100 text-zinc-600" : "bg-amber-100 text-amber-700"}`}>{st}</span>
        </div>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-6 border-y border-zinc-200 py-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Billed to</p><p className="mt-1 font-semibold text-zinc-900">{c?.company ?? c?.name}</p>{c?.company && <p>{c.name}</p>}<p className="text-zinc-500">{c?.email}</p></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Issued</p><p className="mt-1">{formatDate(inv.issueDate, { month: "long", day: "numeric", year: "numeric" })}</p></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Due</p><p className="mt-1">{formatDate(inv.dueDate, { month: "long", day: "numeric", year: "numeric" })}</p></div>
      </div>
      <table className="mt-6 w-full">
        <thead><tr className="border-b border-zinc-200 text-left text-[10px] uppercase tracking-wider text-zinc-400"><th className="py-2 font-semibold">Description</th><th className="py-2 text-right font-semibold">Qty</th><th className="py-2 text-right font-semibold">Rate</th><th className="py-2 text-right font-semibold">Amount</th></tr></thead>
        <tbody>{inv.items.map((i) => <tr key={i.id} className="border-b border-zinc-100"><td className="py-3 pr-4">{i.description}</td><td className="py-3 text-right tabular-nums">{i.qty}</td><td className="py-3 text-right tabular-nums">{fmt(i.rate)}</td><td className="py-3 text-right font-medium tabular-nums">{fmt(i.qty * i.rate)}</td></tr>)}</tbody>
      </table>
      <div className="ml-auto mt-6 w-64 space-y-1.5">
        <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span className="tabular-nums">{fmt(invoiceSubtotal(inv))}</span></div>
        {inv.taxPct > 0 && <div className="flex justify-between text-zinc-500"><span>Tax ({inv.taxPct}%)</span><span className="tabular-nums">{fmt(invoiceSubtotal(inv) * inv.taxPct / 100)}</span></div>}
        <div className="flex justify-between border-t border-zinc-200 pt-2 text-lg font-bold text-zinc-900"><span>Total</span><span className="tabular-nums">{fmt(invoiceTotal(inv))}</span></div>
      </div>
      {inv.notes && <div className="mt-10"><p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Notes</p><p className="mt-1 whitespace-pre-line text-zinc-600">{inv.notes}</p></div>}
      <p className="mt-12 text-center text-[11px] text-zinc-400">Thank you for your business!</p>
    </div>
  );
}

export function PrintRoot() {
  const { printId, clearPrint } = useCrmUI();
  const inv = useCrm((s) => s.invoices.find((i) => i.id === printId));
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const done = () => clearPrint();
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, [clearPrint]);
  if (!mounted || !inv) return null;
  return createPortal(<div id="print-root"><InvoiceDoc inv={inv} /></div>, document.body);
}
