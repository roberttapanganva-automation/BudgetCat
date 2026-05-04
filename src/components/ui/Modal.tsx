import { type MouseEvent, type ReactNode, useEffect } from "react";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./Button";

export function Modal({
  children,
  className,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end bg-black/55 p-2 backdrop-blur-md sm:items-center sm:justify-center sm:p-5"
      onMouseDown={handleBackdropClick}
      role="dialog"
    >
      <div
        className={cn(
          "w-full max-w-2xl overflow-hidden rounded-t-[30px] border border-[var(--bc-border)] bg-[var(--bc-card)] shadow-2xl shadow-black/30 sm:rounded-[30px]",
          className,
        )}
      >
        <div className="flex max-h-[calc(100dvh-0.75rem)] flex-col sm:max-h-[92vh]">
          <div className="px-4 pb-3 pt-3 sm:px-5 sm:pt-5">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-[var(--bc-border-strong)] sm:hidden" />

            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--bc-text-muted)]">
                  BudgetCat
                </p>
                <h2 className="mt-1 truncate text-xl font-black tracking-[-0.04em] text-[var(--bc-text)]">
                  {title}
                </h2>
              </div>

              <Button
                aria-label="Close modal"
                className="h-11 min-h-11 w-11 shrink-0 rounded-2xl p-0"
                onClick={onClose}
                variant="secondary"
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          <div className="min-h-0 overflow-y-auto px-4 pb-5 sm:px-5 bc-scrollbar">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}