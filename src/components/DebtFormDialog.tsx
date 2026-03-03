"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addDebt, editDebt } from "@/db/mutations/debts";
import { toast } from "sonner";

type Debt = {
  id: string;
  name: string;
  original_amount: number;
  remaining_amount: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: string | null;
  lender: string | null;
  color: string;
};

export function DebtFormDialog({ debt }: { debt?: Debt }) {
  const isEdit = !!debt;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setView("form");
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        if (isEdit) {
          await editDebt(debt.id, formData);
          toast.success("Debt updated");
        } else {
          await addDebt(formData);
          toast.success("Debt added");
        }
        setView("success");
      } catch {
        toast.error("Something went wrong. Please try again.");
      }
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
            Add Debt
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{isEdit ? "Debt updated" : "Debt added"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Debt updated!" : "Debt added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit
                    ? "Your changes have been saved."
                    : "Your debt has been added to the tracker."}
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
              <DialogTitle>{isEdit ? "Edit Debt" : "Add Debt"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the details for this debt."
                  : "Track a new debt to monitor your payoff progress."}
              </DialogDescription>
            </DialogHeader>
            <form key={formKey} onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={debt?.name}
                  placeholder="e.g. Student Loan"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="original_amount">Original Amount</Label>
                  <Input
                    id="original_amount"
                    name="original_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    defaultValue={debt?.original_amount}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="remaining_amount">Remaining</Label>
                  <Input
                    id="remaining_amount"
                    name="remaining_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={debt?.remaining_amount}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="interest_rate">Interest Rate (%)</Label>
                  <Input
                    id="interest_rate"
                    name="interest_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={debt?.interest_rate ?? 0}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="minimum_payment">Min. Payment</Label>
                  <Input
                    id="minimum_payment"
                    name="minimum_payment"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue={debt?.minimum_payment ?? 0}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lender">Lender</Label>
                  <Input
                    id="lender"
                    name="lender"
                    defaultValue={debt?.lender ?? ""}
                    placeholder="e.g. Barclays"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Target Payoff Date</Label>
                  <Input
                    id="due_date"
                    name="due_date"
                    type="date"
                    defaultValue={debt?.due_date ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="color">Colour</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={debt?.color ?? "#ef4444"}
                    className="h-10 w-14 p-1"
                  />
                  <span className="text-xs text-muted-foreground">
                    Pick a colour for this debt card
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Debt"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
