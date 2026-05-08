import { formatISO } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
  Sparkles,
  Target,
} from "../../lib/icons";
import { type FormEvent, useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { addLocalGoal } from "../../lib/localDb";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import { playCreateSuccessFeedback } from "../../lib/soundFeedback";
import { cn } from "../../lib/utils";
import type { GoalPriority, GoalType } from "../../types/finance";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
import { Modal } from "../ui/Modal";

type AddGoalDialogProps = {
  className?: string;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
};

const goalTypes: Array<{ label: string; value: GoalType; helper: string }> = [
  {
    label: "Savings",
    value: "savings",
    helper: "General savings goal",
  },
  {
    label: "Emergency Savings",
    value: "emergency",
    helper: "Safety net and backup fund",
  },
  {
    label: "Travel",
    value: "travel",
    helper: "Trips, vacation, flights",
  },
  {
    label: "Purchase",
    value: "purchase",
    helper: "Things you plan to buy",
  },
  {
    label: "Investment",
    value: "investment",
    helper: "Long-term growth",
  },
  {
    label: "Financial Freedom",
    value: "financial_freedom",
    helper: "Big future milestone",
  },
];

const priorities: Array<{ label: string; value: GoalPriority }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

function getGoalTypeEmoji(type: GoalType) {
  if (type === "travel") return "✈️";
  if (type === "emergency") return "🛡️";
  if (type === "purchase") return "🛍️";
  if (type === "investment") return "📈";
  if (type === "financial_freedom") return "🌟";
  return "🌱";
}

export function AddGoalDialog({
  className,
  label = "New Goal",
  ariaLabel = label,
  compact = false,
}: AddGoalDialogProps) {
  const { user } = useAuth();
  const showToast = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState(
    formatISO(new Date(), { representation: "date" }),
  );
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [note, setNote] = useState("");

  function resetForm() {
    setTitle("");
    setGoalType("savings");
    setTargetAmount("");
    setCurrentAmount("");
    setTargetDate(formatISO(new Date(), { representation: "date" }));
    setPriority("medium");
    setNote("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!user || isSaving) return;

    setIsSaving(true);

    try {
      await addLocalGoal(
        {
          type: goalType,
          title: title || "New Goal",
          target_amount: Number(targetAmount || 0),
          current_amount: Number(currentAmount || 0),
          target_date:
            targetDate || formatISO(new Date(), { representation: "date" }),
          priority,
          status: "active",
          note,
        },
        user.id,
        user.householdId,
      );

      resetForm();
      setIsOpen(false);

      showToast({
        title: "Goal added 🌱",
        message: "Bonnie will help you keep steady progress.",
        tone: "success",
      });

      playCreateSuccessFeedback();
      requestBackgroundSync(user, "goal_created");
    } catch {
      showToast({
        title: "Save failed ⚠️",
        message: "BudgetCat could not save this goal yet. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <button
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-2xl font-black transition active:scale-[0.98]",
          className ?? "bc-button bc-button-primary min-h-11 px-4 text-sm",
        )}
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus className={compact ? "h-5 w-5" : "h-4.5 w-4.5"} />
        {label}
      </button>

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="New Goal">
        <form className="space-y-5" onSubmit={handleSubmit}>
          <section className="rounded-[26px] border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-2xl">
                {getGoalTypeEmoji(goalType)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--bc-text)]">
                  Build a savings goal
                </p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  Set a target, add money over time, and track your progress
                  clearly.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Goal Name
              </span>
              <input
                className="bc-input"
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Emergency Fund, Vacation 2026..."
                required
                value={title}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Goal Type
              </span>
              <select
                className="bc-input"
                onChange={(event) => setGoalType(event.target.value as GoalType)}
                value={goalType}
              >
                {goalTypes.map((typeOption) => (
                  <option key={typeOption.value} value={typeOption.value}>
                    {typeOption.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] font-semibold text-[var(--bc-text-muted)]">
                {goalTypes.find((typeOption) => typeOption.value === goalType)
                  ?.helper ?? "Savings goal"}
              </p>
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Target Amount
                </span>

                <div className="flex min-h-[72px] items-center rounded-[24px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-4 focus-within:border-[var(--bc-green)]/60 focus-within:ring-4 focus-within:ring-[var(--bc-green-glow)]">
                  <span className="mr-2 text-2xl font-black tracking-[-0.06em] text-[var(--bc-text-muted)]">
                    ₱
                  </span>
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-black tracking-[-0.07em] text-[var(--bc-text)] outline-none placeholder:text-[var(--bc-text-muted)]"
                    inputMode="decimal"
                    onChange={(event) => setTargetAmount(event.target.value)}
                    placeholder="0.00"
                    required
                    type="number"
                    value={targetAmount}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Current Amount
                </span>

                <div className="flex min-h-[72px] items-center rounded-[24px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-4 focus-within:border-[var(--bc-blue)]/60 focus-within:ring-4 focus-within:ring-[var(--bc-blue)]/10">
                  <span className="mr-2 text-2xl font-black tracking-[-0.06em] text-[var(--bc-text-muted)]">
                    ₱
                  </span>
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-3xl font-black tracking-[-0.07em] text-[var(--bc-text)] outline-none placeholder:text-[var(--bc-text-muted)]"
                    inputMode="decimal"
                    onChange={(event) => setCurrentAmount(event.target.value)}
                    placeholder="0.00"
                    type="number"
                    value={currentAmount}
                  />
                </div>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Target Date
                </span>
                <div className="relative">
                  <CalendarDays className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--bc-text-muted)]" />
                  <input
                    className="bc-input pr-10"
                    onChange={(event) => setTargetDate(event.target.value)}
                    required
                    type="date"
                    value={targetDate}
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-black text-[var(--bc-text-soft)]">
                  Priority
                </span>
                <select
                  className="bc-input"
                  onChange={(event) =>
                    setPriority(event.target.value as GoalPriority)
                  }
                  value={priority}
                >
                  {priorities.map((priorityOption) => (
                    <option key={priorityOption.value} value={priorityOption.value}>
                      {priorityOption.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                About this goal{" "}
                <span className="font-semibold text-[var(--bc-text-muted)]">
                  (optional)
                </span>
              </span>
              <textarea
                className="bc-input min-h-24 resize-none"
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why this goal matters..."
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
                  label="Saving goal"
                />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5" />
              )}
              {isSaving ? "Saving..." : "Save Goal"}
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

export default AddGoalDialog;