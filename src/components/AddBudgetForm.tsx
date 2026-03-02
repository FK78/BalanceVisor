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
import { addBudget, editBudget } from "@/db/mutations/budgets";

type Category = {
  id: string;
  name: string;
  color: string;
};

type Budget = {
  id: string;
  budgetCategory: string;
  budgetColor: string;
  budgetAmount: number;
  budgetSpent: number;
  budgetPeriod: string | null;
  category_id: string | null;
  start_date: string | null;
};

export function BudgetFormDialog({ categories, budget }: { categories: Category[]; budget?: Budget }) {
  const isEdit = !!budget;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      if (isEdit) {
        await editBudget(budget.id, formData);
      } else {
        await addBudget(formData);
      }
      setView("success");
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
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Budget
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Budget updated" : "Budget added"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Budget updated!" : "Budget added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit ? "Your budget has been updated." : "Your new budget has been created."}
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
              <DialogTitle>{isEdit ? "Edit Budget" : "Add Budget"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update the budget details." : "Set a spending limit for a category."}
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              {/* Category */}
              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select name="category_id" defaultValue={budget ? String(budget.category_id) : undefined} required>
                  <SelectTrigger id="category_id">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: c.color }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="grid gap-2">
                <Label htmlFor="amount">Budget Amount</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue={budget?.budgetAmount?.toString() ?? ""}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Period */}
              <div className="grid gap-2">
                <Label htmlFor="period">Period</Label>
                <Select name="period" defaultValue={budget?.budgetPeriod ?? "monthly"}>
                  <SelectTrigger id="period">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Start Date */}
              <div className="grid gap-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={budget?.start_date ?? today}
                  required
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Budget"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
