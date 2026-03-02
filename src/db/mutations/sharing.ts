"use server";

import { db } from "@/index";
import { sharedAccessTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requireString, sanitizeEnum } from "@/lib/sanitize";

async function getCurrentUserEmail(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("User email not available");
  return user.email;
}

/**
 * Look up a Supabase user ID by email. Returns null if not found.
 */
async function getUserIdByEmail(email: string): Promise<string | null> {
  const supabase = await createClient();
  // Use admin API to look up user by email — this searches auth.users
  // Since we're on the server, we can query the auth schema
  const { data } = await supabase.rpc("get_user_id_by_email", { lookup_email: email }).maybeSingle();
  return typeof data === "string" ? data : null;
}

export async function shareResource(formData: FormData) {
  const userId = await getCurrentUserId();
  const email = requireString(formData.get("email") as string, "Email").toLowerCase();
  const resourceType = sanitizeEnum(
    formData.get("resource_type") as string,
    ["account", "budget"] as const,
    "account",
  );
  const resourceId = requireString(formData.get("resource_id") as string, "Resource ID");
  const permission = sanitizeEnum(
    formData.get("permission") as string,
    ["view", "edit"] as const,
    "edit",
  );

  // Prevent sharing with yourself
  const currentEmail = await getCurrentUserEmail();
  if (email === currentEmail.toLowerCase()) {
    throw new Error("You cannot share with yourself");
  }

  // Try to resolve the user ID
  let sharedWithId: string | null = null;
  try {
    sharedWithId = await getUserIdByEmail(email);
  } catch {
    // If the RPC doesn't exist, proceed without the user ID
  }

  await db
    .insert(sharedAccessTable)
    .values({
      owner_id: userId,
      shared_with_id: sharedWithId,
      shared_with_email: email,
      resource_type: resourceType,
      resource_id: resourceId,
      permission,
      status: "pending",
    })
    .onConflictDoUpdate({
      target: [
        sharedAccessTable.shared_with_email,
        sharedAccessTable.resource_type,
        sharedAccessTable.resource_id,
      ],
      set: {
        permission,
        status: "pending",
        owner_id: userId,
        shared_with_id: sharedWithId,
      },
    });

  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}

export async function acceptInvitation(invitationId: string) {
  const userId = await getCurrentUserId();
  const email = await getCurrentUserEmail();

  // Verify the invitation belongs to this user
  const [invitation] = await db
    .select()
    .from(sharedAccessTable)
    .where(eq(sharedAccessTable.id, invitationId));

  if (!invitation) throw new Error("Invitation not found");
  if (
    invitation.shared_with_email.toLowerCase() !== email.toLowerCase() &&
    invitation.shared_with_id !== userId
  ) {
    throw new Error("This invitation is not for you");
  }

  await db
    .update(sharedAccessTable)
    .set({
      status: "accepted",
      shared_with_id: userId,
      accepted_at: new Date(),
    })
    .where(eq(sharedAccessTable.id, invitationId));

  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}

export async function declineInvitation(invitationId: string) {
  const userId = await getCurrentUserId();
  const email = await getCurrentUserEmail();

  const [invitation] = await db
    .select()
    .from(sharedAccessTable)
    .where(eq(sharedAccessTable.id, invitationId));

  if (!invitation) throw new Error("Invitation not found");
  if (
    invitation.shared_with_email.toLowerCase() !== email.toLowerCase() &&
    invitation.shared_with_id !== userId
  ) {
    throw new Error("This invitation is not for you");
  }

  await db
    .update(sharedAccessTable)
    .set({ status: "declined" })
    .where(eq(sharedAccessTable.id, invitationId));

  revalidatePath("/dashboard");
}

export async function revokeShare(shareId: string) {
  const userId = await getCurrentUserId();

  await db
    .delete(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.id, shareId),
        eq(sharedAccessTable.owner_id, userId),
      ),
    );

  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}

export async function leaveSharedResource(shareId: string) {
  const userId = await getCurrentUserId();
  const email = await getCurrentUserEmail();

  // Can only leave shares where you're the recipient
  const [share] = await db
    .select()
    .from(sharedAccessTable)
    .where(eq(sharedAccessTable.id, shareId));

  if (!share) throw new Error("Share not found");
  if (
    share.shared_with_email.toLowerCase() !== email.toLowerCase() &&
    share.shared_with_id !== userId
  ) {
    throw new Error("Not your share to leave");
  }

  await db.delete(sharedAccessTable).where(eq(sharedAccessTable.id, shareId));

  revalidatePath("/dashboard/accounts");
  revalidatePath("/dashboard/budgets");
  revalidatePath("/dashboard");
}
