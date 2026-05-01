import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { AnimatedStatusIcon } from "./AnimatedStatusIcon";

type ToastTone = "success" | "warning" | "error" | "loading";

export type ToastInput = {
  message: string;
  title: string;
  tone?: ToastTone;
};

type Toast = ToastInput & {
  id: string;
  tone: ToastTone;
};

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    const nextToast: Toast = {
      ...toast,
      id,
      tone: toast.tone ?? "success",
    };

    setToasts((current) => [...current, nextToast]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id));
    }, 4200);
  }, []);

  const value = useMemo(() => showToast, [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] grid w-[min(360px,calc(100vw-2rem))] gap-3 max-sm:left-4 max-sm:right-4 max-sm:w-auto">
        {toasts.map((toast) => (
          <div
            className={cn(
              "pointer-events-auto rounded-[14px] border bg-budget-card px-4 py-3",
              toast.tone === "success" && "border-budget-success/30",
              toast.tone === "warning" && "border-budget-warning/40",
              toast.tone === "error" && "border-budget-urgent/35",
              toast.tone === "loading" && "border-budget-primary/30",
            )}
            key={toast.id}
          >
            <div className="flex items-start gap-3">
              <AnimatedStatusIcon
                animation={
                  toast.tone === "loading"
                    ? "spin"
                    : toast.tone === "error" || toast.tone === "warning"
                      ? "pulse"
                      : "none"
                }
                className={cn(
                  "mt-0.5",
                  toast.tone === "success" && "text-budget-success",
                  toast.tone === "warning" && "text-budget-warning",
                  toast.tone === "error" && "text-budget-urgent",
                  toast.tone === "loading" && "text-budget-primary",
                )}
                icon={
                  toast.tone === "loading"
                    ? Loader2
                    : toast.tone === "error"
                      ? AlertTriangle
                      : toast.tone === "warning"
                        ? AlertCircle
                        : CheckCircle2
                }
                label={`${toast.tone} notification`}
              />
              <div className="min-w-0">
                <p className="font-black text-budget-text">{toast.title}</p>
                <p className="mt-1 text-sm font-semibold leading-5 text-budget-text/65">
                  {toast.message}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
