'use server';

import { db } from '@/index';
import { accountsTable, transactionsTable } from '@/db/schema';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';
import { getCurrentUserId } from '@/lib/auth';
import { checkBudgetAlerts } from '@/lib/budget-alerts';
import { encrypt } from '@/lib/encryption';
import { matchCategorisationRule } from '@/lib/auto-categorise';

type CsvColumnMapping = {
  date: number;
  description: number;
  amount: number;
  type: number | null;       // column index for type, or null if using sign of amount
};

type ImportRow = {
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '');
  return lines.map(parseCSVLine);
}

function normaliseDate(raw: string): string | null {
  // Try ISO format first: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdyMatch = raw.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (mdyMatch) {
    const [, m, d, y] = mdyMatch;
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (month > 12 && day <= 12) {
      // Likely DD/MM/YYYY already handled above
      return `${y}-${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
    }
  }

  // Try Date.parse as fallback
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

function parseAmount(raw: string): number | null {
  // Remove currency symbols and whitespace
  const cleaned = raw.replace(/[£$€\s,]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export async function importTransactionsFromCSV(
  csvText: string,
  mapping: CsvColumnMapping,
  accountId: string,
  defaultType: 'income' | 'expense' | 'auto',
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const userId = await getCurrentUserId();

  // Verify the account belongs to this user
  const [account] = await db
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));

  if (!account) {
    throw new Error('Account not found');
  }

  const allRows = parseCSV(csvText);
  if (allRows.length < 2) {
    return { imported: 0, skipped: 0, errors: ['CSV must have a header row and at least one data row.'] };
  }

  // Skip header row
  const dataRows = allRows.slice(1);
  const errors: string[] = [];
  const validRows: ImportRow[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNum = i + 2; // 1-indexed, accounting for header

    const rawDate = row[mapping.date];
    const rawDesc = row[mapping.description];
    const rawAmount = row[mapping.amount];

    if (!rawDate || !rawDesc || !rawAmount) {
      errors.push(`Row ${rowNum}: Missing required fields.`);
      continue;
    }

    const date = normaliseDate(rawDate);
    if (!date) {
      errors.push(`Row ${rowNum}: Could not parse date "${rawDate}".`);
      continue;
    }

    const amount = parseAmount(rawAmount);
    if (amount === null || amount === 0) {
      errors.push(`Row ${rowNum}: Invalid amount "${rawAmount}".`);
      continue;
    }

    let type: 'income' | 'expense';
    if (mapping.type !== null) {
      const rawType = (row[mapping.type] ?? '').toLowerCase().trim();
      if (rawType === 'income' || rawType === 'credit' || rawType === 'cr') {
        type = 'income';
      } else {
        type = 'expense';
      }
    } else if (defaultType === 'auto') {
      type = amount > 0 ? 'income' : 'expense';
    } else {
      type = defaultType;
    }

    validRows.push({
      date,
      description: rawDesc.substring(0, 255),
      amount: Math.abs(amount),
      type,
    });
  }

  let imported = 0;
  let totalBalanceDelta = 0;

  for (const row of validRows) {
    // Auto-categorise based on description
    const categoryId = await matchCategorisationRule(userId, row.description);

    const delta = row.type === 'income' ? row.amount : -row.amount;

    await db.insert(transactionsTable).values({
      account_id: accountId,
      category_id: categoryId,
      type: row.type,
      amount: row.amount,
      description: encrypt(row.description),
      date: row.date,
      is_recurring: false,
      recurring_pattern: null,
      next_recurring_date: null,
    });

    totalBalanceDelta += delta;
    imported++;
  }

  // Update account balance in one go
  if (totalBalanceDelta !== 0) {
    await db
      .update(accountsTable)
      .set({ balance: sql`${accountsTable.balance} + ${totalBalanceDelta}` })
      .where(eq(accountsTable.id, accountId));
  }

  revalidatePath('/dashboard/transactions');
  revalidatePath('/dashboard/accounts');

  await checkBudgetAlerts(userId);

  return {
    imported,
    skipped: dataRows.length - imported,
    errors: errors.slice(0, 20), // Cap error messages
  };
}
