"use client";

import { useTransition } from "react";
import { Pause, Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleSubscription } from "@/db/mutations/subscriptions";
import { toast } from "sonner";

export function ToggleSubscriptionButton({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      await toggleSubscription(id);
      toast.success(isActive ? "Subscription paused" : "Subscription resumed");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-foreground"
      onClick={handleToggle}
      disabled={isPending}
      title={isActive ? "Pause subscription" : "Resume subscription"}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : isActive ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
    </Button>
  );
}
