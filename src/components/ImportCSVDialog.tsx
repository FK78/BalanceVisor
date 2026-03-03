"use client";

import { useState, useTransition, useCallback } from "react";
import { Upload, FileText, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { importTransactionsFromCSV } from "@/db/mutations/import-csv";
import type { Account } from "@/lib/types";
import { toast } from "sonner";

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

function parseCSVLineForPreview(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSVForPreview(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  return lines.map(parseCSVLineForPreview);
}

const UNMAPPED = "__unmapped__";

export function ImportCSVDialog({
  accounts,
  onImported,
}: {
  accounts: Account[];
  onImported?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "importing" | "result">("upload");
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<string[][]>([]);
  const [fileName, setFileName] = useState("");

  // Mapping state
  const [dateCol, setDateCol] = useState<string>(UNMAPPED);
  const [descCol, setDescCol] = useState<string>(UNMAPPED);
  const [amountCol, setAmountCol] = useState<string>(UNMAPPED);
  const [typeCol, setTypeCol] = useState<string>(UNMAPPED);
  const [accountId, setAccountId] = useState<string>("");
  const [defaultType, setDefaultType] = useState<"auto" | "income" | "expense">("auto");

  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function resetState() {
    setStep("upload");
    setCsvText("");
    setHeaders([]);
    setPreviewRows([]);
    setFileName("");
    setDateCol(UNMAPPED);
    setDescCol(UNMAPPED);
    setAmountCol(UNMAPPED);
    setTypeCol(UNMAPPED);
    setAccountId("");
    setDefaultType("auto");
    setResult(null);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      if (result && result.imported > 0) {
        onImported?.();
      }
      resetState();
    }
    setOpen(nextOpen);
  }

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      const allRows = parseCSVForPreview(text);
      if (allRows.length >= 1) {
        setHeaders(allRows[0]);
        setPreviewRows(allRows.slice(1, 6)); // Show up to 5 preview rows

        // Auto-detect column mappings by header name
        allRows[0].forEach((h, i) => {
          const lower = h.toLowerCase();
          if (lower.includes("date") || lower.includes("time")) {
            setDateCol(String(i));
          } else if (
            lower.includes("desc") ||
            lower.includes("narration") ||
            lower.includes("memo") ||
            lower.includes("reference") ||
            lower.includes("detail") ||
            lower.includes("particular")
          ) {
            setDescCol(String(i));
          } else if (
            lower.includes("amount") ||
            lower.includes("value") ||
            lower.includes("sum") ||
            lower.includes("debit") ||
            lower.includes("credit")
          ) {
            if (amountCol === UNMAPPED || lower.includes("amount")) {
              setAmountCol(String(i));
            }
          } else if (lower.includes("type") || lower.includes("direction")) {
            setTypeCol(String(i));
          }
        });

        setStep("map");
      }
    };
    reader.readAsText(file);
  }, [amountCol]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (!file || !file.name.endsWith(".csv")) return;

      // Simulate the same flow as file select
      const input = document.createElement("input");
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      handleFileSelect({ target: input } as unknown as React.ChangeEvent<HTMLInputElement>);
    },
    [handleFileSelect]
  );

  function canImport() {
    return (
      dateCol !== UNMAPPED &&
      descCol !== UNMAPPED &&
      amountCol !== UNMAPPED &&
      accountId !== ""
    );
  }

  function handleImport() {
    if (!canImport()) return;

    startTransition(async () => {
      setStep("importing");
      try {
        const res = await importTransactionsFromCSV(
          csvText,
          {
            date: parseInt(dateCol),
            description: parseInt(descCol),
            amount: parseInt(amountCol),
            type: typeCol !== UNMAPPED ? parseInt(typeCol) : null,
          },
          accountId,
          defaultType
        );
        setResult(res);
        setStep("result");
        if (res.imported > 0) {
          toast.success(`Imported ${res.imported} transaction${res.imported !== 1 ? "s" : ""}`);
        }
        if (res.errors.length > 0) {
          toast.error(`${res.errors.length} error${res.errors.length !== 1 ? "s" : ""} during import`);
        }
      } catch (err) {
        setResult({
          imported: 0,
          skipped: 0,
          errors: [err instanceof Error ? err.message : "An unexpected error occurred."],
        });
        setStep("result");
        toast.error("Import failed");
      }
    });
  }

  const columnOptions = headers.map((h, i) => ({ label: h || `Column ${i + 1}`, value: String(i) }));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Upload className="h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {step === "upload" && (
          <>
            <DialogHeader>
              <DialogTitle>Import Transactions from CSV</DialogTitle>
              <DialogDescription>
                Upload a CSV file from your bank to import transactions in bulk.
              </DialogDescription>
            </DialogHeader>
            <div
              className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-muted-foreground/25 p-12 transition-colors hover:border-muted-foreground/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <div className="text-center">
                <p className="text-sm font-medium">Drag & drop your CSV file here</p>
                <p className="text-muted-foreground text-xs mt-1">or click below to browse</p>
              </div>
              <label>
                <input
                  type="file"
                  accept=".csv"
                  className="sr-only"
                  onChange={handleFileSelect}
                />
                <Button variant="outline" size="sm" asChild>
                  <span>Choose File</span>
                </Button>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "map" && (
          <>
            <DialogHeader>
              <DialogTitle>Map CSV Columns</DialogTitle>
              <DialogDescription>
                {fileName && (
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {fileName}
                  </span>
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div className="rounded-md border overflow-x-auto max-h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((h, i) => (
                        <TableHead key={i} className="text-xs whitespace-nowrap">
                          {h || `Col ${i + 1}`}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, ri) => (
                      <TableRow key={ri}>
                        {headers.map((_, ci) => (
                          <TableCell key={ci} className="text-xs whitespace-nowrap py-1.5">
                            {row[ci] ?? ""}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Column mapping */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Date Column *</Label>
                <Select value={dateCol} onValueChange={setDateCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Description Column *</Label>
                <Select value={descCol} onValueChange={setDescCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Amount Column *</Label>
                <Select value={amountCol} onValueChange={setAmountCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Type Column (optional)</Label>
                <Select value={typeCol} onValueChange={setTypeCol}>
                  <SelectTrigger>
                    <SelectValue placeholder="None — use amount sign" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNMAPPED}>None — use amount sign</SelectItem>
                    {columnOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Import to Account *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {typeCol === UNMAPPED && (
                <div className="grid gap-2">
                  <Label>Transaction Type</Label>
                  <Select
                    value={defaultType}
                    onValueChange={(v) => setDefaultType(v as "auto" | "income" | "expense")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto (positive = income, negative = expense)</SelectItem>
                      <SelectItem value="expense">All Expenses</SelectItem>
                      <SelectItem value="income">All Income</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="flex gap-2">
              <Button variant="outline" onClick={() => { resetState(); }}>
                <X className="mr-1 h-4 w-4" />
                Start Over
              </Button>
              <Button onClick={handleImport} disabled={!canImport() || isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Import Transactions
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "importing" && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Importing...</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Importing transactions...</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  This may take a moment for large files.
                </p>
              </div>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Import Complete</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              {result.imported > 0 ? (
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-12 w-12 text-amber-500" />
              )}
              <div className="text-center">
                <h3 className="text-lg font-semibold">
                  {result.imported > 0 ? "Import Complete!" : "No Transactions Imported"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {result.imported} transaction{result.imported !== 1 ? "s" : ""} imported
                  {result.skipped > 0 && `, ${result.skipped} skipped`}.
                </p>
              </div>

              {result.errors.length > 0 && (
                <div className="w-full rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-3 max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                    Issues ({result.errors.length}):
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter className="sm:justify-center">
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
