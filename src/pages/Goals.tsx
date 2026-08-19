import {
  format,
  isValid,
  parseISO,
} from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  Trophy,
  Wallet,
} from "../lib/icons";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { AddGoalDialog } from "../components/goals/AddGoalDialog";
import {
  BudgetCatMascot,
  type MascotVariant,
} from "../components/mascot/BudgetCatMascot";
import { AnimatedStatusIcon } from "../components/ui/AnimatedStatusIcon";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/useToast";
import {
  getGoalMonthsLeft,
  getGoalProgress,
  getGoalRemaining,
  getSuggestedMonthlySaving,
} from "../lib/calculations";
import { getGoalIcon } from "../lib/iconMap";
import {
  addLocalGoalContribution,
  db,
  softDeleteLocalGoal,
  updateLocalGoal,
} from "../lib/localDb";
import { getMascotMood } from "../lib/mascotMood";
import { getGoalReminders } from "../lib/reminders";
import { requestBackgroundSync } from "../lib/requestBackgroundSync";
import { playCreateSuccessFeedback } from "../lib/soundFeedback";
import { cn, formatCurrency } from "../lib/utils";
import type {
  BudgetCatUser,
  GoalPriority,
  GoalStatus,
  GoalType,
  LocalGoal,
} from "../types/finance";

const goalTypeLabels: Record<GoalType, string> = {
  financial_freedom: "Financial Freedom",
  travel: "Travel",
  purchase: "Purchase",
  emergency: "Emergency Savings",
  savings: "Savings",
  investment: "Investment",
};

const priorityLabels: Record<GoalPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const statusLabels: Record<GoalStatus, string> = {
  active: "Active",
  completed: "Completed",
  paused: "Paused",
};

function safeDate(dateString?: string | null) {
  if (!dateString) return null;

  const parsedDate = parseISO(dateString);

  if (!isValid(parsedDate)) return null;

  return parsedDate;
}

function formatGoalDate(dateString?: string | null, dateFormat = "MMM d, yyyy") {
  const parsedDate = safeDate(dateString);

  if (!parsedDate) return "No date";

  return format(parsedDate, dateFormat);
}

function getPriorityRank(priority: GoalPriority) {
  if (priority === "high") return 0;
  if (priority === "medium") return 1;
  return 2;
}

function getGoalDisplayIcon(goal: LocalGoal) {
  const mappedIcon = getGoalIcon(goal)?.trim();

  if (mappedIcon) return mappedIcon;

  const searchText = [goal.type, goal.title, goal.note]
    .join(" ")
    .toLowerCase();

  if (searchText.includes("travel") || searchText.includes("vacation")) {
    return "✈️";
  }

  if (searchText.includes("emergency") || searchText.includes("safety")) {
    return "🛡️";
  }

  if (
    searchText.includes("investment") ||
    searchText.includes("financial freedom")
  ) {
    return "📈";
  }

  if (
    searchText.includes("purchase") ||
    searchText.includes("buy") ||
    searchText.includes("gadget")
  ) {
    return "🛍️";
  }

  if (searchText.includes("home") || searchText.includes("house")) {
    return "🏠";
  }

  return "🌱";
}

function getGoalProgressTone(progress: number) {
  if (progress >= 100) {
    return {
      fill: "bc-progress-fill",
      text: "text-[var(--bc-green)]",
      card: "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)]",
      label: "Completed",
    };
  }

  if (progress >= 60) {
    return {
      fill: "bc-progress-fill",
      text: "text-[var(--bc-green)]",
      card: "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)]",
      label: "On track",
    };
  }

  if (progress >= 25) {
    return {
      fill: "bc-progress-fill-warning",
      text: "text-[var(--bc-amber)]",
      card: "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)]",
      label: "Building",
    };
  }

  return {
    fill: "bc-progress-fill-danger",
    text: "text-[var(--bc-red)]",
    card: "border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)]",
    label: "Early stage",
  };
}

function GoalRow({
  goal,
  onEdit,
  onAddMoney,
  onDelete,
}: {
  goal: LocalGoal;
  onEdit: (goal: LocalGoal) => void;
  onAddMoney: (goal: LocalGoal) => void;
  onDelete: (goal: LocalGoal) => void;
}) {
  const progress = getGoalProgress(goal);
  const tone = getGoalProgressTone(progress);
  const remaining = getGoalRemaining(goal);
  const monthsLeft = getGoalMonthsLeft(goal);

  return (
    <article className="rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-4">
      <button
        className="flex w-full items-start gap-3 text-left"
        onClick={() => onEdit(goal)}
        type="button"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-2xl">
          {getGoalDisplayIcon(goal)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-[var(--bc-text)]">
                {goal.title}
              </h3>
              <p className="mt-1 truncate text-[11px] font-semibold text-[var(--bc-text-muted)]">
                {goalTypeLabels[goal.type]} • Target{" "}
                {formatGoalDate(goal.target_date)}
              </p>
            </div>

            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-1 text-[10px] font-black",
                tone.card,
                tone.text,
              )}
            >
              {progress}%
            </span>
          </div>

          <p className="mt-3 text-sm font-black text-[var(--bc-text)]">
            {formatCurrency(goal.current_amount)} /{" "}
            {formatCurrency(goal.target_amount)}
          </p>

          <div className="mt-3 bc-progress-track">
            <div
              className={cn("bc-progress-fill", tone.fill)}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-3 text-[11px] font-semibold text-[var(--bc-text-muted)]">
            <span>{formatCurrency(remaining)} left</span>
            <span>{monthsLeft} month{monthsLeft === 1 ? "" : "s"} left</span>
          </div>
        </div>
      </button>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          className="bc-button bc-button-secondary min-h-10 rounded-2xl py-2 text-xs"
          onClick={() => onEdit(goal)}
          type="button"
        >
          <Pencil className="h-4 w-4" />
          View
        </button>

        <button
          className="bc-button bc-button-primary min-h-10 rounded-2xl py-2 text-xs"
          onClick={() => onAddMoney(goal)}
          type="button"
        >
          <Plus className="h-4 w-4" />
          Add
        </button>

        <button
          className="bc-button bc-button-danger min-h-10 rounded-2xl py-2 text-xs"
          onClick={() => onDelete(goal)}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}

export function Goals() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";

  const [editingGoal, setEditingGoal] = useState<LocalGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<LocalGoal | null>(
    null,
  );

  const goals =
    useLiveQuery(
      () =>
        db.goals
          .where("household_id")
          .equals(householdId)
          .filter((goal) => !goal.deleted_at)
          .toArray(),
      [householdId],
      [],
    ) ?? [];

  const goalReminders = getGoalReminders(goals);

  const sortedGoals = useMemo(() => {
    return [...goals].sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "active") return -1;
        if (b.status === "active") return 1;
      }

      const prioritySort =
        getPriorityRank(a.priority) - getPriorityRank(b.priority);

      if (prioritySort !== 0) return prioritySort;

      return a.target_date.localeCompare(b.target_date);
    });
  }, [goals]);

  const activeGoals = sortedGoals.filter(
    (goal) => goal.status === "active" && getGoalProgress(goal) < 100,
  );
  const completedGoals = sortedGoals.filter(
    (goal) => goal.status === "completed" || getGoalProgress(goal) >= 100,
  );

  const featuredGoal = activeGoals[0] ?? sortedGoals[0];

  const totalTarget = goals.reduce((sum, goal) => {
    const targetAmount = Number(goal.target_amount || 0);
    return (
      sum +
      (Number.isFinite(targetAmount) && targetAmount >= 0 ? targetAmount : 0)
    );
  }, 0);
  const totalSaved = goals.reduce((sum, goal) => {
    const currentAmount = Number(goal.current_amount || 0);
    return (
      sum +
      (Number.isFinite(currentAmount) && currentAmount >= 0
        ? currentAmount
        : 0)
    );
  }, 0);
  const totalFundedTowardTargets = goals.reduce((sum, goal) => {
    const targetAmount = Number(goal.target_amount || 0);
    const currentAmount = Number(goal.current_amount || 0);
    const safeTarget =
      Number.isFinite(targetAmount) && targetAmount >= 0 ? targetAmount : 0;
    const safeCurrent =
      Number.isFinite(currentAmount) && currentAmount >= 0 ? currentAmount : 0;

    return sum + Math.min(safeTarget, safeCurrent);
  }, 0);
  const totalRemaining = goals.reduce(
    (sum, goal) => sum + getGoalRemaining(goal),
    0,
  );
  const overallProgress =
    totalTarget <= 0
      ? 0
      : Math.min(
          100,
          Math.round((totalFundedTowardTargets / totalTarget) * 100),
        );

  const mascotMood = getMascotMood({
    dueDates: [],
    goals,
    monthlyExpenses: 0,
    monthlyIncome: 0,
    pendingSyncCount: 0,
    remainingMoney: 0,
    savings: totalSaved,
    transactions: [],
  });
  const featuredGoalProgress = featuredGoal ? getGoalProgress(featuredGoal) : 0;

const isFeaturedGoalCompleted =
  Boolean(featuredGoal) &&
  (featuredGoal?.status === "completed" || featuredGoalProgress >= 100);

const heroMascotVariant: MascotVariant =
  goals.length === 0
    ? "bonnie"
    : isFeaturedGoalCompleted
      ? "achieved"
      : "savings";

const heroMascotFrameClass =
  heroMascotVariant === "achieved"
    ? "h-[126px] w-[126px]"
    : heroMascotVariant === "savings"
      ? "h-[122px] w-[122px]"
      : "h-[106px] w-[106px]";

const heroMascotScaleClass =
  heroMascotVariant === "achieved"
    ? "scale-[1.20]"
    : heroMascotVariant === "savings"
      ? "scale-[1.20]"
      : "scale-100";

  async function deleteGoal(goal: LocalGoal) {
    const confirmed = window.confirm(`Delete ${goal.title}?`);

    if (!confirmed) return;

    await softDeleteLocalGoal(goal.id);

    if (user) {
      requestBackgroundSync(user, "goal_deleted");
    }
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[430px] px-[clamp(1rem,5vw,1.25rem)] pb-28 pt-5 md:max-w-none md:px-0 md:pb-8 md:pt-0">
        <header className="mb-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
              Savings Plan
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)] md:text-3xl">
              Goals
            </h1>
            <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
              Stay focused. Reach your dreams.
            </p>
          </div>

          <AddGoalDialog
            className="bc-button bc-button-primary h-11 min-h-11 rounded-2xl px-4"
            compact
            label="New Goal"
          />
        </header>

        <section className="bc-card mb-4 overflow-visible p-4">
          <div className="flex items-center gap-3 overflow-visible">
            <BudgetCatMascot
              className={cn("shrink-0 overflow-visible", heroMascotFrameClass)}
              imageClassName={cn(
                "h-full w-full max-w-none origin-center object-contain object-center shadow-none drop-shadow-none transition-transform duration-300",
                heroMascotScaleClass,
              )}
              variant={heroMascotVariant}
            />

            <div className="min-w-0 flex-1 self-center">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--bc-text-muted)]">
                    Featured goal
                  </p>
                  <h2 className="mt-1 truncate text-lg font-black tracking-[-0.04em] text-[var(--bc-text)]">
                    {featuredGoal ? featuredGoal.title : "Start your first goal"}
                  </h2>
                </div>

                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--bc-border)] bg-[var(--bc-green-glow)] px-2.5 py-1 text-[10px] font-black text-[var(--bc-green)]">
                  <Sparkles className="h-3.5 w-3.5" />
                  {overallProgress}%
                </div>
              </div>

              <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                {goals.length === 0
                  ? "Add your first goal to start building momentum."
                  : mascotMood.message}
              </p>
            </div>
          </div>

          {featuredGoal && (
            <>
              <p className="mt-4 text-xl font-black tracking-[-0.05em] text-[var(--bc-text)]">
                {formatCurrency(featuredGoal.current_amount)} / {formatCurrency(featuredGoal.target_amount)}
              </p>

              <div className="mt-3 bc-progress-track">
                <div
                  className="bc-progress-fill"
                  style={{ width: `${getGoalProgress(featuredGoal)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-[11px] font-bold text-[var(--bc-text-muted)]">
                <span>{getGoalProgress(featuredGoal)}% complete</span>
                <span>{getGoalMonthsLeft(featuredGoal)} months left</span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="bc-button bc-button-secondary w-full"
                  onClick={() => setEditingGoal(featuredGoal)}
                  type="button"
                >
                  <Pencil className="h-4.5 w-4.5" />
                  View
                </button>
                <button
                  className="bc-button bc-button-primary w-full"
                  onClick={() => setContributionGoal(featuredGoal)}
                  type="button"
                >
                  <Plus className="h-4.5 w-4.5" />
                  Add Money
                </button>
              </div>
            </>
          )}
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-[20px] border border-[var(--bc-green)]/15 bg-[var(--bc-green-glow)] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
              Saved
            </p>
            <p className="mt-2 text-lg font-black tracking-[-0.04em] text-[var(--bc-green)]">
              {formatCurrency(totalSaved)}
            </p>
          </div>

          <div className="rounded-[20px] border border-[var(--bc-amber)]/15 bg-[var(--bc-amber-glow)] p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.08em] text-[var(--bc-text-muted)]">
              Remaining
            </p>
            <p className="mt-2 text-lg font-black tracking-[-0.04em] text-[var(--bc-amber)]">
              {formatCurrency(totalRemaining)}
            </p>
          </div>

        </section>

        {goalReminders.length > 0 && (
          <section className="mb-4 space-y-2">
            {goalReminders.slice(0, 2).map((reminder) => (
              <article
                className="rounded-[22px] border border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] p-4"
                key={reminder.id}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-xl">
                    {reminder.icon || "🌱"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[var(--bc-amber)]">
                      Goal reminder
                    </p>
                    <h2 className="mt-1 text-sm font-black text-[var(--bc-text)]">
                      {reminder.title}
                    </h2>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                      {reminder.body}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}

        <section className="mb-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
              All Goals
            </h2>

            <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-3 py-1 text-[11px] font-black text-[var(--bc-text-muted)]">
              {goals.length} total
            </span>
          </div>

          <div className="space-y-3">
            {sortedGoals.map((goal) => (
              <GoalRow
                goal={goal}
                key={goal.id}
                onAddMoney={setContributionGoal}
                onDelete={deleteGoal}
                onEdit={setEditingGoal}
              />
            ))}

            {goals.length === 0 && (
              <div className="bc-card p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-green-glow)] text-[var(--bc-green)]">
                  <Target className="h-6 w-6" />
                </div>

                <h2 className="mt-4 text-lg font-black text-[var(--bc-text)]">
                  No goals yet
                </h2>
                <p className="mx-auto mt-2 max-w-sm text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  Start with one calm, practical savings target. Bonnie will
                  keep it visible.
                </p>

                <div className="mt-5 flex justify-center">
                  <AddGoalDialog
                    className="bc-button bc-button-primary"
                    label="Create Goal"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {completedGoals.length > 0 && (
          <section className="bc-card p-4">
            <div className="flex items-start gap-3">
              <div className="bc-icon-circle-green">
                <Trophy className="h-4.5 w-4.5" />
              </div>

              <div>
                <h2 className="text-sm font-black text-[var(--bc-text)]">
                  Completed goals
                </h2>
                <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                  {completedGoals.length} goal
                  {completedGoals.length === 1 ? "" : "s"} reached. Great
                  progress.
                </p>
              </div>
            </div>
          </section>
        )}
      </div>

      <EditGoalModal
        goal={editingGoal}
        onClose={() => setEditingGoal(null)}
        user={user}
      />

      <ContributionModal
        goal={contributionGoal}
        onClose={() => setContributionGoal(null)}
        user={user}
      />
    </>
  );
}

function EditGoalModal({
  goal,
  onClose,
  user,
}: {
  goal: LocalGoal | null;
  onClose: () => void;
  user: BudgetCatUser | null;
}) {
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [status, setStatus] = useState<GoalStatus>("active");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!goal) return;

    setTitle(goal.title);
    setGoalType(goal.type);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date);
    setPriority(goal.priority);
    setStatus(goal.status);
    setNote(goal.note ?? "");
  }, [goal]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();

    if (!goal || isSaving) return;

    setIsSaving(true);

    try {
      await updateLocalGoal(goal.id, {
        title: title || "New Goal",
        type: goalType,
        target_amount: Number(targetAmount || 0),
        current_amount: Number(currentAmount || 0),
        target_date: targetDate,
        priority,
        status,
        note,
      });

      if (user) {
        requestBackgroundSync(user, "goal_updated");
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  }

  if (!goal) return null;

  const progress = getGoalProgress(goal);
  const tone = getGoalProgressTone(progress);

  return (
    <Modal isOpen={Boolean(goal)} onClose={onClose} title="Goal Details">
      <form className="space-y-5" onSubmit={handleSave}>
        <section className="rounded-[26px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/70 p-4 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-4xl">
            {getGoalDisplayIcon(goal)}
          </div>

          <p className="mt-3 text-lg font-black text-[var(--bc-text)]">
            {goal.title}
          </p>
          <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
            {goalTypeLabels[goal.type]} • {statusLabels[goal.status]}
          </p>

          <p className={cn("mt-3 text-3xl font-black tracking-[-0.06em]", tone.text)}>
            {progress}%
          </p>

          <p className="mt-1 text-sm font-black text-[var(--bc-text)]">
            {formatCurrency(goal.current_amount)} /{" "}
            {formatCurrency(goal.target_amount)}
          </p>

          <div className="mt-4 bc-progress-track">
            <div
              className={cn("bc-progress-fill", tone.fill)}
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="mt-3 text-xs font-semibold text-[var(--bc-text-muted)]">
            {getGoalMonthsLeft(goal)} months left • Suggested{" "}
            {formatCurrency(getSuggestedMonthlySaving(goal))} monthly
          </p>
        </section>

        <section className="grid gap-3 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-card)] p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Target Date
            </span>
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              {formatGoalDate(goal.target_date)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Remaining
            </span>
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              {formatCurrency(getGoalRemaining(goal))}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Priority
            </span>
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              {priorityLabels[goal.priority]}
            </span>
          </div>

          {goal.note ? (
            <div className="border-t border-[var(--bc-border)] pt-3">
              <p className="text-xs font-black text-[var(--bc-text-muted)]">
                About this goal
              </p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--bc-text-soft)]">
                {goal.note}
              </p>
            </div>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Title
              </span>
              <input
                className="bc-input"
                onChange={(event) => setTitle(event.target.value)}
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
                {Object.entries(goalTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Target Amount
              </span>
              <input
                className="bc-input"
                min="0.01"
                onChange={(event) => setTargetAmount(event.target.value)}
                required
                step="0.01"
                type="number"
                value={targetAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Current Amount
              </span>
              <input
                className="bc-input"
                min="0"
                onChange={(event) => setCurrentAmount(event.target.value)}
                step="0.01"
                type="number"
                value={currentAmount}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Target Date
              </span>
              <input
                className="bc-input"
                onChange={(event) => setTargetDate(event.target.value)}
                required
                type="date"
                value={targetDate}
              />
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
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2 md:col-span-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Status
              </span>
              <select
                className="bc-input"
                onChange={(event) => setStatus(event.target.value as GoalStatus)}
                value={status}
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              About this goal
            </span>
            <textarea
              className="bc-input min-h-24 resize-none"
              onChange={(event) => setNote(event.target.value)}
              value={note}
            />
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="bc-button bc-button-secondary"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>

          <button
            className="bc-button bc-button-primary"
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
              <Clock3 className="h-4.5 w-4.5" />
            )}
            {isSaving ? "Saving..." : "Save Goal"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ContributionModal({
  goal,
  onClose,
  user,
}: {
  goal: LocalGoal | null;
  onClose: () => void;
  user: BudgetCatUser | null;
}) {
  const showToast = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!goal) return;

    setAmount("");
    setNote(`Contribution to ${goal.title}`);
  }, [goal]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!goal || !user || isSaving) return;

    setIsSaving(true);

    try {
      await addLocalGoalContribution(
        {
          goal_id: goal.id,
          amount: Number(amount || 0),
          date: format(new Date(), "yyyy-MM-dd"),
          note,
        },
        user.id,
        user.householdId,
      );

      requestBackgroundSync(user, "goal_contribution_added");
      playCreateSuccessFeedback();
      showToast({
        title: "Savings added 🌱",
        message: `${formatCurrency(Number(amount))} was added to ${goal.title}.`,
        tone: "success",
      });
      onClose();
    } catch {
      showToast({
        title: "Contribution not saved",
        message: "Check the amount and try again. Your goal was not changed.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Modal isOpen={Boolean(goal)} onClose={onClose} title="Add Money">
      <form className="space-y-5" onSubmit={handleSave}>
        <section className="rounded-[26px] border border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-2xl">
              {goal ? getGoalDisplayIcon(goal) : "🌱"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--bc-text)]">
                {goal?.title ?? "Goal"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                Add a contribution and BudgetCat will update the progress.
              </p>
            </div>
          </div>
        </section>

        <label className="block space-y-2">
          <span className="text-xs font-black text-[var(--bc-text-soft)]">
            Amount
          </span>

          <div className="flex min-h-[84px] items-center rounded-[24px] border border-[var(--bc-border)] bg-[var(--bc-card)] px-4 focus-within:border-[var(--bc-green)]/60 focus-within:ring-4 focus-within:ring-[var(--bc-green-glow)]">
            <span className="mr-2 text-3xl font-black tracking-[-0.06em] text-[var(--bc-text-muted)]">
              ₱
            </span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent text-4xl font-black tracking-[-0.07em] text-[var(--bc-text)] outline-none placeholder:text-[var(--bc-text-muted)]"
              inputMode="decimal"
              min="0.01"
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0.00"
              required
              step="0.01"
              type="number"
              value={amount}
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-xs font-black text-[var(--bc-text-soft)]">
            Note
          </span>
          <textarea
            className="bc-input min-h-24 resize-none"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>

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
                label="Saving contribution"
              />
            ) : (
              <CheckCircle2 className="h-4.5 w-4.5" />
            )}
            {isSaving ? "Saving..." : "Save Contribution"}
          </button>

          <button
            className="w-full rounded-2xl py-3 text-sm font-black text-[var(--bc-text-muted)] hover:text-[var(--bc-text)]"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
