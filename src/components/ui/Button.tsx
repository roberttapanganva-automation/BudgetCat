import { type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "urgent";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "border-transparent bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bc-green)_88%,white_12%),var(--bc-green-soft))] text-white shadow-[0_14px_30px_var(--bc-green-glow)] hover:brightness-105",
  secondary:
    "border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text-soft)] hover:border-[var(--bc-border-strong)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
  ghost:
    "border-transparent bg-transparent text-[var(--bc-text-muted)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
  urgent:
    "border-[var(--bc-red)]/30 bg-[var(--bc-red-glow)] text-[var(--bc-red)] hover:bg-[var(--bc-red)] hover:text-white",
};

export function Button({
  children,
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black leading-none transition duration-200 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}