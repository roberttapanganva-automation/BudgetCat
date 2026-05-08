import { CalendarClock, Heart, type LucideIcon } from "../../lib/icons";
import type { DashboardMascotCheckIn } from "../../lib/mascotMood";
import { BudgetCatMascot } from "../mascot/BudgetCatMascot";
import { Card } from "../ui/Card";
import { cn } from "../../lib/utils";

function MascotBubble({
  icon: Icon,
  mascot,
  message,
  title,
  tone,
}: {
  icon: LucideIcon;
  mascot: "bonnie" | "clyde";
  message: string;
  title: string;
  tone: "advice" | "alert" | "success" | "warning";
}) {
  const toneClass = {
    advice: "bg-budget-primary/10 text-budget-primary",
    alert: "bg-budget-urgent/10 text-budget-urgent",
    success: "bg-budget-success/10 text-budget-success",
    warning: "bg-budget-warning/15 text-budget-warning",
  }[tone];

  return (
    <div className="flex flex-col items-center p-4 text-center">
      <BudgetCatMascot
        className="grid place-items-center"
        imageClassName="w-32 object-contain object-center sm:w-36 xl:w-44"
        variant={mascot}
      />
      <div className="mt-4 flex items-center gap-2">
        <span className={cn("grid h-8 w-8 place-items-center rounded-full", toneClass)}>
          <Icon size={16} />
        </span>
        <h3 className="text-base font-black text-budget-text">{title}</h3>
      </div>
      <p className="mt-3 text-sm font-semibold leading-6 text-budget-text/65">
        {message}
      </p>
    </div>
  );
}

export function MascotCard({ checkIn }: { checkIn: DashboardMascotCheckIn }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-5">
        <div>
          <h2 className="text-xl font-black text-budget-text">Bonnie & Clyde check-in</h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-budget-text/60">
            Live advice from your current budget situation.
          </p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <MascotBubble
            icon={Heart}
            mascot="bonnie"
            message={checkIn.bonnie.message}
            title={checkIn.bonnie.title}
            tone={checkIn.bonnie.tone}
          />
          <MascotBubble
            icon={CalendarClock}
            mascot="clyde"
            message={checkIn.clyde.message}
            title={checkIn.clyde.title}
            tone={checkIn.clyde.tone}
          />
        </div>
      </div>
    </Card>
  );
}
