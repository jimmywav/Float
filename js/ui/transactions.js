// ui/transactions.js
import { getTransactionsGroupedByDay } from '../transactions.js';
import { currentPeriodKey, prevPeriodKey, nextPeriodKey, getPeriodLabel, today } from '../periods.js';
import { navigate, getAppState } from '../router.js';
import { showExpenseSheet, showGigSheet, showDeleteConfirm } from './modals.js';
import { initSwipeItems } from '../drawer.js';
import { formatDuration } from '../transactions.js';

function fmtAUD(n) { return '$' + Math.abs(n).toFixed(2); }

let _viewingPeriod = null;

export async function renderTransactions(container, params, state) {
  const { settings, categories } = state;
  const catMap = {};
  categories.forEach(c => catMap[c.id] = c);

  if (!_viewingPeriod) _viewingPeriod = currentPeriodKey(settings);

  const label    = getPeriodLabel(_viewingPeriod, params?.periodKey ? _viewingPeriod : _viewingPeriod, settings);
  const groups   = await getTransactionsGroupedByDay(_viewingPeriod);
  const dates    = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const isCurrent = _viewingPeriod === currentPeriodKey(settings);

  // Filter
  const filter = params?.filter || 'all';

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="drawer-toggle" aria-label="Menu">
        <span class="hb"><span class="hbl"></span><span class="hbl"></span><span class="hbl"></span></span>
      </button>
      <div class="topbar-text">
        <div class="topbar-title">Transactions</div>
      </div>
    </div>

    <div class="scroll-body" style="padding-bottom: 16px">
      <div class="period-nav">
        <button class="icon-btn period-arr" id="prev-period"><i class="ti ti-chevron-left"></i></button>
        <span class="period-nav-label">${getPeriodLabel(_viewingPeriod, settings)}</span>
        <button class="icon-btn period-arr ${isCurrent ? 'disabled' : ''}" id="next-period" ${isCurrent ? 'disabled' : ''}>
          <i class="ti ti-chevron-right"></i>
        </button>
      </div>

      <div class="chips">
        <button class="chip ${filter === 'all'      ? 'on' : ''}" data-filter="all">All</button>
        <button class="chip ${filter === 'expense'  ? 'on' : ''}" data-filter="expense">Expenses</button>
        <button class="chip ${filter === 'gig'      ? 'on' : ''}" data-filter="gig">Gig runs</button>
      </div>

      <div class="swipe-hint"><i class="ti ti-arrow-left"></i> Swipe left to edit or delete</div>

      ${dates.length === 0 ? `<div class="empty-state">No transactions this period.</div>` : ''}

      ${dates.map(date => {
        const txs = groups[date].filter(t => filter === 'all' || t.type === filter);
        if (!txs.length) return '';

        const d = new Date(date + 'T00:00:00');
        const dateLabel = d.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });

        return `
          <div class="day-group">
            <div class="day-label">${dateLabel}</div>
            ${txs.map(tx => {
              const cat = catMap[tx.categoryId];
              const icon = tx.type === 'gig' ? 'ti-bike' : (cat?.icon || 'ti-tag');
              const name = tx.note || (tx.type === 'gig' ? 'Gig run' : cat?.name || '');
              const sub  = tx.type === 'gig'
                ? `Gig run · ${formatDuration(tx.totalMinutes)} · ${fmtAUD(tx.hourlyRate)}/hr`
                : cat?.name || '';

              return `
                <div class="tx-swipe" data-id="${tx.id}" data-type="${tx.type}">
                  <div class="tx-main">
                    <div class="tx-icon ${tx.type === 'gig' ? 'gig' : ''}">
                      <i class="ti ${icon}"></i>
                    </div>
                    <div class="tx-info">
                      <div class="tx-name">${name}</div>
                      <div class="tx-cat">${sub}</div>
                    </div>
                    <div class="tx-amount ${tx.type === 'gig' ? 'income' : 'expense'}">
                      ${tx.type === 'gig' ? '+' : '-'}${fmtAUD(tx.amount)}
                    </div>
                  </div>
                  <div class="tx-actions">
                    <button class="tx-action edit" data-id="${tx.id}" aria-label="Edit">
                      <i class="ti ti-edit"></i>
                    </button>
                    <button class="tx-action delete" data-id="${tx.id}" aria-label="Delete">
                      <i class="ti ti-trash"></i>
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>`;
      }).join('')}
    </div>
  `;

  // Events
  document.getElementById('drawer-toggle')?.addEventListener('click', () => {
    import('../drawer.js').then(({ toggleDrawer }) => toggleDrawer());
  });

  document.getElementById('prev-period')?.addEventListener('click', () => {
    _viewingPeriod = prevPeriodKey(_viewingPeriod, settings);
    renderTransactions(container, params, state);
  });

  document.getElementById('next-period')?.addEventListener('click', () => {
    if (isCurrent) return;
    _viewingPeriod = nextPeriodKey(_viewingPeriod, settings);
    renderTransactions(container, params, state);
  });

  container.querySelectorAll('.chip').forEach(btn => {
    btn.addEventListener('click', () => {
      renderTransactions(container, { ...params, filter: btn.dataset.filter }, state);
    });
  });

  // Build a flat lookup of transactions by ID
  const allTxs = dates.flatMap(d => groups[d]);
  const txById = {};
  allTxs.forEach(t => txById[t.id] = t);

  container.querySelectorAll('.tx-action.edit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const tx = txById[btn.dataset.id];
      if (!tx) return;
      if (tx.type === 'gig') await showGigSheet(tx);
      else await showExpenseSheet(tx);
    });
  });

  container.querySelectorAll('.tx-action.delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const tx = txById[btn.dataset.id];
      if (!tx) return;
      const cat = catMap[tx.categoryId];
      showDeleteConfirm(tx, cat?.name);
    });
  });

  initSwipeItems();
}
