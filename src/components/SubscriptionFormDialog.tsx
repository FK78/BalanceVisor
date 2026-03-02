"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, CheckCircle2, Loader2 } from "lucide-react";
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
import { addSubscription, editSubscription } from "@/db/mutations/subscriptions";
import type { Account, CategoryWithColor as Category } from "@/lib/types";

type SubscriptionData = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  billing_cycle: string;
  next_billing_date: string | null;
  category_id: string | null;
  account_id: string | null;
  url: string | null;
  notes: string | null;
  color: string;
  icon: string | null;
};

export function SubscriptionFormDialog({
  subscription,
  categories,
  accounts,
}: {
  subscription?: SubscriptionData;
  categories: Category[];
  accounts: Account[];
}) {
  const isEdit = !!subscription;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [billingCycle, setBillingCycle] = useState(subscription?.billing_cycle ?? "monthly");
  const [categoryId, setCategoryId] = useState(subscription?.category_id?.toString() ?? "");
  const [accountId, setAccountId] = useState(subscription?.account_id?.toString() ?? "");

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("billing_cycle", billingCycle);
    if (categoryId && categoryId !== "none") {
      formData.set("category_id", categoryId);
    } else {
      formData.delete("category_id");
    }
    formData.set("account_id", accountId);
    startTransition(async () => {
      if (isEdit) {
        await editSubscription(subscription.id, formData);
      } else {
        await addSubscription(formData);
      }
      setView("success");
    });
  }

  function handleAddAnother() {
    setFormKey((k) => k + 1);
    setBillingCycle("monthly");
    setCategoryId("");
    setAccountId("");
    setView("form");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Subscription
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Subscription updated" : "Subscription added"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Subscription updated!" : "Subscription added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit ? "Your subscription has been updated." : "Your subscription is now being tracked."}
                </p>
              </div>
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
              <DialogTitle>{isEdit ? "Edit Subscription" : "Add Subscription"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update your subscription details." : "Track a recurring subscription."}
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Netflix, Spotify, iCloud"
                  defaultValue={subscription?.name ?? ""}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    defaultValue={subscription?.amount?.toString() ?? ""}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Billing Cycle</Label>
                  <Select value={billingCycle} onValueChange={setBillingCycle}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="next_billing_date">Next Billing Date</Label>
                  <Input
                    id="next_billing_date"
                    name="next_billing_date"
                    type="date"
                    defaultValue={subscription?.next_billing_date ?? new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Category (optional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            {cat.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
                <Label htmlFor="url">Website URL (optional)</Label>
                <Input
                  id="url"
                  name="url"
                  type="url"
                  placeholder="https://..."
                  defaultValue={subscription?.url ?? ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  type="text"
                  placeholder="Any extra details..."
                  defaultValue={subscription?.notes ?? ""}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">Colour</Label>
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue={subscription?.color ?? "#6366f1"}
                  className="h-9 w-full"
                />
              </div>

              <input type="hidden" name="icon" value={subscription?.icon ?? ""} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Subscription"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
