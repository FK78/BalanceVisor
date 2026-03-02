"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Loader2,
  Pencil,
  Repeat,
  XCircle,
} from "lucide-react";
import { cancelRecurring, updateRecurringPattern } from "@/db/mutations/recurring";
import { formatCurrency } from "@/lib/formatCurrency";
import type { RecurringTransaction } from "@/db/queries/recurring";

const patternLabels: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  monthly: "Monthly",
  yearly: "Yearly",
};

type Props = {
  recurring: RecurringTransaction[];
  currency: string;
};

function CancelRecurringButton({
  transaction,
}: {
  transaction: RecurringTransaction;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop recurring transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            This will stop &ldquo;{transaction.description}&rdquo; from
            generating future transactions. The existing transaction record will
            be kept.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await cancelRecurring(transaction.id);
              });
            }}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Stop Recurring
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EditRecurringDialog({
  transaction,
}: {
  transaction: RecurringTransaction;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("id", transaction.id);
    startTransition(async () => {
      await updateRecurringPattern(formData);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Schedule</DialogTitle>
          <DialogDescription>
            Update the frequency or next occurrence date for &ldquo;
            {transaction.description}&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="recurring_pattern">Frequency</Label>
            <Select
              name="recurring_pattern"
              defaultValue={transaction.recurring_pattern ?? "monthly"}
            >
              <SelectTrigger id="recurring_pattern">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Every 2 weeks</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="next_recurring_date">Next Occurrence</Label>
            <Input
              id="next_recurring_date"
              name="next_recurring_date"
              type="date"
              defaultValue={transaction.next_recurring_date ?? ""}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RecurringClient({
  recurring,
  currency,
}: Props) {
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = recurring.filter((r) => {
    if (filter === "all") return true;
    return r.type === filter;
  });

  const today = new Date().toISOString().split("T")[0];

  if (recurring.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Repeat className="h-10 w-10 text-muted-foreground opacity-40" />
          <p className="text-sm font-medium">No recurring transactions</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Mark a transaction as recurring when adding it, and it will appear
            here for easy management.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {(["all", "income", "expense"] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${recurring.length})`
              : f === "income"
              ? `Income (${recurring.filter((r) => r.type === "income").length})`
              : `Expenses (${recurring.filter((r) => r.type === "expense").length})`}
          </Button>
        ))}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>
            {filter === "all"
              ? "All Recurring Transactions"
              : filter === "income"
              ? "Recurring Income"
              : "Recurring Expenses"}
          </CardTitle>
          <CardDescription>
            {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => {
                const isOverdue =
                  r.next_recurring_date && r.next_recurring_date < today;
                const isDueSoon =
                  r.next_recurring_date &&
                  r.next_recurring_date >= today &&
                  (() => {
                    const next7 = new Date();
                    next7.setDate(next7.getDate() + 7);
                    return r.next_recurring_date! <= next7.toISOString().split("T")[0];
                  })();
                return (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                            r.type === "income"
                              ? "bg-emerald-100 dark:bg-emerald-900/30"
                              : "bg-red-100 dark:bg-red-900/30"
                          }`}
                        >
                          {r.type === "income" ? (
                            <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5 text-red-600" />
                          )}
                        </div>
                        <span className="font-medium">{r.description}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.accountName}
                    </TableCell>
                    <TableCell>
                      {r.category ? (
                        <span className="flex items-center gap-1.5 text-sm">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{
                              backgroundColor: r.categoryColor ?? undefined,
                            }}
                          />
                          {r.category}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {patternLabels[r.recurring_pattern ?? ""] ??
                          r.recurring_pattern}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <CalendarClock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm tabular-nums">
                          {r.next_recurring_date
                            ? new Date(
                                r.next_recurring_date + "T00:00:00"
                              ).toLocaleDateString("en-GB", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                        {isOverdue && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] ml-1"
                          >
                            Overdue
                          </Badge>
                        )}
                        {isDueSoon && !isOverdue && (
                          <Badge
                            variant="outline"
                            className="text-[10px] ml-1 border-sky-300 text-sky-600"
                          >
                            Due soon
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`font-semibold tabular-nums ${
                          r.type === "income"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {r.type === "income" ? "+" : "−"}
                        {formatCurrency(r.amount, currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5 justify-end">
                        <EditRecurringDialog transaction={r} />
                        <CancelRecurringButton transaction={r} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {filtered.map((r) => {
          const isOverdue =
            r.next_recurring_date && r.next_recurring_date < today;
          return (
            <Card key={r.id} className="relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-1 w-full"
                style={{
                  backgroundColor:
                    r.type === "income" ? "#10b981" : "#ef4444",
                }}
              />
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        r.type === "income"
                          ? "bg-emerald-100 dark:bg-emerald-900/30"
                          : "bg-red-100 dark:bg-red-900/30"
                      }`}
                    >
                      {r.type === "income" ? (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {r.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.accountName}
                        {r.category && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-1">
                              <span
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{
                                  backgroundColor:
                                    r.categoryColor ?? undefined,
                                }}
                              />
                              {r.category}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <EditRecurringDialog transaction={r} />
                    <CancelRecurringButton transaction={r} />
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p
                      className={`text-xl font-bold tabular-nums ${
                        r.type === "income"
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {r.type === "income" ? "+" : "−"}
                      {formatCurrency(r.amount, currency)}
                    </p>
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {patternLabels[r.recurring_pattern ?? ""] ??
                        r.recurring_pattern}
                    </Badge>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarClock className="h-3 w-3" />
                      {r.next_recurring_date
                        ? new Date(
                            r.next_recurring_date + "T00:00:00"
                          ).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })
                        : "—"}
                    </span>
                    {isOverdue && (
                      <Badge variant="destructive" className="text-[10px]">
                        Overdue
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
