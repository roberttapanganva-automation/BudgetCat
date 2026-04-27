export type StartupErrorCode =
  | "auth_init_failed"
  | "supabase_session_timeout"
  | "dexie_open_failed"
  | "sync_init_failed";

export type StartupErrorState = {
  code: StartupErrorCode;
  title: string;
  message: string;
};

export const startupTimeoutMs = 10000;

export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timeoutId: number | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
}

export function createStartupError(
  code: StartupErrorCode,
  message = "The app took too long to open. Your local data may still be safe.",
): StartupErrorState {
  return {
    code,
    title: "BudgetCat needs a quick refresh",
    message,
  };
}

export function logStartupWarning(code: StartupErrorCode, error: unknown) {
  console.warn(`[BudgetCat startup] ${code}`, error);
}

export function logStartupError(code: StartupErrorCode, error: unknown) {
  console.error(`[BudgetCat startup] ${code}`, error);
}

export function reloadBudgetCat() {
  location.reload();
}

export function emergencyResetBudgetCat() {
  localStorage.clear();
  sessionStorage.clear();
  indexedDB.deleteDatabase("BudgetCatLocalDb");
  location.reload();
}
