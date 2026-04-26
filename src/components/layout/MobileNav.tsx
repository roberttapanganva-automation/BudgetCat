import { CalendarDays, Home, MoreHorizontal, Plus, Target } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "../../lib/utils";

const items = [
  { label: "Home", href: "/", icon: Home },
  { label: "Add", href: "/transactions", icon: Plus, isPrimary: true },
  { label: "Bills", href: "/due-dates", icon: CalendarDays },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "More", href: "/settings", icon: MoreHorizontal },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-budget-border bg-white/95 px-3 pb-3 pt-2 shadow-soft backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-lg grid-cols-5 items-end gap-1">
        {items.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-bold text-budget-text/55 transition",
                item.isPrimary && "text-budget-primary",
                isActive && !item.isPrimary && "bg-budget-background text-budget-text",
              )
            }
            end={item.href === "/"}
            key={item.href}
            to={item.href}
          >
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-lg",
                item.isPrimary && "bg-budget-primary text-white shadow-button",
              )}
            >
              <item.icon size={19} />
            </span>
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
