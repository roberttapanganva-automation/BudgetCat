import type { BudgetCatSyncError } from "../types/finance";

const latestSyncErrorKey = "budgetcat-latest-sync-error";
export const syncErrorEventName = "budgetcat-sync-error-change";

export function getLatestSyncError() {
  const raw = localStorage.getItem(latestSyncErrorKey);
  return raw ? (JSON.parse(raw) as BudgetCatSyncError) : null;
}

export function setLatestSyncError(error: BudgetCatSyncError | null) {
  if (error) {
    localStorage.setItem(latestSyncErrorKey, JSON.stringify(error));
  } else {
    localStorage.removeItem(latestSyncErrorKey);
  }

  window.dispatchEvent(new CustomEvent(syncErrorEventName, { detail: error }));
}
