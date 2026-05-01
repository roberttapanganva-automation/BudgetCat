import { formatISO } from "date-fns";
import { Loader2, Plus } from "lucide-react";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import {
  getCategoriesByType,
  normalizeCategory,
} from "../../lib/categoryConfig";
import { addLocalTransaction } from "../../lib/localDb";
import {
  PAYMENT_METHOD_OPTIONS,
  normalizePaymentMethod,
} from "../../lib/paymentMethods";
import { getQuickAddPresets } from "../../lib/presets";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import { playCreateSuccessFeedback } from "../../lib/soundFeedback";
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

const mobileTransactionTypes: Array<{ label: string; value: TransactionType }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Saving", value: "savings" },
];

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

export function AddTransactionDialog({
  className,
  label = "Add Transaction",
  ariaLabel = label,
  compact = false,
}: {
  className?: string;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(formatISO(new Date(), { representation: "date" }));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");
  const presets = getQuickAddPresets();

  const categoryType = getCategoryTypeForTransaction(type);

  const categoryOptions = useMemo(
    () => getCategoriesByType(categoryType),
    [categoryType],
  );

  useEffect(() => {
    if (!category) return;

    const normalizedCategory = normalizeCategory(category);
    const normalizedCategoryId = normalizedCategory?.id;

    const isStillValid = categoryOptions.some(
      (categoryOption) =>
        categoryOption.id === category || categoryOption.id === normalizedCategoryId,
    );

    if (isStillValid && normalizedCategoryId && category !== normalizedCategoryId) {
      setCategory(normalizedCategoryId);
      return;
    }

    if (!isStillValid) {
      setCategory("");
    }
  }, [category, categoryOptions]);

  function resetForm() {
    setType("expense");
    setAmount("");
    setCategory("");
    setDate(formatISO(new Date(), { representation: "date" }));
    setPaymentMethod("cash");
    setNote("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const normalizedCategory = normalizeCategory(category);
      const savedCategory = normalizedCategory?.id || category || "Uncategorized";

      const savedTransaction = await addLocalTransaction(
        {
          type,
          amount: Number(amount || 0),
          category: savedCategory,
          date: date || formatISO(new Date(), { representation: "date" }),
          payment_method: normalizePaymentMethod(paymentMethod),
          note,
        },
        user.id,
        user.householdId,
      );

      setIsOpen(false);
      resetForm();
      showToast(getTransactionToast(savedTransaction));
      playCreateSuccessFeedback();
      requestBackgroundSync(user, "transaction_saved");
    } catch {
      showToast(getTransactionErrorToast());
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button aria-label={ariaLabel} className={className} onClick={() => setIsOpen(true)}>
        <Plus size={18} />
        {compact ? <span className="sr-only">{label}</span> : label}
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Quick Add"
      >
        {presets.length > 0 && (
        <div className="mb-4 hidden md:block">
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-budget-text/45">
            Presets
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {presets.map((preset) => (
              <button
                className="shrink-0 rounded-full border border-budget-border bg-budget-background px-3 py-2 text-xs font-black text-budget-text transition hover:border-budget-primary hover:text-budget-primary disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
                key={preset.id}
                onClick={() => {
                  const normalizedPresetCategory = normalizeCategory(preset.category);

                  setType(preset.type);
                  setAmount(String(preset.amount));
                  setCategory(normalizedPresetCategory?.id || preset.category);
                  setPaymentMethod(normalizePaymentMethod(preset.payment_method));
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
        )}

        <form className="grid gap-3 md:gap-4" onSubmit={handleSubmit}>
          <div className="md:hidden">
            <div className="grid grid-cols-3 rounded-xl border border-budget-border bg-budget-background p-1">
              {mobileTransactionTypes.map((transactionType) => {
                const isActive = type === transactionType.value;
                const isExpense = transactionType.value === "expense";

                return (
                  <button
                    className={
                      isActive
                        ? isExpense
                          ? "rounded-lg bg-budget-urgent px-2 py-2 text-xs font-black text-white"
                          : "rounded-lg bg-budget-primary px-2 py-2 text-xs font-black text-white"
                        : "rounded-lg px-2 py-2 text-xs font-black text-budget-text/60"
                    }
                    disabled={isSaving}
                    key={transactionType.value}
                    onClick={() => setType(transactionType.value)}
                    type="button"
                  >
                    {transactionType.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="grid gap-2 text-sm font-bold md:hidden">
            <span className="sr-only">Amount</span>
            <div
              className={
                type === "expense"
                  ? "rounded-2xl border border-budget-urgent/35 bg-budget-urgent/10 px-4 py-4 text-center"
                  : "rounded-2xl border border-budget-border bg-budget-background px-4 py-4 text-center"
              }
            >
              <span className="text-xl font-black text-budget-text/45">₱</span>
              <input
                className="w-[calc(100%-2rem)] border-0 bg-transparent p-0 text-center text-4xl font-black tracking-tight outline-none placeholder:text-budget-text/25 focus:ring-0"
                inputMode="decimal"
                min="0"
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
                type="number"
                value={amount}
              />
            </div>
          </label>

          <div className="hidden gap-4 md:grid md:grid-cols-2">
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
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Category
              <select
                className="budget-input"
                onChange={(event) => setCategory(event.target.value)}
                value={category}
              >
                <option value="">Select category</option>
                {categoryOptions.map((categoryOption) => (
                  <option key={categoryOption.id} value={categoryOption.id}>
                    {categoryOption.label}
                  </option>
                ))}
              </select>
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

            <label className="hidden gap-2 text-sm font-bold md:grid">
              Payment Method
              <select
                className="budget-input"
                onChange={(event) => setPaymentMethod(event.target.value)}
                value={paymentMethod}
              >
                {PAYMENT_METHOD_OPTIONS.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold md:col-span-2">
              Note
              <textarea
                className="budget-input min-h-20 resize-none md:min-h-28"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Optional details for future you"
                value={note}
              />
            </label>
          </div>

          <div className="flex flex-col-reverse gap-3 pt-1 md:flex-row md:justify-end">
            <Button className="md:w-auto" disabled={isSaving} onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button className="w-full md:w-auto" disabled={isSaving} type="submit">
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
