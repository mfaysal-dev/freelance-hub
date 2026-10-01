"use client";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useToasts } from "@/lib/toast-store";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const remove = useToasts((s) => s.remove);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex w-[min(92vw,380px)] -translate-x-1/2 flex-col gap-2 md:bottom-6 md:left-auto md:right-24 md:translate-x-0">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = t.tone === "danger" ? XCircle : t.tone === "success" ? CheckCircle2 : Info;
          return (
            <motion.button key={t.id} layout onClick={() => remove(t.id)}
              initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex items-start gap-3 rounded-2xl border bg-card/95 p-3.5 text-left shadow-xl backdrop-blur">
              <Icon className={t.tone === "danger" ? "mt-0.5 size-4 text-danger" : t.tone === "success" ? "mt-0.5 size-4 text-success" : "mt-0.5 size-4 text-info"} />
              <div className="min-w-0">
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
              </div>
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
