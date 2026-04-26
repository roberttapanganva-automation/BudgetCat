import { Sparkles } from "lucide-react";
import type { CoachMessage } from "../../types/finance";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";

const toneToBadge = {
  success: "success",
  warning: "warning",
  urgent: "urgent",
  cat: "cat",
  neutral: "neutral",
} as const;

export function CoachCard({ message }: { message?: CoachMessage }) {
  if (!message) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-budget-cat/20 text-budget-cat">
            <Sparkles size={18} />
          </div>
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
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-budget-cat/20 text-budget-cat">
          <Sparkles size={19} />
        </div>
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
