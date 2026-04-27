import { formatISO } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { addLocalTransaction } from "../../lib/localDb";
import { getQuickAddPresets } from "../../lib/presets";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import { playReminderSound } from "../../lib/sound";
import { getTransactionErrorToast, getTransactionToast } from "../../lib/transactionToast";
import type { TransactionType } from "../../types/finance";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
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
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(formatISO(new Date(), { representation: "date" }));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [note, setNote] = useState("");
  const presets = getQuickAddPresets();

  function resetForm() {
    setType("expense");
    setAmount("");
    setCategory("");
    setDate(formatISO(new Date(), { representation: "date" }));
    setPaymentMethod("");
    setNote("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const savedTransaction = await addLocalTransaction(
        {
          type,
          amount: Number(amount || 0),
          category: category || "Uncategorized",
          date: date || formatISO(new Date(), { representation: "date" }),
          payment_method: paymentMethod || "Cash",
          note,
        },
        user.id,
        user.householdId,
      );

      setIsOpen(false);
      resetForm();
      showToast(getTransactionToast(savedTransaction));
      playReminderSound()
        .then((result) => {
          const reason = "reason" in result ? result.reason : "";
          if (!result.ok && reason !== "Reminder sound is off.") {
            console.warn("[BudgetCat Sound Warning]", reason);
          }
        })
        .catch(() => undefined);
      requestBackgroundSync(user, "transaction_saved");
    } catch {
      showToast(getTransactionErrorToast());
    } finally {
      setIsSaving(false);
    }
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
        <div className="mb-5">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-budget-text/45">
            Quick add
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <button
                className="shrink-0 rounded-full border border-budget-border bg-budget-background px-3 py-2 text-xs font-black text-budget-text transition hover:border-budget-primary hover:text-budget-primary"
                key={preset.id}
                disabled={isSaving}
                onClick={() => {
                  setType(preset.type);
                  setAmount(String(preset.amount));
                  setCategory(preset.category);
                  setPaymentMethod(preset.payment_method);
                  setNote(preset.note);
                  setDate(formatISO(new Date(), { representation: "date" }));
                }}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
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
            <input
              className="budget-input"
              min="0"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="PHP 0"
              required
              type="number"
              value={amount}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Category
            <input
              className="budget-input"
              onChange={(event) => setCategory(event.target.value)}
              placeholder="Food, Bills, Salary..."
              value={category}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Date
            <input
              className="budget-input"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Payment Method
            <input
              className="budget-input"
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="Cash, card, e-wallet"
              value={paymentMethod}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            Notes
            <textarea
              className="budget-input min-h-28 resize-none"
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional details for future you"
              value={note}
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button disabled={isSaving} onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving && (
                <AnimatedStatusIcon
                  animation="spin"
                  className="text-current"
                  icon={Loader2}
                  label="Saving transaction"
                />
              )}
              {isSaving ? "Saving..." : "Save Transaction"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
