"use client";

import { useState, useTransition } from "react";
import { Share2, Loader2, CheckCircle2, Trash2, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { shareResource, revokeShare } from "@/db/mutations/sharing";

type Share = {
  id: string;
  shared_with_email: string;
  permission: "view" | "edit";
  status: "pending" | "accepted" | "declined";
};

export function ShareDialog({
  resourceType,
  resourceId,
  resourceName,
  existingShares = [],
}: {
  resourceType: "account" | "budget";
  resourceId: string;
  resourceName: string;
  existingShares?: Share[];
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"form" | "success">("form");
  const [isPending, startTransition] = useTransition();
  const [formKey, setFormKey] = useState(0);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setView("form");
    setOpen(nextOpen);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("resource_type", resourceType);
    formData.set("resource_id", resourceId);
    startTransition(async () => {
      await shareResource(formData);
      setView("success");
    });
  }

  function handleShareAnother() {
    setFormKey((k) => k + 1);
    setView("form");
  }

  function handleRevoke(shareId: string) {
    startTransition(async () => {
      await revokeShare(shareId);
    });
  }

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    declined: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {view === "success" ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Invitation sent</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">Invitation sent!</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  They&apos;ll see the invitation when they log in.
                </p>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-center">
              <Button variant="outline" onClick={handleShareAnother}>
                <Share2 className="mr-1 h-4 w-4" />
                Share with another
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Share &ldquo;{resourceName}&rdquo;</DialogTitle>
              <DialogDescription>
                Invite someone to access this {resourceType}. They&apos;ll receive
                an invitation to accept.
              </DialogDescription>
            </DialogHeader>

            <form key={formKey} onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="person@example.com"
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="permission">Permission</Label>
                <Select name="permission" defaultValue="edit">
                  <SelectTrigger id="permission">
                    <SelectValue placeholder="Select permission" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit">
                      Can edit — add transactions &amp; view
                    </SelectItem>
                    <SelectItem value="view">
                      View only — can see but not modify
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Invitation
                </Button>
              </DialogFooter>
            </form>

            {existingShares.length > 0 && (
              <div className="border-t pt-4 mt-2">
                <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  People with access
                </p>
                <div className="space-y-2">
                  {existingShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between rounded-md border p-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="truncate">{share.shared_with_email}</span>
                        <Badge
                          variant="secondary"
                          className={`text-[10px] shrink-0 ${statusColors[share.status] ?? ""}`}
                        >
                          {share.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] shrink-0">
                          {share.permission}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                        onClick={() => handleRevoke(share.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
