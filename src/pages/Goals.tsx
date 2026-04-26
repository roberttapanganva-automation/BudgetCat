import { useLiveQuery } from "dexie-react-hooks";
import { CoachCard } from "../components/dashboard/CoachCard";
import { PageHeader } from "../components/dashboard/PageHeader";
import { AddGoalDialog } from "../components/goals/AddGoalDialog";
import { GoalCard } from "../components/goals/GoalCard";
import { ReminderList } from "../components/reminders/ReminderCard";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { getBudgetCatCoachMessages } from "../lib/budgetCatCoach";
import { db } from "../lib/localDb";
import { getGoalReminders } from "../lib/reminders";

export function Goals() {
  const { user } = useAuth();
  const householdId = user?.householdId ?? "";
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
  const coachMessages = getBudgetCatCoachMessages({
    transactions: [],
    dueDates: [],
    goals,
  });

  return (
    <>
      <PageHeader
        action={<AddGoalDialog />}
        subtitle="Long-term goals, travel plans, purchases, and emergency savings."
        title="Goals"
      />
      <section className="mb-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <CoachCard message={coachMessages[0]} />
        <div className="rounded-lg border border-budget-border bg-budget-card p-4 shadow-soft">
          <h2 className="mb-3 text-lg font-black">Goal reminders</h2>
          <ReminderList
            emptyText="No goal reminders right now."
            limit={4}
            reminders={goalReminders}
          />
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        {goals.map((goal) => (
          <GoalCard goal={goal} key={goal.id} />
        ))}
        {goals.length === 0 && (
          <Card className="p-8 text-sm font-semibold text-budget-text/55">
            No goals have been added yet.
          </Card>
        )}
      </section>
    </>
  );
}
