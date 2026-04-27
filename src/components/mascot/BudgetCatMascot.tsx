import { cn } from "../../lib/utils";
import { TransparentMascotImage } from "./TransparentMascotImage";

export type MascotVariant =
  | "bonnie"
  | "clyde"
  | "both"
  | "dashboard"
  | "bill"
  | "savings"
  | "alert"
  | "travel"
  | "achieved"
  | "icon";

const imagePaths: Record<MascotVariant, string> = {
  bonnie: "/assets/mascots/bonnie.png",
  clyde: "/assets/mascots/clyde.png",
  both: "/assets/mascots/bonnie-clyde.png",
  dashboard: "/assets/mascots/dashboard-mascot.png",
  bill: "/assets/mascots/bill-reminder.png",
  savings: "/assets/mascots/savings-goal.png",
  alert: "/assets/mascots/budget-alert.png",
  travel: "/assets/mascots/travel-goal.png",
  achieved: "/assets/mascots/goal-achieved.png",
  icon: "/assets/icons/budgetcat-icon.png",
};

const labels: Record<MascotVariant, string> = {
  bonnie: "Bonnie",
  clyde: "Clyde",
  both: "Bonnie and Clyde",
  dashboard: "BudgetCat dashboard mascot",
  bill: "BudgetCat bill reminder",
  savings: "BudgetCat savings goal",
  alert: "BudgetCat budget alert",
  travel: "BudgetCat travel goal",
  achieved: "BudgetCat goal achieved",
  icon: "BudgetCat icon",
};

export function BudgetCatMascot({
  className,
  imageClassName,
  variant = "both",
}: {
  className?: string;
  imageClassName?: string;
  variant?: MascotVariant;
}) {
  return (
    <div
      aria-label={labels[variant]}
      className={cn("overflow-visible", className)}
      title={labels[variant]}
    >
      <TransparentMascotImage
        alt={labels[variant]}
        className={cn("max-w-14 object-contain object-center", imageClassName)}
        src={imagePaths[variant]}
      />
    </div>
  );
}
