import type { CoachMessage } from "../../types/finance";
import { BudgetCatMascot, type MascotVariant } from "../mascot/BudgetCatMascot";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const toneToBadge = {
  success: "success",
  warning: "warning",
  urgent: "urgent",
  cat: "cat",
  neutral: "neutral",
} as const;

function getCoachMascotVariant(message: CoachMessage): MascotVariant {
  if (message.tone === "urgent" || message.type === "warning") return "alert";
  if (message.type === "due_date_alert") return "bill";
  if (message.type === "goal_progress") return "achieved";
  if (message.type === "savings_tip") return "savings";
  if (message.type === "celebration") return "achieved";
  if (message.mascot === "Bonnie") return "bonnie";
  if (message.mascot === "Clyde") return "clyde";
  return "both";
}

export function CoachCard({ message }: { message?: CoachMessage }) {
  if (!message) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <BudgetCatMascot variant="both" />
          <div>
            <p className="font-black">BudgetCat Coach</p>
            <p className="text-sm font-semibold text-budget-text/60">
              Add a little data and Bonnie & Clyde will start coaching.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <BudgetCatMascot
          imageClassName="w-16 object-contain"
          variant={getCoachMascotVariant(message)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black">{message.title}</p>
            <Badge tone={toneToBadge[message.tone]}>{message.mascot}</Badge>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
            {message.body}
          </p>
        </div>
      </div>
    </Card>
  );
}
