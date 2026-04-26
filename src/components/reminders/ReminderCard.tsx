import { AlertCircle, CalendarClock, CheckCircle2, PiggyBank, Target } from "lucide-react";
import type { Reminder } from "../../types/finance";
import { Badge } from "../ui/Badge";

const icons = {
  bill: CalendarClock,
  savings: PiggyBank,
  goal_deadline: Target,
  goal_pace: Target,
};

const tones = {
  info: "neutral",
  warning: "warning",
  urgent: "urgent",
  success: "success",
} as const;

export function ReminderCard({ reminder }: { reminder: Reminder }) {
  const Icon = icons[reminder.type] ?? AlertCircle;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-budget-border bg-white p-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-budget-background text-budget-primary">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-black leading-snug">{reminder.title}</p>
          <Badge tone={tones[reminder.severity]}>{reminder.status.replace("_", " ")}</Badge>
        </div>
        <p className="mt-1 text-sm font-semibold leading-5 text-budget-text/60">
          {reminder.body}
        </p>
      </div>
      {reminder.status === "completed" && (
        <CheckCircle2 className="text-budget-success" size={18} />
      )}
    </div>
  );
}

export function ReminderList({
  reminders,
  emptyText = "No reminders right now.",
  limit,
}: {
  reminders: Reminder[];
  emptyText?: string;
  limit?: number;
}) {
  const visibleReminders = limit ? reminders.slice(0, limit) : reminders;

  if (visibleReminders.length === 0) {
    return (
      <p className="rounded-lg bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {visibleReminders.map((reminder) => (
        <ReminderCard key={reminder.id} reminder={reminder} />
      ))}
    </div>
  );
}
