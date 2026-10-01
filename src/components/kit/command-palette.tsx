"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, Search, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Command = { id: string; label: string; group: string; icon: LucideIcon; run: () => void; keywords?: string };

export function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return commands;
    return commands.filter((c) => (c.label + " " + c.group + " " + (c.keywords ?? "")).toLowerCase().includes(s));
  }, [q, commands]);

  useEffect(() => {
    if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 20); }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  const run = (c?: Command) => { if (!c) return; onClose(); setTimeout(c.run, 10); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(filtered.length - 1, a + 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    if (e.key === "Enter") { e.preventDefault(); run(filtered[active]); }
    if (e.key === "Escape") onClose();
  };
  if (typeof document === "undefined") return null;
  let lastGroup = "";
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div role="dialog" aria-label="Command palette" initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
            className="relative w-full max-w-xl overflow-hidden rounded-3xl border bg-card shadow-2xl" onKeyDown={onKey}>
            <div className="flex items-center gap-3 border-b px-4">
              <Search className="size-4 text-muted-foreground" />
              <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a command or search…" aria-label="Search commands"
                className="h-14 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              <kbd className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
              {filtered.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No matching commands</p>}
              {filtered.map((c, i) => {
                const header = c.group !== lastGroup ? c.group : null;
                lastGroup = c.group;
                const Icon = c.icon;
                return (
                  <div key={c.id}>
                    {header && <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{header}</p>}
                    <button role="option" aria-selected={i === active} onMouseEnter={() => setActive(i)} onClick={() => run(c)}
                      className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", i === active && "bg-primary-soft text-primary")}>
                      <Icon className="size-4" /> <span className="flex-1">{c.label}</span>
                      {i === active && <CornerDownLeft className="size-3.5 opacity-60" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
