import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserPlus,
  WalletCards,
  WifiOff,
} from "../lib/icons";
import { type FormEvent, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ThemeToggle } from "../components/layout/ThemeToggle";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";

type AuthMode = "login" | "signup";

function AuthModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "min-h-10 flex-1 rounded-2xl text-sm font-black transition",
        active
          ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)] shadow-sm"
          : "text-[var(--bc-text-muted)] hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text)]",
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function TrustItem({
  icon: Icon,
  title,
  description,
  tone = "green",
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  tone?: "green" | "amber" | "blue";
}) {
  const toneClass = {
    green: "bc-icon-circle-green",
    amber: "bc-icon-circle-amber",
    blue: "bc-icon-circle-blue",
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-[var(--bc-border)] bg-[var(--bc-card)]/70 p-3">
      <div className={cn("bc-icon-circle h-10 w-10 shrink-0", toneClass)}>
        <Icon className="h-4.5 w-4.5" strokeWidth={2.4} />
      </div>

      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--bc-text)]">{title}</p>
        <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
          {description}
        </p>
      </div>
    </div>
  );
}

export function Login() {
  const location = useLocation();
  const {
    authError,
    authMessage,
    isSupabaseConfigured,
    signIn,
    signUp,
  } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  const authNotice = authError ?? authMessage ?? localMessage ??
    (location.state?.passwordReset ? "Password updated successfully. You can now sign in." : null);
  const isSignupSuccess = Boolean(
    authMessage &&
      !authError &&
      authMessage.toLowerCase().startsWith("account created"),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");

    setIsSubmitting(true);
    setLocalMessage(null);

    try {
      if (mode === "signup") {
        await signUp(email, password);
        setMode("login");
      } else {
        await signIn(email, password);
      }
    } catch {
      setLocalMessage("Could not complete auth. Check the email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="bc-app-shell min-h-screen overflow-hidden">
      <div className="mx-auto grid min-h-screen w-full max-w-[1180px] gap-6 px-5 py-5 md:grid-cols-[0.95fr_1.05fr] md:items-center md:px-8 md:py-8">
        <section className="relative order-2 flex min-h-[calc(100vh-2.5rem)] flex-col justify-between rounded-[34px] border border-[var(--bc-border)] bg-[var(--bc-card)]/70 p-5 shadow-2xl shadow-black/10 md:order-1 md:min-h-[calc(100vh-4rem)] md:p-7">
          <div className="absolute inset-x-8 top-0 h-24 rounded-full bg-[var(--bc-green-glow)] blur-3xl" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-green-glow)]">
                <BudgetCatMascot
                  className="h-10 w-10"
                  imageClassName="h-full w-full object-contain"
                  variant="icon"
                />
              </div>

              <div>
                <p className="text-lg font-black tracking-[-0.04em] text-[var(--bc-text)]">
                  BudgetCat
                </p>
                <p className="text-xs font-bold text-[var(--bc-text-muted)]">
                  Private budget tracker
                </p>
              </div>
            </div>

          </div>

          <div className="relative z-10 my-8 flex flex-1 flex-col justify-center">
            <div className="mx-auto flex w-full max-w-[420px] justify-center">
              <BudgetCatMascot
                className="h-56 w-full md:h-72"
                imageClassName="h-full w-full max-w-none object-contain object-center"
                variant="both"
              />
            </div>

            <div className="mt-5 text-center">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--bc-border)] bg-[var(--bc-surface-soft)] px-3 py-1 text-[11px] font-black text-[var(--bc-green)]">
                <Sparkles className="h-3.5 w-3.5" />
                Smart. Friendly. Focused.
              </div>

              <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.07em] text-[var(--bc-text)] md:text-6xl">
                Your money,
                <br />
                calmly tracked.
              </h1>

              <p className="mx-auto mt-4 max-w-sm text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                Manual income, expenses, bills, savings, and goals — with
                Bonnie and Clyde helping you stay aware without stress.
              </p>
            </div>

            <div className="mt-6 grid gap-3">
              <TrustItem
                description="No bank connection. You control every entry."
                icon={ShieldCheck}
                title="Manual and private"
              />

              <TrustItem
                description="BudgetCat keeps local-first records and syncs when available."
                icon={WalletCards}
                title="Offline-first budget space"
                tone="blue"
              />

              <TrustItem
                description={
                  isSupabaseConfigured
                    ? "Supabase sync is configured for this app."
                    : "Supabase is not configured, so BudgetCat runs offline-only."
                }
                icon={isSupabaseConfigured ? CheckCircle2 : WifiOff}
                title={isSupabaseConfigured ? "Sync ready" : "Offline-only mode"}
                tone={isSupabaseConfigured ? "green" : "amber"}
              />
            </div>
          </div>

          <p className="relative z-10 text-center text-[11px] font-bold text-[var(--bc-text-muted)]">
            Made by Robert Tapangan as a personal-use project.
          </p>
        </section>

        <section className="order-1 flex min-h-screen items-center md:order-2 md:min-h-0">
          <div className="mx-auto w-full max-w-[430px]">
            <div className="mb-6 flex items-center justify-between gap-3 md:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-green-glow)]">
                  <BudgetCatMascot
                    className="h-9 w-9"
                    imageClassName="h-full w-full object-contain"
                    variant="icon"
                  />
                </div>

                <div>
                  <p className="text-lg font-black tracking-[-0.04em] text-[var(--bc-text)]">
                    BudgetCat
                  </p>
                  <p className="text-xs font-bold text-[var(--bc-text-muted)]">
                    Personal budget app
                  </p>
                </div>
              </div>

              <ThemeToggle className="h-11 w-11 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)]" />
            </div>

            <article className="bc-card-elevated overflow-hidden p-5 md:p-6">
              <div className="mb-4 text-center">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
                  {mode === "signup" ? "Create account" : "Welcome back"}
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-[-0.06em] text-[var(--bc-text)]">
                  {mode === "signup"
                    ? "Start your BudgetCat space"
                    : "Log in to BudgetCat"}
                </h2>

                <p className="mt-2 text-sm font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  {isSupabaseConfigured
                    ? mode === "signup"
                      ? "Create an account to sync your private BudgetCat data."
                      : "Use your email and password to continue."
                    : "Supabase is not configured, so BudgetCat will run in offline-only mode."}
                </p>
              </div>

              <div className="bc-segment mb-5">
                <AuthModeButton
                  active={mode === "login"}
                  onClick={() => {
                    setMode("login");
                    setLocalMessage(null);
                  }}
                >
                  Login
                </AuthModeButton>

                <AuthModeButton
                  active={mode === "signup"}
                  onClick={() => {
                    setMode("signup");
                    setLocalMessage(null);
                  }}
                >
                  Sign Up
                </AuthModeButton>
              </div>

              {authNotice && (
                <div
                  className={cn(
                    "mb-5 rounded-[22px] border p-4",
                    isSignupSuccess
                      ? "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)]"
                      : "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)]",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]",
                        isSignupSuccess
                          ? "text-[var(--bc-green)]"
                          : "text-[var(--bc-amber)]",
                      )}
                    >
                      {isSignupSuccess ? (
                        <CheckCircle2 className="h-4.5 w-4.5" />
                      ) : (
                        <ShieldCheck className="h-4.5 w-4.5" />
                      )}
                    </div>

                    <div>
                      <p className="text-sm font-black text-[var(--bc-text)]">
                        {isSignupSuccess ? "Sign up success" : "Auth message"}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                        {authNotice}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                {mode === "login" && (
                  <Link className="inline-flex min-h-11 items-center text-sm font-bold text-[var(--bc-green)]" to="/forgot-password">
                    Forgot Password?
                  </Link>
                )}
                <label className="block space-y-2">
                  <span className="text-xs font-black text-[var(--bc-text-soft)]">
                    Email
                  </span>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[var(--bc-text-muted)]" />
                    <input
                      autoComplete="email"
                      className="bc-input min-h-[54px] !pl-14"
                      name="email"
                      placeholder="you@example.com"
                      required
                      type="email"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-xs font-black text-[var(--bc-text-soft)]">
                    Password
                  </span>

                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-[var(--bc-text-muted)]" />
                    <input
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      className="bc-input min-h-[54px] !pl-14"
                      minLength={6}
                      name="password"
                      placeholder="••••••••"
                      required
                      type="password"
                    />
                  </div>
                </label>

                <button
                  className="bc-button bc-button-primary mt-2 w-full"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {mode === "signup" ? (
                    <UserPlus className="h-4.5 w-4.5" />
                  ) : (
                    <ArrowRight className="h-4.5 w-4.5" />
                  )}
                  {isSubmitting
                    ? "Working..."
                    : mode === "signup"
                      ? "Create Account"
                      : "Login"}
                </button>
              </form>

              <div className="mt-5 rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)]">
                    <BudgetCatMascot
                      className="h-8 w-8"
                      imageClassName="h-full w-full max-w-none object-contain object-center"
                      variant="both"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-black text-[var(--bc-text)]">
                      Bonnie & Clyde say:
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                      Your coins are safe here. Track manually, review calmly,
                      and keep your budget simple.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <p className="mt-5 text-center text-[11px] font-bold text-[var(--bc-text-muted)] md:hidden">
              No bank connection • Manual entries only • Private personal app
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
