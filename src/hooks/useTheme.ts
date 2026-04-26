import { useEffect, useState } from "react";
import { applyTheme, getPreferredTheme, storeTheme, type BudgetCatTheme } from "../lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState<BudgetCatTheme>(() => getPreferredTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    storeTheme(nextTheme);
  }

  return { theme, toggleTheme };
}
