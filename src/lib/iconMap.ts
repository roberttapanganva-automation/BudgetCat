import type { LocalDueDate, LocalGoal, LocalTransaction } from "../types/finance";
import {
  getEmojiForDueDate,
  getEmojiForGoal,
  getEmojiForReminder,
  getEmojiForText,
  getEmojiForTransaction,
} from "./emojiRules";

type TransactionLike = Partial<LocalTransaction>;
type GoalLike = Partial<LocalGoal>;
type DueDateLike = Partial<LocalDueDate>;

function searchable(values: Array<unknown>) {
  return values.map((value) => String(value || "").toLowerCase()).join(" ");
}

export function getBudgetIcon(input: unknown, type = "") {
  const text = searchable([input, type]);
  if (type === "income" || type === "salary") return "\u{1F4B0}";
  if (type === "expense") return "\u{1F9FE}";
  if (type === "savings") return "\u{1F43E}";
  if (type === "goal" || type === "goal_contribution") return getEmojiForText(text, "\u{1F3AF}");
  if (type === "due_date") return getEmojiForText(text, "\u{1F4C5}");
  return getEmojiForText(text, "\u{2728}");
}

export function getTransactionIcon(transaction: TransactionLike) {
  return getEmojiForTransaction(transaction);
}

export function getGoalIcon(goal: GoalLike) {
  return getEmojiForGoal(goal);
}

export function getDueDateIcon(dueDate: DueDateLike) {
  return getEmojiForDueDate(dueDate);
}

export function getReminderIcon(input: unknown) {
  return getEmojiForReminder(String(input || ""));
}
