import { formatISO } from "date-fns";
import { CalendarPlus, CheckCircle2, ReceiptText } from "../../lib/icons";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../hooks/useToast";
import { addLocalDueDate } from "../../lib/localDb";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import { playCreateSuccessFeedback } from "../../lib/soundFeedback";
import type { RepeatType } from "../../types/finance";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function AddDueDateDialog({
  className,
  label = "Add Bill",
  ariaLabel = label,
  compact = false,
}: {
  className?: string;
  label?: string;
  ariaLabel?: string;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const showToast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [repeatType, setRepeatType] = useState<RepeatType>("monthly");

  function resetForm(form: HTMLFormElement) {
    form.reset();
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
          status: "upcoming",
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
      playCreateSuccessFeedback();
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
      <Button
        aria-label={ariaLabel}
        className={className}
        onClick={() => setIsOpen(true)}
        variant={className ? "primary" : "secondary"}
      >
        <CalendarPlus className={compact ? "h-5 w-5" : "h-4.5 w-4.5"} />
        {label}
      </Button>
      <Modal
        className="mx-auto w-[calc(100%-1.5rem)] max-w-[430px] rounded-[28px] sm:max-w-[560px] sm:rounded-[30px]"
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add Bill"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          <section className="rounded-[24px] border border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] p-3.5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-amber)]">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--bc-text)]">Plan a payment</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  Add the due date once and BudgetCat will keep it in view.
                </p>
              </div>
            </div>
          </section>

          <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
            Title
            <input className="bc-input w-full min-w-0" name="title" placeholder="Bill title" required />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
              Amount
              <input
                className="bc-input w-full min-w-0"
                min="0.01"
                name="amount"
                placeholder="PHP 0"
                required
                step="0.01"
                type="number"
              />
            </label>
            <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
              Due Date
              <input className="bc-input w-full min-w-0" name="due_date" required type="date" />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
              Repeat
              <select
                className="bc-input w-full min-w-0"
                onChange={(event) => setRepeatType(event.target.value as RepeatType)}
                value={repeatType}
              >
                <option value="none">None</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
              Remind Me
              <input className="bc-input w-full min-w-0" defaultValue="3" min="0" name="reminder_days" step="1" type="number" />
            </label>
          </div>

          <label className="grid min-w-0 gap-2 text-xs font-black text-[var(--bc-text-soft)]">
            Note
            <textarea className="bc-input min-h-20 w-full min-w-0 resize-none" name="note" placeholder="Optional payment details" />
          </label>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button className="min-h-11 w-full" disabled={isSaving} onClick={() => setIsOpen(false)} variant="urgent">
              Cancel
            </Button>
            <Button className="min-h-11 w-full" disabled={isSaving} type="submit">
              {!isSaving && <CheckCircle2 className="h-4.5 w-4.5" />}
              {isSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
