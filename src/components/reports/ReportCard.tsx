import { type ReactNode } from "react";
import { Card } from "../ui/Card";

export function ReportCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-black text-budget-text">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-budget-text/55">{subtitle}</p>
      <div className="mt-5 h-64">{children}</div>
    </Card>
  );
}
