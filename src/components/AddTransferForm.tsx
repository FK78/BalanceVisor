"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft, CheckCircle2, Loader2 } from "lucide-react";
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
import { addTransfer } from "@/db/mutations/transactions";
import type { Account } from "@/lib/types";
import { toast } from "sonner";

export function TransferFormDialog({
  accounts,
  onSaved,
}: {
  accounts: Account[];
  onSaved?: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [fromAccountId, setFromAccountId] = useState<string>("");
  const [toAccountId, setToAccountId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const filteredToAccounts = accounts.filter(
    (a) => String(a.id) !== fromAccountId
  );
  const filteredFromAccounts = accounts.filter(
    (a) => String(a.id) !== toAccountId
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
      setError(null);
      setFromAccountId("");
      setToAccountId("");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (fromAccountId === toAccountId) {
      setError("Source and destination accounts must be different.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await addTransfer(formData);
        onSaved?.(result.id);
        toast.success("Transfer recorded");
        setView("success");
      } catch {
        setError("Something went wrong creating the transfer. Please try again.");
        toast.error("Transfer failed");
      }
    });
  }

  function handleAddAnother() {
    setFormKey((k) => k + 1);
    setFromAccountId("");
    setToAccountId("");
    setError(null);
    setView("form");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <ArrowRightLeft className="h-4 w-4" />
          Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Transfer created</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Transfer recorded!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  The funds have been moved between your accounts.
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" onClick={handleAddAnother}>
                <ArrowRightLeft className="mr-1 h-4 w-4" />
                Another Transfer
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Transfer Between Accounts</DialogTitle>
              <DialogDescription>
                Move money from one account to another. This won&apos;t affect
                your income or expense totals.
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              {/* From Account */}
              <div className="grid gap-2">
                <Label htmlFor="from_account_id">From Account</Label>
                <Select
                  name="from_account_id"
                  value={fromAccountId}
                  onValueChange={setFromAccountId}
                >
                  <SelectTrigger id="from_account_id">
                    <SelectValue placeholder="Select source account" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredFromAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* To Account */}
              <div className="grid gap-2">
                <Label htmlFor="to_account_id">To Account</Label>
                <Select
                  name="to_account_id"
                  value={toAccountId}
                  onValueChange={setToAccountId}
                >
                  <SelectTrigger id="to_account_id">
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredToAccounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="transfer-amount">Amount</Label>
                <Input
                  id="transfer-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="transfer-description">
                  Description{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  id="transfer-description"
                  name="description"
                  placeholder="e.g. Move to savings"
                />
              </div>

              {/* Date */}
              <div className="grid gap-2">
                <Label htmlFor="transfer-date">Date</Label>
                <Input
                  id="transfer-date"
                  name="date"
                  type="date"
                  max={today}
                  defaultValue={today}
                  required
                />
              </div>

              {error && (
                <p className="text-destructive text-sm">{error}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isPending || !fromAccountId || !toAccountId
                  }
                >
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Transfer
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
