// transactions.js — CRUD for expenses and gig runs
import db from './db.js';
import { getPeriodStart, today } from './periods.js';
import { genId } from './settings.js';

/**
 * Add an expense transaction.
 * @param {{ categoryId, amount, note, date? }} data
 * @param {object} settings
 */
export async function addExpense(data, settings) {
  const date = data.date || today();
  const tx = {
    id:         genId('tx'),
    type:       'expense',
    categoryId: data.categoryId,
    amount:     Math.round(data.amount * 100) / 100,
    note:       data.note || '',
    date,
    periodKey:  getPeriodStart(date, settings),
    createdAt:  Date.now(),
  };
  await db.put('transactions', tx);
  return tx;
}

/**
 * Add a gig run.
 * @param {{ amount, hours, minutes, note, date? }} data
 * @param {object} settings
 */
export async function addGigRun(data, settings) {
  const date = data.date || today();
  const totalMinutes = (data.hours || 0) * 60 + (data.minutes || 0);
  const hourlyRate = totalMinutes > 0
    ? Math.round((data.amount / (totalMinutes / 60)) * 100) / 100
    : 0;

  const tx = {
    id:          genId('gig'),
    type:        'gig',
    categoryId:  null,
    amount:      Math.round(data.amount * 100) / 100,
    hours:       data.hours || 0,
    minutes:     data.minutes || 0,
    totalMinutes,
    hourlyRate,
    note:        data.note || '',
    date,
    periodKey:   getPeriodStart(date, settings),
    createdAt:   Date.now(),
  };
  await db.put('transactions', tx);
  return tx;
}

/**
 * Update a transaction (expense or gig).
 * Recalculates periodKey if date changes.
 */
export async function updateTransaction(id, changes, settings) {
  const existing = await db.get('transactions', id);
  if (!existing) throw new Error(`Transaction ${id} not found`);

  const updated = { ...existing, ...changes, updatedAt: Date.now() };

  // Recalculate periodKey if date changed
  if (changes.date && changes.date !== existing.date) {
    updated.periodKey = getPeriodStart(changes.date, settings);
  }

  // Recalculate hourly rate if gig fields changed
  if (updated.type === 'gig') {
    const totalMinutes = (updated.hours || 0) * 60 + (updated.minutes || 0);
    updated.totalMinutes = totalMinutes;
    updated.hourlyRate = totalMinutes > 0
      ? Math.round((updated.amount / (totalMinutes / 60)) * 100) / 100
      : 0;
  }

  await db.put('transactions', updated);
  return updated;
}

/** Delete a transaction by ID */
export async function deleteTransaction(id) {
  await db.delete('transactions', id);
}

/** Get all transactions for a period */
export async function getTransactionsForPeriod(periodKey) {
  const all = await db.getAllByIndex('transactions', 'periodKey', periodKey);
  return all.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });
}

/**
 * Get transactions grouped by day for the Transactions screen.
 * Returns: { 'YYYY-MM-DD': [tx, tx], ... } sorted newest day first.
 */
export async function getTransactionsGroupedByDay(periodKey) {
  const txs = await getTransactionsForPeriod(periodKey);
  const groups = {};
  for (const tx of txs) {
    if (!groups[tx.date]) groups[tx.date] = [];
    groups[tx.date].push(tx);
  }
  return groups; // already sorted by date desc from above
}

/** Get all unique periodKeys that have at least one transaction */
export async function getAllPeriodKeys() {
  return db.getUniqueIndexValues('transactions', 'periodKey');
}

/** Format minutes as "Xh Ym" */
export function formatDuration(totalMinutes) {
  if (!totalMinutes) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
