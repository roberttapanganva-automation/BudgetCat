import type { Reminder } from "../../types/finance";
import { Badge } from "../ui/Badge";

type ReminderCardProps = {
  reminder: Reminder;
};

type ReminderListProps = {
  reminders: Reminder[];
  limit?: number;
  emptyText?: string;
};

function getReminderTone(severity: Reminder["severity"]) {
  if (severity === "urgent") return "urgent" as const;
  if (severity === "warning") return "warning" as const;
  if (severity === "success") return "success" as const;

  return undefined;
}

function formatReminderStatus(status: Reminder["status"]) {
  return status.replace(/_/g, " ");
}

export function ReminderCard({ reminder }: ReminderCardProps) {
  const tone = getReminderTone(reminder.severity);

  return (
    <div className="rounded-lg border border-budget-border bg-budget-card p-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-black leading-snug text-budget-text">{reminder.title}</p>
        {tone ? (
          <Badge tone={tone}>{formatReminderStatus(reminder.status)}</Badge>
        ) : (
          <Badge>{formatReminderStatus(reminder.status)}</Badge>
        )}
      </div>

      <p className="mt-1 text-sm font-semibold leading-5 text-budget-text/60">
        {reminder.body}
      </p>
    </div>
  );
}

export function ReminderList({
  reminders,
  limit,
  emptyText = "No reminders right now.",
}: ReminderListProps) {
  const visibleReminders = typeof limit === "number" ? reminders.slice(0, limit) : reminders;

  if (visibleReminders.length === 0) {
    return (
      <p className="rounded-lg border border-budget-border bg-budget-background p-4 text-sm font-semibold text-budget-text/55">
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
