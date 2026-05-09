// ui/dashboard.js
import { computePeriodStats, getDailyPace } from '../budget.js';
import { getAlerts } from '../alerts.js';
import { currentPeriodKey, getPeriodLabel } from '../periods.js';
import { getAppState, setAppState } from '../router.js';

function fmtAUD(n) {
  const abs = Math.abs(n).toFixed(2);
  return (n < 0 ? '-$' : '$') + abs;
}

function fmtAUDPos(n) { return '$' + Math.abs(n).toFixed(2); }

export async function renderDashboard(container, params, state) {
  const { settings, categories } = state;
  const periodKey = currentPeriodKey(settings);
  const stats     = await computePeriodStats(periodKey, settings, categories);

  // Attach lastStats so modals can access remaining amounts
  setAppState({ ...state, lastStats: stats });

  const pace    = await getDailyPace(periodKey, settings);
  const alerts  = getAlerts({ ...stats, settings }, settings);
  const label   = getPeriodLabel(periodKey, settings);

  const remColor = stats.remaining < 0 ? 'red' : stats.remaining < stats.totalIncome * 0.1 ? 'amber' : 'green';

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="drawer-toggle" aria-label="Menu">
        <span class="hb"><span class="hbl"></span><span class="hbl"></span><span class="hbl"></span></span>
      </button>
      <div class="topbar-text">
        <div class="topbar-title">float</div>
        <div class="topbar-sub">${label}</div>
      </div>
    </div>

    <div class="scroll-body">
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-label">Remaining</div>
          <div class="metric-value ${remColor}">${fmtAUD(stats.remaining)}</div>
          <div class="metric-sub">of ${fmtAUDPos(stats.totalIncome)}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Gig earned</div>
          <div class="metric-value green">${stats.gigIncome > 0 ? '+' : ''}${fmtAUDPos(stats.gigIncome)}</div>
          <div class="metric-sub">${stats.gigStats.runCount} run${stats.gigStats.runCount !== 1 ? 's' : ''}</div>
        </div>
        <div class="metric">
          <div class="metric-label">Spent</div>
          <div class="metric-value amber">${fmtAUDPos(stats.totalSpent)}</div>
          <div class="metric-sub">bills + variable</div>
        </div>
        <div class="metric">
          <div class="metric-label">Period</div>
          <div class="metric-value">${Math.round(stats.periodProgress * 100)}%</div>
          <div class="metric-sub">done</div>
        </div>
      </div>

      ${alerts.map(a => `
        <div class="alert-bar ${a.type}">
          <i class="ti ${a.icon}"></i>
          <span>${a.message}</span>
        </div>
      `).join('')}

      <div class="card">
        <div class="card-title">Spending pace</div>
        <div class="pace-chart">
          ${pace.map(d => `
            <div class="pace-day">
              <div class="pace-bar-wrap">
                <div class="pace-bar ${d.isToday ? 'today' : d.isPast ? 'past' : 'future'}"
                     style="height: ${Math.max(d.heightPct, 2)}%"></div>
              </div>
              <div class="pace-label ${d.isToday ? 'today' : ''}">${d.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="pace-legend">
          <span><span class="legend-dot past"></span>Actual</span>
          <span><span class="legend-dot future"></span>Projected</span>
          <span><span class="legend-dot today"></span>Today</span>
        </div>
      </div>

      ${stats.variableCats.length ? `
      <div class="card">
        <div class="card-title">Variable budgets</div>
        ${stats.variableCats.map(cat => {
          const cs = stats.byCategory[cat.id] || {};
          const pct = Math.min((cs.pct || 0) * 100, 100);
          const status = cs.status || 'ok';
          return `
          <div class="budget-row">
            <div class="budget-row-top">
              <span class="budget-name"><i class="ti ${cat.icon}"></i> ${cat.name}</span>
              <span class="budget-amounts">
                ${fmtAUDPos(cs.spent || 0)} / ${fmtAUDPos(cat.budget)}
                ${status !== 'ok' ? `<span class="pill ${status}">${status === 'over' ? 'over' : 'fast'}</span>` : ''}
              </span>
            </div>
            <div class="progress-track">
              <div class="progress-fill ${status}" style="width:${pct}%"></div>
            </div>
            <div class="budget-sub ${status === 'over' ? 'red' : ''}">
              ${cs.remaining >= 0 ? fmtAUDPos(cs.remaining) + ' remaining' : fmtAUDPos(Math.abs(cs.remaining)) + ' over'}
            </div>
          </div>`;
        }).join('')}
      </div>` : ''}

      ${stats.fixedCats.length ? `
      <div class="card">
        <div class="card-title">Fixed bills this period</div>
        <div class="bills-chips">
          ${stats.fixedCats.map(cat => `
            <div class="bill-chip">
              <div class="bill-chip-label">${cat.name}</div>
              <div class="bill-chip-value">${fmtAUDPos(cat.budget)}</div>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

      <div style="height: 20px"></div>
    </div>
  `;

  // Re-init drawer toggle
  document.getElementById('drawer-toggle')?.addEventListener('click', () => {
    import('../drawer.js').then(({ toggleDrawer }) => toggleDrawer());
  });
}
