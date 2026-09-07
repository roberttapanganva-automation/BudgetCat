import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { BudgetCatMascot } from "../components/mascot/BudgetCatMascot";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

const invalidLink = "This password reset link is invalid or has expired.";
const confirmation = "If an account exists for this email, we've sent you a password reset link.";
const redirectTo = import.meta.env.DEV
  ? `${window.location.origin}/reset-password`
  : "https://budget-cat-orpin.vercel.app/reset-password";

export function PasswordRecovery({ mode }: { mode: "request" | "reset" }) {
  const navigate = useNavigate();
  const { signOut, isPasswordRecovery } = useAuth();
  const [checking, setChecking] = useState(mode === "reset");
  const [validSession, setValidSession] = useState(false);
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    setMessage(null);
    setValidSession(false);
    setUpdated(false);
    setChecking(mode === "reset");
    if (mode !== "reset") return;

    async function validateSession() {
      // The existing implicit-flow client consumes URL credentials itself.
      // Never trust the offline BudgetCat identity to authorize a password change.
      const params = new URLSearchParams(window.location.hash.slice(1));
      const query = new URLSearchParams(window.location.search);
      const linkError = params.has("error") || params.has("error_code") || query.has("error") || query.has("error_code");
      try {
        if (!supabase || linkError) throw new Error(invalidLink);
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) throw new Error(invalidLink);
        if (active) setValidSession(true);
      } catch {
        if (active) setError(invalidLink);
      } finally {
        if (active) setChecking(false);
      }
    }
    void validateSession();
    return () => { active = false; };
  }, [mode, isPasswordRecovery]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !supabase) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      if (mode === "request") {
        const { error: requestError } = await supabase.auth.resetPasswordForEmail(
          String(form.get("email") ?? "").trim(), { redirectTo },
        );
        if (requestError) throw new Error("Could not send the reset link. Please check your connection or try again shortly.");
        setMessage(confirmation);
        return;
      }
      if (!validSession) throw new Error(invalidLink);
      if (!updated) {
        const password = String(form.get("password") ?? "");
        if (password.length < 6) throw new Error("Use at least 6 characters for your password.");
        if (password !== String(form.get("confirmPassword") ?? "")) throw new Error("Passwords do not match.");
        const { data, error: sessionError } = await supabase.auth.getUser();
        if (sessionError || !data.user) {
          setValidSession(false);
          throw new Error(invalidLink);
        }
        const { error: updateError } = await supabase.auth.updateUser({ password });
        if (updateError) throw updateError;
        setUpdated(true);
      }
      // Keep a retryable sign-out step if the connection drops after the update.
      await signOut();
      navigate("/login", { replace: true, state: { passwordReset: true } });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="bc-app-shell flex min-h-[100dvh] items-center justify-center px-4 py-8">
      <section className="bc-card-elevated w-full min-w-0 max-w-[430px] p-5 sm:p-7">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BudgetCatMascot className="h-12 w-12 shrink-0" imageClassName="h-full w-full object-contain" variant="icon" />
            <span className="text-lg font-black text-[var(--bc-text)]">BudgetCat</span>
          </div>
          <ThemeToggle className="h-11 w-11 shrink-0 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)]" />
        </header>
        <h1 className="text-2xl font-black text-[var(--bc-text)]">{mode === "request" ? "Forgot your password?" : "Reset your password"}</h1>
        <p className="mb-5 mt-2 text-sm leading-relaxed text-[var(--bc-text-muted)]">
          {mode === "request" ? "Enter your email and we'll send a link to get you back into BudgetCat." : "Choose a new password for your BudgetCat account."}
        </p>
        {!supabase && <p role="alert" className="mb-4 text-sm text-[var(--bc-red)]">Password recovery is unavailable because Supabase is not configured.</p>}
        {checking && <p role="status" className="mb-4 text-sm text-[var(--bc-text-muted)]">Checking your reset link...</p>}
        {error && <p role="alert" className="mb-4 break-words text-sm text-[var(--bc-red)]">{error}</p>}
        {message && <p role="status" className="mb-4 rounded-2xl bg-[var(--bc-green-glow)] p-4 text-sm text-[var(--bc-text)]">{message}</p>}
        {updated && <p role="status" className="mb-4 text-sm text-[var(--bc-text)]">Password updated. Finish signing out to return to login.</p>}
        {(mode === "request" || (!checking && validSession)) && (
          <form className="space-y-4" onSubmit={submit}>
            {mode === "request" ? (
              <label className="block min-w-0 space-y-2">
                <span className="text-sm font-bold text-[var(--bc-text)]">Email</span>
                <input autoComplete="email" className="bc-input min-h-12 w-full min-w-0 !text-base" name="email" placeholder="you@example.com" required type="email" disabled={busy} />
              </label>
            ) : !updated && (
              <>
                {([['password', 'New Password'], ['confirmPassword', 'Confirm New Password']] as const).map(([name, label]) => (
                  <label className="block min-w-0 space-y-2" key={name}>
                    <span className="text-sm font-bold text-[var(--bc-text)]">{label}</span>
                    <input autoComplete="new-password" className="bc-input min-h-12 w-full min-w-0 !text-base" minLength={6} name={name} required type={showPassword ? "text" : "password"} disabled={busy} />
                  </label>
                ))}
                <button className="min-h-11 text-sm font-bold text-[var(--bc-green)]" type="button" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide passwords" : "Show passwords"}</button>
                <p className="text-xs text-[var(--bc-text-muted)]">Use at least 6 characters.</p>
              </>
            )}
            <button className="bc-button bc-button-primary min-h-11 w-full min-w-0" disabled={busy || !supabase || Boolean(message)} type="submit">
              {busy ? "Working..." : mode === "request" ? "Send reset link" : updated ? "Return to login" : "Update Password"}
            </button>
          </form>
        )}
        {mode === "reset" && !checking && !validSession && <Link className="bc-button bc-button-primary min-h-11 w-full" to="/forgot-password">Request a new reset link</Link>}
        <Link className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[var(--bc-text-muted)]" to="/login">Back to login</Link>
      </section>
    </main>
  );
}
