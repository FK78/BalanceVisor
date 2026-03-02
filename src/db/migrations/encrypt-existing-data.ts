/**
 * One-time migration script to encrypt existing plaintext data in the database.
 *
 * Run with:
 *   npx tsx src/db/migrations/encrypt-existing-data.ts
 *
 * Requires ENCRYPTION_KEY and DATABASE_URL in .env
 */

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { accountsTable, transactionsTable, truelayerConnectionsTable } from "@/db/schema";
import { encrypt, isEncrypted } from "@/lib/encryption";

const client = postgres(process.env.DATABASE_URL!, {
  ssl: { rejectUnauthorized: false },
});
const db = drizzle(client);

async function migrateTable(
  label: string,
  fetchAll: () => Promise<{ id: string; [key: string]: unknown }[]>,
  updateRow: (id: string, encrypted: Record<string, string>) => Promise<void>,
  fields: string[],
) {
  const rows = await fetchAll();
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const encryptedFields: Record<string, string> = {};
    let needsUpdate = false;

    for (const field of fields) {
      const value = row[field] as string | null;
      if (value && !isEncrypted(value)) {
        encryptedFields[field] = encrypt(value);
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await updateRow(row.id, encryptedFields);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`  ${label}: ${updated} rows encrypted, ${skipped} already encrypted/skipped`);
}

async function main() {
  console.log("Starting encryption migration...\n");

  // 1. TrueLayer connections: access_token, refresh_token
  console.log("[1/3] Encrypting TrueLayer connections...");
  await migrateTable(
    "truelayer_connections",
    () => db.select().from(truelayerConnectionsTable),
    async (id, fields) => {
      await client`UPDATE truelayer_connections SET ${client(fields)} WHERE id = ${id}`;
    },
    ["access_token", "refresh_token"],
  );

  // 2. Accounts: name
  console.log("[2/3] Encrypting account names...");
  await migrateTable(
    "accounts",
    () => db.select().from(accountsTable),
    async (id, fields) => {
      await client`UPDATE accounts SET ${client(fields)} WHERE id = ${id}`;
    },
    ["name"],
  );

  // 3. Transactions: description
  console.log("[3/3] Encrypting transaction descriptions...");
  await migrateTable(
    "transactions",
    () => db.select().from(transactionsTable),
    async (id, fields) => {
      await client`UPDATE transactions SET ${client(fields)} WHERE id = ${id}`;
    },
    ["description"],
  );

  console.log("\nEncryption migration complete!");
  await client.end();
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  client.end();
  process.exit(1);
});
