import { type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./Button";

export function Modal({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-budget-text/30 p-3 backdrop-blur-sm sm:items-center sm:justify-center">
      <div className="max-h-[calc(100dvh-0.75rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-t-2xl rounded-b-none border border-budget-border bg-budget-card p-4 sm:max-h-[92vh] sm:rounded-[var(--budget-radius)] sm:p-5">
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-budget-border sm:hidden" />
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-budget-text">{title}</h2>
          <Button
            aria-label="Close modal"
            className="h-10 min-h-10 w-10 rounded-lg p-0"
            onClick={onClose}
            variant="secondary"
          >
            <X size={18} />
          </Button>
        </div>
        {children}
      </div>
    </div>
  );
}
