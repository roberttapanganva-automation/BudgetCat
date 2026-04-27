import Dexie, { type Table } from "dexie";
import { addDays, formatISO } from "date-fns";
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
  const record = withRecordMeta(data, userId, householdId) as LocalTransaction;

  await db.transaction("rw", db.transactions, db.sync_queue, async () => {
    await db.transactions.add(record);
    await enqueueSync("transactions", record.id);
  });

  return record;
}

export async function addLocalDueDate(
  data: Omit<LocalDueDate, keyof LocalRecord>,
  userId: string,
  householdId: string,
) {
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
  const record = withRecordMeta(data, userId, householdId) as LocalGoalContribution;
  const timestamp = nowIso();

  await db.transaction("rw", db.goal_contributions, db.goals, db.sync_queue, async () => {
    await db.goal_contributions.add(record);
    const goal = await db.goals.get(record.goal_id);
    if (goal) {
      await db.goals.update(goal.id, {
        current_amount: Number(goal.current_amount || 0) + Number(record.amount || 0),
        sync_status: "pending",
        updated_at: timestamp,
      });
      await enqueueSync("goals", goal.id);
    }
    await enqueueSync("goal_contributions", record.id);
  });

  return record;
}

export async function updateLocalTransaction(
  recordId: string,
  patch: Partial<Omit<LocalTransaction, keyof LocalRecord>>,
) {
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
  const [transactionCount, dueDateCount, goalCount] = await Promise.all([
    db.transactions.where("household_id").equals(householdId).count(),
    db.due_dates.where("household_id").equals(householdId).count(),
    db.goals.where("household_id").equals(householdId).count(),
  ]);

  if (transactionCount === 0) {
    await addLocalTransaction(
      {
        type: "salary",
        amount: 40000,
        category: "Salary",
        date: formatISO(new Date(), { representation: "date" }),
        payment_method: "Bank transfer",
        note: "Initial salary sample",
      },
      userId,
      householdId,
    );
    await addLocalTransaction(
      {
        type: "expense",
        amount: 12850,
        category: "Monthly Expenses",
        date: formatISO(new Date(), { representation: "date" }),
        payment_method: "Mixed",
        note: "Initial expense sample",
      },
      userId,
      householdId,
    );
    await addLocalTransaction(
      {
        type: "savings",
        amount: 8000,
        category: "Savings",
        date: formatISO(new Date(), { representation: "date" }),
        payment_method: "Transfer",
        note: "Initial savings sample",
      },
      userId,
      householdId,
    );
  }

  if (dueDateCount === 0) {
    await addLocalDueDate(
      {
        title: "Internet Bill",
        amount: 1699,
        due_date: formatISO(addDays(new Date(), 3), { representation: "date" }),
        repeat_type: "monthly",
        reminder_days: 3,
        status: "upcoming",
        note: "Seed bill",
      },
      userId,
      householdId,
    );
  }

  if (goalCount === 0) {
    await addLocalGoal(
      {
        type: "travel",
        title: "Japan Travel Fund",
        target_amount: 80000,
        current_amount: 12000,
        target_date: "2027-03-01",
        priority: "high",
        status: "active",
        note: "Initial travel goal",
      },
      userId,
      householdId,
    );
    await addLocalGoal(
      {
        type: "financial_freedom",
        title: "Financial Freedom Goal",
        target_amount: 1000000,
        current_amount: 35000,
        target_date: "2036-12-01",
        priority: "high",
        status: "active",
        note: "Long-term goal",
      },
      userId,
      householdId,
    );
    await addLocalGoal(
      {
        type: "purchase",
        title: "New Laptop",
        target_amount: 95000,
        current_amount: 22000,
        target_date: "2026-10-01",
        priority: "medium",
        status: "active",
        note: "Purchase goal",
      },
      userId,
      householdId,
    );
    await addLocalGoal(
      {
        type: "emergency",
        title: "Emergency Fund",
        target_amount: 180000,
        current_amount: 48000,
        target_date: "2027-06-01",
        priority: "high",
        status: "active",
        note: "Emergency savings",
      },
      userId,
      householdId,
    );
  }
}
