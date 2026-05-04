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
import { BudgetCatMascot } from "../mascot/BudgetCatMascot";
import { AddTransactionDialog } from "../transactions/AddTransactionDialog";
import { AnimatedStatusIcon } from "../ui/AnimatedStatusIcon";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Ledger", href: "/transactions", icon: ListChecks },
  { label: "Bills", href: "/due-dates", icon: CalendarDays },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pendingCount =
    useLiveQuery(
      () =>
        db.sync_queue
          .where("sync_status")
          .anyOf(["pending", "failed"])
          .count(),
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
    ? "text-[var(--bc-red)]"
    : pendingCount > 0 || syncStatus.isSyncing
      ? "text-[var(--bc-amber)]"
      : "text-[var(--bc-green)]";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--budget-sidebar-width)] border-r border-[var(--bc-border)] bg-[var(--bc-bg-deep)]/95 px-4 py-5 shadow-2xl shadow-black/10 backdrop-blur-xl md:flex">
      <div className="flex min-h-0 w-full flex-col">
        <div className="bc-card-elevated mb-5 overflow-hidden p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[var(--bc-green-glow)]">
              <BudgetCatMascot
                className="h-12 w-12"
                imageClassName="h-full w-full object-contain"
                variant="icon"
              />
            </div>

            <div className="min-w-0">
              <p className="text-lg font-black leading-tight tracking-[-0.03em] text-[var(--bc-text)]">
                BudgetCat
              </p>
              <p className="text-xs font-semibold text-[var(--bc-text-muted)]">
                Smart. Friendly. Focused.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[20px] border border-[var(--bc-border)] bg-[var(--bc-card)]/80 p-3">
            <div className="flex items-center gap-3">
              <BudgetCatMascot
                className="h-16 w-20 shrink-0"
                imageClassName="h-full w-full object-contain"
                variant="both"
              />

              <div className="min-w-0">
                <p className="text-xs font-black text-[var(--bc-text)]">
                  Bonnie & Clyde
                </p>
                <p className="mt-1 text-[11px] leading-snug text-[var(--bc-text-muted)]">
                  Keeping your budget calm and organized.
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav className="space-y-1" aria-label="Main desktop navigation">
          <p className="px-3 pb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
            Main
          </p>

          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) =>
                cn(
                  "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-bold text-[var(--bc-text-muted)] transition",
                  isActive
                    ? "bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                    : "hover:bg-[var(--bc-card)] hover:text-[var(--bc-text)]",
                )
              }
              end={item.href === "/"}
              key={item.href}
              to={item.href}
            >
              <item.icon className="h-4.5 w-4.5" strokeWidth={2.4} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-5">
          <AddTransactionDialog
            ariaLabel="Quick add transaction"
            className="bc-button bc-button-primary w-full"
            label="+ Quick Add"
          />
        </div>

        <div className="mt-auto space-y-3 pt-5">
          <div className="bc-card-soft p-4">
            <div className="flex items-start gap-3">
              <span className="bc-icon-circle">
                <AnimatedStatusIcon
                  animation={syncAnimation}
                  className={syncIconClass}
                  icon={SyncIcon}
                  label={syncMood.title}
                />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-black text-[var(--bc-text)]">
                  {syncMood.title}
                </p>
                <p className="mt-1 text-xs leading-snug text-[var(--bc-text-muted)]">
                  {syncMood.message}
                </p>

                {syncStatus.isSyncing && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-[var(--bc-text-muted)]">
                      <span>{syncStatus.currentTable ?? "Syncing"}</span>
                      <span>{syncStatus.percentComplete}%</span>
                    </div>

                    <div className="bc-progress-track">
                      <div
                        className="bc-progress-fill"
                        style={{
                          width: `${Math.max(
                            4,
                            Math.min(100, syncStatus.percentComplete),
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-card)]/80 px-3 py-2.5">
            <div>
              <p className="text-xs font-black text-[var(--bc-text)]">
                Private budget space
              </p>
              <p className="text-[11px] text-[var(--bc-text-muted)]">
                Theme stays saved
              </p>
            </div>

            <ThemeToggle className="h-10 w-10 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-surface-soft)] text-[var(--bc-text)]" />
          </div>
        </div>
      </div>
    </aside>
  );
}