"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";

type DeleteConfirmButtonProps = {
  onDelete: () => Promise<void>;
  triggerClassName?: string;
  triggerIconClassName?: string;
  dialogTitle: string;
  dialogDescription: ReactNode;
  successTitle: string;
  successDescription: ReactNode;
};

export function DeleteConfirmButton({
  onDelete,
  triggerClassName = "h-8 w-8 text-muted-foreground hover:text-destructive",
  triggerIconClassName = "h-4 w-4",
  dialogTitle,
  dialogDescription,
  successTitle,
}: DeleteConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      try {
        await onDelete();
        toast.success(successTitle);
      } catch {
        toast.error("Something went wrong. Please try again.");
      } finally {
        setConfirming(false);
      }
    });
  }

  return (
    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className={triggerClassName}>
          <Trash2 className={triggerIconClassName} />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
