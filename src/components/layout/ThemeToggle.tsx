import { Moon, Sun } from "lucide-react";

import { useTheme } from "../../hooks/useTheme";
import { cn } from "../../lib/utils";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)] shadow-sm transition hover:border-[var(--bc-border-strong)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-green)] active:scale-[0.98]",
        className,
      )}
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}