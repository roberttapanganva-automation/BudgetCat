import { differenceInCalendarDays, parseISO } from "date-fns";
import { getGoalProgress } from "./calculations";
import type { LocalDueDate, LocalGoal, LocalTransaction } from "../types/finance";
import type { MascotVariant } from "../components/mascot/BudgetCatMascot";

export type MascotMood = {
  variant: MascotVariant;
  title: string;
  message: string;
  tone: "success" | "warning" | "urgent" | "cat" | "neutral";
  iconLabel: string;
};

export type DashboardMascotCheckIn = {
  bonnie: {
    title: string;
    message: string;
    tone: "advice" | "success" | "warning";
  };
  clyde: {
    title: string;
    message: string;
    tone: "alert" | "success" | "warning";
  };
};

type MascotMoodInput = {
  remainingMoney: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  dueDates: LocalDueDate[];
  goals: LocalGoal[];
  transactions: LocalTransaction[];
  pendingSyncCount?: number;
};

export function getMascotMood({
  dueDates,
  goals,
  monthlyExpenses,
  monthlyIncome,
  pendingSyncCount = 0,
  remainingMoney,
  savings,
  transactions,
}: MascotMoodInput): MascotMood {
  const today = new Date();
  const activeBills = dueDates.filter((bill) => !bill.deleted_at && bill.status !== "paid");
  const hasOverdueBill = activeBills.some(
    (bill) => bill.status === "overdue" || differenceInCalendarDays(parseISO(bill.due_date), today) < 0,
  );
  const hasDueSoonBill = activeBills.some((bill) => {
    const days = differenceInCalendarDays(parseISO(bill.due_date), today);
    return days >= 0 && days <= 3;
  });
  const achievedGoal = goals.find(
    (goal) => !goal.deleted_at && goal.target_amount > 0 && goal.current_amount >= goal.target_amount,
  );
  const recentTransaction = [...transactions]
    .filter((transaction) => !transaction.deleted_at)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const recentSavings =
    recentTransaction?.type === "savings" || recentTransaction?.type === "goal_contribution";
  const travelGoal = goals.find((goal) => goal.type === "travel" && getGoalProgress(goal) > 0);
  const tightBudget =
    monthlyIncome > 0 &&
    (remainingMoney <= monthlyIncome * 0.15 || monthlyExpenses >= monthlyIncome * 0.85);

  if (achievedGoal) {
    return {
      variant: "achieved",
      title: "Goal achieved",
      message: `Bonnie & Clyde are celebrating. ${achievedGoal.title} is complete!`,
      tone: "success",
      iconLabel: "Goal achieved",
    };
  }

  if (hasOverdueBill) {
    return {
      variant: "bill",
      title: "Bill needs attention",
      message: "Bonnie says: One bill needs attention today. Let's keep things calm.",
      tone: "urgent",
      iconLabel: "Overdue",
    };
  }

  if (tightBudget) {
    return {
      variant: "alert",
      title: "Tight budget",
      message: "Clyde says: Careful, spending is getting close to your limit.",
      tone: "warning",
      iconLabel: "Budget warning",
    };
  }

  if (hasDueSoonBill) {
    return {
      variant: "bill",
      title: "Due soon",
      message: "Bonnie is watching the next due date for you.",
      tone: "warning",
      iconLabel: "Due soon",
    };
  }

  if (recentSavings) {
    return {
      variant: travelGoal ? "travel" : "savings",
      title: "Savings momentum",
      message: "Bonnie says: Small savings still count. You're building momentum.",
      tone: "success",
      iconLabel: "Savings progress",
    };
  }

  if (pendingSyncCount > 0) {
    return {
      variant: "both",
      title: "Sync waiting",
      message: "Bonnie & Clyde are holding your changes until sync is ready.",
      tone: "cat",
      iconLabel: "Sync pending",
    };
  }

  if (remainingMoney > 0 && savings > 0) {
    return {
      variant: "dashboard",
      title: "Healthy and calm",
      message: "Bonnie & Clyde say: Nice. Your money still has room to breathe.",
      tone: "success",
      iconLabel: "Healthy budget",
    };
  }

  return {
    variant: "both",
    title: "Keep tracking",
    message: "Bonnie & Clyde say: Add today's entries when you're ready.",
    tone: "neutral",
    iconLabel: "BudgetCat",
  };
}

export function getDashboardMascotCheckIn({
  dueDates,
  goals,
  monthlyExpenses,
  monthlyIncome,
  pendingSyncCount = 0,
  remainingMoney,
  savings,
}: MascotMoodInput): DashboardMascotCheckIn {
  const today = new Date();
  const activeBills = dueDates.filter((bill) => !bill.deleted_at && bill.status !== "paid");
  const hasOverdueBill = activeBills.some(
    (bill) =>
      bill.status === "overdue" || differenceInCalendarDays(parseISO(bill.due_date), today) < 0,
  );
  const hasDueWithin3Days = activeBills.some((bill) => {
    const days = differenceInCalendarDays(parseISO(bill.due_date), today);
    return days >= 0 && days <= 3;
  });
  const hasDueWithin7Days = activeBills.some((bill) => {
    const days = differenceInCalendarDays(parseISO(bill.due_date), today);
    return days >= 0 && days <= 7;
  });
  const hasGoalProgress = goals.some((goal) => !goal.deleted_at && goal.current_amount > 0);
  const hasGoalAchieved = goals.some(
    (goal) => !goal.deleted_at && goal.target_amount > 0 && goal.current_amount >= goal.target_amount,
  );
  const tightBudget = monthlyIncome > 0 && remainingMoney <= monthlyIncome * 0.15;
  const spendingWarning = monthlyIncome > 0 && monthlyExpenses >= monthlyIncome * 0.85;

  const bonnie = (() => {
    if (hasGoalAchieved) {
      return {
        title: "Bonnie's advice",
        message: "You did it. A goal is complete. Bonnie is proud of you. 🎉",
        tone: "success" as const,
      };
    }
    if (tightBudget) {
      return {
        title: "Bonnie's advice",
        message: "Keep entries light and careful for now. Calm tracking helps. 💚",
        tone: "warning" as const,
      };
    }
    if (savings > 0) {
      return {
        title: "Bonnie's advice",
        message: "Small habits count. One clean entry at a time. 🐾",
        tone: "success" as const,
      };
    }
    if (hasGoalProgress) {
      return {
        title: "Bonnie's advice",
        message: "Your goals are moving. Small savings still build real progress. ✨",
        tone: "success" as const,
      };
    }
    if (savings <= 0 && remainingMoney > 0) {
      return {
        title: "Bonnie's advice",
        message: "You still have room to save a little this month. Even small progress counts. 🌱",
        tone: "advice" as const,
      };
    }
    return {
      title: "Bonnie's advice",
      message: "Small habits count. One clean entry at a time. 🐾",
      tone: "advice" as const,
    };
  })();

  const clyde = (() => {
    if (hasOverdueBill) {
      return {
        title: "Clyde's alert",
        message: "One bill needs attention today. Let's handle it before it piles up. 🚨",
        tone: "alert" as const,
      };
    }
    if (hasDueWithin3Days) {
      return {
        title: "Clyde's reminder",
        message: "Due soon: Clyde is watching the next bill for you. ⏰",
        tone: "warning" as const,
      };
    }
    if (hasDueWithin7Days) {
      return {
        title: "Clyde's reminder",
        message: "A bill is coming up this week. Good time to prepare. 📅",
        tone: "warning" as const,
      };
    }
    if (spendingWarning) {
      return {
        title: "Clyde's reminder",
        message: "Spending is getting close to income. Time to slow down a little. ⚠️",
        tone: "warning" as const,
      };
    }
    if (pendingSyncCount > 0) {
      return {
        title: "Clyde's reminder",
        message: "Some changes are waiting to sync. Clyde is keeping an eye on them. 🔄",
        tone: "warning" as const,
      };
    }
    return {
      title: "Clyde's reminder",
      message: activeBills.length === 0
        ? "No urgent bills right now. You did well this month. 🎉"
        : "No urgent reminders right now. You're doing well. ✅",
      tone: "success" as const,
    };
  })();

  return { bonnie, clyde };
}

export function getSyncMascotMood(pendingSyncCount: number): MascotMood {
  if (pendingSyncCount > 0) {
    return {
      variant: "both",
      title: "Sync pending",
      message: `${pendingSyncCount} change${pendingSyncCount === 1 ? "" : "s"} waiting to sync.`,
      tone: "cat",
      iconLabel: "Sync pending",
    };
  }

  return {
    variant: "both",
    title: "Synced",
    message: "All changes are saved.",
    tone: "success",
    iconLabel: "All synced",
  };
}
