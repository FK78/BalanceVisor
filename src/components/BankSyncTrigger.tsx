"use client";

import { useEffect, useRef, useCallback } from "react";
import { syncBankIfNeeded } from "@/db/mutations/truelayer";
import { toast } from "sonner";

/**
 * Triggers a background bank sync on mount and shows a sonner toast
 * with the result.
 */
export function BankSyncTrigger() {
  const ran = useRef(false);

  const doSync = useCallback(async () => {
    const toastId = toast.loading("Syncing bank data…");
    try {
      const res = await syncBankIfNeeded();
      if (res.synced) {
        toast.success(
          `Synced ${res.accountsImported} account${res.accountsImported !== 1 ? "s" : ""}, ${res.transactionsImported} transaction${res.transactionsImported !== 1 ? "s" : ""}`,
          { id: toastId },
        );
      } else {
        toast.dismiss(toastId);
      }
    } catch {
      toast.error("Bank sync failed — try manual sync", { id: toastId });
    }
  }, []);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    queueMicrotask(doSync);
  }, [doSync]);

  return null;
}
