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
import { Logo } from "./Logo";
import { SyncStatusIndicator } from "./SyncStatusIndicator";

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
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-budget-border bg-white/80 p-6 backdrop-blur-xl md:block">
      <Logo />
      <nav className="mt-10 grid gap-2">
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-bold text-budget-text/70 transition",
                isActive
                  ? "bg-budget-primary text-white shadow-button"
                  : "hover:bg-budget-background hover:text-budget-text",
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
      </nav>
      <div className="absolute bottom-6 left-6 right-6 rounded-lg border border-budget-border bg-budget-background p-4">
        <SyncStatusIndicator />
        <p className="text-sm font-black">Private budget space</p>
        <p className="mt-1 text-xs leading-5 text-budget-text/60">
          Manual tracking for two people, with room for Bonnie and Clyde.
        </p>
      </div>
    </aside>
  );
}
