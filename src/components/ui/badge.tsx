import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", {
  variants: {
    tone: {
      default: "bg-muted text-muted-foreground",
      primary: "bg-primary-soft text-primary",
      success: "bg-success/15 text-success",
      warning: "bg-warning/20 text-[color-mix(in_oklch,var(--color-warning)_70%,black)] dark:text-warning",
      danger: "bg-danger/15 text-danger",
      info: "bg-info/15 text-info",
    },
  },
  defaultVariants: { tone: "default" },
});

export function Badge({ className, tone, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
