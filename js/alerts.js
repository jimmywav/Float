// alerts.js — Smart alert engine
// Returns an array of alerts to display on the dashboard

/**
 * @param {object} stats - output of computePeriodStats()
 * @param {object} settings
 * @returns {Array<{ type: 'warning'|'success'|'info', icon: string, message: string }>}
 */
export function getAlerts(stats, settings) {
  if (!settings.alertPace && !settings.alertOver) return [];

  const alerts = [];
  const { byCategory, variableCats, remaining, totalIncome, periodProgress } = stats;
  const pct = periodProgress;

  // 1. Negative remaining (highest priority)
  if (remaining < 0) {
    alerts.push({
      type: 'warning',
      icon: 'ti-alert-triangle',
      message: `You're ${fmtAUD(Math.abs(remaining))} over total budget this period.`,
      priority: 0,
    });
  }

  // 2. Remaining under 10% of total income
  else if (remaining < totalIncome * 0.1 && totalIncome > 0) {
    alerts.push({
      type: 'warning',
      icon: 'ti-alert-triangle',
      message: `Only ${fmtAUD(remaining)} remaining for the rest of the period.`,
      priority: 1,
    });
  }

  // 3. Per-category over-budget
  if (settings.alertOver) {
    for (const cat of variableCats) {
      const cs = byCategory[cat.id];
      if (!cs) continue;
      if (cs.pct >= 1.0) {
        alerts.push({
          type: 'warning',
          icon: 'ti-alert-triangle',
          message: `${cat.name} is over budget by ${fmtAUD(cs.spent - cs.budget)}.`,
          priority: 2,
        });
      }
    }
  }

  // 4. Per-category running fast
  if (settings.alertPace) {
    for (const cat of variableCats) {
      const cs = byCategory[cat.id];
      if (!cs || cs.pct >= 1.0) continue; // already caught above
      if (cs.burnRate > 1.35 && cs.pct > 0.25) {
        const timeLeft = Math.round((1 - pct) * (stats.settings?.payCycle === 'weekly' ? 7 : 14));
        alerts.push({
          type: 'warning',
          icon: 'ti-flame',
          message: `${cat.name} at ${Math.round(cs.pct * 100)}% — only ${Math.round(pct * 100)}% through the period.`,
          priority: 3,
        });
      }
    }
  }

  // 5. Looking good (positive, late in period)
  if (alerts.length === 0 && pct > 0.65 && remaining > totalIncome * 0.2) {
    alerts.push({
      type: 'success',
      icon: 'ti-circle-check',
      message: `Looking good — ${fmtAUD(remaining)} left with ${Math.round((1 - pct) * 100)}% of the period remaining.`,
      priority: 99,
    });
  }

  // Sort and cap at 2
  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 2);
}

function fmtAUD(n) {
  return '$' + Math.abs(n).toFixed(2);
}
