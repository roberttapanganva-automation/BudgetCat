import { formatISO } from "date-fns";
import { Loader2, Plus, X } from "../../lib/icons";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
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
import type { TransactionType } from "../../types/finance";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
import { Button } from "../ui/Button";

const transactionTypes: Array<{ label: string; value: TransactionType }> = [
  { label: "Expense", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Salary", value: "salary" },
  { label: "Savings", value: "savings" },
  { label: "Goal Contribution", value: "goal_contribution" },
];

const transactionTypeEmojis: Record<TransactionType, string> = {
  expense: "🧾",
  income: "💵",
  salary: "💼",
  savings: "🌱",
  goal_contribution: "🎯",
};

const categoryEmojis: Record<string, string> = {
  salary: "💼",
  freelance: "💻",
  "business-income": "🏢",
  bonus: "🎁",
  allowance: "🤝",
  refund: "🔁",
  interest: "🏦",
  "gift-income": "🎉",
  "other-income": "💵",
  "food-groceries": "🛒",
  "dining-out": "🍽️",
  "coffee-snacks": "☕",
  transportation: "🚌",
  fuel: "⛽",
  shopping: "🛍️",
  "health-medicine": "💊",
  education: "📚",
  entertainment: "🎬",
  fitness: "🏋️",
  "personal-care": "✨",
  household: "🏠",
  pets: "🐾",
  travel: "✈️",
  "fees-charges": "🧾",
  "debt-payment": "💳",
  "other-expense": "🗂️",
  "emergency-fund": "🛡️",
  "travel-goal": "✈️",
  "home-goal": "🏠",
  "gadget-goal": "📱",
  "education-goal": "📚",
  investment: "📈",
  "general-savings": "🐷",
  "other-goal": "🎯",
};

const mobileTransactionTypes: Array<{ label: string; value: TransactionType }> =
  [
    { label: "Expense", value: "expense" },
    { label: "Income", value: "income" },
    { label: "Saving", value: "savings" },
  ];

type AddTransactionDialogProps = {
  className?: string;
  label?: ReactNode;
  ariaLabel?: string;
  compact?: boolean;
};

function getCategoryTypeForTransaction(type: TransactionType) {
  if (type === "salary") return "income";
  if (type === "income") return "income";
  if (type === "savings") return "savings";
  if (type === "goal_contribution") return "savings";

  return "expense";
}

function getTypeTone(type: TransactionType) {
  if (type === "income" || type === "salary") {
    return "text-[var(--bc-green)]";
  }

  if (type === "savings" || type === "goal_contribution") {
    return "text-[var(--bc-blue)]";
  }

  return "text-[var(--bc-red)]";
}

function formatAmountPreview(amount: string) {
  const parsedAmount = Number(amount || 0);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(parsedAmount) ? parsedAmount : 0);
}

export function AddTransactionDialog({
  className,
  label = "Add Transaction",
  ariaLabel,
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

  const buttonAriaLabel =
    ariaLabel ?? (typeof label === "string" ? label : "Add transaction");

  const selectedCategoryLabel =
    normalizeCategory(category)?.label || category || "No category yet";

  const selectedPaymentLabel =
    PAYMENT_METHOD_OPTIONS.find((method) => method.id === paymentMethod)
      ?.label ?? "Cash";

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

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  function resetForm() {
    setType("expense");
    setAmount("");
    setCategory("");
    setDate(formatISO(new Date(), { representation: "date" }));
    setPaymentMethod("cash");
    setNote("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

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
      <Button
        aria-label={buttonAriaLabel}
        className={className}
        onClick={() => setIsOpen(true)}
        variant={compact ? "secondary" : "primary"}
      >
        {compact ? (
          <>
            <Plus className="h-4 w-4" />
            <span>{label}</span>
          </>
        ) : (
          label
        )}
      </Button>

    {isOpen && typeof document !== "undefined"
  ? createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-stretch justify-center bg-black/55 p-0 backdrop-blur-md sm:items-center sm:p-5"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            setIsOpen(false);
          }
        }}
      >
        <section
          className="flex h-[100dvh] w-full max-w-none flex-col overflow-hidden rounded-none border-0 bg-[var(--bc-card)] px-4 pb-4 pt-3 shadow-none sm:h-auto sm:max-h-[calc(100dvh-3rem)] sm:max-w-lg sm:rounded-[32px] sm:border sm:border-[var(--bc-border-strong)] sm:p-4 sm:shadow-[0_24px_70px_rgba(0,0,0,0.38)]"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-[var(--bc-border-strong)] sm:hidden" />

          <header className="mb-4 flex shrink-0 items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--bc-text-muted)]">
                BudgetCat
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)]">
                Quick Add
              </h2>
            </div>

            <button
              aria-label="Close Quick Add"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] border border-[var(--bc-red)]/30 bg-[var(--bc-red-glow)] text-[var(--bc-red)] transition hover:bg-[var(--bc-red)] hover:text-white"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <form
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            onSubmit={handleSubmit}
          >
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {presets.length > 0 ? (
                <section>
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.16em] text-[var(--bc-text-muted)]">
                    Presets
                  </p>

                  <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {presets.map((preset) => (
                      <button
                        className="shrink-0 rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-3 py-2 text-xs font-black text-[var(--bc-text-soft)]"
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
                            formatISO(new Date(), {
                              representation: "date",
                            }),
                          );
                        }}
                        type="button"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                {mobileTransactionTypes.map((transactionType) => {
                  const isActive = type === transactionType.value;
                  const isExpense = transactionType.value === "expense";
                  const isSaving = transactionType.value === "savings";

                  return (
                    <button
                      className={[
                        "min-h-9 rounded-2xl border px-2 text-xs font-black transition",
                        isActive
                          ? isExpense
                            ? "border-[var(--bc-red)]/30 bg-[var(--bc-red-glow)] text-[var(--bc-red)]"
                            : isSaving
                              ? "border-[var(--bc-blue)]/30 bg-[var(--bc-blue)]/14 text-[var(--bc-blue)]"
                            : "border-[var(--bc-green)]/30 bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                          : "border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text-muted)]",
                      ].join(" ")}
                      key={transactionType.value}
                      onClick={() => setType(transactionType.value)}
                      type="button"
                    >
                      {transactionType.label}
                    </button>
                  );
                })}
              </div>

              <section className="rounded-[20px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-black text-[var(--bc-text-muted)]">
                      {selectedCategoryLabel}
                    </p>

                    <p
                      className={[
                        "mt-1 text-2xl font-black leading-none tracking-[-0.04em]",
                        getTypeTone(type),
                      ].join(" ")}
                    >
                      {formatAmountPreview(amount)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--bc-text-muted)]">
                      {type.replace("_", " ")}
                    </p>

                    <p className="mt-1 text-xs font-bold text-[var(--bc-text-soft)]">
                      {selectedPaymentLabel}
                    </p>
                  </div>
                </div>
              </section>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-1.5">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Type
                  </span>

                  <select
                    className="budget-input min-h-11 py-2.5"
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
                        {transactionTypeEmojis[transactionType.value]}{" "}
                        {transactionType.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Amount
                  </span>

                  <input
                    className="budget-input min-h-11 py-2.5"
                    inputMode="decimal"
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="PHP 0"
                    required
                    type="number"
                    value={amount}
                  />
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Category
                  </span>

                  <select
                    className="budget-input min-h-11 py-2.5"
                    onChange={(event) => setCategory(event.target.value)}
                    value={category}
                  >
                    <option value="">🏷️ Select category</option>

                    {categoryOptions.map((categoryOption) => (
                      <option
                        key={categoryOption.id}
                        value={categoryOption.id}
                      >
                        {categoryEmojis[categoryOption.id] ?? "🏷️"}{" "}
                        {categoryOption.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Date
                  </span>

                  <input
                    className="budget-input min-h-11 py-2.5"
                    onChange={(event) => setDate(event.target.value)}
                    type="date"
                    value={date}
                  />
                </label>

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Payment Method
                  </span>

                  <select
                    className="budget-input min-h-11 py-2.5"
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

                <label className="space-y-1.5 md:col-span-2">
                  <span className="text-xs font-black text-[var(--bc-text)]">
                    Note
                  </span>

                  <textarea
                    className="budget-input min-h-[58px] resize-none py-2.5"
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Optional details"
                    rows={2}
                    value={note}
                  />
                </label>
              </div>
            </div>

            <div className="shrink-0 border-t border-[var(--bc-border)] bg-[var(--bc-card)] pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-3 sm:pb-0">
              <div className="grid grid-cols-[0.72fr_1fr] gap-2">
                <Button
                  className="min-h-11"
                  disabled={isSaving}
                  onClick={() => setIsOpen(false)}
                  type="button"
                  variant="urgent"
                >
                  Cancel
                </Button>

                <Button
                  className="min-h-11"
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
                  ) : null}

                  {isSaving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </form>
        </section>
      </div>,
      document.body,
    )
  : null}
  </>
);
}
