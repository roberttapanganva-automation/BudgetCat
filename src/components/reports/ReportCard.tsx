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
    <Card className="min-w-0 p-4 sm:p-5">
      <h2 className="text-lg font-black text-[var(--bc-text)]">{title}</h2>
      <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">{subtitle}</p>
      <div className="mt-5 h-44 min-w-0 overflow-hidden sm:h-64">{children}</div>
    </Card>
  );
}
