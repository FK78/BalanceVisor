import { formatCurrency } from "@/lib/formatCurrency";
import { TableCell, TableRow } from "./ui/table";

export function TransactionRow({
  t,
  currency,
}: {
  t: { id: string; description: string | null; category: string | null; date: string | null; amount: number; type: "income" | "expense" | "transfer" };
  currency: string;
}) {
    const colorClass =
      t.type === "income"
        ? "text-emerald-600"
        : t.type === "transfer"
          ? "text-blue-600"
          : "text-red-600";

    const prefix =
      t.type === "income" ? "+" : t.type === "transfer" ? "⇄ " : "−";

    return (
        <TableRow>
            <TableCell className="font-medium">
                {t.description}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {t.type === "transfer" ? "Transfer" : t.category}
            </TableCell>
            <TableCell className="text-muted-foreground">
                {t.date}
            </TableCell>
            <TableCell
                className={`text-right font-semibold tabular-nums ${colorClass}`}
            >
                {prefix}
                {formatCurrency(t.amount, currency)}
            </TableCell>
        </TableRow>
    );
}
