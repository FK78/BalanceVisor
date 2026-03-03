"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, CheckCircle2, Loader2, Sparkles } from "lucide-react";
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
import { addTransaction, editTransaction } from "@/db/mutations/transactions";
import { learnCategorisationRule } from "@/db/mutations/categorisation-rules";
import type { Account, Category } from "@/lib/types";

type Transaction = {
  id: string;
  accountName: string;
  account_id: string | null;
  type: "income" | "expense" | "transfer" | null;
  amount: number;
  category: string | null;
  category_id: string | null;
  description: string;
  date: string | null;
  is_recurring: boolean;
  transfer_account_id?: string | null;
};

export function TransactionFormDialog({
  transaction,
  accounts,
  categories,
  onSaved,
}: {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSaved?: (ids: string[]) => void;
}) {
  const isEdit = !!transaction;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [isRecurring, setIsRecurring] = useState(transaction?.is_recurring ?? false);
  const [ruleSuggestion, setRuleSuggestion] = useState<{ description: string; categoryId: string; categoryName: string } | null>(null);
  const [ruleSaved, setRuleSaved] = useState(false);
  const [isSavingRule, startSavingRule] = useTransition();

  const today = new Date().toISOString().split("T")[0];

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (savedIds.length > 0) {
        onSaved?.(savedIds);
      }
      setSavedIds([]);
      setView("form");
      setRuleSuggestion(null);
      setRuleSaved(false);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (isEdit) {
      formData.set("id", String(transaction.id));
    }

    const newCategoryId = formData.get("category_id") as string | null;
    const description = formData.get("description") as string;

    startTransition(async () => {
      const result = isEdit
        ? await editTransaction(formData)
        : await addTransaction(formData);
      setSavedIds((prev) => [...prev, result.id]);

      // Check if category changed during edit — offer to create a rule
      if (isEdit && newCategoryId && newCategoryId !== transaction.category_id && description) {
        const cat = categories.find((c) => c.id === newCategoryId);
        if (cat) {
          setRuleSuggestion({ description, categoryId: newCategoryId, categoryName: cat.name });
        }
      }

      setView("success");
    });
  }

  function handleLearnRule() {
    if (!ruleSuggestion) return;
    startSavingRule(async () => {
      await learnCategorisationRule(ruleSuggestion.description, ruleSuggestion.categoryId);
      setRuleSaved(true);
    });
  }

  function handleAddAnother() {
    setFormKey((k) => k + 1);
    setView("form");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Transaction updated" : "Transaction added"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Transaction updated!" : "Transaction added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit
                    ? "Your changes have been saved."
                    : savedIds.length === 1
                      ? "Your transaction has been recorded."
                      : `${savedIds.length} transactions added in this session.`}
                </p>
              </div>

              {ruleSuggestion && !ruleSaved && (
                <div className="w-full rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    Create a rule?
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Always categorise &ldquo;{ruleSuggestion.description}&rdquo; as <span className="font-medium text-foreground">{ruleSuggestion.categoryName}</span>?
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setRuleSuggestion(null)}>
                      No thanks
                    </Button>
                    <Button size="sm" onClick={handleLearnRule} disabled={isSavingRule}>
                      {isSavingRule && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                      Create rule
                    </Button>
                  </div>
                </div>
              )}

              {ruleSaved && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Rule created — future transactions will auto-categorise.
                </div>
              )}
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              {!isEdit && (
                <Button variant="outline" onClick={handleAddAnother}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Another
                </Button>
              )}
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the details for this transaction."
                  : "Enter the details for a new transaction."}
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              {/* Type */}
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={transaction?.type ?? "expense"}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={transaction?.description}
                  placeholder="e.g. Grocery shopping"
                  required
                />
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={transaction?.amount}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Account */}
              <div className="grid gap-2">
                <Label htmlFor="account_id">Account</Label>
                <Select name="account_id" defaultValue={transaction?.account_id != null ? String(transaction.account_id) : undefined}>
                  <SelectTrigger id="account_id">
                    <SelectValue placeholder="Select account" />
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

              {/* Category */}
              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={transaction?.category_id != null ? String(transaction.category_id) : undefined}>
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  max={today}
                  defaultValue={transaction?.date ?? today}
                  required
                />
              </div>

              {/* Recurring */}
              <div className="grid gap-2">
                <Label htmlFor="is_recurring">Recurring</Label>
                <Select
                  name="is_recurring"
                  defaultValue={String(transaction?.is_recurring ?? false)}
                  onValueChange={(v) => setIsRecurring(v === "true")}
                >
                  <SelectTrigger id="is_recurring">
                    <SelectValue placeholder="Is this recurring?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">No</SelectItem>
                    <SelectItem value="true">Yes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Recurring Pattern */}
              {isRecurring && (
                <div className="grid gap-2">
                  <Label htmlFor="recurring_pattern">Frequency</Label>
                  <Select name="recurring_pattern" defaultValue="monthly">
                    <SelectTrigger id="recurring_pattern">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Transaction"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
