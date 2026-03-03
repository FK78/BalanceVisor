"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { Plus, CheckCircle2, Loader2, Search, Pencil } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addManualHolding, editManualHolding } from "@/db/mutations/investments";
import { searchTickers } from "@/db/queries/investments";
import { toast } from "sonner";

type InvestmentAccount = { id: string; accountName: string };
type InvestmentGroupOption = { id: string; name: string; color: string; account_id: string | null };

type Holding = {
  id: string;
  ticker: string;
  name: string;
  quantity: number;
  average_price: number;
  account_id?: string | null;
  group_id?: string | null;
};

type SearchResult = {
  ticker: string;
  name: string;
  exchange?: string;
};

export function AddHoldingDialog({
  holding,
  investmentAccounts = [],
  groups = [],
}: {
  holding?: Holding;
  investmentAccounts?: InvestmentAccount[];
  groups?: InvestmentGroupOption[];
}) {
  const isEdit = !!holding;
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTicker, setSelectedTicker] = useState(holding?.ticker ?? "");
  const [selectedName, setSelectedName] = useState(holding?.name ?? "");
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (searchQuery.length < 1) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await searchTickers(searchQuery);
        setSearchResults(Array.isArray(data) ? data : []);
        setShowDropdown(Array.isArray(data) && data.length > 0);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView("form");
      setSearchQuery("");
      setSearchResults([]);
      setShowDropdown(false);
      if (!isEdit) {
        setSelectedTicker("");
        setSelectedName("");
      }
    }
    setOpen(nextOpen);
  }

  function handleSelectTicker(result: SearchResult) {
    setSelectedTicker(result.ticker);
    setSelectedName(result.name);
    setSearchQuery(result.ticker);
    setShowDropdown(false);
  }
  
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("ticker", selectedTicker);
    formData.set("name", selectedName);
    startTransition(async () => {
      try {
        if (isEdit) {
          await editManualHolding(holding.id, formData);
          toast.success("Holding updated");
        } else {
          await addManualHolding(formData);
          toast.success("Holding added");
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
    setSelectedTicker("");
    setSelectedName("");
    setSearchQuery("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add Holding
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>{isEdit ? "Holding updated" : "Holding added"}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {isEdit ? "Holding updated!" : "Holding added!"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {selectedTicker} has been {isEdit ? "updated" : "added to your portfolio"}.
                  Prices will be tracked automatically via Yahoo Finance.
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
              <DialogTitle>{isEdit ? "Edit Holding" : "Add Holding"}</DialogTitle>
              <DialogDescription>
                {isEdit
                  ? "Update the holding details."
                  : "Search for a stock or ETF and enter your holding details. Prices update automatically via Yahoo Finance."}
              </DialogDescription>
            </DialogHeader>
            <form key={formKey} onSubmit={handleSubmit} className="grid gap-4">
              {/* Ticker search */}
              <div className="grid gap-2">
                <Label htmlFor="ticker-search">Ticker</Label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="ticker-search"
                      placeholder="Search e.g. AAPL, VUSA..."
                      className="pl-8"
                      value={isEdit ? selectedTicker : searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (!isEdit) {
                          setSelectedTicker("");
                          setSelectedName("");
                        }
                      }}
                      disabled={isEdit}
                      autoComplete="off"
                    />
                    {isSearching && (
                      <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                  {showDropdown && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
                      {searchResults.map((r) => (
                        <button
                          key={r.ticker}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-accent"
                          onClick={() => handleSelectTicker(r)}
                        >
                          <span className="font-medium">{r.ticker}</span>
                          <span className="text-muted-foreground text-xs truncate ml-2 max-w-[200px]">
                            {r.name}
                            {r.exchange && ` · ${r.exchange}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTicker && !isEdit && (
                  <p className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium">{selectedTicker}</span> — {selectedName}
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div className="grid gap-2">
                <Label htmlFor="quantity">Shares / Units</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  step="any"
                  min="0"
                  defaultValue={holding?.quantity?.toString() ?? ""}
                  placeholder="e.g. 10.5"
                  required
                />
              </div>

              {/* Average price */}
              <div className="grid gap-2">
                <Label htmlFor="averagePrice">Average Price Paid</Label>
                <Input
                  id="averagePrice"
                  name="averagePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={holding?.average_price?.toString() ?? ""}
                  placeholder="0.00"
                  required
                />
              </div>

              {investmentAccounts.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="account_id">Account</Label>
                  <Select name="account_id" defaultValue={holding?.account_id ?? "none"}>
                    <SelectTrigger id="account_id">
                      <SelectValue placeholder="Select account (optional)" />
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

              {groups.length > 0 && (
                <div className="grid gap-2">
                  <Label htmlFor="group_id">Group / Pie</Label>
                  <Select name="group_id" defaultValue={holding?.group_id ?? "none"}>
                    <SelectTrigger id="group_id">
                      <SelectValue placeholder="Select group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ungrouped</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center gap-2">
                            <span
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: g.color }}
                            />
                            {g.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <input type="hidden" name="ticker" value={selectedTicker} />
              <input type="hidden" name="name" value={selectedName} />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending || (!isEdit && !selectedTicker)}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEdit ? "Save Changes" : "Add Holding"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
