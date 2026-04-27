import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  Settings,
  Target,
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { NavLink } from "react-router-dom";
import { useSyncStatus } from "../../hooks/useSyncStatus";
import { db } from "../../lib/localDb";
import { getSyncMascotMood } from "../../lib/mascotMood";
import { cn } from "../../lib/utils";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: ListChecks },
  { label: "Due Dates", href: "/due-dates", icon: CalendarDays },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pendingCount =
    useLiveQuery(
      () => db.sync_queue.where("sync_status").anyOf(["pending", "failed"]).count(),
      [],
      0,
    ) ?? 0;
  const syncStatus = useSyncStatus();
  const syncMood = syncStatus.syncError
    ? {
        title: "Sync needs attention",
        message: "Some changes could not sync. Try again.",
      }
    : getSyncMascotMood(pendingCount);
  const SyncIcon = syncStatus.syncError
    ? AlertTriangle
    : pendingCount > 0 || syncStatus.isSyncing
      ? RefreshCw
      : CheckCircle2;
  const syncAnimation = syncStatus.syncError
    ? "pulse"
    : pendingCount > 0 || syncStatus.isSyncing
      ? "spin"
      : "none";
  const syncIconClass = syncStatus.syncError
    ? "text-budget-urgent"
    : pendingCount > 0 || syncStatus.isSyncing
      ? "text-budget-warning"
      : "text-budget-success";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--budget-sidebar-width)] flex-col border-r border-budget-border bg-budget-card md:flex">
      <div className="border-b border-budget-border px-4 py-4">
        <Logo />
      </div>
      <nav className="grid flex-1 content-start gap-1 px-3 py-4">
        <p className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-budget-text/50">
          Main
        </p>
        {navItems.map((item) => (
          <NavLink
            className={({ isActive }) =>
              cn(
                "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-bold text-budget-text/70 transition",
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
          className="mt-3 w-full justify-start rounded-lg px-3 text-sm"
          label="Add Transaction"
        />
      </nav>
      <div className="border-t border-budget-border p-3">
        <div className="mb-3 rounded-[14px] border border-budget-border bg-[var(--budget-cream-2)] p-3">
          <div className="flex min-w-0 items-start gap-3">
            <AnimatedStatusIcon
              animation={syncAnimation}
              className={syncIconClass}
              icon={SyncIcon}
              label="Sync status"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{syncMood.title}</p>
              <p className="truncate text-xs font-semibold text-budget-text/60">
                {syncMood.message}
              </p>
            </div>
          </div>
          {syncStatus.isSyncing && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-black uppercase tracking-wide text-budget-text/55">
                <span className="truncate">{syncStatus.currentTable ?? "Syncing"}</span>
                <span>{syncStatus.percentComplete}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-budget-background ring-1 ring-budget-border">
                <div
                  className="h-full rounded-full bg-budget-primary transition-all duration-500 ease-out"
                  style={{ width: `${syncStatus.percentComplete}%` }}
                />
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-budget-text/55">Private budget space</p>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
