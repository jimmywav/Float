// ui/gig.js — Gig runs view
import { getTransactionsForPeriod, formatDuration } from '../transactions.js';
import { computeGigStats } from '../budget.js';
import { currentPeriodKey, getPeriodLabel, prevPeriodKey, nextPeriodKey } from '../periods.js';
import { getAppState } from '../router.js';
import { showGigSheet, showDeleteConfirm } from './modals.js';
import { initSwipeItems } from '../drawer.js';

function fmtAUD(n) { return '$' + Math.abs(n).toFixed(2); }

let _gigPeriod = null;

export async function renderGig(container, params, state) {
  const { settings } = state;
  if (!_gigPeriod) _gigPeriod = currentPeriodKey(settings);

  const txs     = await getTransactionsForPeriod(_gigPeriod);
  const runs    = txs.filter(t => t.type === 'gig').sort((a,b) => b.date.localeCompare(a.date));
  const gstats  = computeGigStats(runs);
  const isCurrent = _gigPeriod === currentPeriodKey(settings);

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="drawer-toggle"><span class="hb"><span class="hbl"></span><span class="hbl"></span><span class="hbl"></span></span></button>
      <div class="topbar-text"><div class="topbar-title">Gig runs</div></div>
    </div>
    <div class="scroll-body" style="padding-bottom:16px">
      <div class="period-nav">
        <button class="icon-btn period-arr" id="prev-gig"><i class="ti ti-chevron-left"></i></button>
        <span class="period-nav-label">${getPeriodLabel(_gigPeriod, settings)}</span>
        <button class="icon-btn period-arr ${isCurrent?'disabled':''}" id="next-gig" ${isCurrent?'disabled':''}>
          <i class="ti ti-chevron-right"></i></button>
      </div>
      <div class="gig-hero">
        <div class="gig-hero-label">Earned this period</div>
        <div class="gig-hero-val">${fmtAUD(gstats.totalEarned)}</div>
        <div class="gig-hero-sub">
          ${gstats.runCount} run${gstats.runCount!==1?'s':''} ·
          ${formatDuration(gstats.totalMinutes)} clocked ·
          ${gstats.avgHourlyRate > 0 ? 'avg ' + fmtAUD(gstats.avgHourlyRate) + '/hr' : 'no time logged'}
        </div>
        ${gstats.runCount > 1 ? `
        <div class="gig-rate-row">
          <span class="gig-rate-item best"><i class="ti ti-trending-up"></i> Best ${fmtAUD(gstats.bestRate)}/hr</span>
          <span class="gig-rate-item worst"><i class="ti ti-trending-down"></i> Worst ${fmtAUD(gstats.worstRate)}/hr</span>
        </div>` : ''}
      </div>
      <div class="card">
        ${runs.length === 0
          ? '<div class="empty-state">No gig runs logged this period.</div>'
          : `<div class="card-title">This period's runs</div>
             <div class="swipe-hint"><i class="ti ti-arrow-left"></i> Swipe to edit or delete</div>
             ${runs.map(r => `
              <div class="tx-swipe run-item" data-id="${r.id}">
                <div class="tx-main">
                  <div class="tx-icon gig"><i class="ti ti-bike"></i></div>
                  <div class="tx-info">
                    <div class="tx-name">${r.note || 'Gig run'}</div>
                    <div class="tx-cat">${r.date} · ${formatDuration(r.totalMinutes)}</div>
                  </div>
                  <div class="run-right">
                    <div class="tx-amount income">+${fmtAUD(r.amount)}</div>
                    ${r.hourlyRate > 0 ? `<div class="run-rate">${fmtAUD(r.hourlyRate)}/hr</div>` : ''}
                  </div>
                </div>
                <div class="tx-actions">
                  <button class="tx-action edit" data-id="${r.id}"><i class="ti ti-edit"></i></button>
                  <button class="tx-action delete" data-id="${r.id}"><i class="ti ti-trash"></i></button>
                </div>
              </div>`).join('')}`
        }
      </div>
    </div>`;

  document.getElementById('drawer-toggle')?.addEventListener('click', () =>
    import('../drawer.js').then(({toggleDrawer}) => toggleDrawer()));
  document.getElementById('prev-gig')?.addEventListener('click', () => {
    _gigPeriod = prevPeriodKey(_gigPeriod, settings);
    renderGig(container, params, state);
  });
  document.getElementById('next-gig')?.addEventListener('click', () => {
    if (!isCurrent) { _gigPeriod = nextPeriodKey(_gigPeriod, settings); renderGig(container, params, state); }
  });

  const byId = {};
  runs.forEach(r => byId[r.id] = r);
  container.querySelectorAll('.tx-action.edit').forEach(btn =>
    btn.addEventListener('click', () => showGigSheet(byId[btn.dataset.id])));
  container.querySelectorAll('.tx-action.delete').forEach(btn =>
    btn.addEventListener('click', () => showDeleteConfirm(byId[btn.dataset.id], 'Gig run')));

  initSwipeItems();
}
