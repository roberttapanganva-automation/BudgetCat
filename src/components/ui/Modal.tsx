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
      <div className="w-full max-w-2xl rounded-lg border border-budget-border bg-white p-5 shadow-soft">
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
