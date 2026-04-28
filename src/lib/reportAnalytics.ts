import { format, getMonth, getYear, parseISO } from "date-fns";
import type { LocalDueDate, LocalTransaction } from "../types/finance";
import { getCategoryLabel } from "./categoryConfig";
import { formatCurrency } from "./utils";

export type MonthOption = {
  label: string;
  value: number;
};

export type YearlyMonthSummary = {
  month: string;
  monthIndex: number;
  currentIncome: number;
  previousIncome: number;
  currentExpenses: number;
  previousExpenses: number;
  currentSavings: number;
  previousSavings: number;
  currentNet: number;
  previousNet: number;
  currentBills: number;
  previousBills: number;
};

export type SelectedMonthSummary = {
  income: number;
  expenses: number;
  savings: number;
  bills: number;
  net: number;
};

export type CategorySummary = {
  name: string;
  amount: number;
  percent: number;
};

export type BillSummary = {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  status: LocalDueDate["status"];
};

export type ReportsAnalytics = {
  currentYear: number;
  previousYear: number;
  monthOptions: MonthOption[];
  yearlyData: YearlyMonthSummary[];
  yearlySummary: SelectedMonthSummary;
  yearlyCategories: CategorySummary[];
  highestYearBill: BillSummary | null;
  selectedMonthLabel: string;
  selectedMonthSummary: SelectedMonthSummary;
  selectedMonthCategories: CategorySummary[];
  selectedMonthBills: BillSummary[];
  highestSelectedMonthBill: BillSummary | null;
  selectedMonthTransactions: LocalTransaction[];
  selectedMonthInsights: string[];
  hasCurrentYearData: boolean;
  hasPreviousYearData: boolean;
  hasSelectedMonthData: boolean;
  hasBillData: boolean;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDate(value: string) {
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isTransactionInMonth(transaction: LocalTransaction, year: number, monthIndex: number) {
  const date = parseDate(transaction.date);
  if (!date) return false;
  return getYear(date) === year && getMonth(date) === monthIndex;
}

function isBillInMonth(bill: LocalDueDate, year: number, monthIndex: number) {
  const date = parseDate(bill.due_date);
  if (!date) return false;
  return getYear(date) === year && getMonth(date) === monthIndex;
}

function isIncome(transaction: LocalTransaction) {
  return transaction.type === "income" || transaction.type === "salary";
}

function isExpense(transaction: LocalTransaction) {
  return transaction.type === "expense";
}

function isSavings(transaction: LocalTransaction) {
  return transaction.type === "savings" || transaction.type === "goal_contribution";
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function summarizeTransactions(transactions: LocalTransaction[]): Omit<SelectedMonthSummary, "bills" | "net"> {
  return {
    income: sum(transactions.filter(isIncome).map((transaction) => transaction.amount)),
    expenses: sum(transactions.filter(isExpense).map((transaction) => transaction.amount)),
    savings: sum(transactions.filter(isSavings).map((transaction) => transaction.amount)),
  };
}

function buildSummary(
  transactions: LocalTransaction[],
  bills: BillSummary[],
): SelectedMonthSummary {
  const transactionSummary = summarizeTransactions(transactions);

  return {
    ...transactionSummary,
    bills: sum(bills.map((bill) => bill.amount)),
    net: transactionSummary.income - transactionSummary.expenses - transactionSummary.savings,
  };
}

export function getCurrentYear(date = new Date()) {
  return getYear(date);
}

export function getPreviousYear(date = new Date()) {
  return getYear(date) - 1;
}

export function getMonthOptions(): MonthOption[] {
  return monthNames.map((label, value) => ({ label, value }));
}

export function getYearlyMonthlyTransactionSummary(
  transactions: LocalTransaction[],
  year: number,
) {
  return getMonthOptions().map((month) => {
    const monthTransactions = getSelectedMonthTransactions(transactions, year, month.value);
    const summary = summarizeTransactions(monthTransactions);

    return {
      month: month.label.slice(0, 3),
      monthIndex: month.value,
      ...summary,
      net: summary.income - summary.expenses - summary.savings,
    };
  });
}

export function getYearlyMonthlyBillSummary(dueDates: LocalDueDate[], year: number) {
  return getMonthOptions().map((month) => ({
    month: month.label.slice(0, 3),
    monthIndex: month.value,
    bills: sum(
      dueDates
        .filter((bill) => isBillInMonth(bill, year, month.value))
        .map((bill) => bill.amount),
    ),
  }));
}

export function getSelectedMonthTransactions(
  transactions: LocalTransaction[],
  year: number,
  monthIndex: number,
) {
  return transactions
    .filter((transaction) => isTransactionInMonth(transaction, year, monthIndex))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getSelectedMonthBills(
  dueDates: LocalDueDate[],
  year: number,
  monthIndex: number,
): BillSummary[] {
  return dueDates
    .filter((bill) => isBillInMonth(bill, year, monthIndex))
    .map((bill) => ({
      id: bill.id,
      title: bill.title || "Untitled bill",
      amount: bill.amount,
      dueDate: bill.due_date,
      status: bill.status,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getSelectedMonthCategoryBreakdown(
  transactions: LocalTransaction[],
  year: number,
  monthIndex: number,
): CategorySummary[] {
  const expenses = getSelectedMonthTransactions(transactions, year, monthIndex).filter(isExpense);
  const totalExpenses = sum(expenses.map((transaction) => transaction.amount));
  const grouped = expenses.reduce<Record<string, number>>((acc, transaction) => {
    const label = getCategoryLabel(transaction.category) || "Uncategorized";
    acc[label] = (acc[label] ?? 0) + Number(transaction.amount || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([name, amount]) => ({
      name,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

export function getYearCategoryBreakdown(
  transactions: LocalTransaction[],
  year: number,
): CategorySummary[] {
  const expenses = transactions.filter((transaction) => {
    const date = parseDate(transaction.date);
    return date && getYear(date) === year && isExpense(transaction);
  });
  const totalExpenses = sum(expenses.map((transaction) => transaction.amount));
  const grouped = expenses.reduce<Record<string, number>>((acc, transaction) => {
    const label = getCategoryLabel(transaction.category) || "Uncategorized";
    acc[label] = (acc[label] ?? 0) + Number(transaction.amount || 0);
    return acc;
  }, {});

  return Object.entries(grouped)
    .map(([name, amount]) => ({
      name,
      amount,
      percent: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
}

export function getSelectedMonthInsights(params: {
  monthLabel: string;
  summary: SelectedMonthSummary;
  categories: CategorySummary[];
  highestBill: BillSummary | null;
}) {
  const insights: string[] = [];
  const topCategory = params.categories[0];

  if (topCategory) {
    insights.push(
      `${params.monthLabel}'s highest expense category is ${topCategory.name} at ${formatCurrency(topCategory.amount)}.`,
    );
  } else {
    insights.push(`No expense categories recorded for ${params.monthLabel} yet.`);
  }

  if (params.highestBill) {
    insights.push(
      `Highest bill for ${params.monthLabel} is ${params.highestBill.title} at ${formatCurrency(params.highestBill.amount)}.`,
    );
  } else {
    insights.push(`No bill data found for ${params.monthLabel}.`);
  }

  if (params.summary.net > 0) {
    insights.push(`${params.monthLabel} net is positive at ${formatCurrency(params.summary.net)}.`);
  } else if (params.summary.net < 0) {
    insights.push(`${params.monthLabel} net is below zero by ${formatCurrency(Math.abs(params.summary.net))}.`);
  }

  return insights.slice(0, 4);
}

export function buildReportsAnalytics(
  transactions: LocalTransaction[],
  dueDates: LocalDueDate[],
  selectedMonthIndex: number,
  date = new Date(),
): ReportsAnalytics {
  const currentYear = getCurrentYear(date);
  const previousYear = getPreviousYear(date);
  const monthOptions = getMonthOptions();
  const currentTransactionsByMonth = getYearlyMonthlyTransactionSummary(transactions, currentYear);
  const previousTransactionsByMonth = getYearlyMonthlyTransactionSummary(transactions, previousYear);
  const currentBillsByMonth = getYearlyMonthlyBillSummary(dueDates, currentYear);
  const previousBillsByMonth = getYearlyMonthlyBillSummary(dueDates, previousYear);

  const yearlyData = monthOptions.map((month) => {
    const currentTransactions = currentTransactionsByMonth[month.value];
    const previousTransactions = previousTransactionsByMonth[month.value];
    const currentBills = currentBillsByMonth[month.value];
    const previousBills = previousBillsByMonth[month.value];

    return {
      month: month.label.slice(0, 3),
      monthIndex: month.value,
      currentIncome: currentTransactions.income,
      previousIncome: previousTransactions.income,
      currentExpenses: currentTransactions.expenses,
      previousExpenses: previousTransactions.expenses,
      currentSavings: currentTransactions.savings,
      previousSavings: previousTransactions.savings,
      currentNet: currentTransactions.net,
      previousNet: previousTransactions.net,
      currentBills: currentBills.bills,
      previousBills: previousBills.bills,
    };
  });
  const currentYearTransactions = transactions.filter((transaction) => {
    const date = parseDate(transaction.date);
    return date && getYear(date) === currentYear;
  });
  const currentYearBills = dueDates
    .filter((bill) => {
      const date = parseDate(bill.due_date);
      return date && getYear(date) === currentYear;
    })
    .map((bill) => ({
      id: bill.id,
      title: bill.title || "Untitled bill",
      amount: bill.amount,
      dueDate: bill.due_date,
      status: bill.status,
    }))
    .sort((a, b) => b.amount - a.amount);
  const yearlySummary = buildSummary(currentYearTransactions, currentYearBills);
  const yearlyCategories = getYearCategoryBreakdown(transactions, currentYear);

  const selectedMonthTransactions = getSelectedMonthTransactions(
    transactions,
    currentYear,
    selectedMonthIndex,
  );
  const selectedMonthBills = getSelectedMonthBills(dueDates, currentYear, selectedMonthIndex);
  const selectedMonthSummary = buildSummary(selectedMonthTransactions, selectedMonthBills);
  const selectedMonthCategories = getSelectedMonthCategoryBreakdown(
    transactions,
    currentYear,
    selectedMonthIndex,
  );
  const selectedMonthLabel = `${monthOptions[selectedMonthIndex]?.label ?? "Selected month"} ${currentYear}`;
  const highestSelectedMonthBill = selectedMonthBills[0] ?? null;
  const hasCurrentYearData = yearlyData.some(
    (month) =>
      month.currentIncome > 0 ||
      month.currentExpenses > 0 ||
      month.currentSavings > 0 ||
      month.currentBills > 0,
  );
  const hasPreviousYearData = yearlyData.some(
    (month) =>
      month.previousIncome > 0 ||
      month.previousExpenses > 0 ||
      month.previousSavings > 0 ||
      month.previousBills > 0,
  );

  return {
    currentYear,
    previousYear,
    monthOptions,
    yearlyData,
    yearlySummary,
    yearlyCategories,
    highestYearBill: currentYearBills[0] ?? null,
    selectedMonthLabel,
    selectedMonthSummary,
    selectedMonthCategories,
    selectedMonthBills,
    highestSelectedMonthBill,
    selectedMonthTransactions,
    selectedMonthInsights: getSelectedMonthInsights({
      monthLabel: selectedMonthLabel,
      summary: selectedMonthSummary,
      categories: selectedMonthCategories,
      highestBill: highestSelectedMonthBill,
    }),
    hasCurrentYearData,
    hasPreviousYearData,
    hasSelectedMonthData:
      selectedMonthTransactions.length > 0 || selectedMonthBills.length > 0,
    hasBillData: dueDates.length > 0,
  };
}
