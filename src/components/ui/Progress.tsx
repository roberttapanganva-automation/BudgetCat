import { cn } from "../../lib/utils";

export function Progress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "h-3 overflow-hidden rounded-full bg-[var(--bc-bg-deep)] border border-[var(--bc-border)]",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-[var(--bc-green)] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
