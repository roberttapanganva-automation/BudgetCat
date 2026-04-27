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

export const defaultQuickAddPresets: QuickAddPreset[] = [];

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
