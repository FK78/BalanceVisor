"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Download,
  Loader2,
  Moon,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";
import {
  updateDisplayName,
  updateBaseCurrency,
  deleteAccount,
  exportUserData,
} from "@/db/mutations/settings";

const currencyLabels: Record<string, string> = {
  GBP: "British Pound (£)",
  USD: "US Dollar ($)",
  EUR: "Euro (€)",
  CAD: "Canadian Dollar (CA$)",
  AUD: "Australian Dollar (A$)",
};

type Props = {
  displayName: string;
  email: string;
  baseCurrency: string;
  supportedCurrencies: readonly string[];
};

export function SettingsClient({
  displayName,
  email,
  baseCurrency,
  supportedCurrencies,
}: Props) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Profile
  const [profilePending, startProfileTransition] = useTransition();
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Currency
  const [currencyValue, setCurrencyValue] = useState(baseCurrency);
  const [currencyPending, startCurrencyTransition] = useTransition();
  const [currencyMessage, setCurrencyMessage] = useState<string | null>(null);

  // Export
  const [exportPending, startExportTransition] = useTransition();

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deletePending, startDeleteTransition] = useTransition();

  function handleProfileSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startProfileTransition(async () => {
      const result = await updateDisplayName(formData);
      if (result.error) {
        setProfileMessage(result.error);
      } else {
        setProfileMessage("Display name updated!");
        setTimeout(() => setProfileMessage(null), 3000);
      }
    });
  }

  function handleCurrencySubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("base_currency", currencyValue);
    startCurrencyTransition(async () => {
      const result = await updateBaseCurrency(formData);
      if (result.error) {
        setCurrencyMessage(result.error);
      } else {
        setCurrencyMessage("Base currency updated!");
        setTimeout(() => setCurrencyMessage(null), 3000);
      }
    });
  }

  function handleExport() {
    startExportTransition(async () => {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `balancevisor-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteAccount();
      if (result.error) {
        alert(result.error);
      } else {
        router.push("/auth/login");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                name="display_name"
                type="text"
                defaultValue={displayName}
                placeholder="Your name"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                disabled
                className="opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed here.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={profilePending}>
                {profilePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Name
              </Button>
              {profileMessage && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {profileMessage}
                </span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customise how the app works for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Base Currency */}
          <form onSubmit={handleCurrencySubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label>Base Currency</Label>
              <Select value={currencyValue} onValueChange={setCurrencyValue}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {supportedCurrencies.map((c) => (
                    <SelectItem key={c} value={c}>
                      {currencyLabels[c] ?? c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Changing this will update all your account currencies.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" variant="outline" disabled={currencyPending}>
                {currencyPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Currency
              </Button>
              {currencyMessage && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {currencyMessage}
                </span>
              )}
            </div>
          </form>

          {/* Theme */}
          <div className="space-y-3">
            <Label>Appearance</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === "light" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("light")}
              >
                <Sun className="mr-1.5 h-3.5 w-3.5" />
                Light
              </Button>
              <Button
                variant={theme === "dark" ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme("dark")}
              >
                <Moon className="mr-1.5 h-3.5 w-3.5" />
                Dark
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data */}
      <Card>
        <CardHeader>
          <CardTitle>Your Data</CardTitle>
          <CardDescription>Export or manage your data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport} disabled={exportPending}>
            {exportPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export All Data (JSON)
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Downloads all your accounts, transactions, budgets, goals, categories, and subscriptions.
          </p>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions — please be certain.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Delete your account?</DialogTitle>
                <DialogDescription>
                  This will permanently delete all your data including accounts,
                  transactions, budgets, goals, categories, and subscriptions.
                  This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="confirm_delete">
                  Type <strong>delete my account</strong> to confirm
                </Label>
                <Input
                  id="confirm_delete"
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="delete my account"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteConfirm !== "delete my account" || deletePending}
                  onClick={handleDelete}
                >
                  {deletePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Permanently Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <p className="mt-2 text-xs text-muted-foreground">
            This deletes all your data and signs you out.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
