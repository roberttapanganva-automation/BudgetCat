import type { BudgetCatSyncError } from "../types/finance";

export type SyncProgressState = {
  totalPending: number;
  syncedCount: number;
  failedCount: number;
  currentTable: string | null;
  percentComplete: number;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: BudgetCatSyncError | null;
};

const syncStatusEventName = "budgetcat-sync-status-change";

let syncStatus: SyncProgressState = {
  totalPending: 0,
  syncedCount: 0,
  failedCount: 0,
  currentTable: null,
  percentComplete: 0,
  lastSyncedAt: localStorage.getItem("budgetcat-last-synced-at"),
  isSyncing: false,
  syncError: null,
};

export function getSyncStatus() {
  return syncStatus;
}

export function setSyncStatus(update: Partial<SyncProgressState>) {
  syncStatus = {
    ...syncStatus,
    ...update,
  };

  if (update.lastSyncedAt) {
    localStorage.setItem("budgetcat-last-synced-at", update.lastSyncedAt);
  }

  window.dispatchEvent(new CustomEvent(syncStatusEventName));
}

export function subscribeToSyncStatus(callback: () => void) {
  window.addEventListener(syncStatusEventName, callback);
  return () => window.removeEventListener(syncStatusEventName, callback);
}
