import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      className="flex w-full items-center justify-between rounded-lg bg-[var(--budget-cream-2)] px-3 py-2 text-xs font-bold text-budget-text/70 transition hover:bg-[var(--budget-cream-3)]"
      onClick={toggleTheme}
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        {isDark ? <Moon size={15} /> : <Sun size={15} />}
        {isDark ? "Light mode" : "Dark mode"}
      </span>
      <span className="relative h-5 w-9 rounded-full bg-[var(--budget-cream-3)]">
        <span
          className="absolute top-1 h-3 w-3 rounded-full bg-white shadow-sm transition-all"
          style={{ left: isDark ? "20px" : "4px" }}
        />
      </span>
    </button>
  );
}
