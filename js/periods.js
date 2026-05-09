// periods.js — Pay period calculation engine
// Handles fortnightly and weekly cycles anchored to a specific pay day

// Day index: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
// Default pay day: 2 (Tuesday)

// ANCHOR: A known pay day Tuesday we use as a reference point
// for counting fortnightly periods. 2025-01-07 was a Tuesday.
const ANCHOR_DATE = '2025-01-07';

/** Parse a YYYY-MM-DD string into a local Date (no timezone shift) */
export function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Format a Date as YYYY-MM-DD */
export function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Format a Date as human-readable: "Tue 6 May" */
export function formatShort(date) {
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Today as YYYY-MM-DD */
export function today() {
  return formatDate(new Date());
}

/** Add N days to a date string, return YYYY-MM-DD */
export function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return formatDate(d);
}

/** Difference in days between two YYYY-MM-DD strings (b - a) */
export function diffDays(a, b) {
  const da = parseDate(a);
  const db = parseDate(b);
  return Math.round((db - da) / 86400000);
}

/**
 * Get the start date of the pay period containing `dateStr`.
 * @param {string} dateStr - YYYY-MM-DD
 * @param {{ payCycle: 'fortnightly'|'weekly', payDay: number }} settings
 * @returns {string} YYYY-MM-DD — the period start (a.k.a. periodKey)
 */
export function getPeriodStart(dateStr, settings) {
  const { payCycle = 'fortnightly', payDay = 2 } = settings;
  const date = parseDate(dateStr);
  const dow = date.getDay(); // 0=Sun…6=Sat

  // How many days back to reach the most recent payDay?
  let daysBack = (dow - payDay + 7) % 7;
  let candidateStr = formatDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() - daysBack));

  if (payCycle === 'weekly') {
    return candidateStr;
  }

  // Fortnightly: check if this payDay is in an "even" or "odd" fortnight
  // by comparing against anchor.
  const anchorDays = diffDays(ANCHOR_DATE, candidateStr);
  const weekNumber = Math.round(anchorDays / 7); // weeks since anchor

  if (weekNumber % 2 === 0) {
    // candidate IS a period start
    return candidateStr;
  } else {
    // step back one more week
    return addDays(candidateStr, -7);
  }
}

/**
 * Get the end date of a period (last day, inclusive).
 */
export function getPeriodEnd(periodStart, settings) {
  const { payCycle = 'fortnightly' } = settings;
  const days = payCycle === 'fortnightly' ? 13 : 6;
  return addDays(periodStart, days);
}

/**
 * Total number of days in a period.
 */
export function getPeriodLength(settings) {
  return settings.payCycle === 'fortnightly' ? 14 : 7;
}

/**
 * How far through the current period are we? Returns 0–1.
 */
export function getPeriodProgress(settings) {
  const t = today();
  const start = getPeriodStart(t, settings);
  const elapsed = diffDays(start, t) + 1; // +1 to count today
  const total = getPeriodLength(settings);
  return Math.min(elapsed / total, 1);
}

/**
 * Human-readable label for a period.
 * e.g. "Tue 6 – Mon 19 May" or "Tue 6 – Mon 12 May"
 */
export function getPeriodLabel(periodStart, settings) {
  const end = getPeriodEnd(periodStart, settings);
  const ds = parseDate(periodStart);
  const de = parseDate(end);

  const sameMonth = ds.getMonth() === de.getMonth();

  const startStr = ds.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  const endStr = de.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: sameMonth ? undefined : 'short' });

  return `${startStr} – ${endStr}`;
}

/**
 * Short label: "6 – 19 May" for compact display.
 */
export function getPeriodShortLabel(periodStart, settings) {
  const end = getPeriodEnd(periodStart, settings);
  const ds = parseDate(periodStart);
  const de = parseDate(end);
  const month = de.toLocaleDateString('en-AU', { month: 'short' });
  return `${ds.getDate()} – ${de.getDate()} ${month}`;
}

/**
 * The current period's start date.
 */
export function currentPeriodKey(settings) {
  return getPeriodStart(today(), settings);
}

/**
 * Previous period's start date.
 */
export function prevPeriodKey(periodKey, settings) {
  return addDays(periodKey, -getPeriodLength(settings));
}

/**
 * Next period's start date.
 */
export function nextPeriodKey(periodKey, settings) {
  return addDays(periodKey, getPeriodLength(settings));
}

/**
 * All 14 (or 7) days in a period as objects for the pace chart.
 */
export function getPeriodDays(periodStart, settings) {
  const len = getPeriodLength(settings);
  const t = today();
  const days = [];
  for (let i = 0; i < len; i++) {
    const dateStr = addDays(periodStart, i);
    const d = parseDate(dateStr);
    days.push({
      date: dateStr,
      label: d.toLocaleDateString('en-AU', { weekday: 'narrow' }),
      isPast: dateStr < t,
      isToday: dateStr === t,
      isFuture: dateStr > t,
    });
  }
  return days;
}

/**
 * Which month does most of this period fall in? Used for monthly history.
 */
export function getPeriodMonth(periodStart, settings) {
  const midpoint = addDays(periodStart, Math.floor(getPeriodLength(settings) / 2));
  const d = parseDate(midpoint);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
