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
import { getCachedHouseholdId, getOrCreateHousehold, saveCachedHouseholdId } from "../lib/household";
import { ensureLocalDefaults, getKnownLocalHouseholdId, getLocalHouseholdId } from "../lib/localDb";
import { getSupabaseSessionOnce, hasSupabaseConfig, supabase } from "../lib/supabase";
import { syncPendingRecords } from "../lib/syncEngine";
import {
  createStartupError,
  isOfflineLikeError,
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
  | "authenticated_degraded"
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
const bootTraceStartedAt = performance.now();

function bootTrace(message: string, details?: Record<string, unknown>) {
  console.info(`[BOOT_TRACE] ${message}`, {
    elapsedMs: Math.round(performance.now() - bootTraceStartedAt),
    ...(details ?? {}),
  });
}

function storeLocalUser(user: BudgetCatUser) {
  localStorage.setItem(localSessionKey, JSON.stringify(user));
  saveCachedHouseholdId(user.id, user.householdId);
}

function logAuthBoot(message: string, details?: Record<string, unknown>) {
  console.info(`[BudgetCat Auth Boot] ${message}`, details ?? {});
}

async function toBudgetCatUser(user: User): Promise<BudgetCatUser | null> {
  if (!user.email) return null;

  let householdId = "";
  let isDegraded = false;

  try {
    const cachedHouseholdId = getCachedHouseholdId(user.id);
    if (cachedHouseholdId) {
      bootTrace("cached household id found =", {
        value: true,
        source: "pre-household lookup",
      });
      householdId = cachedHouseholdId;
    } else {
      bootTrace("auth init step: loading household", {
        userId: user.id,
        source: hasSupabaseConfig && supabase ? "supabase" : "local",
      });
      householdId = hasSupabaseConfig && supabase
        ? await withTimeout(getOrCreateHousehold(user), 6000, "household_init")
        : getLocalHouseholdId(user.id);
      bootTrace("auth init step completed: household", {
        householdFound: Boolean(householdId),
        source: hasSupabaseConfig && supabase ? "supabase" : "local",
      });
    }
  } catch (error) {
    logStartupWarning("auth_init_failed", error);
    const cachedHouseholdId = getCachedHouseholdId(user.id);
    if (cachedHouseholdId && isOfflineLikeError(error)) {
      householdId = cachedHouseholdId;
      isDegraded = true;
      bootTrace("household init failed but cached household fallback used", {
        householdFound: true,
        reason: error instanceof Error ? error.message : String(error),
      });
    } else if (hasSupabaseConfig && supabase) {
      throw error;
    } else {
      householdId = getLocalHouseholdId(user.id);
    }
  }

  const budgetCatUser = {
    id: user.id,
    email: user.email,
    householdId,
    isOffline: !hasSupabaseConfig || isDegraded,
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

  const cachedHouseholdId = getCachedHouseholdId(cachedSupabaseUser.id);
  const knownHouseholdId = cachedHouseholdId ?? await getKnownLocalHouseholdId(cachedSupabaseUser.id);

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

  bootTrace("sync init started", {
    online: navigator.onLine,
    householdFound: Boolean(user.householdId),
  });
  syncPendingRecords(user)
    .then(() => {
      bootTrace("sync init completed", {
        online: navigator.onLine,
      });
    })
    .catch((error) => {
      bootTrace("auth init rejected", {
        stage: "sync init",
        message: error instanceof Error ? error.message : String(error),
      });
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
      bootTrace("auth init started", {
        startupAttempt,
      });

      const isOnline = navigator.onLine;
      bootTrace("navigator.onLine =", {
        value: isOnline,
      });
      bootTrace("auth init step: checking cached session");
      const cachedUser = await getOfflineCachedUser();
      bootTrace("cached Supabase session found =", {
        value: Boolean(getCachedSupabaseUser()),
      });
      bootTrace("cached household id found =", {
        value: Boolean(cachedUser?.householdId),
      });
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
            bootTrace("auth init resolved", {
              state: localUser ? "authenticated_offline" : "unauthenticated",
            });
            bootTrace("final auth state =", {
              value: localUser ? "authenticated_offline" : "unauthenticated",
            });
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
            bootTrace("auth init resolved", {
              state: cachedUser ? "authenticated_offline" : "unauthenticated",
              offlineFallbackUsed: Boolean(cachedUser),
            });
            bootTrace("final auth state =", {
              value: cachedUser ? "authenticated_offline" : "unauthenticated",
            });
            logAuthBoot("finish", {
              state: cachedUser ? "authenticated_offline" : "unauthenticated",
              offlineFallbackUsed: Boolean(cachedUser),
              householdFound: Boolean(cachedUser?.householdId),
            });
          }
          return;
        }

        bootTrace("auth init step: calling supabase.auth.getSession");
        const session = await withTimeout(
          getSupabaseSessionOnce(),
          startupTimeoutMs,
          "supabase_session",
        );
        bootTrace("auth init step completed: getSession", {
          sessionFound: Boolean(session),
        });
        bootTrace("auth init step: calling supabase.auth.getUser", {
          skipped: true,
          reason: "AuthContext reuses session.user from getSession",
        });
        bootTrace("auth init step completed: getUser", {
          skipped: true,
        });
        const sessionUser = session ? await toBudgetCatUser(session.user) : null;
        if (sessionUser) {
          await prepareUserData(sessionUser);
        }
        if (isMounted) {
          setUser(sessionUser);
          const sessionState =
            sessionUser && sessionUser.isOffline ? "authenticated_degraded" : "authenticated_online";
          setAuthBootState(sessionUser ? sessionState : "unauthenticated");
          setIsLoading(false);
          bootTrace("auth init resolved", {
            state: sessionUser ? sessionState : "unauthenticated",
          });
          bootTrace("final auth state =", {
            value: sessionUser ? sessionState : "unauthenticated",
          });
          logAuthBoot("finish", {
            state: sessionUser ? sessionState : "unauthenticated",
            offlineFallbackUsed: false,
            householdFound: Boolean(sessionUser?.householdId),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Startup failed.";
        const isSupabaseTimeout = message.toLowerCase().includes("supabase_session");
        const code = isSupabaseTimeout ? "supabase_session_timeout" : "auth_init_failed";
        bootTrace("auth init rejected", {
          code,
          message,
          online: navigator.onLine,
        });

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
              const fallbackState =
                !navigator.onLine || fallbackUser.isOffline || isOfflineLikeError(error)
                  ? "authenticated_degraded"
                  : "authenticated_online";
              setAuthBootState(fallbackState);
              setIsLoading(false);
              setStartupError(null);
              bootTrace("continuing authenticated offline/degraded startup", {
                state: fallbackState,
                reason: message,
              });
              bootTrace("auth init resolved", {
                state: fallbackState,
                fallbackAfterError: true,
              });
              bootTrace("final auth state =", {
                value: fallbackState,
              });
              logAuthBoot("finish", {
                state: fallbackState,
                offlineFallbackUsed: fallbackState !== "authenticated_online",
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
          bootTrace("setting AUTH_INIT_FAILED because =", {
            code,
            message,
            online: navigator.onLine,
            cachedSupabaseSessionFound: Boolean(getCachedSupabaseUser()),
            cachedLocalIdentityFound: Boolean(localUser?.id && localUser.householdId),
          });
          bootTrace("final auth state =", {
            value: "auth_error",
          });
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
              bootTrace("auth init started", {
                source: "auth state listener",
              });
              bootTrace("navigator.onLine =", {
                value: navigator.onLine,
              });
              bootTrace("auth init step: checking cached session", {
                source: "auth state listener",
              });
              const cachedUser = await getOfflineCachedUser();
              bootTrace("cached Supabase session found =", {
                value: Boolean(getCachedSupabaseUser()),
                source: "auth state listener",
              });
              bootTrace("cached household id found =", {
                value: Boolean(cachedUser?.householdId),
                source: "auth state listener",
              });
              if (cachedUser?.householdId) {
                const offlineUser = { ...cachedUser, isOffline: true };
                await prepareUserData(offlineUser);
                if (!isMounted) return;
                setUser(offlineUser);
                setAuthBootState("authenticated_offline");
                setStartupError(null);
                setIsLoading(false);
                bootTrace("auth init resolved", {
                  source: "auth state listener",
                  state: "authenticated_offline",
                });
                bootTrace("final auth state =", {
                  value: "authenticated_offline",
                  source: "auth state listener",
                });
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
              bootTrace("auth init resolved", {
                source: "auth state listener",
                state: "unauthenticated",
              });
              bootTrace("final auth state =", {
                value: "unauthenticated",
                source: "auth state listener",
              });
              logAuthBoot("auth listener offline without cached identity", {
                cachedSessionFound: Boolean(getCachedSupabaseUser()),
                cachedIdentityFound: false,
                offlineFallbackUsed: false,
                finalState: "unauthenticated",
              });
              return;
            }

            bootTrace("auth init step: loading household", {
              source: "auth state listener",
              sessionFound: Boolean(session),
            });
            const sessionUser = session ? await toBudgetCatUser(session.user) : null;
            if (sessionUser) {
              await prepareUserData(sessionUser);
            }
            if (!isMounted) return;
            setUser(sessionUser);
            const sessionState =
              sessionUser && sessionUser.isOffline ? "authenticated_degraded" : "authenticated_online";
            setAuthBootState(sessionUser ? sessionState : "unauthenticated");
            setStartupError(null);
            bootTrace("auth init resolved", {
              source: "auth state listener",
              state: sessionUser ? sessionState : "unauthenticated",
            });
            bootTrace("final auth state =", {
              value: sessionUser ? sessionState : "unauthenticated",
              source: "auth state listener",
            });
          } catch (error) {
            bootTrace("auth init rejected", {
              source: "auth state listener",
              message: error instanceof Error ? error.message : String(error),
              online: navigator.onLine,
            });
            logStartupError("auth_init_failed", error);
            if (!isMounted) return;
            setAuthBootState("auth_error");
            bootTrace("setting AUTH_INIT_FAILED because =", {
              source: "auth state listener",
              code: "auth_init_failed",
              message: error instanceof Error ? error.message : String(error),
              online: navigator.onLine,
            });
            bootTrace("final auth state =", {
              value: "auth_error",
              source: "auth state listener",
            });
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
