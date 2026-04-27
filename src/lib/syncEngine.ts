import type { User } from "@supabase/supabase-js";
import { getOrCreateHousehold } from "./household";
import { db, markRecordSyncStatus, nowIso } from "./localDb";
import { hasSupabaseConfig, supabase } from "./supabase";
import { setLatestSyncError } from "./syncErrorStore";
import { setSyncStatus } from "./syncStatusStore";
import type {
  BudgetCatSyncError,
  BudgetCatUser,
  LocalDueDate,
  LocalGoal,
  LocalGoalContribution,
  LocalTransaction,
  SyncQueueItem,
} from "../types/finance";

type SupabasePayload = Record<string, string | number | number[] | null>;

type SyncResult = {
  ok: boolean;
  synced: number;
  failed: number;
  skippedReason?: string;
  latestError?: BudgetCatSyncError | null;
};

type SupabaseErrorLike = {
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
};

function canSync() {
  return Boolean(hasSupabaseConfig && supabase && navigator.onLine);
}

const defaultBatchSize = 25;
const tableOrder: SyncQueueItem["table_name"][] = [
  "transactions",
  "due_dates",
  "goals",
  "goal_contributions",
];

let syncRunPromise: Promise<SyncResult> | null = null;

async function getAuthenticatedSyncUser() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.warn("[BudgetCat Sync Warning] Could not read Supabase session", error);
    return null;
  }

  return data.session?.user ?? null;
}

async function resolveSyncHousehold(
  sessionUser: User,
  fallbackHouseholdId?: string,
) {
  try {
    return await getOrCreateHousehold(sessionUser);
  } catch (error) {
    console.warn("[BudgetCat Sync Warning] Could not resolve household from session", error);
    return fallbackHouseholdId ?? "";
  }
}

async function repairPendingGoalOwnership(userId: string, householdId: string) {
  if (!userId || !householdId) return;

  const pendingGoals = await db.goals
    .where("sync_status")
    .anyOf(["pending", "failed"])
    .toArray();

  await Promise.all(
    pendingGoals.map(async (goal) => {
      const patch: Partial<LocalGoal> = {};

      if (goal.user_id !== userId) {
        patch.user_id = userId;
      }
      if (goal.household_id !== householdId) {
        patch.household_id = householdId;
      }

      if (Object.keys(patch).length > 0) {
        await db.goals.update(goal.id, {
          ...patch,
          sync_status: "pending",
          updated_at: nowIso(),
        });
        await markQueueSyncStatus("goals", goal.id, "pending");
      }
    }),
  );
}

function fallbackTransactionType(type: LocalTransaction["type"]) {
  return type === "income" || type === "salary" ? "income" : "expense";
}

function transactionPayloads(record: LocalTransaction): SupabasePayload[] {
  const amount = Number(record.amount || 0);

  return [
    {
      id: record.id,
      household_id: record.household_id,
      user_id: record.user_id,
      type: record.type,
      amount,
      category: record.category || "Uncategorized",
      date: record.date,
      payment_method: record.payment_method || "Cash",
      note: record.note || null,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at ?? null,
    },
    {
      id: record.id,
      household_id: record.household_id,
      user_id: record.user_id,
      title: record.category || record.type || "Transaction",
      type: fallbackTransactionType(record.type),
      amount,
      transaction_date: record.date,
      notes: record.note || null,
      created_at: record.created_at,
      updated_at: record.updated_at,
      deleted_at: record.deleted_at ?? null,
    },
  ];
}

function dueDatePayloads(record: LocalDueDate): SupabasePayload[] {
  const base = {
    id: record.id,
    household_id: record.household_id,
    user_id: record.user_id,
    title: record.title || "Untitled bill",
    amount: Number(record.amount || 0),
    due_date: record.due_date,
    repeat_type: record.repeat_type,
    status: record.status,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at ?? null,
  };

  return [
    {
      ...base,
      reminder_days: Number(record.reminder_days || 0),
      note: record.note || null,
    },
    {
      ...base,
      reminder_days: Number(record.reminder_days || 0),
      notes: record.note || null,
    },
    {
      ...base,
      reminder_days: [Number(record.reminder_days || 0)],
      note: record.note || null,
    },
    {
      ...base,
      reminder_days: [Number(record.reminder_days || 0)],
      notes: record.note || null,
    },
  ];
}

function goalPayloads(record: LocalGoal): SupabasePayload[] {
  const base = {
    id: record.id,
    household_id: record.household_id,
    user_id: record.user_id,
    title: record.title || "Untitled goal",
    target_amount: Number(record.target_amount || 0),
    current_amount: Number(record.current_amount || 0),
    target_date: record.target_date || null,
    priority: record.priority,
    status: record.status,
    note: record.note || null,
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at ?? null,
  };

  return [
    {
      ...base,
      type: record.type,
    },
    {
      ...base,
      goal_type: record.type,
    },
  ];
}

function goalContributionPayloads(record: LocalGoalContribution): SupabasePayload[] {
  const base = {
    id: record.id,
    household_id: record.household_id,
    user_id: record.user_id,
    goal_id: record.goal_id,
    amount: Number(record.amount || 0),
    created_at: record.created_at,
    updated_at: record.updated_at,
    deleted_at: record.deleted_at ?? null,
  };

  return [
    {
      ...base,
      date: record.date,
      note: record.note || null,
    },
    {
      ...base,
      contribution_date: record.date,
      notes: record.note || null,
    },
  ];
}

function getPayloads(
  tableName: SyncQueueItem["table_name"],
  record: LocalTransaction | LocalDueDate | LocalGoal | LocalGoalContribution,
) {
  if (tableName === "transactions") {
    return transactionPayloads(record as LocalTransaction);
  }
  if (tableName === "due_dates") {
    return dueDatePayloads(record as LocalDueDate);
  }
  if (tableName === "goals") {
    return goalPayloads(record as LocalGoal);
  }
  return goalContributionPayloads(record as LocalGoalContribution);
}

function logSyncError(
  tableName: SyncQueueItem["table_name"],
  recordId: string,
  action: string,
  error: SupabaseErrorLike,
  recordSentToSupabase: SupabasePayload,
) {
  const latestError: BudgetCatSyncError = {
    tableName,
    recordId,
    action,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    createdAt: new Date().toISOString(),
  };

  console.error("[BudgetCat Sync Error]", {
    tableName,
    recordId,
    action,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
    recordSentToSupabase,
  });

  setLatestSyncError(latestError);
  return latestError;
}

async function markQueueSyncStatus(
  tableName: SyncQueueItem["table_name"],
  recordId: string,
  syncStatus: SyncQueueItem["sync_status"],
) {
  await db.sync_queue
    .where("[table_name+record_id]")
    .equals([tableName, recordId])
    .modify({ sync_status: syncStatus, updated_at: new Date().toISOString() });
}

async function syncRecord(
  tableName: SyncQueueItem["table_name"],
  record:
    | LocalTransaction
    | LocalDueDate
    | LocalGoal
    | LocalGoalContribution
    | undefined,
) {
  if (!record || !supabase) {
    return { ok: false, latestError: null };
  }

  const payloads = getPayloads(tableName, record);
  let latestError: BudgetCatSyncError | null = null;

  for (const [index, payload] of payloads.entries()) {
    const { error } = await supabase.from(tableName).upsert(payload);

    if (!error) {
      await markRecordSyncStatus(tableName, record.id, "synced");
      await markQueueSyncStatus(tableName, record.id, "synced");
      return { ok: true, latestError: null };
    }

    latestError = logSyncError(
      tableName,
      record.id,
      index === 0 ? "upsert" : "upsert fallback",
      error,
      payload,
    );
  }

  await markRecordSyncStatus(tableName, record.id, "failed");
  await markQueueSyncStatus(tableName, record.id, "failed");
  return { ok: false, latestError };
}

function chunkRecords<T>(records: T[], batchSize: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < records.length; index += batchSize) {
    chunks.push(records.slice(index, index + batchSize));
  }
  return chunks;
}

async function syncRecordBatch(
  tableName: SyncQueueItem["table_name"],
  records: Array<LocalTransaction | LocalDueDate | LocalGoal | LocalGoalContribution>,
) {
  if (!supabase || records.length === 0) {
    return { synced: 0, failed: 0, latestError: null as BudgetCatSyncError | null };
  }

  const primaryPayloads = records.map((record) => getPayloads(tableName, record)[0]);
  const { error } = await supabase.from(tableName).upsert(primaryPayloads);

  if (!error) {
    await Promise.all(
      records.flatMap((record) => [
        markRecordSyncStatus(tableName, record.id, "synced"),
        markQueueSyncStatus(tableName, record.id, "synced"),
      ]),
    );
    return { synced: records.length, failed: 0, latestError: null };
  }

  console.warn("[BudgetCat Sync Warning] Batch sync fell back to per-record sync", {
    tableName,
    count: records.length,
    message: error.message,
    details: error.details,
    hint: error.hint,
    code: error.code,
  });

  let synced = 0;
  let failed = 0;
  let latestError: BudgetCatSyncError | null = null;

  for (const record of records) {
    const result = await syncRecord(tableName, record);
    if (result.ok) {
      synced += 1;
    } else {
      failed += 1;
      latestError = result.latestError;
    }
  }

  return { synced, failed, latestError };
}

async function getTotalPending(householdId: string) {
  const totals = await Promise.all(
    tableOrder.map((tableName) =>
      db
        .table(tableName)
        .where("sync_status")
        .anyOf(["pending", "failed"])
        .filter((record) => record.household_id === householdId)
        .count(),
    ),
  );
  return totals.reduce((sum, count) => sum + count, 0);
}

async function syncTable(
  tableName: SyncQueueItem["table_name"],
  householdId: string,
  batchSize: number,
  onProgress: (syncedDelta: number, failedDelta: number, tableName: string) => void,
) {
  const pending = await db
    .table(tableName)
    .where("sync_status")
    .anyOf(["pending", "failed"])
    .filter((record) => record.household_id === householdId)
    .toArray();

  let synced = 0;
  let failed = 0;
  let latestError: BudgetCatSyncError | null = null;

  for (const batch of chunkRecords(pending, batchSize)) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    const result = await syncRecordBatch(tableName, batch);
    synced += result.synced;
    failed += result.failed;
    latestError = result.latestError ?? latestError;
    onProgress(result.synced, result.failed, tableName);
  }

  return { synced, failed, latestError };
}

export async function syncTransactions(householdId: string, batchSize = defaultBatchSize) {
  return syncTable("transactions", householdId, batchSize, () => undefined);
}

export async function syncDueDates(householdId: string, batchSize = defaultBatchSize) {
  return syncTable("due_dates", householdId, batchSize, () => undefined);
}

export async function syncGoals(householdId: string, batchSize = defaultBatchSize) {
  return syncTable("goals", householdId, batchSize, () => undefined);
}

export async function syncGoalContributions(householdId: string, batchSize = defaultBatchSize) {
  return syncTable("goal_contributions", householdId, batchSize, () => undefined);
}

export async function syncPendingRecords(
  user?: BudgetCatUser | User,
  options: { batchSize?: number } = {},
): Promise<SyncResult> {
  if (syncRunPromise) return syncRunPromise;

  syncRunPromise = runSyncPendingRecords(user, options).finally(() => {
    syncRunPromise = null;
  });

  return syncRunPromise;
}

async function runSyncPendingRecords(
  user?: BudgetCatUser | User,
  options: { batchSize?: number } = {},
): Promise<SyncResult> {
  if (!canSync()) {
    setSyncStatus({
      isSyncing: false,
      currentTable: null,
      syncError: null,
    });
    return {
      ok: false,
      synced: 0,
      failed: 0,
      skippedReason: navigator.onLine ? "Supabase is not configured" : "Offline mode",
      latestError: null,
    };
  }

  if (!user?.id) {
    setSyncStatus({
      isSyncing: false,
      currentTable: null,
    });
    return {
      ok: false,
      synced: 0,
      failed: 0,
      skippedReason: "No signed-in user for sync.",
      latestError: null,
    };
  }

  const sessionUser = await getAuthenticatedSyncUser();

  if (!sessionUser) {
    setSyncStatus({
      isSyncing: false,
      currentTable: null,
    });
    return {
      ok: false,
      synced: 0,
      failed: 0,
      skippedReason: "No active Supabase session. Local changes remain pending.",
      latestError: null,
    };
  }

  const fallbackHouseholdId = "householdId" in user ? user.householdId : "";
  let householdId = await resolveSyncHousehold(sessionUser, fallbackHouseholdId);

  if (!householdId) {
    householdId = fallbackHouseholdId;
  }

  if (!householdId) {
    setSyncStatus({
      isSyncing: false,
      currentTable: null,
    });
    return {
      ok: false,
      synced: 0,
      failed: 0,
      skippedReason: "No household found for sync.",
      latestError: null,
    };
  }

  await repairPendingGoalOwnership(sessionUser.id, householdId);

  const totalPending = await getTotalPending(householdId);
  const progress = {
    syncedCount: 0,
    failedCount: 0,
  };

  setSyncStatus({
    totalPending,
    syncedCount: 0,
    failedCount: 0,
    currentTable: totalPending > 0 ? "transactions" : null,
    percentComplete: totalPending > 0 ? 0 : 100,
    isSyncing: totalPending > 0,
    syncError: null,
  });

  const updateProgress = (
    syncedDelta: number,
    failedDelta: number,
    currentTable: string,
  ) => {
    progress.syncedCount += syncedDelta;
    progress.failedCount += failedDelta;
    const completed = progress.syncedCount + progress.failedCount;
    setSyncStatus({
      syncedCount: progress.syncedCount,
      failedCount: progress.failedCount,
      currentTable,
      percentComplete:
        totalPending === 0 ? 100 : Math.min(100, Math.round((completed / totalPending) * 100)),
    });
  };

  const results = [];
  for (const tableName of tableOrder) {
    setSyncStatus({ currentTable: tableName });
    results.push(
      await syncTable(
        tableName,
        householdId,
        options.batchSize ?? defaultBatchSize,
        updateProgress,
      ),
    );
  }

  const synced = results.reduce((sum, result) => sum + result.synced, 0);
  const failed = results.reduce((sum, result) => sum + result.failed, 0);
  const latestError =
    results.find((result) => result.latestError)?.latestError ?? null;

  if (failed === 0) {
    setLatestSyncError(null);
  }

  setSyncStatus({
    totalPending,
    syncedCount: synced,
    failedCount: failed,
    currentTable: null,
    percentComplete: 100,
    lastSyncedAt: failed === 0 ? new Date().toISOString() : undefined,
    isSyncing: false,
    syncError: latestError,
  });

  return {
    ok: failed === 0,
    synced,
    failed,
    latestError,
  };
}
