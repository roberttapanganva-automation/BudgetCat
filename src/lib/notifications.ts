import type { NotificationStatus } from "../types/finance";

export function isNotificationSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationStatus {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission as NotificationStatus;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) return "unsupported" as NotificationStatus;
  return (await Notification.requestPermission()) as NotificationStatus;
}

export function sendLocalNotification(title: string, body: string) {
  if (!isNotificationSupported()) {
    return { ok: false, reason: "Notifications are not supported in this browser." };
  }

  if (Notification.permission !== "granted") {
    return { ok: false, reason: "Notification permission is not granted." };
  }

  try {
    new Notification(title, {
      body,
      icon: "/icons/icon.svg",
      badge: "/icons/icon.svg",
      silent: false,
    });
  } catch (error) {
    console.error("[BudgetCat Notification Error]", error);
    return { ok: false, reason: "Notification could not be shown." };
  }

  return { ok: true };
}

export async function testBudgetCatNotification() {
  if (!isNotificationSupported()) {
    return {
      ok: false,
      permission: "unsupported" as NotificationStatus,
      message: "Notifications are not supported in this browser.",
    };
  }

  let permission = getNotificationPermission();
  if (permission === "default") {
    permission = await requestNotificationPermission();
  }

  if (permission === "denied") {
    return {
      ok: false,
      permission,
      message: "Notifications are blocked. Allow them from this site's browser settings.",
    };
  }

  if (permission !== "granted") {
    return {
      ok: false,
      permission,
      message: "Notification permission was not granted.",
    };
  }

  const result = sendLocalNotification(
    "BudgetCat Reminder",
    "Bonnie & Clyde say your reminders are working.",
  );

  return {
    ok: result.ok,
    permission,
    message: result.ok ? "Test reminder sent." : result.reason ?? "Test notification failed.",
  };
}
