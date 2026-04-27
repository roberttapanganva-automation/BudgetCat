const emoji = {
  alert: "\u{1F6A8}",
  bank: "\u{1F3E6}",
  bill: "\u{1F9FE}",
  briefcase: "\u{1F4BC}",
  calendar: "\u{1F4C5}",
  car: "\u{1F697}",
  card: "\u{1F4B3}",
  cash: "\u{1F4B5}",
  check: "\u{2705}",
  electric: "\u{26A1}",
  emergency: "\u{1F6DF}",
  food: "\u{1F37D}\u{FE0F}",
  goal: "\u{1F3AF}",
  graduation: "\u{1F393}",
  grocery: "\u{1F6D2}",
  home: "\u{1F3E0}",
  hospital: "\u{1F3E5}",
  laptop: "\u{1F4BB}",
  map: "\u{1F5FA}\u{FE0F}",
  money: "\u{1F4B0}",
  paw: "\u{1F43E}",
  phone: "\u{1F4F1}",
  pin: "\u{1F4CC}",
  repeat: "\u{1F501}",
  ring: "\u{1F48D}",
  shopping: "\u{1F6CD}\u{FE0F}",
  sparkle: "\u{2728}",
  timer: "\u{23F0}",
  water: "\u{1F4A7}",
  web: "\u{1F310}",
} as const;

const emojiRules: Array<{ emoji: string; keywords: string[] }> = [
  {
    emoji: emoji.money,
    keywords: ["salary", "payroll", "wage", "income", "bonus", "freelance", "client", "payment"],
  },
  { emoji: emoji.cash, keywords: ["cash"] },
  { emoji: emoji.bank, keywords: ["bank", "transfer"] },
  { emoji: emoji.bill, keywords: ["expense", "spending", "cost", "bill", "invoice"] },
  { emoji: emoji.grocery, keywords: ["grocery", "groceries", "supermarket"] },
  { emoji: emoji.food, keywords: ["food", "meal", "restaurant", "lunch", "dinner", "coffee"] },
  { emoji: emoji.home, keywords: ["rent", "apartment", "house", "home"] },
  { emoji: emoji.electric, keywords: ["electricity", "electric", "power"] },
  { emoji: emoji.water, keywords: ["water"] },
  { emoji: emoji.web, keywords: ["internet", "wifi", "broadband", "router"] },
  { emoji: emoji.phone, keywords: ["phone", "mobile", "load", "sim"] },
  { emoji: emoji.car, keywords: ["transport", "fare", "commute", "taxi", "grab", "bus", "train", "gas", "fuel"] },
  { emoji: emoji.shopping, keywords: ["shopping", "clothes", "shoes", "mall"] },
  { emoji: emoji.hospital, keywords: ["medical", "medicine", "hospital", "doctor", "dental", "clinic"] },
  { emoji: emoji.graduation, keywords: ["school", "tuition", "education", "course"] },
  { emoji: emoji.repeat, keywords: ["subscription", "netflix", "spotify", "software", "app"] },
  { emoji: emoji.card, keywords: ["debt", "loan", "credit"] },
  { emoji: emoji.laptop, keywords: ["laptop", "computer", "pc", "macbook"] },
  { emoji: emoji.map, keywords: ["travel", "japan", "vacation", "trip", "flight", "hotel"] },
  { emoji: emoji.emergency, keywords: ["emergency", "safety", "backup"] },
  { emoji: emoji.paw, keywords: ["savings", "save", "financial freedom", "freedom"] },
  { emoji: emoji.car, keywords: ["car", "vehicle"] },
  { emoji: emoji.ring, keywords: ["wedding"] },
  { emoji: emoji.briefcase, keywords: ["business"] },
  { emoji: emoji.alert, keywords: ["overdue", "late"] },
  { emoji: emoji.timer, keywords: ["due soon"] },
  { emoji: emoji.calendar, keywords: ["upcoming"] },
  { emoji: emoji.check, keywords: ["paid", "completed", "done"] },
  { emoji: emoji.pin, keywords: ["reminder"] },
];

function normalize(input: unknown) {
  return String(input || "").toLowerCase();
}

function combine(values: Array<unknown>) {
  return values.map(normalize).join(" ");
}

export function getEmojiForText(
  input: string | null | undefined,
  fallback: string = emoji.sparkle,
): string {
  const text = normalize(input);
  return emojiRules.find(({ keywords }) => keywords.some((keyword) => text.includes(keyword)))?.emoji ?? fallback;
}

export function getEmojiForTransaction(transaction: any): string {
  const text = combine([
    transaction?.title,
    transaction?.name,
    transaction?.category,
    transaction?.type,
    transaction?.description,
    transaction?.note,
    transaction?.notes,
  ]);

  const fallback =
    transaction?.type === "income" || transaction?.type === "salary"
      ? emoji.money
      : transaction?.type === "savings" || transaction?.type === "goal_contribution"
        ? emoji.paw
        : emoji.bill;

  return getEmojiForText(text, fallback);
}

export function getEmojiForGoal(goal: any): string {
  return getEmojiForText(
    combine([goal?.title, goal?.name, goal?.category, goal?.type, goal?.description, goal?.note, goal?.notes]),
    emoji.goal,
  );
}

export function getEmojiForDueDate(dueDate: any): string {
  return getEmojiForText(
    combine([dueDate?.title, dueDate?.name, dueDate?.category, dueDate?.type, dueDate?.description, dueDate?.note, dueDate?.notes, dueDate?.status]),
    emoji.calendar,
  );
}

export function getEmojiForReminder(input: string | null | undefined): string {
  return getEmojiForText(input, emoji.calendar);
}
