"use client";

import { useState, useTransition } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { upsertAlertPreferences } from "@/db/mutations/budget-alerts";

type AlertPrefs = {
  threshold: number;
  browser_alerts: boolean;
  email_alerts: boolean;
} | null;

export function BudgetAlertSettings({
  budgetId,
  budgetCategory,
  prefs,
}: {
  budgetId: string;
  budgetCategory: string;
  prefs: AlertPrefs;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [threshold, setThreshold] = useState(prefs?.threshold ?? 80);
  const [browserAlerts, setBrowserAlerts] = useState(prefs?.browser_alerts ?? true);
  const [emailAlerts, setEmailAlerts] = useState(prefs?.email_alerts ?? false);

  function handleSave() {
    startTransition(async () => {
      await upsertAlertPreferences(budgetId, threshold, browserAlerts, emailAlerts);
      setOpen(false);
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setThreshold(prefs?.threshold ?? 80);
      setBrowserAlerts(prefs?.browser_alerts ?? true);
      setEmailAlerts(prefs?.email_alerts ?? false);
    }
    setOpen(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
          <Bell className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Alert Settings</DialogTitle>
          <DialogDescription>
            Configure alerts for your {budgetCategory} budget.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="threshold">Alert threshold (%)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="threshold"
                type="number"
                min={1}
                max={100}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                Alert when spending reaches {threshold}% of budget
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="browser-alerts">Browser notifications</Label>
              <p className="text-xs text-muted-foreground">
                Show alerts in the notification bell and as browser push notifications
              </p>
            </div>
            <Switch
              id="browser-alerts"
              checked={browserAlerts}
              onCheckedChange={setBrowserAlerts}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-alerts">Email notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive alerts via email when thresholds are crossed
              </p>
            </div>
            <Switch
              id="email-alerts"
              checked={emailAlerts}
              onCheckedChange={setEmailAlerts}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
