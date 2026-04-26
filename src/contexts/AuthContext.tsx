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
import type { BudgetCatUser } from "../types/finance";

type AuthContextValue = {
  user: BudgetCatUser | null;
  isLoading: boolean;
  authError: string | null;
  authMessage: string | null;
  isSupabaseConfigured: boolean;
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
      ? await getOrCreateHousehold(user)
      : getLocalHouseholdId(user.id);
  } catch (error) {
    console.error("[BudgetCat Auth Error]", error);
  }

  return {
    id: user.id,
    email: user.email,
    householdId,
    isOffline: !hasSupabaseConfig,
  };
}

function getStoredLocalUser() {
  const raw = localStorage.getItem(localSessionKey);
  return raw ? (JSON.parse(raw) as BudgetCatUser) : null;
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
  await ensureLocalDefaults(user.id, user.householdId);
  await syncPendingRecords(user);
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

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
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

      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session ? await toBudgetCatUser(data.session.user) : null;
      if (sessionUser) {
        await prepareUserData(sessionUser);
      }
      if (isMounted) {
        setUser(sessionUser);
        setIsLoading(false);
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
      const sessionUser = session ? await toBudgetCatUser(session.user) : null;
      if (sessionUser) {
        await prepareUserData(sessionUser);
      }
      setUser(sessionUser);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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

  const value = useMemo(
    () => ({
      user,
      isLoading,
      authError,
      authMessage,
      isSupabaseConfigured: hasSupabaseConfig,
      signIn,
      signUp,
      signOut,
    }),
    [authError, authMessage, isLoading, signIn, signOut, signUp, user],
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
