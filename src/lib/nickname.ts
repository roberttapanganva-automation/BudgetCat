import type { BudgetCatUser } from "../types/finance";
import { hasSupabaseConfig, supabase } from "./supabase";

const nicknamePrefix = "budgetcat-nickname";
export const nicknameEventName = "budgetcat-nickname-change";

function keyForUser(userId: string) {
  return `${nicknamePrefix}-${userId}`;
}

export function getStoredNickname(userId?: string) {
  if (!userId) return "";
  return localStorage.getItem(keyForUser(userId))?.trim() ?? "";
}

export function getDisplayNickname(user?: BudgetCatUser | null) {
  const stored = getStoredNickname(user?.id);
  if (stored) return stored;

  const metadataName = user?.nickname || user?.fullName;
  if (metadataName?.trim()) return metadataName.trim();

  const emailName = user?.email?.split("@")[0]?.trim();
  return emailName || "friend";
}

export async function saveNickname(user: BudgetCatUser | null, nickname: string) {
  if (!user?.id) return;

  const cleanNickname = nickname.trim();
  localStorage.setItem(keyForUser(user.id), cleanNickname);
  window.dispatchEvent(new CustomEvent(nicknameEventName));

  if (hasSupabaseConfig && supabase && !user.isOffline) {
    await supabase.auth.updateUser({
      data: {
        nickname: cleanNickname,
        full_name: cleanNickname,
      },
    });
  }
}
