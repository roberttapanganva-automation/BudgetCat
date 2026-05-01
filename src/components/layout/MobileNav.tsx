import { BarChart3, CalendarDays, Home, Plus, WalletCards } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";

const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Ledger", href: "/transactions", icon: WalletCards },
  { label: "Add", href: "/transactions", icon: Plus, isPrimary: true },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Bills", href: "/due-dates", icon: CalendarDays },
];

export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-budget-border bg-budget-background px-2 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end">
        {items.map((item) => (
          item.isPrimary ? (
            <div className="flex items-end justify-center" key={item.href}>
              <AddTransactionDialog
                ariaLabel="Add transaction"
                className="h-14 w-14 -translate-y-4 rounded-full bg-budget-primary p-0 text-white hover:bg-budget-primary"
                compact
                label={item.label}
              />
            </div>
          ) : (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-col items-center justify-end gap-1 rounded-lg px-1 py-1.5 text-[10px] font-black uppercase leading-none tracking-normal text-budget-text/50 transition",
                isActive
                  ? "bg-budget-primary/10 text-budget-primary"
                  : "hover:text-budget-text",
              )
            }
            end={item.href === "/"}
            key={item.href}
            to={item.href}
          >
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg",
              )}
            >
              <item.icon size={19} />
            </span>
            <span className="truncate">{item.label}</span>
          </NavLink>
          )
        ))}
      </div>
    </nav>
  );
}
