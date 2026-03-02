"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteGoal } from "@/db/mutations/goals";

export function DeleteGoalButton({ id }: { id: string }) {
  return (
    <DeleteConfirmButton
      dialogTitle="Delete Goal"
      dialogDescription="Are you sure you want to delete this goal? This action cannot be undone."
      onDelete={() => deleteGoal(id)}
      successTitle="Goal deleted"
      successDescription="Your goal has been removed."
    />
  );
}
