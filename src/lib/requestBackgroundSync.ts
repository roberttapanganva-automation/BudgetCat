import type { User } from "@supabase/supabase-js";
import type { BudgetCatUser } from "../types/finance";
import { hasSupabaseConfig } from "./supabase";
import { syncPendingRecords } from "./syncEngine";

let syncTimer: number | undefined;

export function requestBackgroundSync(
  user: BudgetCatUser | User | null | undefined,
  reason: string,
) {
  if (!user || !hasSupabaseConfig) return;

  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (syncTimer) window.clearTimeout(syncTimer);

  syncTimer = window.setTimeout(() => {
    syncPendingRecords(user).catch((error) => {
      console.warn("[BudgetCat Background Sync Skipped]", reason, error);
    });
  }, 800);
}
