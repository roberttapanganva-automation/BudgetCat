import type { LocalDueDate, LocalGoal, Reminder } from "../types/finance";

function safeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSearchText(parts: unknown[]) {
  return parts
    .map((part) => safeText(part))
    .join(" ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getBillKeywordIcon(text: string) {
  // Utilities first, so "electricity" never falls through to a generic gadget/laptop icon.
  if (
    includesAny(text, [
      "electric",
      "electricity",
      "electric bill",
      "power",
      "meralco",
      "kuryente",
      "utility bill",
    ])
  ) {
    return "⚡";
  }

  if (includesAny(text, ["water", "water bill", "maynilad", "manila water", "tubig"])) {
    return "💧";
  }

  if (
    includesAny(text, [
      "internet",
      "wifi",
      "wi fi",
      "fiber",
      "broadband",
      "web",
      "globe",
      "pldt",
      "converge",
    ])
  ) {
    return "🌐";
  }

  if (
    includesAny(text, ["phone", "mobile", "load", "prepaid", "postpaid", "sim", "cellphone"])
  ) {
    return "📱";
  }

  if (includesAny(text, ["gas bill", "lpg", "propane", "gasul", "cooking gas"])) {
    return "🔥";
  }

  // Housing and recurring home costs.
  if (
    includesAny(text, [
      "mortgage",
      "rent",
      "apartment",
      "condo",
      "house",
      "home",
      "hoa",
      "association dues",
    ])
  ) {
    return "🏠";
  }

  // Transport.
  if (includesAny(text, ["motorcycle", "motorbike", "scooter", "moto", "bike payment"])) {
    return "🏍️";
  }

  if (includesAny(text, ["car", "vehicle", "auto", "parking", "toll", "registration"])) {
    return "🚗";
  }

  if (includesAny(text, ["fuel", "petrol", "diesel", "gasoline"])) {
    return "⛽";
  }

  // Money obligations.
  if (includesAny(text, ["debt", "loan", "credit", "card", "installment", "payment plan", "balance"])) {
    return "💳";
  }

  if (includesAny(text, ["insurance", "premium", "hmo", "policy"])) {
    return "🛡️";
  }

  if (includesAny(text, ["tax", "sss", "philhealth", "pag ibig", "government"])) {
    return "🏛️";
  }

  // Food, health, family, pets.
  if (includesAny(text, ["grocery", "groceries", "supermarket", "market", "food"])) {
    return "🛒";
  }

  if (includesAny(text, ["medicine", "medical", "doctor", "hospital", "pharmacy", "health"])) {
    return "💊";
  }

  if (includesAny(text, ["school", "tuition", "education", "course", "class", "learning"])) {
    return "📚";
  }

  if (includesAny(text, ["pet", "cat", "dog", "vet"])) {
    return "🐾";
  }

  // Subscriptions and digital services.
  if (
    includesAny(text, [
      "subscription",
      "netflix",
      "spotify",
      "youtube",
      "icloud",
      "google one",
      "microsoft 365",
      "adobe",
      "software subscription",
      "saas",
    ])
  ) {
    return "🔁";
  }

  if (includesAny(text, ["laptop", "computer", "pc", "gadget", "device", "electronics"])) {
    return "💻";
  }

  if (includesAny(text, ["shopping", "shop", "store", "mall"])) {
    return "🛍️";
  }

  return "🧾";
}

export function getDueDateIcon(bill: LocalDueDate) {
  const text = normalizeSearchText([
    bill.title,
    bill.note,
    bill.repeat_type,
    bill.status,
  ]);

  return getBillKeywordIcon(text);
}

export function getReminderIcon(reminder: Reminder) {
  if (reminder.icon?.trim()) {
    return reminder.icon;
  }

  const text = normalizeSearchText([
    reminder.title,
    reminder.body,
    reminder.type,
    reminder.status,
    reminder.severity,
  ]);

  if (reminder.type === "bill") {
    return getBillKeywordIcon(text);
  }

  if (includesAny(text, ["savings", "save", "seed", "deposit", "contribution"])) {
    return "🌱";
  }

  if (includesAny(text, ["goal", "target", "deadline", "pace", "progress"])) {
    return "🎯";
  }

  if (includesAny(text, ["overdue", "urgent", "critical", "warning", "late"])) {
    return "🚨";
  }

  if (includesAny(text, ["complete", "completed", "success", "paid", "done"])) {
    return "✅";
  }

  return "🔔";
}

export function getGoalIcon(goal: LocalGoal) {
  const text = normalizeSearchText([goal.type, goal.title, goal.note]);

  if (includesAny(text, ["travel", "trip", "flight", "hotel", "vacation"])) {
    return "✈️";
  }

  if (includesAny(text, ["emergency", "safety", "backup"])) {
    return "🛟";
  }

  if (includesAny(text, ["investment", "invest", "stock", "fund", "financial freedom", "freedom"])) {
    return "📈";
  }

  if (includesAny(text, ["purchase", "buy", "gadget", "phone", "laptop", "computer", "device"])) {
    return "🛍️";
  }

  if (includesAny(text, ["home", "house", "rent", "mortgage", "renovation"])) {
    return "🏠";
  }

  if (includesAny(text, ["savings", "save", "seed", "general"])) {
    return "🌱";
  }

  return "🎯";
}

// Backward-compatible aliases in case older components import these names.
export const getBillIcon = getDueDateIcon;
export const getDueDateEmoji = getDueDateIcon;
export const getGoalEmoji = getGoalIcon;
