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
        "grid h-10 w-10 place-items-center rounded-full border border-budget-border bg-[var(--budget-cream-2)] text-budget-text transition hover:bg-[var(--budget-cream-3)] hover:text-budget-primary",
        className,
      )}
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
