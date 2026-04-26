import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Card } from "../ui/Card";

export function PreviewPanel({
  title,
  to,
  children,
}: {
  title: string;
  to: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-budget-text">{title}</h2>
        <Link className="text-sm font-bold text-budget-primary" to={to}>
          View
        </Link>
      </div>
      {children}
    </Card>
  );
}
