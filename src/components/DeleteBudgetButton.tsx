"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteBudget } from "@/db/mutations/budgets";

export function DeleteBudgetButton({ budget }: { budget: { id: string; budgetCategory: string } }) {
  return (
    <DeleteConfirmButton
      onDelete={() => deleteBudget(budget.id)}
      triggerClassName="h-7 w-7 text-muted-foreground hover:text-destructive"
      triggerIconClassName="h-3.5 w-3.5"
      dialogTitle="Delete budget?"
      dialogDescription={
        <>
          This will permanently delete the &ldquo;{budget.budgetCategory}&rdquo; budget. This action cannot be undone.
        </>
      }
      successTitle="Budget deleted"
      successDescription={
        <>
          The &ldquo;{budget.budgetCategory}&rdquo; budget has been removed.
        </>
      }
    />
  );
}
