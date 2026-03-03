"use client";

import { useState, useTransition } from "react";
import { Link2, Unlink, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
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
import { connectTrading212, disconnectTrading212 } from "@/db/mutations/investments";
import { toast } from "sonner";

type InvestmentAccount = { id: string; accountName: string };

export function ConnectTrading212Dialog({
  isConnected,
  investmentAccounts = [],
  currentAccountId,
}: {
  isConnected: boolean;
  investmentAccounts?: InvestmentAccount[];
  currentAccountId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setView("form");
    setOpen(nextOpen);
  }

  function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await connectTrading212(formData);
        toast.success("Trading 212 connected");
        setView("success");
      } catch {
        toast.error("Failed to connect Trading 212");
      }
    });
  }

  function handleDisconnect() {
    startTransition(async () => {
      await disconnectTrading212();
      toast.success("Trading 212 disconnected");
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isConnected ? (
          <Button variant="outline" size="sm">
            <Unlink className="mr-1 h-4 w-4" />
            Manage T212
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Link2 className="mr-1 h-4 w-4" />
            Connect Trading 212
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {isConnected && view === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>Trading 212 Connected</DialogTitle>
              <DialogDescription>
                Your Trading 212 account is connected and syncing positions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You can reconnect with a new API key or disconnect entirely.
              </p>
              <form onSubmit={handleConnect} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="apiKey">New API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    type="password"
                    placeholder="Paste new API key to reconnect"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="apiSecret">New API Secret</Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    placeholder="Paste new API secret to reconnect"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="environment">Environment</Label>
                  <Select name="environment" defaultValue="live">
                    <SelectTrigger id="environment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="demo">Demo (Paper Trading)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {investmentAccounts.length > 0 && (
                  <div className="grid gap-2">
                    <Label htmlFor="account_id">Link to Account</Label>
                    <Select name="account_id" defaultValue={currentAccountId ?? "none"}>
                      <SelectTrigger id="account_id">
                        <SelectValue placeholder="Select account (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No account</SelectItem>
                        {investmentAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.accountName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Link to an investment account to track holdings together.
                    </p>
                  </div>
                )}
                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Disconnect
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Reconnect
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </>
        ) : view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Connected</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Trading 212 Connected!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Your positions will now appear on this page.
                </p>
              </div>
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Connect Trading 212</DialogTitle>
              <DialogDescription>
                Enter your Trading 212 API key to sync your investment positions
                automatically.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleConnect} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  name="apiKey"
                  type="password"
                  placeholder="Paste your Trading 212 API key"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apiSecret">API Secret</Label>
                <Input
                  id="apiSecret"
                  name="apiSecret"
                  type="password"
                  placeholder="Paste your Trading 212 API secret"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Generate your API key and secret from{" "}
                  <a
                    href="https://app.trading212.com/settings/api"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 underline underline-offset-2"
                  >
                    Trading 212 Settings
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="environment">Environment</Label>
                <Select name="environment" defaultValue="live">
                  <SelectTrigger id="environment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">Live</SelectItem>
                    <SelectItem value="demo">Demo (Paper Trading)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {investmentAccounts.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="account_id">Link to Account</Label>
                  <Select name="account_id" defaultValue="none">
                    <SelectTrigger id="account_id">
                      <SelectValue placeholder="Select account (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No account</SelectItem>
                      {investmentAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Link to an investment account to track holdings together.
                  </p>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Connect
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
