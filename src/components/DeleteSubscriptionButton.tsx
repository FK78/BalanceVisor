"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteSubscription } from "@/db/mutations/subscriptions";

export function DeleteSubscriptionButton({ id, name }: { id: string; name: string }) {
  return (
    <DeleteConfirmButton
      dialogTitle="Delete Subscription"
      dialogDescription={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
      onDelete={() => deleteSubscription(id)}
      successTitle="Subscription deleted"
      successDescription="Your subscription has been removed."
    />
  );
}
