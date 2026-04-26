import {
  BarChart3,
  CalendarDays,
  Home,
  ListChecks,
  Settings,
  Target,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";
import { Logo } from "./Logo";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "Dashboard", href: "/", icon: Home },
  { label: "Transactions", href: "/transactions", icon: ListChecks },
  { label: "Due Dates", href: "/due-dates", icon: CalendarDays },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--budget-sidebar-width)] flex-col border-r border-budget-border bg-budget-card md:flex">
      <div className="border-b border-budget-border px-5 py-5">
        <Logo />
      </div>
      <nav className="grid flex-1 gap-1 px-3 py-4">
        <p className="px-2 py-2 text-[10px] font-black uppercase text-budget-text/40">Main</p>
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-bold text-budget-text/65 transition",
                isActive
                  ? "bg-[var(--budget-green-faint)] text-budget-primary"
                  : "hover:bg-[var(--budget-cream-2)] hover:text-budget-text",
              )
            }
            end={item.href === "/"}
            key={item.href}
            to={item.href}
          >
            <item.icon size={19} />
            {item.label}
          </NavLink>
        ))}
        <AddTransactionDialog
          className="mt-2 w-full justify-start rounded-lg px-3 py-2.5 text-[13.5px]"
          label="Add Transaction"
        />
      </nav>
      <div className="border-t border-budget-border p-3">
        <div className="mb-2 rounded-lg bg-[var(--budget-cream-2)] p-3">
          <SyncStatusIndicator showProgress />
        </div>
        <ThemeToggle />
        <p className="mt-3 text-sm font-black">Private budget space</p>
        <p className="mt-1 text-xs leading-5 text-budget-text/55">
          Manual tracking for two people, with room for Bonnie and Clyde.
        </p>
      </div>
    </aside>
  );
}
