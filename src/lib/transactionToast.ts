import type { LocalTransaction, TransactionType } from "../types/finance";
import { formatCurrency } from "./utils";

const toastCopy: Record<
  TransactionType,
  { message: string; title: string; tone?: "success" | "warning" | "error" }
> = {
  income: {
    title: "Income added 💰",
    message: "Nice — your money is now tracked.",
  },
  salary: {
    title: "Income added 💰",
    message: "Nice — your money is now tracked.",
  },
  expense: {
    title: "Expense added 🧾",
    message: "Clyde logged it. Your budget is updated.",
  },
  savings: {
    title: "Savings added 🐾",
    message: "Bonnie says small progress still counts.",
  },
  goal_contribution: {
    title: "Goal contribution added ✨",
    message: "Your goal just moved closer.",
  },
};

export function getTransactionToast(transaction: Pick<LocalTransaction, "amount" | "type">) {
  const copy = toastCopy[transaction.type] ?? {
    title: "Transaction saved ✅",
    message: "BudgetCat updated your records.",
  };

  return {
    ...copy,
    message: `${formatCurrency(transaction.amount)} ${copy.message}`,
    tone: copy.tone ?? "success",
  };
}

export function getTransactionErrorToast() {
  return {
    title: "Save failed ⚠️",
    message: "BudgetCat could not save this yet. Please try again.",
    tone: "error" as const,
  };
}
