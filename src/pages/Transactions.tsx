import { format, parseISO } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddTransactionDialog } from "../components/transactions/AddTransactionDialog";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../lib/localDb";
import { formatCurrency } from "../lib/utils";
import type { TransactionType } from "../types/finance";

const typeLabels: Record<TransactionType, string> = {
  expense: "Expense",
  income: "Income",
  salary: "Salary",
  savings: "Savings",
  goal_contribution: "Goal Contribution",
};

export function Transactions() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TransactionType>("all");
  const transactions =
    useLiveQuery(
      () =>
        db.transactions
          .where("household_id")
          .equals(householdId)
          .filter((transaction) => !transaction.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => typeFilter === "all" || transaction.type === typeFilter)
      .filter((transaction) => {
        const haystack = [
          transaction.category,
          transaction.payment_method,
          transaction.note,
          transaction.type,
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [search, transactions, typeFilter]);

  return (
    <>
      <PageHeader
        action={<AddTransactionDialog />}
        subtitle="Manual entries are saved locally first and synced when available."
        title="Transactions"
      />
      <Card className="mb-6 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-budget-text/40"
              size={18}
            />
            <input
              className="budget-input pl-11"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search transactions"
              value={search}
            />
          </label>
          <select
            className="budget-input"
            onChange={(event) => setTypeFilter(event.target.value as "all" | TransactionType)}
            value={typeFilter}
          >
            <option value="all">All types</option>
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select className="budget-input">
            <option>This month</option>
            <option>Last month</option>
            <option>Custom range</option>
          </select>
        </div>
      </Card>
      <Card className="p-0">
        <div className="hidden grid-cols-[1fr_160px_140px_140px] border-b border-budget-border px-5 py-4 text-xs font-black uppercase text-budget-text/45 md:grid">
          <span>Transaction</span>
          <span>Category</span>
          <span>Date</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-budget-border">
          {filteredTransactions.map((transaction) => {
            const isPositive = transaction.type === "income" || transaction.type === "salary";
            return (
              <div
                className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_160px_140px_140px] md:items-center"
                key={transaction.id}
              >
                <div>
                  <p className="font-black">{typeLabels[transaction.type]}</p>
                  <p className="text-sm font-semibold text-budget-text/55">
                    {transaction.payment_method || "Payment method not set"}
                  </p>
                </div>
                <Badge tone={isPositive ? "success" : "neutral"}>
                  {transaction.category}
                </Badge>
                <p className="text-sm font-bold text-budget-text/60">
                  {format(parseISO(transaction.date), "MMM d, yyyy")}
                </p>
                <p
                  className={
                    isPositive
                      ? "font-black text-budget-success md:text-right"
                      : "font-black text-budget-text md:text-right"
                  }
                >
                  {isPositive ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            );
          })}
          {filteredTransactions.length === 0 && (
            <p className="px-5 py-8 text-sm font-semibold text-budget-text/55">
              No transactions match this view.
            </p>
          )}
        </div>
      </Card>
    </>
  );
}
