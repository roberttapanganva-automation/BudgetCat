import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { getOrCreateHousehold } from "../lib/household";
import { ensureLocalDefaults, getLocalHouseholdId } from "../lib/localDb";
import { hasSupabaseConfig, supabase } from "../lib/supabase";
import { syncPendingRecords } from "../lib/syncEngine";
import {
  createStartupError,
  logStartupError,
  logStartupWarning,
  startupTimeoutMs,
  type StartupErrorState,
  withTimeout,
} from "../lib/startupDebug";
import type { BudgetCatUser } from "../types/finance";

type AuthContextValue = {
  user: BudgetCatUser | null;
  isLoading: boolean;
  authError: string | null;
  authMessage: string | null;
  startupError: StartupErrorState | null;
  isSupabaseConfigured: boolean;
  retryStartup: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const localSessionKey = "budgetcat-local-session";

async function toBudgetCatUser(user: User): Promise<BudgetCatUser | null> {
  if (!user.email) return null;

  let householdId = "";

  try {
    householdId = hasSupabaseConfig && supabase
      ? await withTimeout(getOrCreateHousehold(user), 6000, "household_init")
      : getLocalHouseholdId(user.id);
  } catch (error) {
    logStartupWarning("auth_init_failed", error);
    householdId = getLocalHouseholdId(user.id);
  }

  return {
    id: user.id,
    email: user.email,
    householdId,
    isOffline: !hasSupabaseConfig,
    nickname:
      typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : undefined,
    fullName:
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
  };
}

function getStoredLocalUser() {
  try {
    const raw = localStorage.getItem(localSessionKey);
    return raw ? (JSON.parse(raw) as BudgetCatUser) : null;
  } catch (error) {
    logStartupWarning("auth_init_failed", error);
    return null;
  }
}

function createLocalUser(email: string) {
  const existing = getStoredLocalUser();
  if (existing?.email === email) return existing;

  const id = crypto.randomUUID?.() ?? `local-${Date.now()}`;
  const localUser: BudgetCatUser = {
    id,
    email,
    householdId: getLocalHouseholdId(id),
    isOffline: true,
  };

  localStorage.setItem(localSessionKey, JSON.stringify(localUser));
  return localUser;
}

async function prepareUserData(user: BudgetCatUser) {
  if (!user.householdId) return;
  await withTimeout(
    ensureLocalDefaults(user.id, user.householdId),
    startupTimeoutMs,
    "dexie_open",
  );

  syncPendingRecords(user).catch((error) => {
    logStartupWarning("sync_init_failed", error);
  });
}

function getFriendlyAuthError(error: AuthError | Error) {
  const message = error.message.toLowerCase();

  if (message.includes("invalid login") || message.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("email not confirmed") || message.includes("confirm")) {
    return "Please confirm your email, then log in.";
  }
  if (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("user already exists")
  ) {
    return "That account already exists. Switch to Login and use your password.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Network/auth request failed. Check your connection and try again.";
  }

  return error.message || "Authentication failed. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<BudgetCatUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<StartupErrorState | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsLoading(true);
      setStartupError(null);

      try {
        if (!hasSupabaseConfig || !supabase) {
          const localUser = getStoredLocalUser();
          if (localUser) {
            await prepareUserData(localUser);
          }
          if (isMounted) {
            setUser(localUser);
            setIsLoading(false);
          }
          return;
        }

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          startupTimeoutMs,
          "supabase_session",
        );
        const sessionUser = data.session ? await toBudgetCatUser(data.session.user) : null;
        if (sessionUser) {
          await prepareUserData(sessionUser);
        }
        if (isMounted) {
          setUser(sessionUser);
          setIsLoading(false);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Startup failed.";
        const isSupabaseTimeout = message.toLowerCase().includes("supabase_session");
        const code = isSupabaseTimeout ? "supabase_session_timeout" : "auth_init_failed";

        if (code === "supabase_session_timeout") {
          logStartupWarning(code, error);
        } else {
          logStartupError(code, error);
        }

        const localUser = getStoredLocalUser();
        if (localUser) {
          try {
            await prepareUserData(localUser);
            if (isMounted) {
              setUser(localUser);
              setIsLoading(false);
              setStartupError(null);
            }
            return;
          } catch (localError) {
            logStartupError("dexie_open_failed", localError);
          }
        }

        if (isMounted) {
          setStartupError(
            createStartupError(
              code,
              code === "supabase_session_timeout"
                ? "Supabase took too long to respond. BudgetCat stopped waiting so you are not stuck on loading."
                : "BudgetCat could not finish startup. Your local data may still be safe.",
            ),
          );
          setIsLoading(false);
        }
      }
    }

    loadSession();

    if (!hasSupabaseConfig || !supabase) {
      return () => {
        isMounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const sessionUser = session ? await toBudgetCatUser(session.user) : null;
        if (sessionUser) {
          await prepareUserData(sessionUser);
        }
        setUser(sessionUser);
        setStartupError(null);
      } catch (error) {
        logStartupError("auth_init_failed", error);
        setStartupError(createStartupError("auth_init_failed"));
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [startupAttempt]);

  const handleAuthError = (error: AuthError | Error) => {
    setAuthError(getFriendlyAuthError(error));
    throw error;
  };

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthMessage(null);

    if (!hasSupabaseConfig || !supabase) {
      const localUser = createLocalUser(email);
      await prepareUserData(localUser);
      setUser(localUser);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) handleAuthError(error);
    const sessionUser = data.session ? await toBudgetCatUser(data.session.user) : null;
    if (sessionUser) {
      await prepareUserData(sessionUser);
      setUser(sessionUser);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthMessage(null);

    if (!hasSupabaseConfig || !supabase) {
      const localUser = createLocalUser(email);
      await prepareUserData(localUser);
      setUser(localUser);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) handleAuthError(error);
    const sessionUser = data.session ? await toBudgetCatUser(data.session.user) : null;
    if (sessionUser) {
      await prepareUserData(sessionUser);
      setUser(sessionUser);
      setAuthMessage("Account created and signed in.");
      return;
    }

    setAuthMessage("Account created. Please confirm your email, then log in.");
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    setAuthMessage(null);

    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut();
    }

    localStorage.removeItem(localSessionKey);
    setUser(null);
  }, []);

  const retryStartup = useCallback(() => {
    setStartupAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      authError,
      authMessage,
      startupError,
      isSupabaseConfigured: hasSupabaseConfig,
      retryStartup,
      signIn,
      signUp,
      signOut,
    }),
    [
      authError,
      authMessage,
      isLoading,
      retryStartup,
      signIn,
      signOut,
      signUp,
      startupError,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
