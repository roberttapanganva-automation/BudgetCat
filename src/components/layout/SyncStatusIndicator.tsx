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
    label = `Syncing ${syncStatus.syncedCount + syncStatus.failedCount} of ${syncStatus.totalPending}`;
    tone = "cat";
  } else if (syncStatus.syncError) {
    label = "Sync failed, tap to retry";
    tone = "urgent";
  } else if (pendingCount > 0) {
    label = `${pendingCount} pending change${pendingCount === 1 ? "" : "s"}`;
    tone = "cat";
  } else if (syncStatus.lastSyncedAt) {
    label = `Last synced ${formatDistanceToNow(new Date(syncStatus.lastSyncedAt), { addSuffix: true })}`;
    tone = "success";
  }

  if (!showProgress) {
    return <Badge tone={tone}>{label}</Badge>;
  }

  return (
    <div className="min-w-0">
      <Badge tone={tone}>{label}</Badge>
      {syncStatus.isSyncing && (
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-budget-background ring-1 ring-budget-border">
          <div
            className="h-full rounded-full bg-budget-primary transition-all"
            style={{ width: `${syncStatus.percentComplete}%` }}
          />
        </div>
      )}
    </div>
  );
}
