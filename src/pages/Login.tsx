import { LockKeyhole, UserPlus } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { Button } from "../components/ui/Button";

export function Login() {
  const { authError, authMessage, isSupabaseConfigured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

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
    <main className="grid min-h-screen place-items-center bg-budget-background px-4 py-10 text-budget-text">
      <ThemeToggle className="fixed right-4 top-4 z-20" />
      <div className="w-full max-w-5xl overflow-hidden rounded-xl border border-budget-border bg-budget-card shadow-soft">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <section className="p-7 sm:p-10">
            <div className="flex items-center gap-3">
                <img
                    src="/assets/icons/budgetcat-icon.png"
                      alt="BudgetCat"
                     className="h-12 w-12 object-contain"
                  />
              <div>
                <h1 className="text-2xl font-black text-budget-primary">BudgetCat</h1>
                <p className="text-sm font-semibold text-budget-text/55">
                  Private personal finance tracker
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
                    ? "rounded-md bg-budget-card px-4 py-2 text-sm font-black shadow-sm"
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
                    ? "rounded-md bg-budget-card px-4 py-2 text-sm font-black shadow-sm"
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
                <input className="budget-input" name="email" placeholder="you@example.com" required type="email" />
              </label>
              <label className="grid gap-2 text-sm font-bold">
                Password
                <input className="budget-input" minLength={6} name="password" placeholder="Password" required type="password" />
              </label>
              {(authError || localMessage) && (
                <p className="rounded-lg bg-budget-urgent/10 px-4 py-3 text-sm font-bold text-budget-urgent">
                  {authError || localMessage}
                </p>
              )}
              {authMessage && !authError && (
                <p className="rounded-lg bg-budget-success/10 px-4 py-3 text-sm font-bold text-budget-success">
                  {authMessage}
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
                <span className="text-budget-cat">Bonnie & Clyde</span>{" "}
                Are Ready to Track Your{" "}
                <span className="text-budget-primary">Money</span>{" "}
                Trail 🐾
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
    </main>
  );
}
