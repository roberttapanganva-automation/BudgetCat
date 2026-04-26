export const monthlySummary = {
  salaryIncome: 40000,
  expenses: 12850,
  savings: 8000,
  remaining: 19150,
};

export const dueDates = [
  {
    id: "internet",
    title: "Internet Bill",
    amount: 1699,
    dueLabel: "Due in 3 days",
    dueDate: "2026-04-29",
    status: "Due Soon",
  },
  {
    id: "electricity",
    title: "Electricity",
    amount: 2450,
    dueLabel: "Due in 8 days",
    dueDate: "2026-05-04",
    status: "Upcoming",
  },
  {
    id: "rent",
    title: "Rent",
    amount: 12000,
    dueLabel: "Paid Apr 20",
    dueDate: "2026-04-20",
    status: "Paid",
  },
  {
    id: "insurance",
    title: "Insurance",
    amount: 1850,
    dueLabel: "Due yesterday",
    dueDate: "2026-04-25",
    status: "Overdue",
  },
] as const;

export const goals = [
  {
    id: "freedom",
    title: "Financial Freedom Goal",
    targetAmount: 1000000,
    currentAmount: 35000,
    targetDate: "December 2036",
    suggestedMonthly: "Add suggested amount in Phase 2",
  },
  {
    id: "japan",
    title: "Japan Travel Fund",
    targetAmount: 80000,
    currentAmount: 12000,
    targetDate: "March 2027",
    suggestedMonthly: "Placeholder monthly plan",
  },
  {
    id: "laptop",
    title: "New Laptop",
    targetAmount: 95000,
    currentAmount: 22000,
    targetDate: "October 2026",
    suggestedMonthly: "Placeholder monthly plan",
  },
  {
    id: "emergency",
    title: "Emergency Fund",
    targetAmount: 180000,
    currentAmount: 48000,
    targetDate: "June 2027",
    suggestedMonthly: "Placeholder monthly plan",
  },
] as const;

export const recentTransactions = [
  {
    id: "salary",
    title: "Salary",
    category: "Income",
    amount: 40000,
    date: "Apr 25",
    type: "income",
  },
  {
    id: "groceries",
    title: "Groceries",
    category: "Food",
    amount: -3850,
    date: "Apr 24",
    type: "expense",
  },
  {
    id: "travel-goal",
    title: "Japan Travel Fund",
    category: "Goal Contribution",
    amount: -4000,
    date: "Apr 22",
    type: "savings",
  },
] as const;

export const spendingByCategory = [
  { name: "Food", value: 3850, color: "#E6A44E" },
  { name: "Bills", value: 4149, color: "#F2B84B" },
  { name: "Transport", value: 2100, color: "#7FA77B" },
  { name: "Personal", value: 2751, color: "#D96B5F" },
];

export const incomeExpenseData = [
  { month: "Jan", income: 40000, expenses: 18500 },
  { month: "Feb", income: 42000, expenses: 16800 },
  { month: "Mar", income: 40000, expenses: 14200 },
  { month: "Apr", income: 40000, expenses: 12850 },
];
