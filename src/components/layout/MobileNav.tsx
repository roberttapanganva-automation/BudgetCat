import { BarChart3, CalendarDays, Home, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "../../lib/utils";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";

const items = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Ledger", href: "/transactions", icon: WalletCards },
  { label: "Add", href: "/transactions", isPrimary: true },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Bills", href: "/due-dates", icon: CalendarDays },
];

export function MobileNav() {
  return (
    <nav className="bc-bottom-nav md:hidden" aria-label="Main mobile navigation">
      <div className="bc-safe-bottom grid grid-cols-5 items-end gap-1 px-3 pt-2">
        {items.map((item) => {
          if (item.isPrimary) {
            return (
             <div key={item.label} className="relative flex items-center justify-center">
  <div className="absolute left-1/2 top-[-18px] -translate-x-1/2">
    <AddTransactionDialog
      ariaLabel="Quick add transaction"
      className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-[var(--bc-green)]/30 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--bc-green)_88%,white_12%),var(--bc-green-soft))] p-0 text-white shadow-[0_16px_34px_var(--bc-green-glow)]"
      compact
      label=""
    />
  </div>
  <span className="pointer-events-none mt-9 text-[10px] font-black text-[var(--bc-text-muted)]">
    Add
  </span>
</div>
            );
          }

          const Icon = item.icon;

          return (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "bc-bottom-nav-item flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 transition",
                  isActive
                    ? "bc-bottom-nav-item-active bg-[var(--bc-green-glow)]"
                    : "hover:text-[var(--bc-text-soft)]",
                )
              }
              end={item.href === "/"}
              key={item.label}
              to={item.href}
            >
              {Icon ? <Icon className="h-5 w-5" strokeWidth={2.4} /> : null}
              <span className="truncate text-[10px] leading-none">
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}