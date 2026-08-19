import { useLiveQuery } from "dexie-react-hooks";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  FileDown,
  FileJson,
  Loader2,
  LogOut,
  Palette,
  RefreshCcw,
  Settings as SettingsIcon,
  ShieldCheck,
  Smartphone,
  Trash2,
  UserRound,
  Volume2,
  VolumeX,
} from "../lib/icons";
import { useEffect, useState } from "react";

import { ThemeToggle } from "../components/layout/ThemeToggle";
import { AnimatedStatusIcon } from "../components/ui/AnimatedStatusIcon";
import { useAuth } from "../contexts/AuthContext";
import { useSyncStatus } from "../hooks/useSyncStatus";
import { exportBudgetCatData } from "../lib/exportData";
import { clearLocalTestData, db } from "../lib/localDb";
import { getStoredNickname, saveNickname } from "../lib/nickname";
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
import { cn } from "../lib/utils";
import type {
  BudgetCatSyncError,
  ExportType,
  NotificationStatus,
  ReminderSoundMode,
} from "../types/finance";

const warmDashboardKey = "budgetcat-warm-dashboard";
const mascotReminderKey = "budgetcat-show-mascot-reminders";

type MessageTone = "success" | "warning" | "error" | "info";

function getStoredBoolean(key: string, fallback: boolean) {
  const storedValue = localStorage.getItem(key);

  if (storedValue === "true") return true;
  if (storedValue === "false") return false;

  return fallback;
}

function saveStoredBoolean(key: string, value: boolean) {
  localStorage.setItem(key, String(value));
}

function MessageBox({
  message,
  tone = "info",
}: {
  message: string | null;
  tone?: MessageTone;
}) {
  if (!message) return null;

  const toneClass = {
    success: "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] text-[var(--bc-green)]",
    warning: "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]",
    error: "border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] text-[var(--bc-red)]",
    info: "border-[var(--bc-blue)]/20 bg-[var(--bc-blue)]/10 text-[var(--bc-blue)]",
  }[tone];

  return (
    <div className={cn("mt-3 rounded-2xl border px-3 py-2", toneClass)}>
      <p className="text-xs font-bold leading-relaxed">{message}</p>
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
  icon: Icon,
  tone = "green",
}: {
  title: string;
  subtitle?: string;
  icon: typeof SettingsIcon;
  tone?: "green" | "amber" | "red" | "blue" | "purple";
}) {
  const iconClass = {
    green: "bc-icon-circle-green",
    amber: "bc-icon-circle-amber",
    red: "bc-icon-circle-red",
    blue: "bc-icon-circle-blue",
    purple: "bg-[var(--bc-purple)]/15 text-[var(--bc-purple)]",
  }[tone];

  return (
    <div className="mb-4 flex items-start gap-3">
      <div className={cn("bc-icon-circle h-11 w-11 shrink-0", iconClass)}>
        <Icon className="h-5 w-5" strokeWidth={2.4} />
      </div>

      <div className="min-w-0">
        <h2 className="text-base font-black tracking-[-0.02em] text-[var(--bc-text)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
      <div className="min-w-0">
        <p className="text-sm font-black text-[var(--bc-text)]">{title}</p>
        <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[var(--bc-text-muted)]">
          {description}
        </p>
      </div>

      <button
        aria-pressed={checked}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full border transition",
          checked
            ? "border-[var(--bc-green)]/30 bg-[var(--bc-green)]"
            : "border-[var(--bc-border)] bg-[var(--bc-card)]",
        )}
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-6" : "left-1",
          )}
        />
      </button>
    </div>
  );
}

function ExportButton({
  label,
  description,
  variant = "csv",
  onClick,
}: {
  label: string;
  description: string;
  variant?: "csv" | "json";
  onClick: () => void;
}) {
  const isJson = variant === "json";
  const Icon = isJson ? FileJson : FileDown;
  const iconClass = isJson ? "bc-icon-circle-amber" : "bc-icon-circle-blue";

  return (
    <button
      className="flex w-full items-center gap-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3 text-left transition hover:border-[var(--bc-border-strong)] hover:bg-[var(--bc-card)]"
      onClick={onClick}
      type="button"
    >
      <div className={cn("bc-icon-circle h-10 w-10 shrink-0", iconClass)}>
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-[var(--bc-text)]">{label}</p>
        <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
          {description}
        </p>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--bc-text-muted)]" />
    </button>
  );
}

export function Settings() {
  const { signOut, user } = useAuth();

  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [latestSyncError, setDisplayedSyncError] =
    useState<BudgetCatSyncError | null>(() => getLatestSyncError());
  const [notificationStatus, setNotificationStatus] =
    useState<NotificationStatus>(() => getNotificationPermission());
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null,
  );
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [nickname, setNickname] = useState(() => getStoredNickname(user?.id));
  const [nicknameMessage, setNicknameMessage] = useState<string | null>(null);
  const [soundMode, setSoundMode] = useState<ReminderSoundMode>(() =>
    getReminderSoundMode(),
  );
  const [canInstallPwa, setCanInstallPwa] = useState(() =>
    canPromptPwaInstall(),
  );
  const [pwaMessage, setPwaMessage] = useState<string | null>(null);
  const [warmDashboard, setWarmDashboard] = useState(() =>
    getStoredBoolean(warmDashboardKey, true),
  );
  const [showMascotReminders, setShowMascotReminders] = useState(() =>
    getStoredBoolean(mascotReminderKey, true),
  );

  const syncStatus = useSyncStatus();

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

  useEffect(() => {
    const handleSyncError = () => {
      setDisplayedSyncError(getLatestSyncError());
    };

    window.addEventListener(syncErrorEventName, handleSyncError);

    return () => window.removeEventListener(syncErrorEventName, handleSyncError);
  }, []);

  useEffect(() => {
    setNickname(getStoredNickname(user?.id));
  }, [user?.id]);

  useEffect(() => {
    return subscribeToPwaInstallPrompt(() => {
      setCanInstallPwa(canPromptPwaInstall());
    });
  }, []);

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
          : `Synced ${result.synced} record${
              result.synced === 1 ? "" : "s"
            }; ${result.failed} failed.`),
    );
  }

  async function handleRetryFailedSync() {
    await handleSyncNow();
  }

  async function handleClearLocalTestData() {
    const shouldClear = window.confirm(
      "Warning: this will clear local test records saved on this device. This will not delete Supabase data. Continue?",
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

  async function handleTestSound() {
    await playReminderSound(soundMode);
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

  async function handleSaveNickname() {
    try {
      await saveNickname(user, nickname);
      setNicknameMessage("Nickname saved. Bonnie and Clyde will use it on your dashboard.");
    } catch {
      setNicknameMessage("Nickname saved locally. Supabase metadata could not be updated.");
    }
  }

  function handleWarmDashboardChange(value: boolean) {
    setWarmDashboard(value);
    saveStoredBoolean(warmDashboardKey, value);
  }

  function handleMascotReminderChange(value: boolean) {
    setShowMascotReminders(value);
    saveStoredBoolean(mascotReminderKey, value);
  }

  const syncHealthy = !latestSyncError && pendingCount === 0;
  const soundEnabled = soundMode !== "off";
  const notificationHealthy = notificationStatus === "granted";

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] px-[clamp(1rem,5vw,1.25rem)] pb-28 pt-5 md:max-w-none md:px-0 md:pb-8 md:pt-0">
      <header className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--bc-text-muted)]">
            Preferences
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-[-0.05em] text-[var(--bc-text)] md:text-3xl">
            Settings
          </h1>
          <p className="mt-1 text-sm font-semibold text-[var(--bc-text-muted)]">
            Manage your preferences
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-green)]">
          <SettingsIcon className="h-5 w-5" strokeWidth={2.4} />
        </div>
      </header>

      <section className="bc-card-elevated mb-4 p-4">
        <SectionTitle
          icon={UserRound}
          subtitle="This is what Bonnie and Clyde will call you."
          title="Profile"
        />

        <div className="space-y-3">
          <label className="block space-y-2">
            <span className="text-xs font-black text-[var(--bc-text-soft)]">
              Nickname
            </span>
            <input
              className="bc-input"
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Robert"
              value={nickname}
            />
          </label>

          <MessageBox message={nicknameMessage} tone="success" />

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <button
              className="bc-button bc-button-primary w-full"
              onClick={handleSaveNickname}
              type="button"
            >
              Save Nickname
            </button>

            <button
              className="bc-button bc-button-danger px-4"
              onClick={signOut}
              type="button"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>

          <div className="rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-black text-[var(--bc-text-muted)]">
                Account
              </span>
              <span className="rounded-full border border-[var(--bc-border)] bg-[var(--bc-card)] px-2 py-1 text-[10px] font-black text-[var(--bc-text-soft)]">
                {user?.isOffline ? "Offline" : "Supabase"}
              </span>
            </div>
            <p className="mt-2 truncate text-sm font-bold text-[var(--bc-text)]">
              {user?.email ?? "Local BudgetCat user"}
            </p>
          </div>
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={Palette}
          subtitle="Keep BudgetCat comfortable in dark or light mode."
          title="Appearance"
          tone="purple"
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
            <div className="min-w-0">
              <p className="text-sm font-black text-[var(--bc-text)]">Theme</p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--bc-text-muted)]">
                Switch between BudgetCat light and dark mode.
              </p>
            </div>

            <ThemeToggle className="h-11 w-11 rounded-2xl border border-[var(--bc-border)] bg-[var(--bc-card)] text-[var(--bc-text)]" />
          </div>

          <ToggleRow
            checked={warmDashboard}
            description="Keeps cards soft, cozy, and mascot-friendly."
            onChange={handleWarmDashboardChange}
            title="Warm dashboard"
          />

          <ToggleRow
            checked={showMascotReminders}
            description="Show Bonnie and Clyde encouragement where supported."
            onChange={handleMascotReminderChange}
            title="Show mascot reminders"
          />
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={Database}
          subtitle="Offline-first changes sync when BudgetCat can reach Supabase."
          title="Sync"
          tone={syncHealthy ? "green" : "amber"}
        />

        <div className="rounded-[22px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-4">
          <div className="flex items-start gap-2.5">
            <div
              className={cn(
                "bc-icon-circle h-11 w-11 shrink-0",
                syncHealthy ? "bc-icon-circle-green" : "bc-icon-circle-amber",
              )}
            >
              {syncStatus.isSyncing ? (
                <AnimatedStatusIcon
                  animation="spin"
                  className="text-[var(--bc-amber)]"
                  icon={Loader2}
                  label="Syncing"
                />
              ) : syncHealthy ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <RefreshCcw className="h-5 w-5" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[var(--bc-text)]">
                {syncHealthy ? "All synced" : "Sync needs review"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[var(--bc-text-muted)]">
                {pendingCount} pending local record{pendingCount === 1 ? "" : "s"}.
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

              <MessageBox message={syncMessage} tone={syncHealthy ? "success" : "warning"} />
            </div>
          </div>
        </div>

        {latestSyncError && (
          <div className="mt-3 rounded-[20px] border border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] p-4">
            <div className="flex items-start gap-2.5">
              <div className="bc-icon-circle-red h-10 w-10 shrink-0">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-black text-[var(--bc-text)]">
                  Sync failed for {latestSyncError.tableName}
                </p>
                <p className="mt-0.5 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
                  {latestSyncError.message}
                </p>
                {latestSyncError.code ? (
                  <p className="mt-2 text-[11px] font-black text-[var(--bc-red)]">
                    Code: {latestSyncError.code}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            className="bc-button bc-button-primary w-full"
            onClick={handleSyncNow}
            type="button"
          >
            <RefreshCcw className="h-4.5 w-4.5" />
            Sync Now
          </button>

          <button
            className="bc-button bc-button-secondary w-full"
            onClick={handleRetryFailedSync}
            type="button"
          >
            Retry Failed
          </button>
        </div>

        <div className="mt-3 rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-black text-[var(--bc-text-muted)]">
              Supabase config
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-1 text-[10px] font-black",
                hasSupabaseConfig
                  ? "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                  : "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]",
              )}
            >
              {hasSupabaseConfig ? "Found" : "Offline-only"}
            </span>
          </div>
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={Bell}
          subtitle="Local reminders work best while BudgetCat or your browser is open."
          title="Notifications"
          tone={notificationHealthy ? "green" : "amber"}
        />

        <div className="space-y-3">
          <div className="rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-black text-[var(--bc-text)]">
                Permission
              </span>
              <span
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-black",
                  notificationHealthy
                    ? "border-[var(--bc-green)]/20 bg-[var(--bc-green-glow)] text-[var(--bc-green)]"
                    : "border-[var(--bc-amber)]/20 bg-[var(--bc-amber-glow)] text-[var(--bc-amber)]",
                )}
              >
                {notificationStatus}
              </span>
            </div>
          </div>

          <MessageBox
            message={notificationMessage}
            tone={notificationHealthy ? "success" : "warning"}
          />

          <div className="grid grid-cols-2 gap-3">
            <button
              className="bc-button bc-button-primary w-full"
              onClick={handleEnableNotifications}
              type="button"
            >
              <Bell className="h-4.5 w-4.5" />
              Enable
            </button>

            <button
              className="bc-button bc-button-secondary w-full"
              onClick={handleTestNotification}
              type="button"
            >
              Test
            </button>
          </div>
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={soundEnabled ? Volume2 : VolumeX}
          subtitle="Use meow or chime feedback for BudgetCat reminders."
          title="Sound & Alerts"
          tone="blue"
        />

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block space-y-2">
              <span className="text-xs font-black text-[var(--bc-text-soft)]">
                Sound Type
              </span>
              <select
                className="bc-input"
                onChange={(event) =>
                  handleSoundPreferenceChange(
                    event.target.value as ReminderSoundMode,
                  )
                }
                value={soundMode}
              >
                <option value="meow">Meow</option>
                <option value="chime">Soft Chime</option>
                <option value="off">Off</option>
              </select>
            </label>

            <div className="flex gap-2 md:items-end">
              <button
                className="bc-button bc-button-secondary flex-1 md:flex-none"
                onClick={handleTestSound}
                type="button"
              >
                Test Sound
              </button>

              <button
                className="bc-button bc-button-primary flex-1 md:flex-none"
                onClick={handleTestMeowSound}
                type="button"
              >
                Meow
              </button>
            </div>
          </div>

          <ToggleRow
            checked={soundEnabled}
            description="Turning this off sets reminder sound to Off."
            onChange={(checked) =>
              handleSoundPreferenceChange(checked ? "meow" : "off")
            }
            title="Enable sounds"
          />
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={Download}
          subtitle="Export real local BudgetCat data from this device."
          title="Export Data"
          tone="blue"
        />

        <div className="space-y-3">
          <ExportButton
            description="Transactions in CSV format"
            label="Transactions CSV"
            onClick={() => handleExport("transactions_csv")}
          />

          <ExportButton
            description="Bills and due dates in CSV format"
            label="Due Dates CSV"
            onClick={() => handleExport("due_dates_csv")}
          />

          <ExportButton
            description="Savings goals in CSV format"
            label="Goals CSV"
            onClick={() => handleExport("goals_csv")}
          />

          <ExportButton
            description="Goal contributions in CSV format"
            label="Goal Contributions CSV"
            onClick={() => handleExport("goal_contributions_csv")}
          />

          <ExportButton
            description="Complete local JSON backup"
            label="Full Backup JSON"
            variant="json"
            onClick={() => handleExport("full_backup_json")}
          />

          <MessageBox message={exportMessage} tone="info" />
        </div>
      </section>

      <section className="bc-card mb-4 p-4">
        <SectionTitle
          icon={Smartphone}
          subtitle="Install BudgetCat as a private app shortcut when supported."
          title="PWA Install"
          tone="green"
        />

        <div className="rounded-[18px] border border-[var(--bc-border)] bg-[var(--bc-surface-soft)]/60 p-3">
          <p className="text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
            Chrome/Edge desktop: install icon in the address bar. Android
            Chrome: browser menu then Add to Home screen. iPhone Safari: Share
            then Add to Home Screen.
          </p>
        </div>

        <MessageBox message={pwaMessage} tone="info" />

        <button
          className="bc-button bc-button-primary mt-4 w-full"
          disabled={!canInstallPwa}
          onClick={handleInstallPwa}
          type="button"
        >
          <Smartphone className="h-4.5 w-4.5" />
          {canInstallPwa ? "Install BudgetCat" : "Install Prompt Unavailable"}
        </button>
      </section>

      <section className="bc-card mb-4 border-[var(--bc-red)]/20 p-4">
        <SectionTitle
          icon={Trash2}
          subtitle="Use this only for local test cleanup."
          title="Danger Zone"
          tone="red"
        />

        <div className="rounded-[18px] border border-[var(--bc-red)]/20 bg-[var(--bc-red-glow)] p-3">
          <p className="text-sm font-black text-[var(--bc-text)]">
            Clear local test data
          </p>
          <p className="mt-0.5 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
            This clears local test records only. Supabase data is not changed.
          </p>
        </div>

        <button
          className="bc-button bc-button-danger mt-4 w-full"
          onClick={handleClearLocalTestData}
          type="button"
        >
          <Trash2 className="h-4.5 w-4.5" />
          Clear Local Test Data
        </button>

        <button
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-black text-[var(--bc-red)]"
          onClick={signOut}
          type="button"
        >
          <LogOut className="h-4.5 w-4.5" />
          Log Out
        </button>
      </section>

      <section className="bc-card p-3">
        <div className="flex items-start gap-2.5">
          <div className="bc-icon-circle bc-icon-circle-green h-10 w-10 shrink-0">
            <ShieldCheck className="h-4.5 w-4.5" />
          </div>

          <div>
            <p className="text-sm font-black text-[var(--bc-text)]">
              Private personal budget tracker
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-relaxed text-[var(--bc-text-muted)]">
              BudgetCat uses manual entries, local-first storage, and sync when
              available. No bank connection. No sample finance data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}


