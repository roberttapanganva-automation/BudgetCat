import { Badge } from "../ui/Badge";

export function BillStatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "paid") return <Badge tone="success">Paid</Badge>;
  if (normalized === "due soon") return <Badge tone="warning">Due Soon</Badge>;
  if (normalized === "overdue") return <Badge tone="urgent">Overdue</Badge>;
  if (normalized === "upcoming") return <Badge>Upcoming</Badge>;
  return <Badge>{status}</Badge>;
}
