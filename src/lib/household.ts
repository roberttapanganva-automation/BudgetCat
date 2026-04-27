import type { User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { setLatestSyncError } from "./syncErrorStore";

const householdCache = new Map<string, string>();
const householdRequestCache = new Map<string, Promise<string>>();

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
  const existingMembership = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMembership.error) {
    logHouseholdError("read household membership", existingMembership.error);
    throw existingMembership.error;
  }

  if (existingMembership.data?.household_id) {
    const householdId = existingMembership.data.household_id as string;
    householdCache.set(user.id, householdId);
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

  householdCache.set(user.id, householdId);
  return householdId;
}
