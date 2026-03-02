"use client";

import { DeleteConfirmButton } from "@/components/DeleteConfirmButton";
import { deleteAccount } from "@/db/mutations/accounts";

type Account = {
  id: string;
  accountName: string;
  transactions: number;
};

export function DeleteAccountButton({ account }: { account: Account }) {
  return (
    <DeleteConfirmButton
      onDelete={() => deleteAccount(account.id)}
      dialogTitle="Delete account?"
      dialogDescription={
        <>
          This will permanently delete &ldquo;{account.accountName}&rdquo;
          {account.transactions > 0 && (
            <> and its {account.transactions} transaction{account.transactions !== 1 && "s"}</>
          )}
          . This action cannot be undone.
        </>
      }
      successTitle="Account deleted"
      successDescription={
        <>
          &ldquo;{account.accountName}&rdquo; and all related transactions have been removed.
        </>
      }
    />
  );
}
