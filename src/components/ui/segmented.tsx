"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({ value, onChange, options, className, id }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; id: string;
}) {
  return (
    <div role="radiogroup" className={cn("inline-flex rounded-xl bg-muted p-1", className)}>
      {options.map((o) => (
        <button key={o.value} role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn("relative rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer", value === o.value ? "text-foreground" : "text-muted-foreground hover:text-foreground")}>
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-lg bg-card shadow-sm" transition={{ type: "spring", damping: 30, stiffness: 400 }} />}
          <span className="relative z-10 flex items-center gap-1.5">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
