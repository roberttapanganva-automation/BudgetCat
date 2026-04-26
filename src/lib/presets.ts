import type { TransactionType } from "../types/finance";

export type QuickAddPreset = {
  id: string;
  label: string;
  type: TransactionType;
  amount: number;
  category: string;
  payment_method: string;
  note: string;
};

const presetsKey = "budgetcat-quick-add-presets";

export const defaultQuickAddPresets: QuickAddPreset[] = [
  {
    id: "monthly-salary",
    label: "Monthly Salary",
    type: "salary",
    amount: 40000,
    category: "Salary",
    payment_method: "Bank transfer",
    note: "Monthly salary",
  },
  {
    id: "regular-savings",
    label: "Regular Savings",
    type: "savings",
    amount: 8000,
    category: "Savings",
    payment_method: "Transfer",
    note: "Regular savings",
  },
  {
    id: "internet-bill",
    label: "Internet Bill",
    type: "expense",
    amount: 1699,
    category: "Internet",
    payment_method: "Bank transfer",
    note: "Internet bill",
  },
  {
    id: "food-drinks",
    label: "Food / Drinks",
    type: "expense",
    amount: 250,
    category: "Food / Drinks",
    payment_method: "Cash",
    note: "",
  },
  {
    id: "transport",
    label: "Transport",
    type: "expense",
    amount: 100,
    category: "Transport",
    payment_method: "Cash",
    note: "",
  },
  {
    id: "emergency-fund",
    label: "Emergency Fund Contribution",
    type: "goal_contribution",
    amount: 1000,
    category: "Emergency Fund",
    payment_method: "Transfer",
    note: "Emergency fund contribution",
  },
];

export function getQuickAddPresets() {
  const raw = localStorage.getItem(presetsKey);
  if (!raw) return defaultQuickAddPresets;

  try {
    const presets = JSON.parse(raw) as QuickAddPreset[];
    return presets.length > 0 ? presets : defaultQuickAddPresets;
  } catch {
    return defaultQuickAddPresets;
  }
}

export function saveQuickAddPresets(presets: QuickAddPreset[]) {
  localStorage.setItem(presetsKey, JSON.stringify(presets));
}
