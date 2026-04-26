import { useSyncExternalStore } from "react";
import { getSyncStatus, subscribeToSyncStatus } from "../lib/syncStatusStore";

export function useSyncStatus() {
  return useSyncExternalStore(subscribeToSyncStatus, getSyncStatus, getSyncStatus);
}
