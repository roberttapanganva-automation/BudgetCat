import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { formatDistanceToNow } from "date-fns";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { Badge } from "../ui/Badge";
import { db } from "../../lib/localDb";
import { hasSupabaseConfig } from "../../lib/supabase";

export function SyncStatusIndicator({ showProgress = false }: { showProgress?: boolean }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const syncStatus = useSyncStatus();
  const pendingCount =
    useLiveQuery(
      () => db.sync_queue.where("sync_status").anyOf(["pending", "failed"]).count(),
      [],
      0,
    ) ?? 0;

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  let label = "Online, all synced";
  let tone: "neutral" | "success" | "warning" | "urgent" | "cat" = "success";

  if (!isOnline || !hasSupabaseConfig) {
    label = "Offline mode";
    tone = "warning";
  } else if (syncStatus.isSyncing) {
    label =
      syncStatus.totalPending > 0
        ? `Syncing ${syncStatus.syncedCount + syncStatus.failedCount} of ${syncStatus.totalPending}`
        : "Checking sync queue";
    tone = "cat";
  } else if (syncStatus.syncError) {
    label =
      syncStatus.failedCount > 0
        ? `${syncStatus.failedCount} failed, tap retry`
        : "Sync failed, tap retry";
    tone = "urgent";
  } else if (pendingCount > 0) {
    label = `${pendingCount} pending change${pendingCount === 1 ? "" : "s"}`;
    tone = "cat";
  } else if (syncStatus.lastSyncedAt) {
    const syncedAt = new Date(syncStatus.lastSyncedAt);
    label =
      Date.now() - syncedAt.getTime() < 6000
        ? "All synced"
        : `Last synced ${formatDistanceToNow(syncedAt, { addSuffix: true })}`;
    tone = "success";
  }

  if (!showProgress) {
    return <Badge tone={tone}>{label}</Badge>;
  }

  return (
    <div className="min-w-0">
      <Badge tone={tone}>{label}</Badge>
      {syncStatus.isSyncing && (
        <div className="mt-2 min-w-36">
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-wide text-budget-text/45">
            <span className="truncate">{syncStatus.currentTable ?? "Sync"}</span>
            {syncStatus.totalPending > 0 && <span>{syncStatus.percentComplete}%</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-budget-background ring-1 ring-budget-border">
          <div
            className={
              syncStatus.totalPending > 0
                ? "h-full rounded-full bg-budget-primary transition-all duration-500 ease-out"
                : "budget-indeterminate-bar h-full rounded-full bg-budget-primary"
            }
            style={{
              width: syncStatus.totalPending > 0 ? `${syncStatus.percentComplete}%` : "45%",
            }}
          />
          </div>
        </div>
      )}
    </div>
  );
}
