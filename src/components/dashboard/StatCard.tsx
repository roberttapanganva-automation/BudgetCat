import { Card } from "../ui/Card";
import { cn, formatCurrency } from "../../lib/utils";
import type { MonthTrend } from "../../lib/monthComparison";

export function StatCard({
  title,
  value,
  helper,
  icon,
  trend,
}: {
  title: string;
  value: number;
  helper: string;
  icon: string;
  trend?: MonthTrend;
}) {
  const trendClass = {
    positive: "text-emerald-700 dark:text-emerald-400",
    negative: "text-red-700 dark:text-red-400",
    neutral: "text-budget-text/55",
  }[trend?.tone ?? "neutral"];

  return (
    <Card className="relative min-w-0 overflow-hidden p-4">
      <div className="absolute inset-x-0 top-0 h-1 bg-budget-primary/70" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-budget-text/55">{title}</p>
          <p className="mt-2 break-words font-display text-2xl font-black text-budget-text">
            {formatCurrency(value)}
          </p>
        </div>
        <div className="grid h-11 w-11 shrink-0 place-items-center">
          <span aria-hidden="true" className="text-2xl leading-none">
            {icon}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold text-budget-text/50">{helper}</p>
      {trend && (
        <p className={cn("mt-2 text-xs font-semibold", trendClass)}>
          {trend.label}
        </p>
      )}
    </Card>
  );
}
