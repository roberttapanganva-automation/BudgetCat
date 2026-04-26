import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border border-budget-border bg-budget-card p-5 shadow-soft",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
