import type { LocalDueDate } from "../types/finance";

function compareDueDateAsc(a: LocalDueDate, b: LocalDueDate) {
  return a.due_date.localeCompare(b.due_date);
}

export function getUnpaidDueDates(dueDates: LocalDueDate[]) {
  return [...dueDates]
    .filter((bill) => !bill.deleted_at)
    .filter((bill) => bill.status !== "paid")
    .sort(compareDueDateAsc);
}

export function getDashboardUpcomingBills(dueDates: LocalDueDate[], limit = 2) {
  return getUnpaidDueDates(dueDates).slice(0, limit);
}
