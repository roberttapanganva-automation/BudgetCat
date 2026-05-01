import { useLiveQuery } from "dexie-react-hooks";
import { type FormEvent, useEffect, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddGoalDialog } from "../components/goals/AddGoalDialog";
import { GoalCard } from "../components/goals/GoalCard";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Modal } from "../components/ui/Modal";
import { useAuth } from "../contexts/AuthContext";
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
import type { GoalPriority, GoalType, LocalGoal } from "../types/finance";
import { formatCurrency } from "../lib/utils";
import {
  getGoalMonthsLeft,
  getGoalProgress,
  getGoalRemaining,
  getSuggestedMonthlySaving,
} from "../lib/calculations";

export function Goals() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
  const [editingGoal, setEditingGoal] = useState<LocalGoal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<LocalGoal | null>(null);
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
  const mascotMood = getMascotMood({
    dueDates: [],
    goals,
    monthlyExpenses: 0,
    monthlyIncome: 0,
    pendingSyncCount: 0,
    remainingMoney: 0,
    savings: 0,
    transactions: [],
  });
  const hasAchievedGoal = goals.some(
    (goal) => !goal.deleted_at && goal.target_amount > 0 && goal.current_amount >= goal.target_amount,
  );
  const mobileMascotVariant =
    goals.length === 0 ? "bonnie" : hasAchievedGoal ? "both" : mascotMood.variant;

  async function deleteGoal(goal: LocalGoal) {
    const confirmed = window.confirm(`Delete ${goal.title}?`);
    if (!confirmed) return;
    await softDeleteLocalGoal(goal.id);
    requestBackgroundSync(user, "goal_deleted");
  }

  return (
    <>
      <div className="md:hidden space-y-4">
        <section className="flex items-start gap-3">
          <BudgetCatMascot
            className="shrink-0"
            imageClassName="w-16 object-contain object-center"
            variant={mobileMascotVariant}
          />
          <div className="min-w-0 pt-1">
            <h1 className="mt-1 text-2xl font-black text-budget-text">Goals</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
              {goals.length === 0
                ? "Bonnie says: Add your first goal to start building momentum."
                : mascotMood.message}
            </p>
          </div>
        </section>

        <div>
          <AddGoalDialog />
        </div>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black">Goal reminders</h2>
              <p className="text-sm font-semibold text-budget-text/55">
                Steady savings, calm progress.
              </p>
            </div>
          </div>
          <ReminderList
            emptyText="No goal reminders right now."
            limit={4}
            reminders={goalReminders}
          />
        </Card>

        <section className="grid gap-3">
          {goals.map((goal) => {
            const progress = getGoalProgress(goal);
            const progressTone =
              progress >= 100
                ? "bg-budget-success"
                : progress >= 60
                  ? "bg-budget-warning"
                  : "bg-budget-urgent";

            return (
              <Card className="p-4" key={goal.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-black text-budget-text">{goal.title}</p>
                    <p className="mt-1 text-sm font-semibold text-budget-text/55">
                      {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-budget-background px-3 py-1 text-xs font-black text-budget-text">
                    {progress}%
                  </span>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-budget-background ring-1 ring-budget-border">
                  <div
                    className={progressTone}
                    style={{ width: `${progress}%`, height: "100%" }}
                  />
                </div>

                <div className="mt-4 grid gap-2 text-sm font-semibold text-budget-text/65">
                  <p>
                    Target date: <strong className="text-budget-text">{goal.target_date}</strong>
                  </p>
                  <p>
                    Remaining: {formatCurrency(getGoalRemaining(goal))} • Months left:{" "}
                    {getGoalMonthsLeft(goal)}
                  </p>
                  <p>
                    Suggested monthly amount: {formatCurrency(getSuggestedMonthlySaving(goal))}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button onClick={() => setEditingGoal(goal)} variant="secondary">
                    Edit
                  </Button>
                  <Button onClick={() => setContributionGoal(goal)} variant="secondary">
                    Add Contribution
                  </Button>
                  <Button
                    className="text-budget-urgent"
                    onClick={() => deleteGoal(goal)}
                    variant="ghost"
                  >
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}

          {goals.length === 0 && (
            <Card className="p-5 text-sm font-semibold text-budget-text/55">
              No goals have been added yet.
            </Card>
          )}
        </section>
      </div>

      <div className="hidden md:block">
        <PageHeader
          action={<AddGoalDialog />}
          subtitle="Long-term goals, travel plans, purchases, and emergency savings."
          title="Goals"
        />
        <section className="mb-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-budget-primary">
                  {mascotMood.iconLabel}
                </p>
                <h2 className="mt-2 text-xl font-black">{mascotMood.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
                  {mascotMood.message}
                </p>
              </div>
              <BudgetCatMascot
                imageClassName="w-28 object-contain"
                variant={mascotMood.variant === "both" ? "savings" : mascotMood.variant}
              />
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Goal reminders</h2>
                <p className="text-sm font-semibold text-budget-text/55">
                  Steady savings, calm progress.
                </p>
              </div>
            </div>
            <ReminderList
              emptyText="No goal reminders right now."
              limit={4}
              reminders={goalReminders}
            />
          </Card>
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          {goals.map((goal) => (
            <GoalCard
              goal={goal}
              key={goal.id}
              onAddContribution={setContributionGoal}
              onDelete={deleteGoal}
              onEdit={setEditingGoal}
            />
          ))}
          {goals.length === 0 && (
            <Card className="p-8 text-sm font-semibold text-budget-text/55">
              No goals have been added yet.
            </Card>
          )}
        </section>
      </div>
      <EditGoalModal goal={editingGoal} onClose={() => setEditingGoal(null)} user={user} />
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
  user: ReturnType<typeof useAuth>["user"];
}) {
  const [title, setTitle] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [priority, setPriority] = useState<GoalPriority>("medium");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!goal) return;
    setTitle(goal.title);
    setGoalType(goal.type);
    setTargetAmount(String(goal.target_amount));
    setCurrentAmount(String(goal.current_amount));
    setTargetDate(goal.target_date);
    setPriority(goal.priority);
    setNote(goal.note ?? "");
  }, [goal]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal) return;

    await updateLocalGoal(goal.id, {
      title: title || "New Goal",
      type: goalType,
      target_amount: Number(targetAmount || 0),
      current_amount: Number(currentAmount || 0),
      target_date: targetDate,
      priority,
      note,
    });

    requestBackgroundSync(user, "goal_updated");
    onClose();
  }

  return (
    <Modal isOpen={Boolean(goal)} onClose={onClose} title="Edit goal">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSave}>
        <label className="grid gap-2 text-sm font-bold">
          Title
          <input
            className="budget-input"
            onChange={(event) => setTitle(event.target.value)}
            required
            value={title}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Goal Type
          <select
            className="budget-input"
            onChange={(event) => setGoalType(event.target.value as GoalType)}
            value={goalType}
          >
            <option value="financial_freedom">Financial Freedom</option>
            <option value="travel">Travel</option>
            <option value="purchase">Purchase</option>
            <option value="emergency">Emergency</option>
            <option value="savings">Savings</option>
            <option value="investment">Investment</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Target Amount
          <input
            className="budget-input"
            min="0"
            onChange={(event) => setTargetAmount(event.target.value)}
            required
            type="number"
            value={targetAmount}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Current Amount
          <input
            className="budget-input"
            min="0"
            onChange={(event) => setCurrentAmount(event.target.value)}
            type="number"
            value={currentAmount}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Target Date
          <input
            className="budget-input"
            onChange={(event) => setTargetDate(event.target.value)}
            required
            type="date"
            value={targetDate}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Priority
          <select
            className="budget-input"
            onChange={(event) => setPriority(event.target.value as GoalPriority)}
            value={priority}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold sm:col-span-2">
          Note
          <textarea
            className="budget-input min-h-24 resize-none"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit">Save Goal</Button>
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
  user: ReturnType<typeof useAuth>["user"];
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!goal) return;
    setAmount("");
    setNote(`Contribution to ${goal.title}`);
  }, [goal]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!goal || !user) return;

    await addLocalGoalContribution(
      {
        goal_id: goal.id,
        amount: Number(amount || 0),
        date: new Date().toISOString().slice(0, 10),
        note,
      },
      user.id,
      user.householdId,
    );

    requestBackgroundSync(user, "goal_contribution_added");
    playCreateSuccessFeedback();
    onClose();
  }

  return (
    <Modal isOpen={Boolean(goal)} onClose={onClose} title="Add contribution">
      <form className="grid gap-4" onSubmit={handleSave}>
        <p className="rounded-lg bg-budget-background px-4 py-3 text-sm font-semibold text-budget-text/65">
          {goal?.title}
        </p>
        <label className="grid gap-2 text-sm font-bold">
          Amount
          <input
            className="budget-input"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            required
            type="number"
            value={amount}
          />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Note
          <textarea
            className="budget-input min-h-24 resize-none"
            onChange={(event) => setNote(event.target.value)}
            value={note}
          />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={onClose} type="button" variant="secondary">
            Cancel
          </Button>
          <Button type="submit">Save Contribution</Button>
        </div>
      </form>
    </Modal>
  );
}
