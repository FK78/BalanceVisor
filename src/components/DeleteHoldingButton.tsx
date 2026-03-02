"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteManualHolding } from "@/db/mutations/investments";

type Holding = {
  id: string;
  ticker: string;
  name: string;
};

export function DeleteHoldingButton({ holding }: { holding: Holding }) {
  return (
    <DeleteConfirmButton
      onDelete={() => deleteManualHolding(holding.id)}
      dialogTitle="Delete holding?"
      dialogDescription={
        <>
          This will permanently remove &ldquo;{holding.name}&rdquo; ({holding.ticker}) from your portfolio. This action cannot be undone.
        </>
      }
      successTitle="Holding deleted"
      successDescription={
        <>
          &ldquo;{holding.name}&rdquo; has been removed from your portfolio.
        </>
      }
    />
  );
}
