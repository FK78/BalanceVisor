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
import { addGoal, editGoal } from "@/db/mutations/goals";

type Goal = {
  id: string;
  name: string;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  icon: string | null;
  color: string;
};

export function GoalFormDialog({ goal }: { goal?: Goal }) {
  const isEdit = !!goal;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

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
        await editGoal(goal.id, formData);
      } else {
        await addGoal(formData);
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
            Add Goal
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Goal updated" : "Goal created"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Goal updated!" : "Goal created!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit ? "Your goal has been updated." : "Start saving towards your new goal."}
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
              <DialogTitle>{isEdit ? "Edit Goal" : "Create a Savings Goal"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update your goal details." : "Set a target and track your progress."}
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              <div className="grid gap-2">
                <Label htmlFor="name">Goal Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="e.g. Holiday fund, Emergency fund"
                  defaultValue={goal?.name ?? ""}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target_amount">Target Amount</Label>
                  <Input
                    id="target_amount"
                    name="target_amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    defaultValue={goal?.target_amount?.toString() ?? ""}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="saved_amount">Saved So Far</Label>
                  <Input
                    id="saved_amount"
                    name="saved_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    defaultValue={goal?.saved_amount?.toString() ?? "0"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="target_date">Target Date (optional)</Label>
                  <Input
                    id="target_date"
                    name="target_date"
                    type="date"
                    defaultValue={goal?.target_date ?? ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="color">Colour</Label>
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={goal?.color ?? "#6366f1"}
                    className="h-9 w-full"
                  />
                </div>
              </div>

              <input type="hidden" name="icon" value={goal?.icon ?? ""} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Create Goal"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
