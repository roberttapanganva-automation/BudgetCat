import { type ReactNode } from "react";
import { cn } from "../../lib/utils";

type BadgeTone = "neutral" | "success" | "warning" | "urgent" | "cat";

const tones: Record<BadgeTone, string> = {
  neutral: "bg-budget-background text-budget-text",
  success: "bg-budget-success/12 text-budget-success",
  warning: "bg-budget-warning/20 text-budget-text",
  urgent: "bg-budget-urgent/12 text-budget-urgent",
  cat: "bg-budget-cat/18 text-budget-text",
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
