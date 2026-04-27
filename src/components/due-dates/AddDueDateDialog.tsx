import { formatISO } from "date-fns";
import { CalendarPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { addLocalDueDate } from "../../lib/localDb";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import type { DueDateStatus, RepeatType } from "../../types/finance";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function AddDueDateDialog() {
  const { user } = useAuth();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<DueDateStatus>("upcoming");
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");

  function resetForm(form: HTMLFormElement) {
    form.reset();
    setStatus("upcoming");
    setRepeatType("monthly");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving) return;

    const formData = new FormData(event.currentTarget);
    const form = event.currentTarget;

    setIsSaving(true);
    try {
      await addLocalDueDate(
        {
          title: String(formData.get("title") || "Untitled bill"),
          amount: Number(formData.get("amount") || 0),
          due_date: String(
            formData.get("due_date") ||
              formatISO(new Date(), { representation: "date" }),
          ),
          repeat_type: repeatType,
          reminder_days: Number(formData.get("reminder_days") || 3),
          status,
          note: String(formData.get("note") || ""),
        },
        user.id,
        user.householdId,
      );

      setIsOpen(false);
      resetForm(form);
      showToast({
        title: "Bill added \u{1F4C5}",
        message: "Clyde will watch the due date for you.",
        tone: "success",
      });
      requestBackgroundSync(user, "due_date_saved");
    } catch {
      showToast({
        title: "Save failed \u{26A0}\u{FE0F}",
        message: "BudgetCat could not save this bill yet. Please try again.",
        tone: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        <CalendarPlus size={18} />
        Add Bill
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add bill">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            Title
            <input className="budget-input" name="title" placeholder="Bill title" required />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Amount
            <input className="budget-input" min="0" name="amount" placeholder="0" required type="number" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Due Date
            <input className="budget-input" name="due_date" required type="date" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Repeat
            <select
              className="budget-input"
              onChange={(event) => setRepeatType(event.target.value as RepeatType)}
              value={repeatType}
            >
              <option value="none">None</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Reminder Days
            <input className="budget-input" defaultValue="3" min="0" name="reminder_days" type="number" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Status
            <select
              className="budget-input"
              onChange={(event) => setStatus(event.target.value as DueDateStatus)}
              value={status}
            >
              <option value="upcoming">Upcoming</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold sm:col-span-2">
            Note
            <textarea className="budget-input min-h-24 resize-none" name="note" />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button disabled={isSaving} onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button disabled={isSaving} type="submit">
              {isSaving ? "Saving..." : "Save Bill"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
