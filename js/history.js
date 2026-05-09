// history.js — History aggregation
import { getAllPeriodKeys } from './transactions.js';
import { computePeriodStats } from './budget.js';
import { getPeriodLabel, getPeriodEnd, getPeriodMonth, currentPeriodKey, parseDate } from './periods.js';

/**
 * Get all past + current periods with full stats.
 * Returns sorted newest first.
 */
export async function getAllPeriods(settings, categories) {
  const keys = await getAllPeriodKeys();
  const current = currentPeriodKey(settings);

  // Always include the current period even if empty
  if (!keys.includes(current)) keys.push(current);

  const periods = await Promise.all(
    keys.map(async key => {
      const stats = await computePeriodStats(key, settings, categories);
      const end   = getPeriodEnd(key, settings);
      const isCurrent = key === current;
      const isComplete = !isCurrent;

      return {
        periodKey: key,
        label: getPeriodLabel(key, settings),
        end,
        isCurrent,
        isComplete,
        ...stats,
      };
    })
  );

  return periods.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

/**
 * Get stats grouped by calendar month.
 * Returns array of months sorted newest first.
 */
export async function getMonthlyStats(settings, categories) {
  const all = await getAllPeriods(settings, categories);
  const monthMap = {};

  for (const period of all) {
    const { year, month } = getPeriodMonth(period.periodKey, settings);
    const key = `${year}-${String(month).padStart(2, '0')}`;

    if (!monthMap[key]) {
      monthMap[key] = {
        year,
        month,
        key,
        label: parseDate(`${year}-${String(month).padStart(2, '0')}-01`)
          .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' }),
        periods: [],
        totalBaseIncome:  0,
        totalGigIncome:   0,
        totalIncome:      0,
        totalFixed:       0,
        totalVariable:    0,
        totalSpent:       0,
        remaining:        0,
        gigRunCount:      0,
        gigTotalMinutes:  0,
        spentByCat:       {},
      };
    }

    const m = monthMap[key];
    m.periods.push(period);
    m.totalBaseIncome  += period.baseIncome;
    m.totalGigIncome   += period.gigIncome;
    m.totalIncome      += period.totalIncome;
    m.totalFixed       += period.fixedTotal;
    m.totalVariable    += period.variableSpent;
    m.totalSpent       += period.totalSpent;
    m.remaining        += period.remaining;
    m.gigRunCount      += period.gigStats.runCount;
    m.gigTotalMinutes  += period.gigStats.totalMinutes;

    // Accumulate per-category spending
    for (const [catId, cs] of Object.entries(period.byCategory)) {
      m.spentByCat[catId] = (m.spentByCat[catId] || 0) + cs.spent;
    }
  }

  return Object.values(monthMap)
    .sort((a, b) => b.key.localeCompare(a.key));
}

/** Helper: format duration from total minutes */
export function fmtDuration(totalMinutes) {
  if (!totalMinutes) return '0m';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
