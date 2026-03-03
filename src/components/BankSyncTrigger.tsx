"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { syncBankIfNeeded } from "@/db/mutations/truelayer";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

type SyncState = "idle" | "syncing" | "done" | "error";

/**
 * Triggers a background bank sync on mount and shows a brief status toast
 * in the bottom-right corner. Fades out after a few seconds.
 */
export function BankSyncTrigger() {
  const ran = useRef(false);
  const [state, setState] = useState<SyncState>("syncing");
  const [result, setResult] = useState<{ accounts: number; transactions: number } | null>(null);

  const doSync = useCallback(async () => {
    try {
      const res = await syncBankIfNeeded();
      if (res.synced) {
        setResult({ accounts: res.accountsImported, transactions: res.transactionsImported });
        setState("done");
      } else {
        setState("idle");
      }
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    queueMicrotask(doSync);
  }, [doSync]);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (state === "done" || state === "error") {
      const timer = setTimeout(() => setState("idle"), 4000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  if (state === "idle") return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg text-sm">
        {state === "syncing" && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            <span className="text-muted-foreground">Syncing bank data…</span>
          </>
        )}
        {state === "done" && result && (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span className="text-muted-foreground">
              Synced {result.accounts} account{result.accounts !== 1 ? "s" : ""}, {result.transactions} transaction{result.transactions !== 1 ? "s" : ""}
            </span>
          </>
        )}
        {state === "error" && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">Bank sync failed — try manual sync</span>
          </>
        )}
      </div>
    </div>
  );
}
