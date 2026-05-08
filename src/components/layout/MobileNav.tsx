import { NavLink } from "react-router-dom";

import { cn } from "../../lib/utils";
import {
  AnimatedAddIcon,
  AnimatedBillsIcon,
  AnimatedDashboardIcon,
  AnimatedLedgerIcon,
  AnimatedReportsIcon,
} from "../ui/AnimatedNavIcons";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";

type MobileNavItem = {
  id: string;
  label: string;
  href: string;
  isPrimary?: boolean;
};

const items: MobileNavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/" },
  { id: "ledger", label: "Ledger", href: "/transactions" },
  { id: "add", label: "Add", href: "/transactions", isPrimary: true },
  { id: "reports", label: "Reports", href: "/reports" },
  { id: "bills", label: "Bills", href: "/due-dates" },
];

export function MobileNav() {
  function renderNavIcon(id: MobileNavItem["id"], isActive: boolean) {
    const iconClassName = "h-[19px] w-[19px]";
    const replayKey = `${id}-${isActive ? "active" : "inactive"}`;

    switch (id) {
      case "dashboard":
        return (
          <AnimatedDashboardIcon
            key={replayKey}
            active={isActive}
            className={iconClassName}
          />
        );
      case "ledger":
        return (
          <AnimatedLedgerIcon
            key={replayKey}
            active={isActive}
            className={iconClassName}
          />
        );
      case "reports":
        return (
          <AnimatedReportsIcon
            key={replayKey}
            active={isActive}
            className={iconClassName}
          />
        );
      case "bills":
        return (
          <AnimatedBillsIcon
            key={replayKey}
            active={isActive}
            className={iconClassName}
          />
        );
      default:
        return null;
    }
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--bc-border)] bg-[var(--bc-bg-deep)]/95 px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] shadow-[0_-18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid h-[64px] max-w-lg grid-cols-[1fr_1fr_76px_1fr_1fr] items-center gap-1">
        {items.map((item) => {
          if (item.isPrimary) {
            return (
              <div
                className="flex h-[64px] flex-col items-center justify-center"
                key={item.id}
              >
                <AddTransactionDialog
                  ariaLabel="Add transaction"
                  className="flex h-[54px] w-[54px] -translate-y-2 items-center justify-center rounded-full border border-white/20 bg-[var(--bc-green)] p-0 text-white shadow-[0_14px_28px_var(--bc-green-glow)] transition hover:bg-[var(--bc-green-soft)] active:scale-95"
                  label={<AnimatedAddIcon key="mobile-add-icon" className="h-5 w-5" />}
                />

                <span className="-mt-1 text-[10px] font-black leading-none text-[var(--bc-text-soft)]">
                  Add
                </span>
              </div>
            );
          }

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex h-[56px] min-w-0 flex-col items-center justify-center gap-1 rounded-[20px] px-1 text-[10px] font-black leading-none text-[var(--bc-text-muted)] transition active:scale-[0.98]",
                  isActive
                    ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)] shadow-[inset_0_0_0_1px_var(--bc-border)]"
                    : "hover:bg-[var(--bc-surface-soft)] hover:text-[var(--bc-text-soft)]",
                )
              }
              end={item.href === "/"}
              key={item.id}
              to={item.href}
            >
              {({ isActive }) => (
                <>
                  {renderNavIcon(item.id, isActive)}
                  <span className="max-w-full truncate">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
