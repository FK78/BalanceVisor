"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, CheckCircle2, Loader2, FolderPlus } from "lucide-react";
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
  addInvestmentGroup,
  editInvestmentGroup,
} from "@/db/mutations/investment-groups";
import { toast } from "sonner";

type InvestmentAccount = { id: string; accountName: string };

type Group = {
  id: string;
  name: string;
  color: string;
  account_id: string | null;
};

const colorOptions = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Violet" },
  { value: "#ec4899", label: "Pink" },
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#14b8a6", label: "Teal" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#64748b", label: "Slate" },
];

export function InvestmentGroupDialog({
  group,
  investmentAccounts = [],
}: {
  group?: Group;
  investmentAccounts?: InvestmentAccount[];
}) {
  const isEdit = !!group;
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
    if (isEdit) formData.set("id", group.id);
    startTransition(async () => {
      try {
        if (isEdit) {
          await editInvestmentGroup(formData);
          toast.success("Group updated");
        } else {
          await addInvestmentGroup(formData);
          toast.success("Group created");
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
          <Button variant="outline" size="sm">
            <FolderPlus className="mr-1 h-4 w-4" />
            New Group
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Group updated" : "Group created"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Group updated!" : "Group created!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit
                    ? "Your changes have been saved."
                    : "You can now assign holdings to this group."}
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
              <DialogTitle>
                {isEdit ? "Edit Group" : "Create Group / Pie"}
              </DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the group details."
                  : "Create a group or pie to organise your holdings within an investment account."}
              </DialogDescription>
            </DialogHeader>
            <form key={formKey} onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={group?.name ?? ""}
                  placeholder="e.g. Tech Stocks, Global ETFs, Pie 1"
                  required
                />
              </div>

              {investmentAccounts.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="account_id">Investment Account</Label>
                  <Select
                    name="account_id"
                    defaultValue={group?.account_id ?? "none"}
                  >
                    <SelectTrigger id="account_id">
                      <SelectValue placeholder="Select account" />
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
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((c) => (
                    <label key={c.value} className="cursor-pointer">
                      <input
                        type="radio"
                        name="color"
                        value={c.value}
                        defaultChecked={
                          group ? group.color === c.value : c.value === "#6366f1"
                        }
                        className="sr-only peer"
                      />
                      <div
                        className="h-8 w-8 rounded-full border-2 border-transparent peer-checked:border-foreground peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-offset-background transition-all"
                        style={{ backgroundColor: c.value }}
                        title={c.label}
                      />
                    </label>
                  ))}
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
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEdit ? "Save Changes" : "Create Group"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
