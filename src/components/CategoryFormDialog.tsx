"use client";

import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil, CheckCircle2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { addCategory, editCategory } from "@/db/mutations/categories";

type Category = {
  id: string;
  name: string;
  color: string;
  icon: string | null;
};

const PRESET_COLORS = [
  "#4CAF50", "#F44336", "#2196F3", "#FF9800",
  "#9C27B0", "#607D8B", "#E91E63", "#00BCD4",
  "#795548", "#CDDC39",
];

export function CategoryFormDialog({ category }: { category?: Category }) {
  const isEdit = !!category;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);
  const [selectedColor, setSelectedColor] = useState(category?.color ?? PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(category?.icon ?? null);
  const [iconSearch, setIconSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const entries = Object.entries(CATEGORY_ICONS);
    if (!iconSearch) return entries;
    return entries.filter(([name]) => name.includes(iconSearch.toLowerCase()));
  }, [iconSearch]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
      if (!isEdit) {
        setSelectedColor(PRESET_COLORS[0]);
        setSelectedIcon(null);
        setIconSearch("");
      }
    }
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("color", selectedColor);
    formData.set("icon", selectedIcon ?? "");
    startTransition(async () => {
      if (isEdit) {
        await editCategory(category.id, formData);
      } else {
        await addCategory(formData);
      }
      setView("success");
    });
  }

  function handleAddAnother() {
    setFormKey((k) => k + 1);
    setSelectedColor(PRESET_COLORS[0]);
    setSelectedIcon(null);
    setIconSearch("");
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
            Add Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>
                {isEdit ? "Category updated" : "Category added"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Category updated!" : "Category added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {isEdit ? "Your category has been updated." : "Your new category has been created."}
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
              <DialogTitle>{isEdit ? "Edit Category" : "Add Category"}</DialogTitle>
              <DialogDescription>
                {isEdit ? "Update the category details." : "Create a new spending category."}
              </DialogDescription>
            </DialogHeader>
            <form
              key={formKey}
              onSubmit={handleSubmit}
              className="grid gap-4"
            >
              {/* Name */}
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Subscriptions"
                  defaultValue={category?.name ?? ""}
                  required
                />
              </div>

              {/* Color */}
              <div className="grid gap-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        selectedColor === color
                          ? "border-foreground scale-110"
                          : "border-transparent hover:border-muted-foreground/50"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setSelectedColor(color)}
                    />
                  ))}
                </div>
              </div>

              {/* Icon */}
              <div className="grid gap-2">
                <Label>Icon</Label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search icons..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="grid grid-cols-8 gap-1.5 max-h-36 overflow-y-auto rounded-md border p-2">
                  {filteredIcons.map(([name, Icon]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                        selectedIcon === name
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setSelectedIcon(selectedIcon === name ? null : name)}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  ))}
                  {filteredIcons.length === 0 && (
                    <p className="col-span-8 text-center text-xs text-muted-foreground py-2">No icons found</p>
                  )}
                </div>
                {selectedIcon && (
                  <p className="text-xs text-muted-foreground">Selected: {selectedIcon}</p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Category"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
