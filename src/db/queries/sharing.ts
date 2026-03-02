"use server";

import { db } from "@/index";
import { sharedAccessTable, accountsTable, budgetsTable, categoriesTable } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { decrypt } from "@/lib/encryption";

export type SharedAccess = {
  id: string;
  owner_id: string;
  shared_with_id: string | null;
  shared_with_email: string;
  resource_type: "account" | "budget";
  resource_id: string;
  permission: "view" | "edit";
  status: "pending" | "accepted" | "declined";
  created_at: Date;
  accepted_at: Date | null;
};

/**
 * Get all shares where the current user is the owner (things they've shared out).
 */
export async function getSharesByOwner(userId: string): Promise<SharedAccess[]> {
  return db
    .select()
    .from(sharedAccessTable)
    .where(eq(sharedAccessTable.owner_id, userId));
}

/**
 * Get all shares for a specific resource (account or budget).
 */
export async function getSharesForResource(
  resourceType: "account" | "budget",
  resourceId: string,
): Promise<SharedAccess[]> {
  return db
    .select()
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, resourceType),
        eq(sharedAccessTable.resource_id, resourceId),
      ),
    );
}

/**
 * Get pending invitations for a user (by email or user ID).
 */
export async function getPendingInvitations(
  userId: string,
  email: string,
): Promise<(SharedAccess & { resourceName: string })[]> {
  const rows = await db
    .select()
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.status, "pending"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );

  // Enrich with resource names
  const enriched = await Promise.all(
    rows.map(async (row) => {
      let resourceName = "Unknown";
      if (row.resource_type === "account") {
        const [account] = await db
          .select({ name: accountsTable.name })
          .from(accountsTable)
          .where(eq(accountsTable.id, row.resource_id));
        if (account) resourceName = decrypt(account.name);
      } else if (row.resource_type === "budget") {
        const [budget] = await db
          .select({ name: categoriesTable.name })
          .from(budgetsTable)
          .innerJoin(categoriesTable, eq(categoriesTable.id, budgetsTable.category_id))
          .where(eq(budgetsTable.id, row.resource_id));
        if (budget) resourceName = budget.name;
      }
      return { ...row, resourceName };
    }),
  );

  return enriched;
}

/**
 * Get accepted shared account IDs for a user (accounts shared with them).
 */
export async function getSharedAccountIds(
  userId: string,
  email: string,
): Promise<string[]> {
  const rows = await db
    .select({ resource_id: sharedAccessTable.resource_id })
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, "account"),
        eq(sharedAccessTable.status, "accepted"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );
  return rows.map((r) => r.resource_id);
}

/**
 * Get accepted shared budget IDs for a user (budgets shared with them).
 */
export async function getSharedBudgetIds(
  userId: string,
  email: string,
): Promise<string[]> {
  const rows = await db
    .select({ resource_id: sharedAccessTable.resource_id })
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, "budget"),
        eq(sharedAccessTable.status, "accepted"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );
  return rows.map((r) => r.resource_id);
}

/**
 * Check if a user has edit access to a specific resource (as owner or shared-with).
 */
export async function hasEditAccess(
  userId: string,
  email: string,
  resourceType: "account" | "budget",
  resourceId: string,
): Promise<boolean> {
  // Check ownership first
  if (resourceType === "account") {
    const [owned] = await db
      .select({ id: accountsTable.id })
      .from(accountsTable)
      .where(and(eq(accountsTable.id, resourceId), eq(accountsTable.user_id, userId)));
    if (owned) return true;
  } else {
    const [owned] = await db
      .select({ id: budgetsTable.id })
      .from(budgetsTable)
      .where(and(eq(budgetsTable.id, resourceId), eq(budgetsTable.user_id, userId)));
    if (owned) return true;
  }

  // Check shared access
  const [shared] = await db
    .select({ id: sharedAccessTable.id })
    .from(sharedAccessTable)
    .where(
      and(
        eq(sharedAccessTable.resource_type, resourceType),
        eq(sharedAccessTable.resource_id, resourceId),
        eq(sharedAccessTable.permission, "edit"),
        eq(sharedAccessTable.status, "accepted"),
        or(
          eq(sharedAccessTable.shared_with_id, userId),
          eq(sharedAccessTable.shared_with_email, email),
        ),
      ),
    );

  return !!shared;
}
