import { CalendarDays } from "../../lib/icons";
import {
  getGoalMonthsLeft,
  getGoalProgress,
  getGoalRemaining,
  getSuggestedMonthlySaving,
} from "../../lib/calculations";
import { getGoalIcon } from "../../lib/iconMap";
import { formatCurrency } from "../../lib/utils";
import type { LocalGoal } from "../../types/finance";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Progress } from "../ui/Progress";

export function GoalCard({
  goal,
  onAddContribution,
  onDelete,
  onEdit,
}: {
  goal: LocalGoal;
  onAddContribution?: (goal: LocalGoal) => void;
  onDelete?: (goal: LocalGoal) => void;
  onEdit?: (goal: LocalGoal) => void;
}) {
  const progress = getGoalProgress(goal);
  const goalIcon = progress >= 100 ? "\u{1F389}" : getGoalIcon(goal);

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-black text-[var(--bc-text)]">
            <span aria-hidden="true" className="text-2xl">
              {goalIcon}
            </span>
            {goal.title}
          </h2>
          <p className="mt-2 text-sm font-semibold text-[var(--bc-text-muted)]">
            {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-[color-mix(in_srgb,var(--bc-blue)_18%,transparent)] text-[var(--bc-blue)] px-3 py-1 text-xs font-black">
            {progress}%
          </span>
        </div>
      </div>
      <Progress className="mt-5" value={progress} />
      <div className="mt-5 grid gap-3 text-sm text-[var(--bc-text-muted)]">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-[var(--bc-green)]" size={17} />
          Target date: <strong className="text-[var(--bc-text)]">{goal.target_date}</strong>
        </div>
        <p className="rounded-lg bg-[var(--bc-bg-deep)] px-4 py-3 font-semibold">
          Remaining: {formatCurrency(getGoalRemaining(goal))} - Months left:{" "}
          {getGoalMonthsLeft(goal)}
        </p>
        <p className="rounded-lg bg-[var(--bc-bg-deep)] px-4 py-3 font-semibold">
          Suggested monthly amount: {formatCurrency(getSuggestedMonthlySaving(goal))}
        </p>
      </div>
      {(onAddContribution || onEdit || onDelete) && (
        <div className="mt-5 flex flex-wrap gap-2">
          {onEdit && (
            <Button onClick={() => onEdit(goal)} variant="secondary">
              Edit
            </Button>
          )}
          {onAddContribution && (
            <Button onClick={() => onAddContribution(goal)} variant="secondary">
              Add Contribution
            </Button>
          )}
          {onDelete && (
            <Button className="text-[var(--bc-red)]" onClick={() => onDelete(goal)} variant="ghost">
              Delete
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
