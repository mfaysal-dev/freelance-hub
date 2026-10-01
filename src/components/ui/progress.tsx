import { cn } from "@/lib/utils";

export function Progress({ value, className, barClassName, color, label }: { value: number; className?: string; barClassName?: string; color?: string; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full bg-primary transition-[width] duration-700 ease-out", barClassName)} style={{ width: `${v}%`, background: color }} />
    </div>
  );
}

export function Ring({ value, size = 64, stroke = 7, color, children }: { value: number; size?: number; stroke?: number; color?: string; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-muted" />
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" fill="none"
          stroke={color ?? "var(--color-primary)"} strokeDasharray={c} strokeDashoffset={c - (v / 100) * c}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold">{children}</div>
    </div>
  );
}
