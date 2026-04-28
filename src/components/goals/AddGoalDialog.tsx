import { formatISO } from "date-fns";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { addLocalGoal } from "../../lib/localDb";
import { requestBackgroundSync } from "../../lib/requestBackgroundSync";
import { playCreateSuccessFeedback } from "../../lib/soundFeedback";
import type { GoalPriority, GoalType } from "../../types/finance";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export function AddGoalDialog() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [goalType, setGoalType] = useState<GoalType>("savings");
  const [priority, setPriority] = useState<GoalPriority>("medium");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const formData = new FormData(event.currentTarget);
    await addLocalGoal(
      {
        type: goalType,
        title: String(formData.get("title") || "New Goal"),
        target_amount: Number(formData.get("target_amount") || 0),
        current_amount: Number(formData.get("current_amount") || 0),
        target_date: String(
          formData.get("target_date") ||
            formatISO(new Date(), { representation: "date" }),
        ),
        priority,
        status: "active",
        note: String(formData.get("note") || ""),
      },
      user.id,
      user.householdId,
    );

    setIsOpen(false);
    event.currentTarget.reset();
    playCreateSuccessFeedback();
    requestBackgroundSync(user, "goal_created");
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="secondary">
        <Plus size={18} />
        Add Goal
      </Button>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Add goal">
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm font-bold">
            Title
            <input className="budget-input" name="title" placeholder="Goal title" required />
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
            <input className="budget-input" min="0" name="target_amount" required type="number" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Current Amount
            <input className="budget-input" defaultValue="0" min="0" name="current_amount" type="number" />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Target Date
            <input className="budget-input" name="target_date" required type="date" />
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
            <textarea className="budget-input min-h-24 resize-none" name="note" />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setIsOpen(false)} variant="secondary">
              Cancel
            </Button>
            <Button type="submit">Save Goal</Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
