import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "urgent" | "cat";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-[var(--bc-surface-soft)] text-[var(--bc-text)] border border-[var(--bc-border)]",
  success: "bg-[color-mix(in_srgb,var(--bc-green)_12%,transparent)] text-[var(--bc-green)]",
  warning: "bg-[color-mix(in_srgb,var(--bc-amber)_20%,transparent)] text-[var(--bc-amber)]",
  urgent: "bg-[color-mix(in_srgb,var(--bc-red)_12%,transparent)] text-[var(--bc-red)]",
  cat: "bg-[color-mix(in_srgb,var(--bc-blue)_18%,transparent)] text-[var(--bc-blue)]",
};

export function Badge({
  children,
  className,
  tone = "neutral",
}: {
  children: ReactNode;
  className?: string;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
