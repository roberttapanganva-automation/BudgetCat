import { type HTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <section
      className={cn(
        "rounded-[var(--bc-radius-md)] border border-[var(--bc-border)] bg-[var(--bc-card)] shadow-[var(--bc-shadow)] p-4 md:p-5",
        className,
      )}
      {...props}
    >
      {children}
    </section>
  );
}
