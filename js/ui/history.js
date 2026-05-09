// ui/history.js
import { getAllPeriods, getMonthlyStats, fmtDuration } from '../history.js';
import { formatDuration } from '../transactions.js';

function fmtAUD(n) { return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2); }
function fmtPos(n) { return '$' + Math.abs(n).toFixed(2); }

let _histTab = 'periods'; // 'periods' | 'monthly'

export async function renderHistory(container, params, state) {
  const { settings, categories } = state;

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="drawer-toggle"><span class="hb"><span class="hbl"></span><span class="hbl"></span><span class="hbl"></span></span></button>
      <div class="topbar-text"><div class="topbar-title">History</div></div>
    </div>
    <div class="scroll-body" style="padding-bottom:16px">
      <div class="hist-toggle">
        <button class="hist-tab ${_histTab==='periods'?'on':''}" data-tab="periods">By period</button>
        <button class="hist-tab ${_histTab==='monthly'?'on':''}" data-tab="monthly">By month</button>
      </div>
      <div id="hist-content"><div class="loading">Loading…</div></div>
    </div>`;

  document.getElementById('drawer-toggle')?.addEventListener('click', () =>
    import('../drawer.js').then(({toggleDrawer}) => toggleDrawer()));

  container.querySelectorAll('.hist-tab').forEach(btn =>
    btn.addEventListener('click', () => {
      _histTab = btn.dataset.tab;
      renderHistory(container, params, state);
    }));

  const content = container.querySelector('#hist-content');

  if (_histTab === 'periods') {
    const periods = await getAllPeriods(settings, categories);
    content.innerHTML = periods.map(p => {
      const badge = p.isCurrent
        ? `<span class="pill info">${Math.round(p.periodProgress*100)}% done</span>`
        : p.remaining >= 0
          ? `<span class="pill ok">Saved ${fmtPos(p.remaining)}</span>`
          : `<span class="pill over">Over by ${fmtPos(Math.abs(p.remaining))}</span>`;

      return `
        <div class="week-card">
          <div class="wc-head">
            <div>
              <div class="wc-label">${p.label}</div>
              <div class="wc-sub">${p.isCurrent ? 'In progress' : 'Completed'}</div>
            </div>
            ${badge}
          </div>
          <div class="wc-body">
            <div class="wc-row"><span class="wc-key">Base income</span><span class="wc-val">${fmtPos(p.baseIncome)}</span></div>
            <div class="wc-row"><span class="wc-key">Gig income</span><span class="wc-val green">+${fmtPos(p.gigIncome)}</span></div>
            <div class="wc-row"><span class="wc-key">Fixed bills</span><span class="wc-val">-${fmtPos(p.fixedTotal)}</span></div>
            <div class="wc-row"><span class="wc-key">Variable spent</span><span class="wc-val">-${fmtPos(p.variableSpent)}</span></div>
            <div class="wc-divider"></div>
            <div class="wc-row">
              <span class="wc-key bold">Remaining</span>
              <span class="wc-val bold ${p.remaining >= 0 ? 'green' : 'red'}">${fmtAUD(p.remaining)}</span>
            </div>
          </div>
        </div>`;
    }).join('') || '<div class="empty-state">No history yet.</div>';

  } else {
    const months = await getMonthlyStats(settings, categories);
    content.innerHTML = months.map(m => {
      const catMap = {};
      categories.forEach(c => catMap[c.id] = c);
      const varCats = categories.filter(c => c.type === 'variable');

      return `
        <div class="week-card">
          <div class="wc-head">
            <div><div class="wc-label">${m.label}</div></div>
            <span class="pill ${m.remaining >= 0 ? 'ok' : 'over'}">${m.remaining >= 0 ? 'Net +' : 'Net '}${fmtPos(m.remaining)}</span>
          </div>
          <div class="wc-body">
            <div class="wc-row"><span class="wc-key">Total in</span><span class="wc-val green">${fmtPos(m.totalIncome)}</span></div>
            <div class="wc-row"><span class="wc-key">Gig income</span><span class="wc-val green">+${fmtPos(m.totalGigIncome)}</span></div>
            <div class="wc-row"><span class="wc-key">Total out</span><span class="wc-val red">-${fmtPos(m.totalSpent)}</span></div>
            ${m.gigRunCount > 0 ? `
            <div class="wc-divider"></div>
            <div class="wc-row"><span class="wc-key">Gig runs</span><span class="wc-val">${m.gigRunCount} · ${fmtDuration(m.gigTotalMinutes)}</span></div>
            ` : ''}
            ${varCats.length ? `
            <div class="wc-divider"></div>
            <div class="wc-sub-title">By category</div>
            ${varCats.map(cat => {
              const spent = m.spentByCat[cat.id] || 0;
              const budget = cat.budget * m.periods.length;
              const pct = budget > 0 ? Math.min((spent/budget)*100, 100) : 0;
              return `
                <div class="hist-cat-row">
                  <div class="hist-cat-top">
                    <span class="hist-cat-name"><i class="ti ${cat.icon}"></i> ${cat.name}</span>
                    <span class="hist-cat-val">${fmtPos(spent)}</span>
                  </div>
                  <div class="progress-track sm">
                    <div class="progress-fill ${pct>=100?'over':pct>75?'caution':'ok'}" style="width:${pct}%"></div>
                  </div>
                </div>`;
            }).join('')}` : ''}
          </div>
        </div>`;
    }).join('') || '<div class="empty-state">No history yet.</div>';
  }
}
