"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_ICONS } from "@/lib/categoryIcons";

type AddCategoryAction = (formData: FormData) => void | Promise<void>;

export function OnboardingCategoryForm({ action }: { action: AddCategoryAction }) {
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState("");

  const filteredIcons = useMemo(() => {
    const entries = Object.entries(CATEGORY_ICONS);
    if (!iconSearch) return entries;
    return entries.filter(([name]) => name.includes(iconSearch.toLowerCase()));
  }, [iconSearch]);

  return (
    <form action={action} className="grid gap-4 rounded-md border p-4">
      <input type="hidden" name="color" value={selectedColor} />
      <input type="hidden" name="icon" value={selectedIcon ?? ""} />

      <div className="grid gap-2">
        <Label htmlFor="category-name">Name</Label>
        <Input id="category-name" name="name" placeholder="Subscriptions" required />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="category-color-wheel">Color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="category-color-wheel"
            type="color"
            value={selectedColor}
            onChange={(event) => setSelectedColor(event.target.value)}
            className="h-10 w-14 cursor-pointer p-1"
          />
          <Input
            aria-label="Selected color hex"
            value={selectedColor}
            onChange={(event) => setSelectedColor(event.target.value)}
            className="font-mono"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label>Icon</Label>
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
          <Input
            placeholder="Search icons..."
            value={iconSearch}
            onChange={(event) => setIconSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid max-h-36 grid-cols-8 gap-1.5 overflow-y-auto rounded-md border p-2">
          {filteredIcons.map(([name, Icon]) => (
            <button
              key={name}
              type="button"
              title={name}
              className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
                selectedIcon === name
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              onClick={() => setSelectedIcon(selectedIcon === name ? null : name)}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
          {filteredIcons.length === 0 && (
            <p className="text-muted-foreground col-span-8 py-2 text-center text-xs">No icons found</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-fit">
        Add category
      </Button>
    </form>
  );
}
