import { useEffect, useState } from "react";

type PwaDebugState = {
  cacheNames: string[];
  cacheEntryCount: number;
  controllerExists: boolean;
  cssCached: boolean;
  indexCached: boolean;
  isOnline: boolean;
  jsCached: boolean;
  registrationState: string;
  serviceWorkerSupported: boolean;
};

const initialState: PwaDebugState = {
  cacheNames: [],
  cacheEntryCount: 0,
  controllerExists: false,
  cssCached: false,
  indexCached: false,
  isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
  jsCached: false,
  registrationState: "checking",
  serviceWorkerSupported: typeof navigator !== "undefined" && "serviceWorker" in navigator,
};

async function getCacheDiagnostics() {
  if (typeof caches === "undefined") {
    return {
      cacheNames: [],
      cacheEntryCount: 0,
      indexCached: false,
      jsCached: false,
      cssCached: false,
    };
  }

  const cacheNames = await caches.keys();
  const requests = (
    await Promise.all(
      cacheNames.map(async (cacheName) => {
        const cache = await caches.open(cacheName);
        return cache.keys();
      }),
    )
  ).flat();

  const urls = requests.map((request) => new URL(request.url));

  return {
    cacheNames,
    cacheEntryCount: urls.length,
    indexCached: urls.some((url) => url.pathname === "/" || url.pathname.includes("index.html")),
    jsCached: urls.some((url) => url.pathname.endsWith(".js")),
    cssCached: urls.some((url) => url.pathname.endsWith(".css")),
  };
}

async function readPwaDebugState(): Promise<PwaDebugState> {
  const serviceWorkerSupported = "serviceWorker" in navigator;
  const cacheDiagnostics = await getCacheDiagnostics();
  let registrationState = serviceWorkerSupported ? "not registered" : "unsupported";

  if (serviceWorkerSupported) {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = registration?.active ?? registration?.waiting ?? registration?.installing;
    registrationState = worker?.state ?? "registered without worker";
  }

  return {
    ...cacheDiagnostics,
    controllerExists: Boolean(serviceWorkerSupported && navigator.serviceWorker.controller),
    isOnline: navigator.onLine,
    registrationState,
    serviceWorkerSupported,
  };
}

export function PwaDebugPanel() {
  const [state, setState] = useState<PwaDebugState>(initialState);

  useEffect(() => {
    let isMounted = true;

    async function refresh() {
      try {
        const nextState = await readPwaDebugState();
        if (isMounted) {
          setState(nextState);
          console.info("[BudgetCat PWA Debug]", nextState);
        }
      } catch (error) {
        console.warn("[BudgetCat PWA Debug] Could not read PWA diagnostics", error);
      }
    }

    refresh();

    const interval = window.setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    navigator.serviceWorker?.addEventListener("controllerchange", refresh);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      navigator.serviceWorker?.removeEventListener("controllerchange", refresh);
    };
  }, []);

  return (
    <aside className="fixed bottom-3 left-3 z-[100] max-w-[min(92vw,360px)] rounded-lg border border-budget-border bg-budget-card/95 p-3 text-xs font-bold text-budget-text shadow-soft backdrop-blur">
      <p className="mb-2 text-sm font-black text-budget-primary">PWA offline debug</p>
      <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
        <dt>SW supported</dt>
        <dd>{state.serviceWorkerSupported ? "yes" : "no"}</dd>
        <dt>SW controller</dt>
        <dd>{state.controllerExists ? "yes" : "no"}</dd>
        <dt>Registration</dt>
        <dd>{state.registrationState}</dd>
        <dt>Cache entries</dt>
        <dd>{state.cacheEntryCount}</dd>
        <dt>Cache names</dt>
        <dd className="max-w-40 truncate" title={state.cacheNames.join(", ") || "none"}>
          {state.cacheNames.length || "none"}
        </dd>
        <dt>index.html cached</dt>
        <dd>{state.indexCached ? "yes" : "no"}</dd>
        <dt>Main JS cached</dt>
        <dd>{state.jsCached ? "yes" : "no"}</dd>
        <dt>Main CSS cached</dt>
        <dd>{state.cssCached ? "yes" : "no"}</dd>
        <dt>Network</dt>
        <dd>{state.isOnline ? "online" : "offline"}</dd>
      </dl>
    </aside>
  );
}
