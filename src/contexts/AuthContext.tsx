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
import { ensureLocalDefaults, getKnownLocalHouseholdId, getLocalHouseholdId } from "../lib/localDb";
import { getSupabaseSessionOnce, hasSupabaseConfig, supabase } from "../lib/supabase";
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

type AuthBootState =
  | "initializing"
  | "authenticated_online"
  | "authenticated_offline"
  | "unauthenticated"
  | "auth_error";

type AuthContextValue = {
  user: BudgetCatUser | null;
  isLoading: boolean;
  authBootState: AuthBootState;
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

function storeLocalUser(user: BudgetCatUser) {
  localStorage.setItem(localSessionKey, JSON.stringify(user));
}

function logAuthBoot(message: string, details?: Record<string, unknown>) {
  console.info(`[BudgetCat Auth Boot] ${message}`, details ?? {});
}

async function toBudgetCatUser(user: User): Promise<BudgetCatUser | null> {
  if (!user.email) return null;

  let householdId = "";

  try {
    householdId = hasSupabaseConfig && supabase
      ? await withTimeout(getOrCreateHousehold(user), 6000, "household_init")
      : getLocalHouseholdId(user.id);
  } catch (error) {
    logStartupWarning("auth_init_failed", error);
    if (hasSupabaseConfig && supabase) {
      throw error;
    }
    householdId = getLocalHouseholdId(user.id);
  }

  const budgetCatUser = {
    id: user.id,
    email: user.email,
    householdId,
    isOffline: !hasSupabaseConfig,
    nickname:
      typeof user.user_metadata?.nickname === "string" ? user.user_metadata.nickname : undefined,
    fullName:
      typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : undefined,
  };

  storeLocalUser(budgetCatUser);
  return budgetCatUser;
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

function getCachedSupabaseUser() {
  try {
    const authKey = Object.keys(localStorage).find(
      (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
    );
    if (!authKey) return null;

    const raw = localStorage.getItem(authKey);
    const parsed = raw ? JSON.parse(raw) : null;
    const user = parsed?.user ?? parsed?.currentSession?.user;

    if (!user?.id || !user?.email) return null;

    return {
      id: String(user.id),
      email: String(user.email),
      nickname:
        typeof user.user_metadata?.nickname === "string"
          ? user.user_metadata.nickname
          : undefined,
      fullName:
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : undefined,
    };
  } catch (error) {
    logStartupWarning("auth_init_failed", error);
    return null;
  }
}

async function getOfflineCachedUser() {
  const storedUser = getStoredLocalUser();
  if (storedUser?.id && storedUser.householdId) return storedUser;

  const cachedSupabaseUser = getCachedSupabaseUser();
  if (!cachedSupabaseUser) return storedUser;

  const knownHouseholdId = await getKnownLocalHouseholdId(cachedSupabaseUser.id);

  if (storedUser?.householdId || knownHouseholdId) {
    return {
      ...(storedUser ?? {}),
      id: cachedSupabaseUser.id,
      email: cachedSupabaseUser.email,
      householdId: storedUser?.householdId ?? knownHouseholdId ?? "",
      isOffline: true,
      nickname: cachedSupabaseUser.nickname ?? storedUser?.nickname,
      fullName: cachedSupabaseUser.fullName ?? storedUser?.fullName,
    };
  }

  return null;
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

  storeLocalUser(localUser);
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
  const [authBootState, setAuthBootState] = useState<AuthBootState>("initializing");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [startupError, setStartupError] = useState<StartupErrorState | null>(null);
  const [startupAttempt, setStartupAttempt] = useState(0);

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setIsLoading(true);
      setStartupError(null);
      setAuthBootState("initializing");

      const isOnline = navigator.onLine;
      const cachedUser = await getOfflineCachedUser();
      logAuthBoot("start", {
        online: isOnline,
        cachedSessionFound: Boolean(getCachedSupabaseUser()),
        cachedIdentityFound: Boolean(cachedUser?.id && cachedUser.householdId),
      });

      try {
        if (!hasSupabaseConfig || !supabase) {
          const localUser = getStoredLocalUser();
          if (localUser) {
            await prepareUserData(localUser);
          }
          if (isMounted) {
            setUser(localUser);
            setAuthBootState(localUser ? "authenticated_offline" : "unauthenticated");
            setIsLoading(false);
            logAuthBoot("finish", {
              state: localUser ? "authenticated_offline" : "unauthenticated",
              offlineFallbackUsed: Boolean(localUser),
            });
          }
          return;
        }

        if (!isOnline) {
          if (cachedUser?.householdId) {
            const offlineUser = { ...cachedUser, isOffline: true };
            await prepareUserData(offlineUser);
          }
          if (isMounted) {
            setUser(cachedUser ? { ...cachedUser, isOffline: true } : null);
            setAuthBootState(cachedUser ? "authenticated_offline" : "unauthenticated");
            setIsLoading(false);
            logAuthBoot("finish", {
              state: cachedUser ? "authenticated_offline" : "unauthenticated",
              offlineFallbackUsed: Boolean(cachedUser),
              householdFound: Boolean(cachedUser?.householdId),
            });
          }
          return;
        }

        const session = await withTimeout(
          getSupabaseSessionOnce(),
          startupTimeoutMs,
          "supabase_session",
        );
        const sessionUser = session ? await toBudgetCatUser(session.user) : null;
        if (sessionUser) {
          await prepareUserData(sessionUser);
        }
        if (isMounted) {
          setUser(sessionUser);
          setAuthBootState(sessionUser ? "authenticated_online" : "unauthenticated");
          setIsLoading(false);
          logAuthBoot("finish", {
            state: sessionUser ? "authenticated_online" : "unauthenticated",
            offlineFallbackUsed: false,
            householdFound: Boolean(sessionUser?.householdId),
          });
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

        const localUser = !navigator.onLine ? await getOfflineCachedUser() : getStoredLocalUser();
        if (localUser) {
          try {
            const fallbackUser = { ...localUser, isOffline: !navigator.onLine || localUser.isOffline };
            await prepareUserData(fallbackUser);
            if (isMounted) {
              setUser(fallbackUser);
              setAuthBootState(!navigator.onLine ? "authenticated_offline" : "authenticated_online");
              setIsLoading(false);
              setStartupError(null);
              logAuthBoot("finish", {
                state: !navigator.onLine ? "authenticated_offline" : "authenticated_online",
                offlineFallbackUsed: !navigator.onLine,
                householdFound: Boolean(fallbackUser.householdId),
              });
            }
            return;
          } catch (localError) {
            logStartupError("dexie_open_failed", localError);
          }
        }

        if (isMounted) {
          setAuthBootState("auth_error");
          logAuthBoot("finish", {
            state: "auth_error",
            offlineFallbackUsed: false,
            householdFound: false,
          });
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => {
        if (!isMounted) return;

        void (async () => {
          try {
            if (!navigator.onLine) {
              const cachedUser = await getOfflineCachedUser();
              if (cachedUser?.householdId) {
                const offlineUser = { ...cachedUser, isOffline: true };
                await prepareUserData(offlineUser);
                if (!isMounted) return;
                setUser(offlineUser);
                setAuthBootState("authenticated_offline");
                setStartupError(null);
                setIsLoading(false);
                logAuthBoot("auth listener offline fallback", {
                  cachedSessionFound: Boolean(getCachedSupabaseUser()),
                  cachedIdentityFound: true,
                  offlineFallbackUsed: true,
                  finalState: "authenticated_offline",
                });
                return;
              }

              if (!isMounted) return;
              setUser(null);
              setAuthBootState("unauthenticated");
              setIsLoading(false);
              logAuthBoot("auth listener offline without cached identity", {
                cachedSessionFound: Boolean(getCachedSupabaseUser()),
                cachedIdentityFound: false,
                offlineFallbackUsed: false,
                finalState: "unauthenticated",
              });
              return;
            }

            const sessionUser = session ? await toBudgetCatUser(session.user) : null;
            if (sessionUser) {
              await prepareUserData(sessionUser);
            }
            if (!isMounted) return;
            setUser(sessionUser);
            setAuthBootState(sessionUser ? "authenticated_online" : "unauthenticated");
            setStartupError(null);
          } catch (error) {
            logStartupError("auth_init_failed", error);
            if (!isMounted) return;
            setAuthBootState("auth_error");
            setStartupError(createStartupError("auth_init_failed"));
          } finally {
            if (isMounted) {
              setIsLoading(false);
            }
          }
        })();
      }, 0);
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
      setAuthBootState("authenticated_offline");
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
      setAuthBootState("authenticated_online");
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    setAuthMessage(null);

    if (!hasSupabaseConfig || !supabase) {
      const localUser = createLocalUser(email);
      await prepareUserData(localUser);
      setUser(localUser);
      setAuthBootState("authenticated_offline");
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
      setAuthBootState("authenticated_online");
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
    setAuthBootState("unauthenticated");
  }, []);

  const retryStartup = useCallback(() => {
    setStartupAttempt((attempt) => attempt + 1);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      authBootState,
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
      authBootState,
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
