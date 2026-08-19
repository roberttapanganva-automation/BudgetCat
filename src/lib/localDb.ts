import Dexie, { type Table } from "dexie";
import type {
  LocalDueDate,
  LocalGoal,
  LocalGoalContribution,
  LocalRecord,
  LocalTransaction,
  SyncQueueItem,
} from "../types/finance";

class BudgetCatDatabase extends Dexie {
  transactions!: Table<LocalTransaction, string>;
  due_dates!: Table<LocalDueDate, string>;
  goals!: Table<LocalGoal, string>;
  goal_contributions!: Table<LocalGoalContribution, string>;
  sync_queue!: Table<SyncQueueItem, number>;

  constructor() {
    super("budgetcat-local-db");

    this.version(1).stores({
      transactions:
        "id, household_id, user_id, type, category, date, sync_status, updated_at, deleted_at",
      due_dates:
        "id, household_id, user_id, due_date, status, sync_status, updated_at, deleted_at",
      goals:
        "id, household_id, user_id, type, status, target_date, sync_status, updated_at, deleted_at",
      goal_contributions:
        "id, household_id, user_id, goal_id, date, sync_status, updated_at, deleted_at",
      sync_queue:
        "++queue_id, [table_name+record_id], table_name, record_id, operation, sync_status, created_at, updated_at",
    });
  }
}

export const db = new BudgetCatDatabase();

export function createId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

const MAX_MONEY_AMOUNT = 9_999_999_999.99;

function requirePositiveAmount(value: number, label = "Amount") {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be greater than zero.`);
  }
  if (value > MAX_MONEY_AMOUNT) {
    throw new Error(`${label} exceeds the supported amount limit.`);
  }
}

function requireNonNegativeAmount(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} cannot be negative.`);
  }
  if (value > MAX_MONEY_AMOUNT) {
    throw new Error(`${label} exceeds the supported amount limit.`);
  }
}

function requireNonNegativeInteger(value: number, label: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative whole number.`);
  }
}

export function getLocalHouseholdId(userId: string) {
  const key = "budgetcat-households";
  const raw = localStorage.getItem(key);
  const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};

  if (!map[userId]) {
    map[userId] = createId();
    localStorage.setItem(key, JSON.stringify(map));
  }

  return map[userId];
}

function withRecordMeta<T extends Omit<LocalRecord, keyof LocalRecord>>(
  data: T,
  userId: string,
  householdId: string,
) {
  const timestamp = nowIso();

  return {
    ...data,
    id: createId(),
    household_id: householdId,
    user_id: userId,
    sync_status: "pending",
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  } as T & LocalRecord;
}

export async function enqueueSync(
  tableName: SyncQueueItem["table_name"],
  recordId: string,
  operation: SyncQueueItem["operation"] = "upsert",
) {
  const timestamp = nowIso();
  const existing = await db.sync_queue
    .where("[table_name+record_id]")
    .equals([tableName, recordId])
    .first();

  if (existing?.queue_id) {
    await db.sync_queue.update(existing.queue_id, {
      operation,
      sync_status: "pending",
      updated_at: timestamp,
    });
    return;
  }

  await db.sync_queue.add({
    table_name: tableName,
    record_id: recordId,
    operation,
    sync_status: "pending",
    created_at: timestamp,
    updated_at: timestamp,
  });
}

export async function addLocalTransaction(
  data: Omit<LocalTransaction, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
  requirePositiveAmount(data.amount, "Transaction amount");
  const record = withRecordMeta(data, userId, householdId) as LocalTransaction;

  await db.transaction("rw", db.transactions, db.sync_queue, async () => {
    await db.transactions.add(record);
    await enqueueSync("transactions", record.id);
  });

  return record;
}

export async function markLocalDueDatePaidWithTransaction(
  dueDateId: string,
  data: Omit<LocalTransaction, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
  requirePositiveAmount(data.amount, "Bill payment amount");
  const transaction = withRecordMeta(data, userId, householdId) as LocalTransaction;
  let linkedTransaction: LocalTransaction | null = null;
  let created = false;

  await db.transaction(
    "rw",
    db.transactions,
    db.due_dates,
    db.sync_queue,
    async () => {
      const bill = await db.due_dates.get(dueDateId);

      if (!bill || bill.deleted_at) {
        throw new Error("The bill is no longer available.");
      }

      if (bill.paid_transaction_id) {
        const existing = await db.transactions.get(bill.paid_transaction_id);

        if (existing && !existing.deleted_at) {
          linkedTransaction = existing;

          if (bill.status !== "paid") {
            await db.due_dates.update(dueDateId, {
              status: "paid",
              sync_status: "pending",
              updated_at: nowIso(),
            });
            await enqueueSync("due_dates", dueDateId);
          }
          return;
        }
      }

      const timestamp = nowIso();
      await db.transactions.add(transaction);
      await db.due_dates.update(dueDateId, {
        status: "paid",
        paid_transaction_id: transaction.id,
        sync_status: "pending",
        updated_at: timestamp,
      });
      await enqueueSync("transactions", transaction.id);
      await enqueueSync("due_dates", dueDateId);
      linkedTransaction = transaction;
      created = true;
    },
  );

  return {
    transaction: linkedTransaction ?? transaction,
    created,
  };
}

export async function markLocalDueDateUnpaidWithTransaction(
  dueDateId: string,
  transactionId?: string | null,
) {
  let deletedTransactionId: string | null = null;

  await db.transaction(
    "rw",
    db.transactions,
    db.due_dates,
    db.sync_queue,
    async () => {
      const bill = await db.due_dates.get(dueDateId);

      if (!bill || bill.deleted_at) {
        throw new Error("The bill is no longer available.");
      }

      const linkedTransactionId = transactionId ?? bill.paid_transaction_id;
      const timestamp = nowIso();

      if (linkedTransactionId) {
        const linkedTransaction = await db.transactions.get(linkedTransactionId);

        if (linkedTransaction && !linkedTransaction.deleted_at) {
          await db.transactions.update(linkedTransactionId, {
            deleted_at: timestamp,
            sync_status: "pending",
            updated_at: timestamp,
          });
          await enqueueSync("transactions", linkedTransactionId, "delete");
          deletedTransactionId = linkedTransactionId;
        }
      }

      await db.due_dates.update(dueDateId, {
        status: "upcoming",
        paid_transaction_id: undefined,
        sync_status: "pending",
        updated_at: timestamp,
      });
      await enqueueSync("due_dates", dueDateId);
    },
  );

  return { deletedTransactionId };
}

export async function addLocalDueDate(
  data: Omit<LocalDueDate, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
  requirePositiveAmount(data.amount, "Bill amount");
  requireNonNegativeInteger(data.reminder_days, "Reminder days");
  const record = withRecordMeta(data, userId, householdId) as LocalDueDate;

  await db.transaction("rw", db.due_dates, db.sync_queue, async () => {
    await db.due_dates.add(record);
    await enqueueSync("due_dates", record.id);
  });

  return record;
}

export async function addLocalGoal(
  data: Omit<LocalGoal, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
  requirePositiveAmount(data.target_amount, "Goal target");
  requireNonNegativeAmount(data.current_amount, "Current goal amount");
  const record = withRecordMeta(data, userId, householdId) as LocalGoal;

  await db.transaction("rw", db.goals, db.sync_queue, async () => {
    await db.goals.add(record);
    await enqueueSync("goals", record.id);
  });

  return record;
}

export async function addLocalGoalContribution(
  data: Omit<LocalGoalContribution, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
  requirePositiveAmount(data.amount, "Goal contribution");
  const record = withRecordMeta(data, userId, householdId) as LocalGoalContribution;
  const timestamp = nowIso();

  await db.transaction("rw", db.goal_contributions, db.goals, db.sync_queue, async () => {
    const goal = await db.goals.get(record.goal_id);

    if (
      !goal ||
      goal.deleted_at ||
      goal.household_id !== householdId
    ) {
      throw new Error("The selected goal is no longer available.");
    }

    const currentAmount = Number(goal.current_amount || 0);
    requireNonNegativeAmount(currentAmount, "Current goal amount");

    const updatedAmount = currentAmount + record.amount;
    requireNonNegativeAmount(updatedAmount, "Updated goal amount");

    await db.goal_contributions.add(record);
    await db.goals.update(goal.id, {
      current_amount: updatedAmount,
      sync_status: "pending",
      updated_at: timestamp,
    });
    await enqueueSync("goals", goal.id);
    await enqueueSync("goal_contributions", record.id);
  });

  return record;
}

export async function updateLocalTransaction(
  recordId: string,
  patch: Partial<Omit<LocalTransaction, keyof LocalRecord>>,
) {
  if (patch.amount !== undefined) {
    requirePositiveAmount(patch.amount, "Transaction amount");
  }

  await db.transaction("rw", db.transactions, db.sync_queue, async () => {
    await db.transactions.update(recordId, {
      ...patch,
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("transactions", recordId);
  });
}

export async function softDeleteLocalTransaction(recordId: string) {
  await db.transaction("rw", db.transactions, db.sync_queue, async () => {
    await db.transactions.update(recordId, {
      deleted_at: nowIso(),
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("transactions", recordId, "delete");
  });
}

export async function updateLocalDueDate(
  recordId: string,
  patch: Partial<Omit<LocalDueDate, keyof LocalRecord>>,
) {
  if (patch.amount !== undefined) {
    requirePositiveAmount(patch.amount, "Bill amount");
  }
  if (patch.reminder_days !== undefined) {
    requireNonNegativeInteger(patch.reminder_days, "Reminder days");
  }

  await db.transaction("rw", db.due_dates, db.sync_queue, async () => {
    await db.due_dates.update(recordId, {
      ...patch,
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("due_dates", recordId);
  });
}

export async function softDeleteLocalDueDate(recordId: string) {
  await db.transaction("rw", db.due_dates, db.sync_queue, async () => {
    await db.due_dates.update(recordId, {
      deleted_at: nowIso(),
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("due_dates", recordId, "delete");
  });
}

export async function updateLocalGoal(
  recordId: string,
  patch: Partial<Omit<LocalGoal, keyof LocalRecord>>,
) {
  if (patch.target_amount !== undefined) {
    requirePositiveAmount(patch.target_amount, "Goal target");
  }
  if (patch.current_amount !== undefined) {
    requireNonNegativeAmount(patch.current_amount, "Current goal amount");
  }

  await db.transaction("rw", db.goals, db.sync_queue, async () => {
    await db.goals.update(recordId, {
      ...patch,
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("goals", recordId);
  });
}

export async function softDeleteLocalGoal(recordId: string) {
  await db.transaction("rw", db.goals, db.sync_queue, async () => {
    await db.goals.update(recordId, {
      deleted_at: nowIso(),
      sync_status: "pending",
      updated_at: nowIso(),
    });
    await enqueueSync("goals", recordId, "delete");
  });
}

export async function markRecordSyncStatus(
  tableName: SyncQueueItem["table_name"],
  recordId: string,
  syncStatus: LocalRecord["sync_status"],
) {
  await db.table(tableName).update(recordId, {
    sync_status: syncStatus,
    updated_at: nowIso(),
  });
}

export async function clearLocalTestData() {
  await db.transaction(
    "rw",
    [db.transactions, db.due_dates, db.goals, db.goal_contributions, db.sync_queue],
    async () => {
      await Promise.all([
        db.transactions.clear(),
        db.due_dates.clear(),
        db.goals.clear(),
        db.goal_contributions.clear(),
        db.sync_queue.clear(),
      ]);
    },
  );
}

export async function ensureLocalDefaults(userId: string, householdId: string) {
  void userId;
  void householdId;
  await db.open();
}

export async function getKnownLocalHouseholdId(userId: string) {
  await db.open();

  const tables = [db.transactions, db.due_dates, db.goals, db.goal_contributions];
  for (const table of tables) {
    const record = await table.where("user_id").equals(userId).first();
    if (record?.household_id) {
      return record.household_id;
    }
  }

  return null;
}
