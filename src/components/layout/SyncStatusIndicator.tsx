import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "../ui/Badge";
import { db } from "../../lib/localDb";
import { hasSupabaseConfig } from "../../lib/supabase";

export function SyncStatusIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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

  if (!isOnline || !hasSupabaseConfig) {
    return <Badge tone="warning">Offline mode</Badge>;
  }

  if (pendingCount > 0) {
    return <Badge tone="cat">Pending sync</Badge>;
  }

  return <Badge tone="success">Online synced</Badge>;
}
