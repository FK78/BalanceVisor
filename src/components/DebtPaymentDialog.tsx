"use client";

import { useState, useTransition } from "react";
import { Banknote, CheckCircle2, Loader2 } from "lucide-react";
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
import { recordDebtPayment } from "@/db/mutations/debts";
import type { Account } from "@/lib/types";

export function DebtPaymentDialog({
  debtId,
  debtName,
  remainingAmount,
  accounts,
}: {
  debtId: number;
  debtName: string;
  remainingAmount: number;
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [accountId, setAccountId] = useState("");
  const today = new Date().toISOString().split("T")[0];

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
      setAccountId("");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount = parseFloat(formData.get("amount") as string);
    const date = formData.get("date") as string;
    const note = (formData.get("note") as string) || undefined;

    startTransition(async () => {
      await recordDebtPayment(debtId, amount, date, parseInt(accountId), note);
      setView("success");
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full">
          <Banknote className="h-4 w-4 mr-1" />
          Make Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Payment recorded</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Payment recorded!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Your payment towards &ldquo;{debtName}&rdquo; has been logged.
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
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Log a payment towards &ldquo;{debtName}&rdquo;.
                <br />
                <span className="text-xs">
                  Remaining: {remainingAmount.toFixed(2)}
                </span>
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="payment-amount">Amount</Label>
                <Input
                  id="payment-amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={remainingAmount}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-date">Date</Label>
                <Input
                  id="payment-date"
                  name="date"
                  type="date"
                  defaultValue={today}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId} required>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="payment-note">Note (optional)</Label>
                <Input
                  id="payment-note"
                  name="note"
                  placeholder="e.g. Extra payment this month"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
