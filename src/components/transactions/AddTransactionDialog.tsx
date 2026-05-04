import { formatISO } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  ReceiptText,
  Sparkles,
  Wallet,
} from "lucide-react";
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
import {
  getTransactionErrorToast,
  getTransactionToast,
} from "../../lib/transactionToast";
import { cn } from "../../lib/utils";
import type { TransactionType } from "../../types/finance";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
import { Modal } from "../ui/Modal";

type AddTransactionDialogProps = {
  className?: string;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
};

const transactionTypes: Array<{ label: string; value: TransactionType }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Salary", value: "salary" },
  { label: "Savings", value: "savings" },
  { label: "Goal Contribution", value: "goal_contribution" },
];

const mobileTransactionTypes: Array<{
  label: string;
  value: TransactionType;
  tone: "expense" | "income" | "savings";
}> = [
  { label: "Expense", value: "expense", tone: "expense" },
  { label: "Income", value: "income", tone: "income" },
  { label: "Savings", value: "savings", tone: "savings" },
];

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getTypeTone(type: TransactionType) {
  if (type === "income" || type === "salary") {
    return {
      icon: Wallet,
      label: "Money coming in",
      className: "text-[var(--bc-green)]",
      glowClassName: "bg-[var(--bc-green-glow)] border-[var(--bc-green)]/20",
    };
  }

  if (type === "savings" || type === "goal_contribution") {
    return {
      icon: Sparkles,
      label: "Saving for later",
      className: "text-[var(--bc-blue)]",
      glowClassName: "bg-[var(--bc-blue)]/10 border-[var(--bc-blue)]/20",
    };
  }

  return {
    icon: ReceiptText,
    label: "Money going out",
    className: "text-[var(--bc-red)]",
    glowClassName: "bg-[var(--bc-red-glow)] border-[var(--bc-red)]/20",
  };
}

export function AddTransactionDialog({
  className,
  label = "Add Transaction",
  ariaLabel = label,
  compact = false,
}: AddTransactionDialogProps) {
  const { user } = useAuth();
  const showToast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(
    formatISO(new Date(), { representation: "date" }),
  );
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [note, setNote] = useState("");

  const presets = getQuickAddPresets();
  const categoryType = getCategoryTypeForTransaction(type);
  const categoryOptions = useMemo(
    () => getCategoriesByType(categoryType),
    [categoryType],
  );

  const tone = getTypeTone(type);
  const ToneIcon = tone.icon;

  useEffect(() => {
    if (!category) return;

    const normalizedCategory = normalizeCategory(category);
    const normalizedCategoryId = normalizedCategory?.id;

    const isStillValid = categoryOptions.some(
      (categoryOption) =>
        categoryOption.id === category ||
        categoryOption.id === normalizedCategoryId,
    );

    if (
      isStillValid &&
      normalizedCategoryId &&
      category !== normalizedCategoryId
    ) {
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

  async function saveTransaction(keepOpen = false) {
    if (!user || isSaving) return;

    setIsSaving(true);

    try {
      const normalizedCategory = normalizeCategory(category);
      const savedCategory =
        normalizedCategory?.id || category || "Uncategorized";

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

      resetForm();

      if (!keepOpen) {
        setIsOpen(false);
      }

      showToast(getTransactionToast(savedTransaction));
      playCreateSuccessFeedback();
      requestBackgroundSync(user, "transaction_saved");
    } catch {
      showToast(getTransactionErrorToast());
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await saveTransaction(false);
  }

  async function handleSaveAndAddAnother() {
    await saveTransaction(true);
  }

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-black transition active:scale-[0.98]",
          className ??
            "bc-button bc-button-primary min-h-11 px-4 text-sm font-black",
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus className={compact ? "h-5 w-5" : "h-4.5 w-4.5"} />
        {compact ? <span>{label}</span> : label}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Quick Add">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <section className={cn("rounded-[26px] border p-4", tone.glowClassName)}>
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]">
                <ToneIcon className={cn("h-5 w-5", tone.className)} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--bc-text)]">
                  Add Transaction
                </p>
                <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                  {tone.label}. Saved locally first, then synced when online.
                </p>
              </div>
            </div>

            <div className="mt-5 bc-segment">
              {mobileTransactionTypes.map((transactionType) => {
                const isActive = type === transactionType.value;

                return (
                  <button
                    className={cn(
                      "bc-segment-button",
                      isActive && "bc-segment-button-active",
                      isActive &&
                        transactionType.tone === "expense" &&
                        "bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
                      isActive &&
                        transactionType.tone === "income" &&
                        "bg-[var(--bc-green-glow)] text-[var(--bc-green)]",
                      isActive &&
                        transactionType.tone === "savings" &&
                        "bg-[var(--bc-blue)]/10 text-[var(--bc-blue)]",
                    )}
                    key={transactionType.value}
                    onClick={() => setType(transactionType.value)}
                    type="button"
                  >
                    {transactionType.label}
                  </button>
                );
              })}
            </div>
          </section>

          {presets.length > 0 && (
            <section>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-[var(--bc-text-soft)]">
                  Presets
                </p>
                <span className="text-[11px] font-bold text-[var(--bc-text-muted)]">
                  Optional
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {presets.map((preset) => (
                  <button
                    className="shrink-0 rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-3 py-2 text-xs font-black text-[var(--bc-text-soft)] transition hover:border-[var(--bc-border-strong)] hover:text-[var(--bc-text)]"
                    key={preset.id}
                    onClick={() => {
                      const normalizedPresetCategory = normalizeCategory(
                        preset.category,
                      );

                      setType(preset.type);
                      setAmount(String(preset.amount));
                      setCategory(
                        normalizedPresetCategory?.id || preset.category,
                      );
                      setPaymentMethod(
                        normalizePaymentMethod(preset.payment_method),
                      );
                      setNote(preset.note);
                      setDate(
                        formatISO(new Date(), { representation: "date" }),
                      );
                    }}
                    type="button"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-[var(--bc-text-soft)]">
                Amount
              </span>

              <div className="flex min-h-[84px] items-center rounded-[24px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-4 focus-within:border-[var(--bc-green)]/60 focus-within:ring-4 focus-within:ring-[var(--bc-green-glow)]">
                <span className="mr-2 text-3xl font-black tracking-[-0.06em] text-[var(--bc-text-muted)]">
                  ₱
                </span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent text-4xl font-black tracking-[-0.07em] text-[var(--bc-text)] outline-none placeholder:text-[var(--bc-text-muted)]"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  required
                  type="number"
                  value={amount}
                />
              </div>
            </label>

            <div className="hidden md:grid md:grid-cols-2 md:gap-4">
              <label className="space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Type
                </span>
                <select
                  className="bc-input"
                  onChange={(event) =>
                    setType(event.target.value as TransactionType)
                  }
                  value={type}
                >
                  {transactionTypes.map((transactionType) => (
                    <option
                      key={transactionType.value}
                      value={transactionType.value}
                    >
                      {transactionType.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
                <p className="text-xs font-black text-[var(--bc-text-soft)]">
                  Current mode
                </p>
                <p className={cn("mt-2 text-sm font-black", tone.className)}>
                  {tone.label}
                </p>
              </div>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Category
              </span>
              <select
                className="bc-input"
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Date
                </span>

                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />
                  <input
                    className="bc-input pr-10"
                    onChange={(event) => setDate(event.target.value)}
                    type="date"
                    value={date}
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Payment Method
                </span>
                <select
                  className="bc-input"
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
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Note{" "}
                <span className="font-semibold text-[var(--bc-text-muted)]">
                  (optional)
                </span>
              </span>
              <textarea
                className="bc-input min-h-24 resize-none"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a note..."
                value={note}
              />
            </label>
          </section>

          <div className="space-y-3 pt-1">
            <button
              className="bc-button bc-button-primary w-full"
              disabled={isSaving}
              type="submit"
            >
              {isSaving ? (
                <AnimatedStatusIcon
                  animation="spin"
                  className="text-current"
                  icon={Loader2}
                  label="Saving transaction"
                />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5" />
              )}
              {isSaving ? "Saving..." : "Save Transaction"}
            </button>

            <button
              className="bc-button bc-button-secondary w-full"
              disabled={isSaving}
              onClick={handleSaveAndAddAnother}
              type="button"
            >
              Save & Add Another
            </button>

            <button
              className="w-full rounded-2xl py-3 text-sm font-black text-[var(--bc-text-muted)] hover:text-[var(--bc-text)]"
              disabled={isSaving}
              onClick={() => setIsOpen(false)}
              type="button"
            >
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export default AddTransactionDialog;