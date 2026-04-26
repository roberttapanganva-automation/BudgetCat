import { formatISO } from "date-fns";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { addLocalTransaction } from "../../lib/localDb";
import { syncPendingRecords } from "../../lib/syncEngine";
import type { TransactionType } from "../../types/finance";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

const transactionTypes: Array<{ label: string; value: TransactionType }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Salary", value: "salary" },
  { label: "Savings", value: "savings" },
  { label: "Goal Contribution", value: "goal_contribution" },
];

export function AddTransactionDialog({
  className,
  label = "Add Transaction",
}: {
  className?: string;
  label?: string;
}) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const formData = new FormData(event.currentTarget);
    await addLocalTransaction(
      {
        type,
        amount: Number(formData.get("amount") || 0),
        category: String(formData.get("category") || "Uncategorized"),
        date: String(
          formData.get("date") || formatISO(new Date(), { representation: "date" }),
        ),
        payment_method: String(formData.get("payment_method") || "Cash"),
        note: String(formData.get("note") || ""),
      },
      user.id,
      user.householdId,
    );

    if (navigator.onLine) {
      await syncPendingRecords(user);
    }

    setIsOpen(false);
    event.currentTarget.reset();
    setType("expense");
  }

  return (
    <>
      <Button className={className} onClick={() => setIsOpen(true)}>
        <Plus size={18} />
        {label}
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add transaction"
      >
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            Type
            <select
              className="budget-input"
              onChange={(event) => setType(event.target.value as TransactionType)}
              value={type}
            >
              {transactionTypes.map((transactionType) => (
                <option key={transactionType.value} value={transactionType.value}>
                  {transactionType.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Amount
            <input className="budget-input" min="0" name="amount" placeholder="PHP 0" required type="number" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Category
            <input className="budget-input" name="category" placeholder="Food, Bills, Salary..." />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Date
            <input className="budget-input" name="date" type="date" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Payment Method
            <input className="budget-input" name="payment_method" placeholder="Cash, card, e-wallet" />
          </label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            Notes
            <textarea
              className="budget-input min-h-28 resize-none"
              name="note"
              placeholder="Optional details for future you"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Save Transaction</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
