import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { isOfflineLikeError } from "./startupDebug";
import { setLatestSyncError } from "./syncErrorStore";

const householdCache = new Map<string, string>();
const householdRequestCache = new Map<string, Promise<string>>();
const householdStorageKey = "budgetcat-household-cache";

function emailPrefix(email?: string | null) {
  return email?.split("@")[0] || "BudgetCat";
}

function logHouseholdError(action: string, error: unknown) {
  const supabaseError =
    error && typeof error === "object" && "message" in error
      ? (error as {
          message?: string;
          details?: string | null;
          hint?: string | null;
          code?: string | null;
        })
      : null;

  console.error("[BudgetCat Household Error]", {
    action,
    message: supabaseError?.message ?? "Unknown household error",
    details: supabaseError?.details,
    hint: supabaseError?.hint,
    code: supabaseError?.code,
  });

  setLatestSyncError({
    tableName: "household_members",
    action,
    message: supabaseError?.message ?? "Unknown household error",
    details: supabaseError?.details,
    hint: supabaseError?.hint,
    code: supabaseError?.code,
    createdAt: new Date().toISOString(),
  });
}

function readHouseholdStorage() {
  try {
    const raw = localStorage.getItem(householdStorageKey);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function readLocalSessionHousehold(userId: string) {
  try {
    const raw = localStorage.getItem("budgetcat-local-session");
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.id === userId && typeof parsed.householdId === "string"
      ? parsed.householdId
      : null;
  } catch {
    return null;
  }
}

export function getCachedHouseholdId(userId: string) {
  if (householdCache.has(userId)) {
    return householdCache.get(userId) as string;
  }

  const storageHouseholdId = readHouseholdStorage()[userId];
  const sessionHouseholdId = readLocalSessionHousehold(userId);
  const householdId = storageHouseholdId || sessionHouseholdId;

  if (householdId) {
    householdCache.set(userId, householdId);
    return householdId;
  }

  return null;
}

export function saveCachedHouseholdId(userId: string, householdId: string) {
  if (!userId || !householdId) return;

  householdCache.set(userId, householdId);

  try {
    const storage = readHouseholdStorage();
    storage[userId] = householdId;
    localStorage.setItem(householdStorageKey, JSON.stringify(storage));
  } catch {
    // Local cache writes are best-effort; Supabase remains the source of truth online.
  }
}

export async function getOrCreateHousehold(user: User) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  if (householdCache.has(user.id)) {
    return householdCache.get(user.id) as string;
  }
  if (householdRequestCache.has(user.id)) {
    return householdRequestCache.get(user.id) as Promise<string>;
  }

  const request = getOrCreateHouseholdInternal(user).finally(() => {
    householdRequestCache.delete(user.id);
  });

  householdRequestCache.set(user.id, request);
  return request;
}

async function getOrCreateHouseholdInternal(user: User) {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  const cachedHouseholdId = getCachedHouseholdId(user.id);
  let existingMembership;

  try {
    existingMembership = await supabase
      .from("household_members")
      .select("household_id")
      .eq("user_id", user.id)
      .maybeSingle();
  } catch (error) {
    if (cachedHouseholdId && isOfflineLikeError(error)) {
      console.info("[BOOT_TRACE] household init failed but cached household fallback used", {
        householdFound: true,
        reason: error instanceof Error ? error.message : String(error),
      });
      return cachedHouseholdId;
    }

    throw error;
  }

  if (existingMembership.error) {
    if (cachedHouseholdId && isOfflineLikeError(existingMembership.error)) {
      console.info("[BOOT_TRACE] household init failed but cached household fallback used", {
        householdFound: true,
        reason: existingMembership.error.message,
      });
      return cachedHouseholdId;
    }
    logHouseholdError("read household membership", existingMembership.error);
    throw existingMembership.error;
  }

  if (existingMembership.data?.household_id) {
    const householdId = existingMembership.data.household_id as string;
    saveCachedHouseholdId(user.id, householdId);
    return householdId;
  }

  const createdHousehold = await supabase
    .from("households")
    .insert({
      name: `${emailPrefix(user.email)}'s Household`,
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (createdHousehold.error) {
    logHouseholdError("create household", createdHousehold.error);
    throw createdHousehold.error;
  }

  const householdId = createdHousehold.data.id as string;
  const createdMembership = await supabase.from("household_members").upsert(
    {
      household_id: householdId,
      user_id: user.id,
      email: user.email,
      role: "owner",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "household_id,user_id" },
  );

  if (createdMembership.error) {
    logHouseholdError("create household membership", createdMembership.error);
    throw createdMembership.error;
  }

  saveCachedHouseholdId(user.id, householdId);
  return householdId;
}
