"use client";

import { useTransition } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { refreshManualHoldingPrices } from "@/db/mutations/investments";
import { toast } from "sonner";

export function RefreshPricesButton() {
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(async () => {
      try {
        await refreshManualHoldingPrices();
        toast.success("Prices refreshed");
      } catch {
        toast.error("Failed to refresh prices");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={handleRefresh}
    >
      <RefreshCw className={`mr-1 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Refreshing…" : "Refresh Prices"}
    </Button>
  );
}
