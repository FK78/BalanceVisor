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
import {
  addCategorisationRule,
  editCategorisationRule,
} from "@/db/mutations/categorisation-rules";
import type { CategoryWithColor as Category } from "@/lib/types";

type Rule = {
  id: number;
  pattern: string;
  category_id: number | null;
  priority: number;
};

export function CategorisationRuleFormDialog({
  categories,
  rule,
}: {
  categories: Category[];
  rule?: Rule;
}) {
  const isEdit = !!rule;
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
      if (isEdit) {
        await editCategorisationRule(rule.id, formData);
      } else {
        await addCategorisationRule(formData);
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
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Add Rule
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{isEdit ? "Rule updated" : "Rule added"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Rule updated!" : "Rule added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit
                    ? "Your categorisation rule has been updated."
                    : "New transactions matching this pattern will be auto-categorised."}
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
              <DialogTitle>{isEdit ? "Edit Rule" : "Add Categorisation Rule"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the pattern or category for this rule."
                  : "Transactions whose description contains this pattern will be auto-assigned to the selected category."}
              </DialogDescription>
            </DialogHeader>
            <form key={formKey} onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pattern">Pattern</Label>
                <Input
                  id="pattern"
                  name="pattern"
                  defaultValue={rule?.pattern}
                  placeholder="e.g. Netflix, Tesco, Uber"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Case-insensitive substring match against transaction descriptions.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  name="category_id"
                  defaultValue={rule?.category_id ? String(rule.category_id) : undefined}
                  required
                >
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

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  name="priority"
                  type="number"
                  min="0"
                  defaultValue={rule?.priority ?? 0}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Higher priority rules are checked first. Use this to resolve conflicts.
                </p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Rule"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
