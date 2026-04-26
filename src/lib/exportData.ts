import { db } from "./localDb";
import type { ExportType } from "../types/finance";

function escapeCsvValue(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv<T extends object>(rows: T[], columns: Array<keyof T>) {
  const header = columns.map(String).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsvValue(row[column])).join(","),
  );
  return [header, ...body].join("\n");
}

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportBudgetCatData(exportType: ExportType) {
  const [transactions, dueDates, goals, goalContributions] = await Promise.all([
    db.transactions.toArray(),
    db.due_dates.toArray(),
    db.goals.toArray(),
    db.goal_contributions.toArray(),
  ]);

  if (exportType === "transactions_csv") {
    if (transactions.length === 0) throw new Error("No transactions to export.");
    downloadFile(
      "transactions.csv",
      toCsv(transactions, [
        "id",
        "type",
        "amount",
        "category",
        "date",
        "payment_method",
        "note",
        "sync_status",
        "created_at",
        "updated_at",
      ]),
      "text/csv;charset=utf-8",
    );
    return;
  }

  if (exportType === "due_dates_csv") {
    if (dueDates.length === 0) throw new Error("No due dates to export.");
    downloadFile(
      "due_dates.csv",
      toCsv(dueDates, [
        "id",
        "title",
        "amount",
        "due_date",
        "repeat_type",
        "reminder_days",
        "status",
        "note",
        "sync_status",
      ]),
      "text/csv;charset=utf-8",
    );
    return;
  }

  if (exportType === "goals_csv") {
    if (goals.length === 0) throw new Error("No goals to export.");
    downloadFile(
      "goals.csv",
      toCsv(goals, [
        "id",
        "type",
        "title",
        "target_amount",
        "current_amount",
        "target_date",
        "priority",
        "status",
        "note",
        "sync_status",
      ]),
      "text/csv;charset=utf-8",
    );
    return;
  }

  if (exportType === "goal_contributions_csv") {
    if (goalContributions.length === 0) throw new Error("No goal contributions to export.");
    downloadFile(
      "goal_contributions.csv",
      toCsv(goalContributions, [
        "id",
        "goal_id",
        "amount",
        "date",
        "note",
        "sync_status",
      ]),
      "text/csv;charset=utf-8",
    );
    return;
  }

  const backup = {
    exported_at: new Date().toISOString(),
    transactions,
    due_dates: dueDates,
    goals,
    goal_contributions: goalContributions,
  };
  const hasAnyData =
    transactions.length + dueDates.length + goals.length + goalContributions.length > 0;
  if (!hasAnyData) throw new Error("No local BudgetCat data to export.");

  downloadFile(
    "full_budgetcat_backup.json",
    JSON.stringify(backup, null, 2),
    "application/json;charset=utf-8",
  );
}
