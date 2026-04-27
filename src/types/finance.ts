export type SyncStatus = "pending" | "synced" | "failed";

export type TransactionType =
  | "expense"
  | "income"
  | "salary"
  | "savings"
  | "goal_contribution";

export type DueDateStatus = "upcoming" | "paid" | "overdue";
export type RepeatType = "none" | "weekly" | "monthly" | "yearly";

export type GoalType =
  | "financial_freedom"
  | "travel"
  | "purchase"
  | "emergency"
  | "savings"
  | "investment";

export type GoalStatus = "active" | "completed" | "paused";
export type GoalPriority = "low" | "medium" | "high";

export interface LocalRecord {
  id: string;
  household_id: string;
  user_id: string;
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface LocalTransaction extends LocalRecord {
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  payment_method: string;
  note?: string;
}

export interface LocalDueDate extends LocalRecord {
  title: string;
  amount: number;
  due_date: string;
  repeat_type: RepeatType;
  reminder_days: number;
  status: DueDateStatus;
  note?: string;
}

export interface LocalGoal extends LocalRecord {
  type: GoalType;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  priority: GoalPriority;
  status: GoalStatus;
  note?: string;
}

export interface LocalGoalContribution extends LocalRecord {
  goal_id: string;
  amount: number;
  date: string;
  note?: string;
}

export interface SyncQueueItem {
  queue_id?: number;
  table_name: "transactions" | "due_dates" | "goals" | "goal_contributions";
  record_id: string;
  operation: "upsert" | "delete";
  sync_status: SyncStatus;
  created_at: string;
  updated_at: string;
}

export interface BudgetCatUser {
  id: string;
  email: string;
  householdId: string;
  isOffline: boolean;
  nickname?: string;
  fullName?: string;
}

export interface BudgetCatSyncError {
  tableName: string;
  recordId?: string;
  action: string;
  message: string;
  details?: string | null;
  hint?: string | null;
  code?: string | null;
  createdAt: string;
}

export type ReminderStatus =
  | "upcoming"
  | "due_soon"
  | "due_today"
  | "overdue"
  | "dismissed"
  | "completed";

export type ReminderType =
  | "bill"
  | "savings"
  | "goal_deadline"
  | "goal_pace";

export interface Reminder {
  id: string;
  type: ReminderType;
  status: ReminderStatus;
  title: string;
  body: string;
  icon?: string;
  dueDate?: string;
  amount?: number;
  severity: "info" | "warning" | "urgent" | "success";
  sourceId?: string;
}

export type CoachMessageType =
  | "encouragement"
  | "warning"
  | "celebration"
  | "savings_tip"
  | "due_date_alert"
  | "goal_progress";

export interface CoachMessage {
  id: string;
  type: CoachMessageType;
  title: string;
  body: string;
  mascot: "Bonnie" | "Clyde" | "Bonnie & Clyde";
  tone: "success" | "warning" | "urgent" | "cat" | "neutral";
}

export type NotificationStatus =
  | "unsupported"
  | "default"
  | "granted"
  | "denied";

export type ExportType =
  | "transactions_csv"
  | "due_dates_csv"
  | "goals_csv"
  | "goal_contributions_csv"
  | "full_backup_json";

export type ReminderSoundMode = "off" | "chime" | "meow";
