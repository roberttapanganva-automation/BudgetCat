import type { LucideIcon } from "./icons";
import {
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  Building2,
  Bus,
  CalendarDays,
  Car,
  CircleDollarSign,
  Coffee,
  CreditCard,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  HandCoins,
  HeartPulse,
  HelpCircle,
  Home,
  Landmark,
  Laptop,
  Lightbulb,
  PawPrint,
  Phone,
  PiggyBank,
  Plane,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Utensils,
  Wallet,
  Wifi,
  Zap,
} from "./icons";

export type BudgetCatCategoryType =
  | "income"
  | "expense"
  | "bill"
  | "savings";

export type BudgetCatCategory = {
  id: string;
  label: string;
  type: BudgetCatCategoryType;
  icon: LucideIcon;
  keywords: string[];
};

export const CATEGORY_CONFIG: BudgetCatCategory[] = [
  // INCOME
  {
    id: "salary",
    label: "Salary",
    type: "income",
    icon: Wallet,
    keywords: ["salary", "payroll", "pay", "wage", "monthly pay", "compensation"],
  },
  {
    id: "freelance",
    label: "Freelance",
    type: "income",
    icon: Laptop,
    keywords: ["freelance", "client", "project", "contract", "gig", "side hustle"],
  },
  {
    id: "business-income",
    label: "Business Income",
    type: "income",
    icon: BriefcaseBusiness,
    keywords: ["business", "sales", "revenue", "shop", "store", "service income"],
  },
  {
    id: "bonus",
    label: "Bonus",
    type: "income",
    icon: BadgeDollarSign,
    keywords: ["bonus", "incentive", "commission", "reward"],
  },
  {
    id: "allowance",
    label: "Allowance",
    type: "income",
    icon: HandCoins,
    keywords: ["allowance", "support", "baon"],
  },
  {
    id: "refund",
    label: "Refund",
    type: "income",
    icon: RefreshCw,
    keywords: ["refund", "reimbursement", "cashback", "returned money"],
  },
  {
    id: "interest",
    label: "Interest",
    type: "income",
    icon: Landmark,
    keywords: ["interest", "bank interest", "dividend", "investment return"],
  },
  {
    id: "gift-income",
    label: "Gift Income",
    type: "income",
    icon: Gift,
    keywords: ["gift", "received gift", "cash gift"],
  },
  {
    id: "other-income",
    label: "Other Income",
    type: "income",
    icon: CircleDollarSign,
    keywords: ["income", "other income", "misc income"],
  },

  // EXPENSE
  {
    id: "food-groceries",
    label: "Food & Groceries",
    type: "expense",
    icon: ShoppingCart,
    keywords: ["food", "grocery", "groceries", "market", "supermarket", "snacks", "meal"],
  },
  {
    id: "dining-out",
    label: "Dining Out",
    type: "expense",
    icon: Utensils,
    keywords: ["restaurant", "dining", "fast food", "jollibee", "mcdonald", "eat out"],
  },
  {
    id: "coffee-snacks",
    label: "Coffee & Snacks",
    type: "expense",
    icon: Coffee,
    keywords: ["coffee", "milk tea", "snack", "drink", "cafe", "starbucks"],
  },
  {
    id: "transportation",
    label: "Transportation",
    type: "expense",
    icon: Bus,
    keywords: ["transport", "fare", "bus", "jeep", "jeepney", "train", "mrt", "lrt", "grab", "taxi"],
  },
  {
    id: "fuel",
    label: "Fuel",
    type: "expense",
    icon: Fuel,
    keywords: ["fuel", "gas", "gasoline", "diesel", "petrol"],
  },
  {
    id: "shopping",
    label: "Shopping",
    type: "expense",
    icon: ShoppingBag,
    keywords: ["shopping", "clothes", "mall", "shopee", "lazada", "store"],
  },
  {
    id: "health-medicine",
    label: "Health & Medicine",
    type: "expense",
    icon: HeartPulse,
    keywords: ["health", "medicine", "medical", "doctor", "hospital", "pharmacy", "checkup"],
  },
  {
    id: "education",
    label: "Education",
    type: "expense",
    icon: GraduationCap,
    keywords: ["education", "school", "course", "book", "training", "learning"],
  },
  {
    id: "entertainment",
    label: "Entertainment",
    type: "expense",
    icon: Film,
    keywords: ["entertainment", "movie", "cinema", "game", "games", "netflix", "spotify"],
  },
  {
    id: "fitness",
    label: "Fitness",
    type: "expense",
    icon: Dumbbell,
    keywords: ["gym", "fitness", "workout", "sports"],
  },
  {
    id: "personal-care",
    label: "Personal Care",
    type: "expense",
    icon: Sparkles,
    keywords: ["personal care", "haircut", "salon", "skincare", "hygiene"],
  },
  {
    id: "household",
    label: "Household",
    type: "expense",
    icon: Home,
    keywords: ["household", "home", "cleaning", "laundry", "supplies"],
  },
  {
    id: "pets",
    label: "Pets",
    type: "expense",
    icon: PawPrint,
    keywords: ["pet", "cat", "dog", "vet", "pet food"],
  },
  {
    id: "travel",
    label: "Travel",
    type: "expense",
    icon: Plane,
    keywords: ["travel", "trip", "vacation", "hotel", "flight"],
  },
  {
    id: "fees-charges",
    label: "Fees & Charges",
    type: "expense",
    icon: ReceiptText,
    keywords: ["fee", "fees", "charge", "charges", "bank fee", "service fee"],
  },
  {
    id: "debt-payment",
    label: "Debt Payment",
    type: "expense",
    icon: CreditCard,
    keywords: ["debt", "loan payment", "credit card payment", "utang"],
  },
  {
    id: "other-expense",
    label: "Other Expense",
    type: "expense",
    icon: HelpCircle,
    keywords: ["other", "misc", "miscellaneous", "uncategorized"],
  },

  // BILL
  {
    id: "rent-mortgage",
    label: "Rent / Mortgage",
    type: "bill",
    icon: Building2,
    keywords: ["rent", "mortgage", "apartment", "condo", "house payment"],
  },
  {
    id: "electricity",
    label: "Electricity",
    type: "bill",
    icon: Zap,
    keywords: ["electricity", "electric", "power", "meralco", "kuryente"],
  },
  {
    id: "water",
    label: "Water",
    type: "bill",
    icon: Droplets,
    keywords: ["water", "maynilad", "manila water", "tubig"],
  },
  {
    id: "internet",
    label: "Internet",
    type: "bill",
    icon: Wifi,
    keywords: ["internet", "wifi", "broadband", "converge", "pldt", "globe fiber"],
  },
  {
    id: "mobile-plan-load",
    label: "Mobile Plan / Load",
    type: "bill",
    icon: Smartphone,
    keywords: ["mobile", "phone", "load", "prepaid", "postpaid", "globe", "smart", "dito"],
  },
  {
    id: "insurance",
    label: "Insurance",
    type: "bill",
    icon: ShieldCheck,
    keywords: ["insurance", "hmo", "life insurance", "car insurance"],
  },
  {
    id: "loan",
    label: "Loan",
    type: "bill",
    icon: Banknote,
    keywords: ["loan", "monthly loan", "installment"],
  },
  {
    id: "credit-card",
    label: "Credit Card",
    type: "bill",
    icon: CreditCard,
    keywords: ["credit card", "card bill", "cc bill"],
  },
  {
    id: "subscription-bill",
    label: "Subscription Bill",
    type: "bill",
    icon: CalendarDays,
    keywords: ["subscription", "netflix", "spotify", "icloud", "google one", "monthly subscription"],
  },
  {
    id: "tuition",
    label: "Tuition",
    type: "bill",
    icon: GraduationCap,
    keywords: ["tuition", "school bill", "school fee"],
  },
  {
    id: "medical-bill",
    label: "Medical Bill",
    type: "bill",
    icon: HeartPulse,
    keywords: ["medical bill", "hospital bill", "doctor bill"],
  },
  {
    id: "government-tax",
    label: "Government / Tax",
    type: "bill",
    icon: Landmark,
    keywords: ["tax", "government", "sss", "philhealth", "pagibig", "bir"],
  },
  {
    id: "other-bill",
    label: "Other Bill",
    type: "bill",
    icon: HelpCircle,
    keywords: ["bill", "due", "other bill"],
  },

  // SAVINGS
  {
    id: "emergency-fund",
    label: "Emergency Fund",
    type: "savings",
    icon: ShieldCheck,
    keywords: ["emergency", "emergency fund", "backup fund"],
  },
  {
    id: "travel-goal",
    label: "Travel Goal",
    type: "savings",
    icon: Plane,
    keywords: ["travel goal", "vacation goal", "trip savings"],
  },
  {
    id: "home-goal",
    label: "Home Goal",
    type: "savings",
    icon: Home,
    keywords: ["home goal", "house goal", "renovation"],
  },
  {
    id: "gadget-goal",
    label: "Gadget Goal",
    type: "savings",
    icon: Smartphone,
    keywords: ["gadget", "phone goal", "laptop goal", "device"],
  },
  {
    id: "education-goal",
    label: "Education Goal",
    type: "savings",
    icon: GraduationCap,
    keywords: ["education goal", "school savings", "course savings"],
  },
  {
    id: "investment",
    label: "Investment",
    type: "savings",
    icon: Landmark,
    keywords: ["investment", "invest", "stocks", "crypto", "fund"],
  },
  {
    id: "general-savings",
    label: "General Savings",
    type: "savings",
    icon: PiggyBank,
    keywords: ["savings", "save", "general savings", "goal"],
  },
  {
    id: "other-goal",
    label: "Other Goal",
    type: "savings",
    icon: HelpCircle,
    keywords: ["other goal", "custom goal"],
  },
];

function cleanValue(value?: string | null) {
  return String(value ?? "").toLowerCase().trim();
}

export function getCategoriesByType(type?: string | null) {
  const normalizedType = cleanValue(type) as BudgetCatCategoryType;

  return CATEGORY_CONFIG.filter((category) => category.type === normalizedType);
}

export function getCategoryById(categoryId?: string | null) {
  const normalized = cleanValue(categoryId);

  return CATEGORY_CONFIG.find((category) => category.id === normalized);
}

export function getCategoryByLabel(label?: string | null) {
  const normalized = cleanValue(label);

  return CATEGORY_CONFIG.find(
    (category) => cleanValue(category.label) === normalized
  );
}

export function getCategoryByKeyword(value?: string | null) {
  const normalized = cleanValue(value);

  if (!normalized) return undefined;

  return CATEGORY_CONFIG.find((category) =>
    category.keywords.some((keyword) => normalized.includes(cleanValue(keyword)))
  );
}

export function normalizeCategory(value?: string | null) {
  return (
    getCategoryById(value) ??
    getCategoryByLabel(value) ??
    getCategoryByKeyword(value)
  );
}

export function getIconByCategory(value?: string | null): LucideIcon {
  return normalizeCategory(value)?.icon ?? HelpCircle;
}

export function getCategoryLabel(value?: string | null) {
  return normalizeCategory(value)?.label ?? value ?? "Uncategorized";
}