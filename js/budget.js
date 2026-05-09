// budget.js — Budget computation engine
import { getTransactionsForPeriod } from './transactions.js';
import { getPeriodProgress, getPeriodDays } from './periods.js';

/**
 * Master computation function.
 * Returns everything the dashboard and history need.
 *
 * @param {string} periodKey
 * @param {object} settings
 * @param {Array}  categories
 * @returns {object} stats
 */
export async function computePeriodStats(periodKey, settings, categories) {
  const transactions = await getTransactionsForPeriod(periodKey);

  const expenses = transactions.filter(t => t.type === 'expense');
  const gigRuns  = transactions.filter(t => t.type === 'gig');

  // Income
  const baseIncome = settings.income || 0;
  const gigIncome  = gigRuns.reduce((s, g) => s + g.amount, 0);
  const totalIncome = baseIncome + gigIncome;

  // Fixed bills (always deducted, regardless of logged transactions)
  const fixedCats    = categories.filter(c => c.type === 'fixed');
  const variableCats = categories.filter(c => c.type === 'variable');
  const fixedTotal   = fixedCats.reduce((s, c) => s + c.budget, 0);

  // Variable spending per category
  const spentByCat = {};
  for (const tx of expenses) {
    spentByCat[tx.categoryId] = (spentByCat[tx.categoryId] || 0) + tx.amount;
  }

  const variableSpent = Object.values(spentByCat).reduce((s, v) => s + v, 0);
  const totalSpent    = fixedTotal + variableSpent;
  const remaining     = totalIncome - totalSpent;

  // Period progress
  const { today: _today, ..._ } = {};
  const progress = getPeriodProgress(settings);

  // Per-category breakdown
  const byCategory = {};

  for (const cat of [...fixedCats, ...variableCats]) {
    const spent    = spentByCat[cat.id] || 0;
    const budget   = cat.budget;
    const rem      = budget - spent;
    const pct      = budget > 0 ? spent / budget : 0;
    const burnRate = progress > 0 ? pct / progress : 0;
    const status   = getCategoryStatus(pct, burnRate);

    byCategory[cat.id] = { budget, spent, remaining: rem, pct, burnRate, status };
  }

  // Gig stats
  const gigStats = computeGigStats(gigRuns);

  return {
    baseIncome,
    gigIncome,
    totalIncome,
    fixedTotal,
    variableSpent,
    totalSpent,
    remaining,
    periodProgress: progress,
    byCategory,
    transactions,
    expenses,
    gigRuns,
    gigStats,
    categories,
    fixedCats,
    variableCats,
  };
}

/** Determine a category's visual status */
export function getCategoryStatus(pct, burnRate) {
  if (pct >= 1.0)    return 'over';
  if (burnRate > 1.3) return 'caution';
  return 'ok';
}

/** Aggregate gig run stats */
export function computeGigStats(gigRuns) {
  if (!gigRuns.length) return {
    totalEarned: 0, totalMinutes: 0, runCount: 0,
    avgHourlyRate: 0, bestRate: 0, worstRate: 0
  };

  const totalEarned  = gigRuns.reduce((s, g) => s + g.amount, 0);
  const totalMinutes = gigRuns.reduce((s, g) => s + (g.totalMinutes || 0), 0);
  const runCount     = gigRuns.length;
  const avgHourlyRate = totalMinutes > 0
    ? Math.round((totalEarned / (totalMinutes / 60)) * 100) / 100 : 0;

  const rates    = gigRuns.filter(g => g.hourlyRate > 0).map(g => g.hourlyRate);
  const bestRate  = rates.length ? Math.max(...rates) : 0;
  const worstRate = rates.length ? Math.min(...rates) : 0;

  return { totalEarned, totalMinutes, runCount, avgHourlyRate, bestRate, worstRate };
}

/**
 * Daily spending breakdown for the pace chart.
 * Returns array of { date, label, spent, isPast, isToday, isFuture, projected }
 */
export async function getDailyPace(periodKey, settings) {
  const txs  = await getTransactionsForPeriod(periodKey);
  const days  = getPeriodDays(periodKey, settings);

  // Sum expenses (not gig) per day
  const spentByDay = {};
  for (const tx of txs) {
    if (tx.type === 'expense') {
      spentByDay[tx.date] = (spentByDay[tx.date] || 0) + tx.amount;
    }
  }

  // Calculate avg daily spend from past days for projection
  const pastDays  = days.filter(d => d.isPast || d.isToday);
  const totalPast = pastDays.reduce((s, d) => s + (spentByDay[d.date] || 0), 0);
  const avgDaily  = pastDays.length > 0 ? totalPast / pastDays.length : 0;

  // Max spend for bar scaling
  const max = Math.max(avgDaily * 1.5, ...Object.values(spentByDay), 1);

  return days.map(d => ({
    ...d,
    spent:     spentByDay[d.date] || 0,
    projected: d.isFuture ? avgDaily : 0,
    heightPct: Math.min(((spentByDay[d.date] || (d.isFuture ? avgDaily : 0)) / max) * 100, 100),
  }));
}
