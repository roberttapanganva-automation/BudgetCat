export const PAYMENT_METHOD_OPTIONS = [
  { id: "cash", label: "Cash" },
  { id: "gcash", label: "GCash" },
  { id: "maya", label: "Maya" },
  { id: "bank-transfer", label: "Bank Transfer" },
  { id: "debit-card", label: "Debit Card" },
  { id: "credit-card", label: "Credit Card" },
  { id: "e-wallet", label: "E-wallet" },
  { id: "other", label: "Other" },
];

const paymentMethodAliases: Record<string, string> = {
  bank: "bank-transfer",
  "bank transfer": "bank-transfer",
  bank_transfer: "bank-transfer",
  card: "debit-card",
  debit: "debit-card",
  "debit card": "debit-card",
  credit: "credit-card",
  "credit card": "credit-card",
  ewallet: "e-wallet",
  "e wallet": "e-wallet",
  gcash: "gcash",
  "g-cash": "gcash",
};

export function getPaymentMethodLabel(value?: string | null) {
  if (!value) return "Cash";

  const normalizedValue = value.toLowerCase().trim();
  const aliasedValue = paymentMethodAliases[normalizedValue] ?? normalizedValue;

  const match = PAYMENT_METHOD_OPTIONS.find(
    (method) =>
      method.id === aliasedValue ||
      method.label.toLowerCase() === aliasedValue,
  );

  return match?.label ?? value;
}

export function normalizePaymentMethod(value?: string | null) {
  if (!value) return "cash";

  const normalizedValue = value.toLowerCase().trim();
  const aliasedValue = paymentMethodAliases[normalizedValue] ?? normalizedValue;

  const match = PAYMENT_METHOD_OPTIONS.find(
    (method) =>
      method.id === aliasedValue ||
      method.label.toLowerCase() === aliasedValue,
  );

  return match?.id ?? normalizedValue;
}
