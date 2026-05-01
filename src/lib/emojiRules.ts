const emoji = {
  // Income / Money
  money: "💰",
  cash: "💵",
  bank: "🏦",
  gift: "🎁",

  // Bills / Utilities
  bill: "🧾",
  electric: "⚡",
  water: "💧",
  web: "🌐",
  phone: "📱",
  gas: "🔥",

  // Food
  grocery: "🛒",
  food: "🍽️",
  coffee: "☕",

  // Home
  home: "🏠",
  tools: "🛠️",
  furniture: "🛋️",

  // Transport
  car: "🚗",
  fuel: "⛽",
  motorcycle: "🏍️",
  flight: "✈️",
  map: "🗺️",

  // Health
  hospital: "🏥",
  fitness: "🏋️",

  // Education
  graduation: "🎓",
  book: "📚",

  // Shopping / Tech
  shopping: "🛍️",
  laptop: "💻",
  phone2: "📲",

  // Subscriptions
  repeat: "🔁",

  // Finance
card: "💳",
seedling: "🌱",
Seedling: "🌱", // kept for backward compatibility with existing emojiRules
goal: "🎯",
investment: "📈",

  // Lifestyle
  game: "🎮",
  pet: "🐶",
  beauty: "💄",
  party: "🎉",
  religion: "⛪",

  // Business / Events
  briefcase: "💼",
  ring: "💍",

  // Status
  alert: "🚨",
  timer: "⏰",
  calendar: "📅",
  check: "✅",
  pin: "📌",
  emergency: "🆘",

  // Safe fallback
sparkle: "✨",
default: "🏷️",
} as const;

const emojiRules: Array<{ emoji: string; keywords: string[] }> = [
  // ── INCOME ───────────────────────────────────────────────────────
  {
    emoji: emoji.money,
    keywords: ["salary", "payroll", "wage", "income", "bonus", "freelance", "client", "payment", "commission", "allowance", "stipend", "profit", "revenue", "earnings", "payout", "honorarium"],
  },
  { emoji: emoji.cash, keywords: ["cash", "withdrawal", "atm", "bills", "coins", "change"] },
  { emoji: emoji.bank, keywords: ["bank", "transfer", "deposit", "wire", "remittance", "gcash", "maya", "paymaya", "paypal", "wise"] },
  { emoji: emoji.gift, keywords: ["gift", "reward", "prize", "giveaway", "pasalubong", "present"] },

  // ── BILLS & EXPENSES ─────────────────────────────────────────────
  { emoji: emoji.bill, keywords: ["expense", "spending", "cost", "bill", "invoice", "charge", "fee", "dues", "penalty", "fine"] },
  { emoji: emoji.electric, keywords: ["electricity", "electric", "power", "meralco", "energy", "generator"] },
  { emoji: emoji.water, keywords: ["water", "maynilad", "manila water", "nawasa"] },
  { emoji: emoji.web, keywords: ["internet", "wifi", "broadband", "router", "pldt", "converge", "globe", "fiber", "data plan"] },
  { emoji: emoji.phone, keywords: ["phone", "mobile", "load", "sim", "prepaid", "postpaid", "globe", "smart", "dito", "sun"] },
  { emoji: emoji.gas, keywords: ["gas", "lpg", "cooking gas", "gasul", "propane"] },

  // ── FOOD & DRINKS ─────────────────────────────────────────────────
  { emoji: emoji.grocery, keywords: ["grocery", "groceries", "supermarket", "palengke", "market", "wet market", "SM supermarket", "robinsons", "puregold", "savemore"] },
  { emoji: emoji.food, keywords: ["food", "meal", "restaurant", "lunch", "dinner", "breakfast", "snack", "takeout", "delivery", "jollibee", "mcdo", "mcdonald", "kfc", "pizza", "shawarma", "merienda"] },
  { emoji: emoji.coffee, keywords: ["coffee", "cafe", "starbucks", "milk tea", "boba", "tea", "drinks", "juice"] },

  // ── HOME ─────────────────────────────────────────────────────────
  { emoji: emoji.home, keywords: ["rent", "apartment", "house", "home", "condo", "boarding house", "dorm", "amortization", "mortgage"] },
  { emoji: emoji.tools, keywords: ["repair", "maintenance", "plumber", "electrician", "hardware", "renovation", "construction", "fix"] },
  { emoji: emoji.furniture, keywords: ["furniture", "appliance", "ref", "refrigerator", "aircon", "washing machine", "tv", "sofa", "bed", "cabinet"] },

  // ── TRANSPORT ─────────────────────────────────────────────────────
  { emoji: emoji.car, keywords: ["transport", "fare", "commute", "taxi", "grab", "bus", "train", "jeep", "jeepney", "mrt", "lrt", "tricycle", "fx"] },
  { emoji: emoji.fuel, keywords: ["fuel", "gas station", "petrol", "diesel", "gasoline", "petron", "shell", "caltex", "seaoil"] },
  { emoji: emoji.motorcycle, keywords: ["motorcycle", "motor", "motorbike", "habal", "angkas", "helmet", "bike", "moto"] },
  { emoji: emoji.car, keywords: ["car", "vehicle", "auto", "suv", "van", "truck", "car wash", "parking", "toll"] },
  { emoji: emoji.flight, keywords: ["travel", "vacation", "trip", "flight", "airline", "cebu pacific", "pal", "airasia", "airport", "terminal"] },
  { emoji: emoji.map, keywords: ["hotel", "japan", "korea", "abroad", "international", "tourist", "airbnb", "resort", "lodging"] },

  // ── HEALTH ───────────────────────────────────────────────────────
  { emoji: emoji.hospital, keywords: ["medical", "medicine", "hospital", "doctor", "dental", "clinic", "checkup", "lab", "xray", "prescription", "pharmacy", "drugstore", "botika", "health card", "hmo"] },
  { emoji: emoji.fitness, keywords: ["gym", "fitness", "workout", "yoga", "sports", "swimming", "crossfit"] },

  // ── EDUCATION ─────────────────────────────────────────────────────
  { emoji: emoji.graduation, keywords: ["school", "tuition", "education", "course", "training", "seminar", "workshop", "review", "tutorial", "udemy", "coursera"] },
  { emoji: emoji.book, keywords: ["book", "books", "reading", "library", "notebook", "supplies", "school supplies"] },

  // ── SHOPPING ─────────────────────────────────────────────────────
  { emoji: emoji.shopping, keywords: ["shopping", "clothes", "shoes", "mall", "lazada", "shopee", "online shop", "fashion", "bag", "accessories", "watch", "jewelry"] },
  { emoji: emoji.laptop, keywords: ["laptop", "computer", "pc", "macbook", "keyboard", "mouse", "monitor", "printer", "gadget"] },
  { emoji: emoji.phone2, keywords: ["iphone", "android", "samsung", "smartphone", "tablet", "ipad"] },

  // ── SUBSCRIPTIONS ─────────────────────────────────────────────────
  { emoji: emoji.repeat, keywords: ["subscription", "netflix", "spotify", "youtube", "disney", "apple", "software", "app", "saas", "canva", "figma", "chatgpt", "claude", "notion", "dropbox"] },

  // ── FINANCE ───────────────────────────────────────────────────────
  { emoji: emoji.card, keywords: ["debt", "loan", "credit", "credit card", "installment", "bayad", "bpi", "bdo", "metrobank", "security bank", "sss", "pagibig", "philhealth"] },
  { emoji: emoji.Seedling, keywords: ["savings", "save", "ipon", "financial freedom", "freedom", "emergency fund", "fund", "goal"] },
  { emoji: emoji.investment, keywords: ["investment", "stock", "crypto", "mutual fund", "uitf", "pse", "binance", "dividend"] },

  // ── LIFESTYLE ─────────────────────────────────────────────────────
  { emoji: emoji.game, keywords: ["gaming", "game", "steam", "playstation", "xbox", "mobile legends", "codm", "roblox", "load game"] },
  { emoji: emoji.pet, keywords: ["pet", "dog", "cat", "vet", "pet food", "grooming"] },
  { emoji: emoji.beauty, keywords: ["beauty", "skincare", "haircut", "salon", "barber", "spa", "makeup", "grooming"] },
  { emoji: emoji.party, keywords: ["celebration", "party", "birthday", "anniversary", "christmas", "noche buena", "media noche", "fiesta"] },
  { emoji: emoji.religion, keywords: ["church", "offering", "tithe", "donation", "charity", "daw"] },

  // ── BUSINESS ──────────────────────────────────────────────────────
  { emoji: emoji.briefcase, keywords: ["business", "office", "supplies", "printing", "courier", "lalamove", "j&t", "lbc"] },
  { emoji: emoji.ring, keywords: ["wedding", "engagement", "honeymoon", "bridal", "groom", "ceremony"] },

  // ── STATUS ────────────────────────────────────────────────────────
  { emoji: emoji.alert, keywords: ["overdue", "late", "missed", "unpaid"] },
  { emoji: emoji.timer, keywords: ["due soon", "due today", "expiring", "deadline"] },
  { emoji: emoji.calendar, keywords: ["upcoming", "scheduled", "monthly", "weekly", "annual"] },
  { emoji: emoji.check, keywords: ["paid", "completed", "done", "settled", "cleared"] },
  { emoji: emoji.pin, keywords: ["reminder", "note", "memo", "flagged"] },
  { emoji: emoji.emergency, keywords: ["emergency", "safety", "backup", "urgent", "unexpected"] },
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
        ? emoji.seedling
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
