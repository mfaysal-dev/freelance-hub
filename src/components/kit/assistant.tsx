"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { create } from "zustand";
import { AlertTriangle, Check, Lightbulb, PartyPopper, RefreshCw, Siren, Sparkles, X, ChevronRight, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUI } from "@/lib/ui-store";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

export type InsightTone = "alert" | "warn" | "tip" | "win";
export type InsightAction = { label: string; run: () => void; resolves?: boolean; done?: string };
export type Insight = { id: string; tone: InsightTone; title: string; body: string; metric?: string; actions?: InsightAction[] };

export const useAssistant = create<{ open: boolean; setOpen: (o: boolean) => void }>((set) => ({ open: false, setOpen: (open) => set({ open }) }));

const TONES: Record<InsightTone, { icon: typeof Siren; label: string; short: string; cls: string; dot: string }> = {
  alert: { icon: Siren, label: "Needs attention", short: "Urgent", cls: "bg-danger/12 text-danger", dot: "bg-danger" },
  warn: { icon: AlertTriangle, label: "Heads up", short: "Heads-up", cls: "bg-warning/20 text-[color-mix(in_oklch,var(--color-warning)_65%,black)] dark:text-warning", dot: "bg-warning" },
  tip: { icon: Lightbulb, label: "Suggestion", short: "Ideas", cls: "bg-info/12 text-info", dot: "bg-info" },
  win: { icon: PartyPopper, label: "Win", short: "Wins", cls: "bg-success/15 text-success", dot: "bg-success" },
};
const ORDER: InsightTone[] = ["alert", "warn", "tip", "win"];

export function useVisibleInsights(insights: Insight[]) {
  const dismissed = useUI((s) => s.dismissed);
  return useMemo(
    () => insights.filter((i) => !dismissed.includes(i.id)).sort((a, b) => ORDER.indexOf(a.tone) - ORDER.indexOf(b.tone)),
    [insights, dismissed],
  );
}

export function InsightCard({ insight, compact, index = 0 }: { insight: Insight; compact?: boolean; index?: number }) {
  const dismiss = useUI((s) => s.dismiss);
  const t = TONES[insight.tone];
  const Icon = t.icon;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: index * 0.06 } }} exit={{ opacity: 0, x: 30, transition: { duration: 0.2 } }}
      className={cn("group relative rounded-2xl border bg-card p-4", compact && "p-3")}>
      <div className="flex items-start gap-3">
        <div className={cn("grid size-8 shrink-0 place-items-center rounded-xl", t.cls)}><Icon className="size-4" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.label}</span>
            {insight.metric && <span className="ml-auto rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px]">{insight.metric}</span>}
          </div>
          <p className={cn("mt-0.5 font-medium leading-snug", compact ? "text-sm" : "text-[15px]")}>{insight.title}</p>
          {!compact && <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{insight.body}</p>}
          {insight.actions && insight.actions.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {insight.actions.map((a, i) => (
                <Button key={a.label} size="sm" variant={i === 0 ? "soft" : "outline"}
                  onClick={() => { a.run(); if (a.done) toast(a.done); if (a.resolves) dismiss(insight.id); }}>
                  {i === 0 && <Sparkles />}{a.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      <button aria-label="Dismiss insight" onClick={() => dismiss(insight.id)}
        className="absolute right-2 top-2 rounded-lg p-1 text-muted-foreground opacity-0 transition group-hover:opacity-100 focus-visible:opacity-100 hover:bg-muted">
        <X className="size-3.5" />
      </button>
    </motion.div>
  );
}

export function AssistantPanel({ insights, scanSteps, name = "Assistant" }: { insights: Insight[]; scanSteps: string[]; name?: string }) {
  const { open, setOpen } = useAssistant();
  const visible = useVisibleInsights(insights);
  const dismissedCount = useUI((s) => s.dismissed.length);
  const restore = useUI((s) => s.restoreDismissed);
  const [step, setStep] = useState(-1);
  const [scanId, setScanId] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= scanSteps.length) clearInterval(iv);
    }, 380);
    return () => clearInterval(iv);
  }, [open, scanId, scanSteps.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  const scanning = step >= 0 && step < scanSteps.length;
  const counts = ORDER.map((t) => ({ t, n: visible.filter((v) => v.tone === t).length }));

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <motion.aside role="dialog" aria-label={`${name} panel`} initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-[75] flex w-full max-w-md flex-col border-l bg-background/95 shadow-2xl backdrop-blur-xl">
            <div className="relative overflow-hidden border-b p-5">
              <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-primary/20 blur-3xl" />
              <div className="relative flex items-center gap-3">
                <div className="relative grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground">
                  <Sparkles className="size-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-success" />
                </div>
                <div className="flex-1">
                  <p className="font-display text-lg font-semibold leading-none">{name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">On-device · rule-based · no data leaves your browser</p>
                </div>
                <Button size="icon" variant="ghost" aria-label="Re-scan" onClick={() => setScanId((x) => x + 1)}><RefreshCw className={cn(scanning && "animate-spin")} /></Button>
                <Button size="icon" variant="ghost" aria-label="Close assistant" onClick={() => setOpen(false)}><X /></Button>
              </div>
              <div className="relative mt-4 flex gap-2">
                {counts.map(({ t, n }) => (
                  <div key={t} className="flex flex-1 items-center gap-1.5 rounded-xl bg-muted/70 px-2.5 py-1.5 text-xs">
                    <span className={cn("size-1.5 rounded-full", TONES[t].dot)} />
                    <span className="font-semibold">{n}</span>
                    <span className="truncate text-muted-foreground">{TONES[t].short}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {scanning ? (
                <div className="space-y-2.5 py-2" aria-live="polite">
                  {scanSteps.map((s, i) => (
                    <motion.div key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= step ? 1 : 0.35, x: 0 }} className="flex items-center gap-2.5 text-sm">
                      {i < step ? <Check className="size-4 text-success" /> : i === step ? <Loader2 className="size-4 animate-spin text-primary" /> : <span className="size-4 rounded-full border" />}
                      <span className={i <= step ? "" : "text-muted-foreground"}>{s}</span>
                    </motion.div>
                  ))}
                </div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-success/15 text-success"><Check /></div>
                  <p className="font-medium">All clear</p>
                  <p className="text-sm text-muted-foreground">Nothing needs your attention right now.</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {visible.map((i, idx) => <InsightCard key={i.id} insight={i} index={idx} />)}
                </AnimatePresence>
              )}
              {!scanning && dismissedCount > 0 && (
                <button onClick={restore} className="mx-auto flex items-center gap-1.5 pt-2 text-xs text-muted-foreground hover:text-foreground">
                  <RotateCcw className="size-3" /> Restore {dismissedCount} dismissed
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export function AssistantBrief({ insights, limit = 3 }: { insights: Insight[]; limit?: number }) {
  const visible = useVisibleInsights(insights);
  const setOpen = useAssistant((s) => s.setOpen);
  return (
    <div className="space-y-2.5">
      <AnimatePresence mode="popLayout">
        {visible.slice(0, limit).map((i, idx) => <InsightCard key={i.id} insight={i} compact index={idx} />)}
      </AnimatePresence>
      {visible.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">All clear — nothing needs attention.</p>}
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium text-primary hover:bg-primary-soft">
        {visible.length > limit ? `See all ${visible.length} insights` : "Open assistant"} <ChevronRight className="size-3.5" />
      </button>
    </div>
  );
}
