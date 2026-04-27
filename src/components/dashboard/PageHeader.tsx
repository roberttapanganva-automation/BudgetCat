import { type ReactNode } from "react";

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-primary">
          BudgetCat
        </p>
        <h1 className="mt-1 text-2xl font-black text-budget-text md:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-budget-text/65">
          {subtitle}
        </p>
      </div>
      {action}
    </header>
  );
}
