"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Tag,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { addTransaction } from "@/db/mutations/transactions";

type ParsedTransaction = {
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
  account_id: string | null;
  category_id: string | null;
  account_name: string | null;
  category_name: string | null;
};

export function QuickAddTransaction({
  onSaved,
}: {
  onSaved?: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<ParsedTransaction | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();
  const [view, setView] = useState<"input" | "preview" | "success">("input");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && view === "input") {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, view]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (savedIds.length > 0) {
        onSaved?.(savedIds);
      }
      // Reset state
      setInput("");
      setParsed(null);
      setParseError(null);
      setView("input");
      setSavedIds([]);
    }
    setOpen(nextOpen);
  }

  async function handleParse() {
    const text = input.trim();
    if (!text) return;

    setIsParsing(true);
    setParseError(null);

    try {
      const res = await fetch("/api/parse-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        throw new Error("Failed to parse transaction");
      }

      const data: ParsedTransaction = await res.json();
      setParsed(data);
      setView("preview");
    } catch {
      setParseError("Could not understand that. Try something like: \"Spent £45 at Tesco yesterday on groceries\"");
    } finally {
      setIsParsing(false);
    }
  }

  function handleConfirm() {
    if (!parsed) return;

    const formData = new FormData();
    formData.set("type", parsed.type);
    formData.set("amount", String(parsed.amount));
    formData.set("description", parsed.description);
    formData.set("date", parsed.date);
    if (parsed.account_id) formData.set("account_id", parsed.account_id);
    if (parsed.category_id) formData.set("category_id", parsed.category_id);
    formData.set("is_recurring", "false");

    startSaving(async () => {
      try {
        const result = await addTransaction(formData);
        setSavedIds((prev) => [...prev, result.id]);
        setView("success");
      } catch {
        setParseError("Failed to save the transaction. Please try again.");
        setView("input");
      }
    });
  }

  function handleAddAnother() {
    setInput("");
    setParsed(null);
    setParseError(null);
    setView("input");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Quick Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Transaction added</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Transaction added!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {savedIds.length === 1
                    ? "Your transaction has been recorded."
                    : `${savedIds.length} transactions added in this session.`}
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" onClick={handleAddAnother}>
                <Sparkles className="mr-1 h-4 w-4" />
                Add Another
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : view === "preview" && parsed ? (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Transaction</DialogTitle>
              <DialogDescription>
                Here&apos;s what I understood. Confirm or go back to edit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              {/* Type + Amount */}
              <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
                <div className="flex items-center gap-2.5">
                  {parsed.type === "income" ? (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                      <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                    </div>
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                      <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium">{parsed.description}</p>
                    <Badge variant="secondary" className="mt-0.5 text-[10px]">
                      {parsed.type}
                    </Badge>
                  </div>
                </div>
                <p className={`text-lg font-bold tabular-nums ${parsed.type === "income" ? "text-emerald-600" : "text-red-600"}`}>
                  {parsed.type === "income" ? "+" : "-"}£{parsed.amount.toFixed(2)}
                </p>
              </div>

              {/* Details */}
              <div className="grid gap-2 text-sm">
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Date:</span>
                  <span className="font-medium">{parsed.date}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Wallet className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Account:</span>
                  <span className="font-medium">
                    {parsed.account_name ?? <span className="text-amber-500 italic">Not matched</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Category:</span>
                  <span className="font-medium">
                    {parsed.category_name ?? <span className="text-amber-500 italic">Auto-detect</span>}
                  </span>
                </div>
              </div>

              {!parsed.account_id && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>Could not match an account. Please make sure you mention which account to use, or edit after saving.</span>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setView("input")}>
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isSaving || !parsed.account_id}
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm & Save
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Quick Add with AI
              </DialogTitle>
              <DialogDescription>
                Describe a transaction in plain English and I&apos;ll parse it for you.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleParse();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='e.g. "Spent £45 at Tesco yesterday on groceries from Monzo"'
                  disabled={isParsing}
                />
                {parseError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    {parseError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] text-muted-foreground font-medium">Try something like:</p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Paid £120 for electricity from Monzo",
                    "Got paid £3200 salary today",
                    "£42 Nando's dinner on Amex yesterday",
                    "Spotify £10.99 subscription",
                  ].map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="text-[11px] rounded-lg border border-border/60 px-2 py-1 hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setInput(example);
                        setParseError(null);
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={isParsing || !input.trim()}
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Parsing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-1 h-4 w-4" />
                      Parse
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
