type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const pwaInstallEventName = "budgetcat-pwa-install-change";

export function initPwaInstallListener() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent(pwaInstallEventName));
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    window.dispatchEvent(new CustomEvent(pwaInstallEventName));
  });
}

export function canPromptPwaInstall() {
  return Boolean(deferredPrompt);
}

export function subscribeToPwaInstallPrompt(callback: () => void) {
  window.addEventListener(pwaInstallEventName, callback);
  return () => window.removeEventListener(pwaInstallEventName, callback);
}

export async function promptPwaInstall() {
  if (!deferredPrompt) return "unavailable" as const;

  const prompt = deferredPrompt;
  deferredPrompt = null;
  await prompt.prompt();
  const choice = await prompt.userChoice;
  window.dispatchEvent(new CustomEvent(pwaInstallEventName));
  return choice.outcome;
}
