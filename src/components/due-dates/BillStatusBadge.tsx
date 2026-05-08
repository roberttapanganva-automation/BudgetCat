import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2 } from "../../lib/icons";
import { Badge } from "../ui/Badge";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";

export function BillStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") {
    return (
      <Badge className="gap-1.5" tone="success">
        <AnimatedStatusIcon className="h-[13px] w-[13px] text-[var(--bc-green)]" icon={CheckCircle2} />
        Paid
      </Badge>
    );
  }
  if (normalized === "overdue") {
    return (
      <Badge className="gap-1.5" tone="urgent">
        <AnimatedStatusIcon
          animation="pulse"
          className="h-[13px] w-[13px] text-[var(--bc-red)]"
          icon={AlertTriangle}
          label="Overdue"
        />
        Overdue
      </Badge>
    );
  }
  if (normalized.includes("due")) {
    return (
      <Badge className="gap-1.5" tone="warning">
        <AnimatedStatusIcon
          animation="pulse"
          className="h-[13px] w-[13px] text-[var(--bc-amber)]"
          icon={CalendarClock}
          label="Due soon"
        />
        {status}
      </Badge>
    );
  }
  if (normalized === "upcoming") {
    return (
      <Badge className="gap-1.5" tone="warning">
        <AnimatedStatusIcon
          className="h-[13px] w-[13px] text-[var(--bc-amber)]"
          icon={CalendarDays}
        />
        Upcoming
      </Badge>
    );
  }
  return <Badge>{status}</Badge>;
}
