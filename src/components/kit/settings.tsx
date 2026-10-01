"use client";
import { useRef } from "react";
import { Download, Upload, Trash2, Sparkles, Monitor, Moon, Sun, Check, RotateCcw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useUI, type ThemeMode } from "@/lib/ui-store";
import { ACCENTS } from "@/components/kit/theme";
import { APP } from "@/app-config";
import { downloadJSON, readFileAsJSON, todayISO, cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";

export type DataHooks = {
  exportData: () => unknown;
  importData: (data: unknown) => void;
  clearDemo: () => void;
  loadDemo: () => void;
  isDemo: boolean;
};

export function exportBackup(hooks: DataHooks) {
  const { theme, accent, layout, dismissed } = useUI.getState();
  downloadJSON(`${APP.storageKey}-backup-${todayISO()}.json`, {
    app: APP.storageKey, version: 1, exportedAt: new Date().toISOString(),
    data: hooks.exportData(), ui: { theme, accent, layout, dismissed },
  });
  toast("Backup downloaded", "Keep it somewhere safe.");
}

export function SettingsDialog({ open, onClose, hooks, extra }: { open: boolean; onClose: () => void; hooks: DataHooks; extra?: React.ReactNode }) {
  const { theme, setTheme, accent, setAccent, replaceUI, resetLayout } = useUI();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (f?: File) => {
    if (!f) return;
    try {
      const json = (await readFileAsJSON(f)) as { app?: string; data?: unknown; ui?: Record<string, unknown> };
      if (!json || json.app !== APP.storageKey || !json.data) throw new Error(`Not a ${APP.name} backup file`);
      hooks.importData(json.data);
      if (json.ui) replaceUI(json.ui as Parameters<typeof replaceUI>[0]);
      toast("Backup restored", "All your data was imported.");
      onClose();
    } catch (e) {
      toast("Import failed", e instanceof Error ? e.message : "Invalid file", "danger");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Settings" description="Make it yours. Everything is stored locally in this browser." className="max-w-xl">
      <div className="space-y-6 pb-4">
        <section>
          <h3 className="mb-2 text-sm font-semibold">Appearance</h3>
          <Segmented id="theme" value={theme} onChange={(v) => setTheme(v as ThemeMode)} options={[
            { value: "light", label: <><Sun className="size-3.5" />Light</> },
            { value: "dark", label: <><Moon className="size-3.5" />Dark</> },
            { value: "system", label: <><Monitor className="size-3.5" />System</> },
          ]} />
          <p className="mb-2 mt-4 text-xs font-medium text-muted-foreground">Accent color</p>
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button key={a.name} onClick={() => setAccent(a.hue)} aria-label={`${a.name} accent`} title={a.name}
                className={cn("grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-card transition hover:scale-110", accent === a.hue && "ring-2 ring-foreground/60")}
                style={{ background: `oklch(0.65 0.16 ${a.hue})` }}>
                {accent === a.hue && <Check className="size-4 text-white" />}
              </button>
            ))}
          </div>
          <label className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            Custom hue
            <input type="range" min={0} max={360} value={accent} onChange={(e) => setAccent(Number(e.target.value))} className="flex-1 accent-[var(--color-primary)]" aria-label="Custom accent hue" />
            <span className="w-8 font-mono">{accent}°</span>
          </label>
        </section>
        {extra && <section>{extra}</section>}
        <section>
          <h3 className="mb-2 text-sm font-semibold">Backup</h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => exportBackup(hooks)}><Download /> Export JSON</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload /> Import JSON</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </section>
        <section>
          <h3 className="mb-2 text-sm font-semibold">Data</h3>
          <div className="flex flex-wrap gap-2">
            {hooks.isDemo && <Button variant="destructive" onClick={() => { hooks.clearDemo(); toast("Demo data cleared", "Fresh start — add your own entries."); onClose(); }}><Trash2 /> Clear demo data</Button>}
            <Button variant="outline" onClick={() => { if (confirm("Replace current data with demo data?")) { hooks.loadDemo(); toast("Demo data loaded"); onClose(); } }}><Sparkles /> Load demo data</Button>
            <Button variant="ghost" onClick={() => { resetLayout(); toast("Dashboard layout reset"); }}><RotateCcw /> Reset layout</Button>
            {!hooks.isDemo && <Button variant="ghost" className="text-danger" onClick={() => { if (confirm("Erase ALL data? This cannot be undone (export a backup first).")) { hooks.clearDemo(); toast("All data erased"); onClose(); } }}><Trash2 /> Erase all</Button>}
          </div>
        </section>
      </div>
    </Dialog>
  );
}
