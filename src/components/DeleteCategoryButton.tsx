"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteCategory } from "@/db/mutations/categories";

export function DeleteCategoryButton({ category }: { category: { id: string; name: string } }) {
  return (
    <DeleteConfirmButton
      onDelete={() => deleteCategory(category.id)}
      triggerClassName="h-7 w-7 text-muted-foreground hover:text-destructive"
      triggerIconClassName="h-3.5 w-3.5"
      dialogTitle="Delete category?"
      dialogDescription={
        <>
          This will permanently delete &ldquo;{category.name}&rdquo;. Transactions using this category will have their category cleared. This action cannot be undone.
        </>
      }
      successTitle="Category deleted"
      successDescription={
        <>
          &ldquo;{category.name}&rdquo; has been removed.
        </>
      }
    />
  );
}
