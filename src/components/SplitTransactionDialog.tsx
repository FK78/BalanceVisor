"use client";

import { useState, useTransition } from "react";
import { Plus, Minus, CheckCircle2, Loader2, Split } from "lucide-react";
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
import { addSplitTransaction } from "@/db/mutations/transactions";
import type { Account, Category } from "@/lib/types";

type SplitRow = {
  key: number;
  category_id: string;
  amount: string;
  description: string;
};

function emptyRow(key: number): SplitRow {
  return { key, category_id: "", amount: "", description: "" };
}

export function SplitTransactionDialog({
  accounts,
  categories,
  onSaved,
}: {
  accounts: Account[];
  categories: Category[];
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  const [type, setType] = useState<"expense" | "income">("expense");
  const [description, setDescription] = useState("");
  const [accountId, setAccountId] = useState("");
  const [txnDate, setTxnDate] = useState(new Date().toISOString().split("T")[0]);
  const [splits, setSplits] = useState<SplitRow[]>([emptyRow(0), emptyRow(1)]);
  const [nextKey, setNextKey] = useState(2);

  const totalAmount = splits.reduce(
    (sum, s) => sum + (parseFloat(s.amount) || 0),
    0
  );

  function addRow() {
    setSplits((prev) => [...prev, emptyRow(nextKey)]);
    setNextKey((k) => k + 1);
  }

  function removeRow(key: number) {
    setSplits((prev) => prev.filter((s) => s.key !== key));
  }

  function updateRow(key: number, field: keyof SplitRow, value: string) {
    setSplits((prev) =>
      prev.map((s) => (s.key === key ? { ...s, [field]: value } : s))
    );
  }

  function resetForm() {
    setType("expense");
    setDescription("");
    setAccountId("");
    setTxnDate(new Date().toISOString().split("T")[0]);
    setSplits([emptyRow(0), emptyRow(1)]);
    setNextKey(2);
    setFormKey((k) => k + 1);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validSplits = splits
      .filter((s) => parseFloat(s.amount) > 0)
      .map((s) => ({
        category_id: s.category_id ? parseInt(s.category_id) : null,
        amount: parseFloat(s.amount),
        description: s.description,
      }));

    if (validSplits.length < 2) return;

    startTransition(async () => {
      await addSplitTransaction(
        type,
        totalAmount,
        description,
        parseInt(accountId),
        txnDate,
        validSplits,
      );
      setView("success");
    });
  }

  function handleAddAnother() {
    resetForm();
    setView("form");
  }

  const isValid =
    description.trim() !== "" &&
    accountId !== "" &&
    txnDate !== "" &&
    splits.filter((s) => parseFloat(s.amount) > 0).length >= 2 &&
    totalAmount > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Split className="h-4 w-4" />
          Split Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Split transaction added</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Split transaction added!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {splits.filter((s) => parseFloat(s.amount) > 0).length} splits
                  totalling {totalAmount.toFixed(2)} recorded.
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" onClick={handleAddAnother}>
                <Plus className="mr-1 h-4 w-4" />
                Add Another
              </Button>
              <Button
                onClick={() => {
                  handleOpenChange(false);
                  onSaved?.();
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Split Transaction</DialogTitle>
              <DialogDescription>
                Split a transaction across multiple categories.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} key={formKey} className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as "expense" | "income")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Account</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Description</Label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Supermarket shop"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              {/* Splits */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Splits</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addRow}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Split
                  </Button>
                </div>

                {splits.map((row) => (
                  <div
                    key={row.key}
                    className="grid grid-cols-[1fr_80px_32px] gap-2 items-end rounded-xl border border-border/60 p-3"
                  >
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Category
                      </Label>
                      <Select
                        value={row.category_id}
                        onValueChange={(v) => updateRow(row.key, "category_id", v)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="h-7 text-xs"
                        placeholder="Note (optional)"
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row.key, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs text-muted-foreground">
                        Amount
                      </Label>
                      <Input
                        className="h-8 text-xs tabular-nums"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(row.key, "amount", e.target.value)
                        }
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      disabled={splits.length <= 2}
                      onClick={() => removeRow(row.key)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm">
                  <span className="font-medium">Total</span>
                  <span className="font-bold tabular-nums">
                    {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || !isValid}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Add Split Transaction
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
