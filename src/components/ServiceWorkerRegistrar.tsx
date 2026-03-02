"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    __pwaInstallPrompt?: Event | null;
  }
}

export function ServiceWorkerRegistrar() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    // Capture beforeinstallprompt early at root level so it's not missed
    // when InstallPrompt is inside an authenticated layout that mounts later
    const captureInstall = (e: Event) => {
      e.preventDefault();
      window.__pwaInstallPrompt = e;
    };
    window.addEventListener("beforeinstallprompt", captureInstall);

    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setUpdateReady(true);
            }
          });
        });
      })
      .catch(() => {
        // Service worker registration failed — non-critical
      });

    return () => {
      window.removeEventListener("beforeinstallprompt", captureInstall);
    };
  }, []);

  if (!updateReady) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 rounded-xl border bg-background px-4 py-3 shadow-lg">
        <p className="text-sm font-medium">A new version is available</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
