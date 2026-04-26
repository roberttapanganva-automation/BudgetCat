import { useLiveQuery } from "dexie-react-hooks";
import {
  Bell,
  Download,
  FileDown,
  LogOut,
  Palette,
  RefreshCcw,
  Smartphone,
  Trash2,
  UserRound,
  Volume2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageHeader } from "../components/dashboard/PageHeader";
import { SyncStatusIndicator } from "../components/layout/SyncStatusIndicator";
import { ThemeToggle } from "../components/layout/ThemeToggle";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { useAuth } from "../contexts/AuthContext";
import { exportBudgetCatData } from "../lib/exportData";
import { clearLocalTestData, db } from "../lib/localDb";
import {
  getNotificationPermission,
  isNotificationSupported,
  requestNotificationPermission,
  testBudgetCatNotification,
} from "../lib/notifications";
import {
  canPromptPwaInstall,
  promptPwaInstall,
  subscribeToPwaInstallPrompt,
} from "../lib/pwaInstall";
import {
  getReminderSoundMode,
  playReminderSound,
  setReminderSoundMode,
} from "../lib/sound";
import { hasSupabaseConfig } from "../lib/supabase";
import {
  getLatestSyncError,
  setLatestSyncError,
  syncErrorEventName,
} from "../lib/syncErrorStore";
import { syncPendingRecords } from "../lib/syncEngine";
import { useSyncStatus } from "../hooks/useSyncStatus";
import type {
  BudgetCatSyncError,
  ExportType,
  NotificationStatus,
  ReminderSoundMode,
} from "../types/finance";

export function Settings() {
  const { signOut, user } = useAuth();
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [latestSyncError, setDisplayedSyncError] =
    useState<BudgetCatSyncError | null>(() => getLatestSyncError());
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>(() => getNotificationPermission());
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [soundMode, setSoundMode] = useState<ReminderSoundMode>(() => getReminderSoundMode());
  const [canInstallPwa, setCanInstallPwa] = useState(() => canPromptPwaInstall());
  const [pwaMessage, setPwaMessage] = useState<string | null>(null);
  const syncStatus = useSyncStatus();
  const pendingCount =
    useLiveQuery(
      () => db.sync_queue.where("sync_status").anyOf(["pending", "failed"]).count(),
      [],
      0,
    ) ?? 0;

  useEffect(() => {
    const handleSyncError = () => {
      setDisplayedSyncError(getLatestSyncError());
    };

    window.addEventListener(syncErrorEventName, handleSyncError);
    return () => window.removeEventListener(syncErrorEventName, handleSyncError);
  }, []);

  useEffect(() => {
    return subscribeToPwaInstallPrompt(() => {
      setCanInstallPwa(canPromptPwaInstall());
    });
  }, []);

  const sections = [
    {
      title: "Profile",
      description: user?.email ?? "Local BudgetCat user",
      icon: UserRound,
      meta: user?.isOffline ? "Offline user" : "Supabase user",
    },
    {
      title: "Currency",
      description: "Default currency for all manual entries.",
      icon: Palette,
      meta: "PHP",
    },
    {
      title: "Export Data",
      description: "Download local backup files from this device.",
      icon: Download,
      meta: "Available",
    },
  ];

  async function handleSyncNow() {
    if (!hasSupabaseConfig) {
      setSyncMessage("Supabase is not configured. BudgetCat is in offline-only mode.");
      return;
    }
    if (!user) {
      setSyncMessage("No signed-in user for sync.");
      return;
    }
    if (!user.householdId) {
      setSyncMessage("No household found for sync. Check the latest sync error below.");
      setDisplayedSyncError(getLatestSyncError());
      return;
    }

    const result = await syncPendingRecords(user);
    setDisplayedSyncError(result.latestError ?? getLatestSyncError());
    setSyncMessage(
      result.skippedReason ??
        (result.ok
          ? `Synced ${result.synced} record${result.synced === 1 ? "" : "s"}.`
          : `Synced ${result.synced} record${result.synced === 1 ? "" : "s"}; ${result.failed} failed.`),
    );
  }

  async function handleRetryFailedSync() {
    await handleSyncNow();
  }

  async function handleClearLocalTestData() {
    const shouldClear = window.confirm(
      "Clear local offline test records? This will not delete Supabase data.",
    );

    if (!shouldClear) return;

    await clearLocalTestData();
    setSyncMessage("Local offline test records cleared. Supabase data was not changed.");
    setLatestSyncError(null);
    setDisplayedSyncError(null);
  }

  async function handleEnableNotifications() {
    if (!isNotificationSupported()) {
      setNotificationStatus("unsupported");
      setNotificationMessage("Notifications are not supported in this browser.");
      return;
    }

    const permission = await requestNotificationPermission();
    setNotificationStatus(permission);
    setNotificationMessage(
      permission === "granted"
        ? "Notifications enabled for local reminders while BudgetCat is open."
        : "Notification permission was not granted.",
    );
  }

  function handleTestNotification() {
    testBudgetCatNotification()
      .then(async (result) => {
        setNotificationStatus(result.permission);
        setNotificationMessage(result.message);
        if (result.ok) {
          await playReminderSound();
        }
      })
      .catch((error) => {
        console.error("[BudgetCat Notification Test Error]", error);
        setNotificationMessage("Test reminder could not be sent.");
      });
  }

  function handleSoundPreferenceChange(mode: ReminderSoundMode) {
    setSoundMode(mode);
    setReminderSoundMode(mode);
  }

  async function handleTestMeowSound() {
    setSoundMode("meow");
    setReminderSoundMode("meow");
    await playReminderSound("meow");
  }

  async function handleInstallPwa() {
    const outcome = await promptPwaInstall();
    if (outcome === "accepted") {
      setPwaMessage("BudgetCat install started.");
    } else if (outcome === "dismissed") {
      setPwaMessage("Install was dismissed. You can try again later from the browser menu.");
    } else {
      setPwaMessage("Install prompt is not available yet. Use your browser install menu.");
    }
    setCanInstallPwa(canPromptPwaInstall());
  }

  async function handleExport(exportType: ExportType) {
    try {
      await exportBudgetCatData(exportType);
      setExportMessage("Export created.");
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Export failed.");
    }
  }

  return (
    <>
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={handleSyncNow} variant="secondary">
              <RefreshCcw size={18} />
              Sync Now
            </Button>
            <Button onClick={handleRetryFailedSync} variant="secondary">
              Retry Failed Sync
            </Button>
            <Button onClick={signOut} variant="secondary">
              <LogOut size={18} />
              Logout
            </Button>
          </div>
        }
        subtitle="Personal app preferences and sync controls."
        title="Settings"
      />
      <section className="grid gap-4">
        <Card className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-black">Sync Status</h2>
              <p className="mt-1 text-sm font-semibold text-budget-text/55">
                {pendingCount} pending local record{pendingCount === 1 ? "" : "s"}.
              </p>
              {syncStatus.isSyncing && (
                <div className="mt-3 max-w-md">
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-budget-text/55">
                    <span>{syncStatus.currentTable ?? "Syncing"}</span>
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
              {syncMessage && (
                <p className="mt-2 text-sm font-semibold text-budget-text/65">
                  {syncMessage}
                </p>
              )}
              {latestSyncError && (
                <div className="mt-3 rounded-lg border border-budget-urgent/30 bg-budget-urgent/10 px-4 py-3 text-sm">
                  <p className="font-black text-budget-urgent">
                    Sync failed for {latestSyncError.tableName}
                  </p>
                  <p className="mt-1 font-semibold text-budget-text/70">
                    {latestSyncError.message}
                  </p>
                  {latestSyncError.code && (
                    <p className="mt-1 text-xs font-semibold text-budget-text/50">
                      Code: {latestSyncError.code}
                    </p>
                  )}
                </div>
              )}
            </div>
            <SyncStatusIndicator showProgress />
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-budget-primary/12 text-budget-primary">
                  <Bell size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-black">Notification Permission</h2>
                  <p className="mt-1 text-sm font-semibold text-budget-text/55">
                    Status: {notificationStatus}
                  </p>
                </div>
              </div>
              <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-budget-text/60">
                Local reminders are best-effort and may not fire if BudgetCat or the browser is closed.
              </p>
              {notificationMessage && (
                <p className="mt-2 rounded-lg bg-budget-background px-4 py-3 text-sm font-semibold text-budget-text/65">
                  {notificationMessage}
                </p>
              )}
              <label className="mt-4 grid max-w-sm gap-2 rounded-lg bg-budget-background p-4 text-sm font-bold">
                <span className="inline-flex items-center gap-2">
                  <Volume2 size={18} />
                  Reminder sound
                </span>
                <select
                  className="budget-input"
                  onChange={(event) =>
                    handleSoundPreferenceChange(event.target.value as ReminderSoundMode)
                  }
                  value={soundMode}
                >
                  <option value="meow">Meow</option>
                  <option value="chime">Soft Chime</option>
                  <option value="off">Off</option>
                </select>
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button onClick={handleEnableNotifications} variant="secondary">
                <Bell size={18} />
                Enable Notifications
              </Button>
              <Button onClick={handleTestNotification} variant="secondary">
                Test Notification
              </Button>
              <Button onClick={handleTestMeowSound} variant="secondary">
                Test Meow Sound
              </Button>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-budget-primary/12 text-budget-primary">
              <FileDown size={21} />
            </div>
            <div>
              <h2 className="text-lg font-black">Export Backup</h2>
              <p className="mt-1 text-sm font-semibold text-budget-text/55">
                Export local Dexie data from this device.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Button onClick={() => handleExport("transactions_csv")} variant="secondary">
              Export Transactions CSV
            </Button>
            <Button onClick={() => handleExport("due_dates_csv")} variant="secondary">
              Export Due Dates CSV
            </Button>
            <Button onClick={() => handleExport("goals_csv")} variant="secondary">
              Export Goals CSV
            </Button>
            <Button onClick={() => handleExport("full_backup_json")} variant="secondary">
              Export Full Backup JSON
            </Button>
          </div>
          <div className="mt-3">
            <Button onClick={() => handleExport("goal_contributions_csv")} variant="ghost">
              Export Goal Contributions CSV
            </Button>
          </div>
          {exportMessage && (
            <p className="mt-3 text-sm font-semibold text-budget-text/65">
              {exportMessage}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-budget-primary/12 text-budget-primary">
              <Smartphone size={21} />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-black">PWA Install</h2>
              <p className="mt-1 text-sm font-semibold leading-6 text-budget-text/60">
                BudgetCat is installable from supported browser menus. Use the install option to keep a private app shortcut on your device.
              </p>
              <p className="mt-2 text-sm font-semibold text-budget-text/55">
                Chrome/Edge desktop: install icon in the address bar. Android Chrome: browser menu then Add to Home screen. iPhone Safari: Share then Add to Home Screen.
              </p>
              <p className="mt-2 text-sm font-semibold text-budget-text/55">
                Offline mode: local entries keep saving to this device when network access is unavailable.
              </p>
              {pwaMessage && (
                <p className="mt-2 text-sm font-semibold text-budget-text/65">
                  {pwaMessage}
                </p>
              )}
            </div>
            <div className="hidden shrink-0 sm:block">
              <Button disabled={!canInstallPwa} onClick={handleInstallPwa} variant="secondary">
                Install BudgetCat
              </Button>
            </div>
          </div>
          <div className="mt-4 sm:hidden">
            <Button className="w-full" disabled={!canInstallPwa} onClick={handleInstallPwa} variant="secondary">
              Install BudgetCat
            </Button>
          </div>
        </Card>
        {sections.map((section) => (
          <Card className="p-5" key={section.title}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-budget-primary/12 text-budget-primary">
                  <section.icon size={21} />
                </div>
                <div>
                  <h2 className="text-lg font-black">{section.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-budget-text/55">
                    {section.description}
                  </p>
                </div>
              </div>
              <Badge tone="cat">{section.meta}</Badge>
            </div>
          </Card>
        ))}
        <Card className="p-5">
          <h2 className="text-lg font-black">App Preferences</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-budget-background p-4 text-sm font-bold">
              Theme
              <ThemeToggle />
            </div>
            <label className="flex items-center justify-between gap-4 rounded-lg bg-budget-background p-4 text-sm font-bold">
              Warm dashboard density
              <input defaultChecked type="checkbox" />
            </label>
            <label className="flex items-center justify-between gap-4 rounded-lg bg-budget-background p-4 text-sm font-bold">
              Show mascot reminders
              <input defaultChecked type="checkbox" />
            </label>
          </div>
          <p className="mt-4 text-sm font-semibold text-budget-text/55">
            Supabase config: {hasSupabaseConfig ? "environment variables found" : "offline-only mode"}
          </p>
          <div className="mt-5">
            <Button onClick={handleClearLocalTestData} variant="urgent">
              <Trash2 size={18} />
              Clear local test data
            </Button>
          </div>
        </Card>
      </section>
    </>
  );
}
