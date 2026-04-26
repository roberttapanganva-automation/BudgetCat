import { type LucideIcon } from "lucide-react";
import { Card } from "../ui/Card";
import { cn, formatCurrency } from "../../lib/utils";

export function StatCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = "primary",
}: {
  title: string;
  value: number;
  helper: string;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "cat";
}) {
  const toneClass = {
    primary: "bg-budget-primary/14 text-budget-primary",
    success: "bg-budget-success/14 text-budget-success",
    warning: "bg-budget-warning/24 text-budget-text",
    cat: "bg-budget-cat/18 text-budget-text",
  }[tone];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-budget-text/55">{title}</p>
          <p className="mt-2 text-2xl font-black text-budget-text">
            {formatCurrency(value)}
          </p>
        </div>
        <div className={cn("grid h-11 w-11 place-items-center rounded-lg", toneClass)}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs font-semibold text-budget-text/50">{helper}</p>
    </Card>
  );
}
