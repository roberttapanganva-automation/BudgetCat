export type BudgetCatTheme = "light" | "dark";

const themeKey = "budgetcat-theme";

export function getStoredTheme() {
  return localStorage.getItem(themeKey) as BudgetCatTheme | null;
}

export function getPreferredTheme(): BudgetCatTheme {
  const storedTheme = getStoredTheme();
  if (storedTheme) return storedTheme;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: BudgetCatTheme) {
  document.documentElement.dataset.theme = theme;
}

export function storeTheme(theme: BudgetCatTheme) {
  localStorage.setItem(themeKey, theme);
  applyTheme(theme);
}
