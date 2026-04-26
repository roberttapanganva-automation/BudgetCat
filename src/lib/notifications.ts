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

  new Notification(title, {
    body,
    icon: "/icons/icon.svg",
    badge: "/icons/icon.svg",
  });

  return { ok: true };
}
