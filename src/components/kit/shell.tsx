"use client";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Command as CmdIcon, Moon, Search, Settings, Sparkles, Sun, Download, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP } from "@/app-config";
import { useUI } from "@/lib/ui-store";
import { cn } from "@/lib/utils";
import { AssistantPanel, useAssistant, useVisibleInsights, type Insight } from "@/components/kit/assistant";
import { CommandPalette, type Command } from "@/components/kit/command-palette";
import { SettingsDialog, exportBackup, type DataHooks } from "@/components/kit/settings";
import { Toaster } from "@/components/kit/toaster";
import { ThemeSync } from "@/components/kit/theme";
import { toast } from "@/lib/toast-store";

export type NavItem = { id: string; label: string; icon: LucideIcon };

export function AppShell({ nav, view, onView, logo: Logo, insights, scanSteps, commands = [], hooks, settingsExtra, children, assistantName }: {
  nav: NavItem[]; view: string; onView: (id: string) => void; logo: LucideIcon; insights: Insight[]; scanSteps: string[];
  commands?: Command[]; hooks: DataHooks; settingsExtra?: React.ReactNode; children: React.ReactNode; assistantName?: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const { open: assistantOpen, setOpen: setAssistantOpen } = useAssistant();
  const visible = useVisibleInsights(insights);
  const urgent = visible.filter((i) => i.tone === "alert" || i.tone === "warn").length;
  const theme = useUI((s) => s.theme);
  const setTheme = useUI((s) => s.setTheme);
  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPaletteOpen((o) => !o); }
      if ((e.metaKey || e.ctrlKey) && e.key === ".") { e.preventDefault(); setAssistantOpen(!useAssistant.getState().open); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [setAssistantOpen]);

  useEffect(() => {
    if (sessionStorage.getItem(`${APP.storageKey}-nudged`) || urgent === 0) return;
    const t = setTimeout(() => { setNudge(true); sessionStorage.setItem(`${APP.storageKey}-nudged`, "1"); }, 1600);
    const t2 = setTimeout(() => setNudge(false), 9000);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [urgent]);

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");
  const allCommands = useMemo<Command[]>(() => [
    ...commands,
    ...nav.map((n) => ({ id: `nav-${n.id}`, label: `Go to ${n.label}`, group: "Navigate", icon: n.icon, run: () => onView(n.id) })),
    { id: "assistant", label: "Open assistant", group: "General", icon: Sparkles, run: () => setAssistantOpen(true) },
    { id: "theme", label: "Toggle dark / light", group: "General", icon: Moon, run: toggleTheme },
    { id: "settings", label: "Settings & accent color", group: "General", icon: Settings, run: () => setSettingsOpen(true) },
    { id: "export", label: "Export JSON backup", group: "General", icon: Download, run: () => exportBackup(hooks) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [commands, nav, hooks, theme, isDark]);

  const current = nav.find((n) => n.id === view);

  return (
    <div className="relative min-h-dvh">
      <ThemeSync />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[520px] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-40 top-1/3 size-[420px] rounded-full bg-[oklch(0.7_0.12_calc(var(--accent-h)+70))]/10 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,var(--color-border)_1px,transparent_0)] [background-size:28px_28px] opacity-40 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]" />
      </div>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-3 focus:py-2">Skip to content</a>

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-background/70 p-4 backdrop-blur-xl lg:flex">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30"><Logo className="size-5" /></div>
          <div>
            <p className="font-display text-lg font-bold leading-none tracking-tight">{APP.name}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{APP.tagline}</p>
          </div>
        </div>
        <button onClick={() => setPaletteOpen(true)} className="mt-5 flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2 text-sm text-muted-foreground hover:text-foreground">
          <Search className="size-4" /> Quick actions <kbd className="ml-auto rounded border px-1 text-[10px]">⌘K</kbd>
        </button>
        <nav className="mt-5 flex flex-col gap-1" aria-label="Main">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = n.id === view;
            return (
              <button key={n.id} onClick={() => onView(n.id)} aria-current={active ? "page" : undefined}
                className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                {active && <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-xl bg-primary-soft" transition={{ type: "spring", damping: 30, stiffness: 380 }} />}
                <Icon className="relative size-4" /> <span className="relative">{n.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          <button onClick={() => setAssistantOpen(true)} className="group relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-primary-soft to-card p-4 text-left">
            <div className="flex items-center gap-2 text-sm font-semibold text-primary"><Sparkles className="size-4" /> {assistantName ?? "Assistant"}</div>
            <p className="mt-1 text-xs text-muted-foreground">{visible.length ? `${visible.length} insight${visible.length > 1 ? "s" : ""} ready${urgent ? ` · ${urgent} need attention` : ""}` : "All clear right now"}</p>
            <span className="mt-2 inline-block text-[10px] text-muted-foreground">Ctrl + . to toggle</span>
          </button>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">{isDark ? <Sun /> : <Moon />}</Button>
            <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings /></Button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"><Logo className="size-4" /></div>
        <p className="font-display text-base font-bold">{APP.name}</p>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setPaletteOpen(true)} aria-label="Quick actions"><CmdIcon /></Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">{isDark ? <Sun /> : <Moon />}</Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><Settings /></Button>
        </div>
      </header>

      <main id="main" className="px-4 pb-28 pt-5 sm:px-6 lg:ml-64 lg:px-10 lg:pb-12 lg:pt-8">
        {hooks.isDemo && (
          <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/50 px-4 py-2.5 text-sm">
            <Sparkles className="size-4 text-primary" />
            <span className="flex-1">You&apos;re exploring <b>demo data</b>. Look around, then start fresh whenever you&apos;re ready.</span>
            <Button size="sm" variant="outline" onClick={() => { hooks.clearDemo(); toast("Demo data cleared", "Fresh start — add your own entries."); }}>Clear demo data</Button>
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}>
            {!current || current.id === nav[0].id ? null : (
              <h1 className="mb-6 font-display text-3xl font-bold tracking-tight">{current.label}</h1>
            )}
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom nav (mobile) */}
      <nav aria-label="Main mobile" className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/90 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
        {nav.slice(0, 5).map((n) => {
          const Icon = n.icon;
          return (
            <button key={n.id} onClick={() => onView(n.id)} aria-current={n.id === view ? "page" : undefined}
              className={cn("flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium", n.id === view ? "text-primary" : "text-muted-foreground")}>
              <Icon className="size-5" />{n.label}
            </button>
          );
        })}
      </nav>

      {/* Floating assistant orb */}
      <div className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6">
        <AnimatePresence>
          {nudge && !assistantOpen && (
            <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="absolute bottom-16 right-0 w-64 rounded-2xl border bg-card p-3.5 text-sm shadow-xl">
              <button aria-label="Hide" onClick={() => setNudge(false)} className="absolute right-2 top-2 text-muted-foreground"><X className="size-3.5" /></button>
              <p className="font-medium">I spotted {urgent} thing{urgent > 1 ? "s" : ""} worth a look.</p>
              <button onClick={() => { setNudge(false); setAssistantOpen(true); }} className="mt-1 text-xs font-medium text-primary">Show me →</button>
            </motion.div>
          )}
        </AnimatePresence>
        <button onClick={() => setAssistantOpen(!assistantOpen)} aria-label={`Open assistant (${visible.length} insights)`}
          className="relative grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/40 transition hover:scale-105">
          {urgent > 0 && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40 [animation-duration:2.5s]" />}
          <Sparkles className="relative size-6" />
          {visible.length > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full border-2 border-background bg-danger px-1 text-[10px] font-bold text-white">{visible.length}</span>}
        </button>
      </div>

      <AssistantPanel insights={insights} scanSteps={scanSteps} name={assistantName} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} commands={allCommands} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} hooks={hooks} extra={settingsExtra} />
      <Toaster />
    </div>
  );
}
