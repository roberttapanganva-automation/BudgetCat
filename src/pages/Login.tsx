import { LockKeyhole, Mail, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export function Login() {
  const { authError, authMessage, isSupabaseConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);
  const authNotice = authError ?? authMessage ?? localMessage;
  const isSignupSuccess =
    Boolean(authMessage && !authError && authMessage.toLowerCase().startsWith("account created"));

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
    <main className="min-h-screen bg-budget-background text-budget-text md:grid md:place-items-center md:px-4 md:py-10">
      <div className="sticky top-0 z-20 border-b border-budget-border bg-budget-background/95 px-4 py-3 md:hidden">
        <div className="mx-auto flex max-w-md items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              alt="BudgetCat"
              className="h-10 w-10 object-contain"
              src="/assets/icons/budgetcat-icon.png"
            />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black text-budget-primary">BudgetCat</h1>
              <p className="truncate text-xs font-semibold text-budget-text/55">
                BudgetCat Version 2
              </p>
            </div>
          </div>
          <ThemeToggle className="h-9 w-9" />
        </div>
      </div>
      <ThemeToggle className="fixed right-4 top-4 z-20 hidden md:grid" />

      <div className="mx-auto w-full max-w-md px-4 py-4 md:hidden">
        <div className="flex items-end justify-center overflow-visible">
          <BudgetCatMascot
            imageClassName="w-[min(78vw,260px)] max-w-[260px] object-contain object-bottom"
            variant="both"
          />
        </div>

        <Card className="mt-3 p-4">
          <div className="grid grid-cols-2 rounded-xl border border-budget-border bg-budget-background p-1">
            <button
              className={
                mode === "login"
                  ? "rounded-lg bg-budget-primary px-3 py-2 text-sm font-black text-white"
                  : "rounded-lg px-3 py-2 text-sm font-black text-budget-text/60"
              }
              onClick={() => setMode("login")}
              type="button"
            >
              Login
            </button>
            <button
              className={
                mode === "signup"
                  ? "rounded-lg bg-budget-primary px-3 py-2 text-sm font-black text-white"
                  : "rounded-lg px-3 py-2 text-sm font-black text-budget-text/60"
              }
              onClick={() => setMode("signup")}
              type="button"
            >
              Sign Up
            </button>
          </div>

          <div className="mt-5">
            <h2 className="text-2xl font-black leading-tight text-budget-text">
              {mode === "signup" ? "Create your account." : "Welcome back to your money corner."}
            </h2>
            <p className="mt-2 text-sm font-semibold leading-6 text-budget-text/65">
              {isSupabaseConfigured
                ? mode === "signup"
                  ? "Create an account to sync your private BudgetCat data."
                  : "Use your email and password to log in."
                : "Supabase is not configured, so BudgetCat will run in offline-only mode."}
            </p>
            {mode === "login" && (
              <div className="mt-3 space-y-1 text-sm font-semibold leading-6 text-budget-text/65">
                <p>Bonnie & Clyde say: Your coins are safe here.</p>
                <p>Made by Robert Tapangan as a personal-use project.</p>
              </div>
            )}
          </div>

          {authNotice && (
            <div
              className={
                isSignupSuccess
                  ? "mt-4 rounded-xl border border-budget-success/30 bg-budget-green-faint px-4 py-3 text-sm font-semibold text-budget-text"
                  : "mt-4 rounded-xl border border-budget-urgent/25 bg-budget-urgent/10 px-4 py-3 text-sm font-semibold text-budget-urgent"
              }
            >
              <p className="font-black">
                {isSignupSuccess ? "Sign up success" : "Auth message"}
              </p>
              <p className="mt-1">{authNotice}</p>
            </div>
          )}

          <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-2 text-sm font-bold">
              Email
              <span className="relative">
                <Mail
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-budget-text/40"
                  size={18}
                />
                <input
                  className="budget-input pl-11"
                  name="email"
                  placeholder="you@example.com"
                  required
                  type="email"
                />
              </span>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Password
              <span className="relative">
                <LockKeyhole
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-budget-text/40"
                  size={18}
                />
                <input
                  className="budget-input pl-11"
                  minLength={6}
                  name="password"
                  placeholder="Password"
                  required
                  type="password"
                />
              </span>
            </label>
            <Button className="mt-2 w-full" disabled={isSubmitting} type="submit">
              {mode === "signup" ? <UserPlus size={18} /> : <LockKeyhole size={18} />}
              {isSubmitting ? "Working..." : mode === "signup" ? "Create Account" : "Login"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="hidden md:block">
        <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-budget-border bg-budget-card">
          <div className="grid md:grid-cols-[1.05fr_0.95fr]">
            <section className="p-7 sm:p-10">
              <div className="flex items-center gap-3">
                <img
                  alt="BudgetCat"
                  className="h-12 w-12 object-contain"
                  src="/assets/icons/budgetcat-icon.png"
                />
                <div>
                  <h1 className="text-2xl font-black text-budget-primary">BudgetCat</h1>
                  <p className="text-sm font-semibold text-budget-text/55">
                    BudgetCat Version 2
                  </p>
                </div>
              </div>
              <div className="mt-10">
                <h2 className="text-3xl font-black leading-tight sm:text-4xl">
                  Welcome back to your money corner.
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-budget-text/65">
                  {isSupabaseConfigured
                    ? "Use your email and password to log in."
                    : "Supabase is not configured, so BudgetCat will run in offline-only mode."}
                </p>
              </div>
              <div className="mt-7 grid grid-cols-2 rounded-lg border border-budget-border bg-budget-background p-1">
                <button
                  className={
                    mode === "login"
                      ? "rounded-md bg-budget-card px-4 py-2 text-sm font-black"
                      : "rounded-md px-4 py-2 text-sm font-black text-budget-text/60"
                  }
                  onClick={() => setMode("login")}
                  type="button"
                >
                  Login
                </button>
                <button
                  className={
                    mode === "signup"
                      ? "rounded-md bg-budget-card px-4 py-2 text-sm font-black"
                      : "rounded-md px-4 py-2 text-sm font-black text-budget-text/60"
                  }
                  onClick={() => setMode("signup")}
                  type="button"
                >
                  Sign Up
                </button>
              </div>
              <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
                <label className="grid gap-2 text-sm font-bold">
                  Email
                  <input
                    className="budget-input"
                    name="email"
                    placeholder="you@example.com"
                    required
                    type="email"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Password
                  <input
                    className="budget-input"
                    minLength={6}
                    name="password"
                    placeholder="Password"
                    required
                    type="password"
                  />
                </label>
                {authNotice && (
                  <p
                    className={
                      isSignupSuccess
                        ? "rounded-lg border border-budget-success/30 bg-budget-green-faint px-4 py-3 text-sm font-bold text-budget-text"
                        : "rounded-lg bg-budget-urgent/10 px-4 py-3 text-sm font-bold text-budget-urgent"
                    }
                  >
                    {authNotice}
                  </p>
                )}
                <Button className="mt-2 w-full" disabled={isSubmitting} type="submit">
                  {mode === "signup" ? <UserPlus size={18} /> : <LockKeyhole size={18} />}
                  {isSubmitting ? "Working..." : mode === "signup" ? "Create Account" : "Login"}
                </Button>
              </form>
            </section>

            <section className="bg-budget-background p-7 sm:p-10">
              <div className="flex h-full min-h-[460px] flex-col">
                <h2 className="text-center text-2xl font-black leading-tight sm:text-3xl">
                  <span className="text-budget-cat">Bonnie & Clyde</span> Are Ready to Track Your{" "}
                  <span className="text-budget-primary">Money</span> Trail
                </h2>
                <div className="mt-8 flex min-h-[300px] flex-1 items-end justify-center overflow-visible sm:min-h-[360px]">
                  <BudgetCatMascot
                    imageClassName="w-[min(90vw,420px)] max-w-[500px] object-contain object-bottom md:w-full"
                    variant="both"
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
