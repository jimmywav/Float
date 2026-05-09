// ui/settings.js
import { getAllSettings, setSetting, getCategories, saveCategory, deleteCategory, genId } from '../settings.js';
import { navigate, getAppState, setAppState } from '../router.js';

function fmtAUD(n) { return '$' + Math.abs(n).toFixed(2); }

const ICONS = [
  'ti-home','ti-wifi','ti-device-mobile','ti-shopping-cart','ti-coffee',
  'ti-car','ti-device-gamepad','ti-shirt','ti-heart','ti-paw',
  'ti-plane','ti-tool','ti-music','ti-book','ti-gym','ti-bike',
  'ti-pill','ti-baby-carriage','ti-dog','ti-cash','ti-dots',
];

export async function renderSettings(container, params, state) {
  const s = state.settings;

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="drawer-toggle"><span class="hb"><span class="hbl"></span><span class="hbl"></span><span class="hbl"></span></span></button>
      <div class="topbar-text"><div class="topbar-title">Settings</div></div>
    </div>
    <div class="scroll-body" style="padding-bottom:24px">

      <div class="settings-section">
        <div class="settings-section-title">Income</div>
        <div class="si">
          <div><div class="si-label">Pay cycle</div></div>
          <div class="seg" id="cycle-seg">
            <button class="seg-opt ${s.payCycle==='fortnightly'?'on':''}" data-val="fortnightly">Fortnight</button>
            <button class="seg-opt ${s.payCycle==='weekly'?'on':''}" data-val="weekly">Weekly</button>
          </div>
        </div>
        <div class="si">
          <div>
            <div class="si-label" id="income-label">${s.payCycle==='fortnightly'?'Fortnightly':'Weekly'} income</div>
          </div>
          <div class="si-right">
            <input class="si-input" id="income-input" type="number" min="0" step="0.01"
              value="${s.income || ''}" placeholder="0.00" inputmode="decimal">
          </div>
        </div>
        <div class="si">
          <div><div class="si-label">Pay day</div></div>
          <div class="si-right">
            <select class="si-select" id="payday-select">
              ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i) =>
                `<option value="${i}" ${s.payDay===i?'selected':''}>${d}</option>`
              ).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Budgets</div>
        <div class="si tappable" id="goto-categories">
          <div><div class="si-label">Manage categories</div><div class="si-sub">${state.categories.length} configured</div></div>
          <div class="si-right"><i class="ti ti-chevron-right"></i></div>
        </div>
        <div class="si">
          <div><div class="si-label">Roll over unspent budget</div><div class="si-sub">Carry unused variable budget forward</div></div>
          <div class="switch ${s.rollover?'on':''}" id="sw-rollover"></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Alerts</div>
        <div class="si">
          <div><div class="si-label">Spending pace alerts</div><div class="si-sub">Warn when running over pace</div></div>
          <div class="switch ${s.alertPace?'on':''}" id="sw-alertPace"></div>
        </div>
        <div class="si">
          <div><div class="si-label">Over-budget alert</div><div class="si-sub">Notify when a category exceeds limit</div></div>
          <div class="switch ${s.alertOver?'on':''}" id="sw-alertOver"></div>
        </div>
        <div class="si">
          <div><div class="si-label">Period summary</div><div class="si-sub">Recap on the last day of pay period</div></div>
          <div class="switch ${s.alertSummary?'on':''}" id="sw-alertSummary"></div>
        </div>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Data</div>
        <div class="si tappable" id="export-btn">
          <div><div class="si-label">Export all data</div><div class="si-sub">Download as CSV</div></div>
          <div class="si-right"><i class="ti ti-download"></i></div>
        </div>
        <div class="si tappable danger" id="clear-btn">
          <div><div class="si-label">Clear all data</div></div>
          <div class="si-right"><i class="ti ti-trash"></i></div>
        </div>
      </div>

      <div class="settings-footer">float v1.0 · Offline PWA · Data stored on-device</div>
    </div>`;

  // Drawer
  document.getElementById('drawer-toggle')?.addEventListener('click', () =>
    import('../drawer.js').then(({toggleDrawer}) => toggleDrawer()));

  // Pay cycle segment
  document.getElementById('cycle-seg').querySelectorAll('.seg-opt').forEach(btn => {
    btn.addEventListener('click', async () => {
      const val = btn.dataset.val;
      await setSetting('payCycle', val);
      document.getElementById('income-label').textContent =
        (val === 'fortnightly' ? 'Fortnightly' : 'Weekly') + ' income';
      document.querySelectorAll('#cycle-seg .seg-opt').forEach(b => b.classList.toggle('on', b.dataset.val === val));
      const newState = { ...state, settings: { ...state.settings, payCycle: val } };
      setAppState(newState);
    });
  });

  // Income
  document.getElementById('income-input').addEventListener('change', async e => {
    const val = parseFloat(e.target.value) || 0;
    await setSetting('income', val);
    setAppState({ ...getAppState(), settings: { ...getAppState().settings, income: val } });
  });

  // Pay day
  document.getElementById('payday-select').addEventListener('change', async e => {
    await setSetting('payDay', parseInt(e.target.value));
  });

  // Categories link
  document.getElementById('goto-categories')?.addEventListener('click', () => navigate('categories'));

  // Toggles
  ['rollover','alertPace','alertOver','alertSummary'].forEach(key => {
    const sw = document.getElementById(`sw-${key}`);
    sw?.addEventListener('click', async () => {
      const newVal = !sw.classList.contains('on');
      sw.classList.toggle('on', newVal);
      await setSetting(key, newVal);
      setAppState({ ...getAppState(), settings: { ...getAppState().settings, [key]: newVal } });
    });
  });

  // Export
  document.getElementById('export-btn')?.addEventListener('click', exportCSV);

  // Clear
  document.getElementById('clear-btn')?.addEventListener('click', () => {
    if (confirm('Clear ALL data? This cannot be undone.')) {
      indexedDB.deleteDatabase('float');
      location.reload();
    }
  });
}

export async function renderCategories(container, params, state) {
  const cats = await getCategories();
  const fixed = cats.filter(c => c.type === 'fixed');
  const variable = cats.filter(c => c.type === 'variable');

  function catRowHTML(cat) {
    return `
      <div class="cat-list-item tappable" data-id="${cat.id}">
        <div class="cat-list-icon"><i class="ti ${cat.icon}"></i></div>
        <div class="cat-list-info">
          <div class="cat-list-name">${cat.name}</div>
          <div class="cat-list-budget">${fmtAUD(cat.budget)} / period <span class="pill ${cat.type==='fixed'?'fx':'vr'}">${cat.type}</span></div>
        </div>
        <i class="ti ti-chevron-right" style="color:var(--text3)"></i>
      </div>`;
  }

  container.innerHTML = `
    <div class="topbar">
      <button class="icon-btn" id="back-btn"><i class="ti ti-chevron-left"></i></button>
      <div class="topbar-text"><div class="topbar-title">Categories</div></div>
    </div>
    <div class="scroll-body" style="padding-bottom:24px">
      <div class="settings-help">Tap to edit. Fixed bills are deducted automatically each period.</div>
      ${fixed.length ? `<div class="settings-section"><div class="settings-section-title">Fixed bills</div>${fixed.map(catRowHTML).join('')}</div>` : ''}
      ${variable.length ? `<div class="settings-section"><div class="settings-section-title">Variable budgets</div>${variable.map(catRowHTML).join('')}</div>` : ''}
      <button class="add-cat-btn" id="add-cat"><i class="ti ti-plus"></i> Add category</button>
    </div>`;

  document.getElementById('back-btn')?.addEventListener('click', () => navigate('settings'));
  document.getElementById('drawer-toggle')?.addEventListener('click', () =>
    import('../drawer.js').then(({toggleDrawer}) => toggleDrawer()));

  const catById = {};
  cats.forEach(c => catById[c.id] = c);

  container.querySelectorAll('.cat-list-item').forEach(el => {
    el.addEventListener('click', () => showCatModal(catById[el.dataset.id], container, params, state));
  });
  document.getElementById('add-cat')?.addEventListener('click', () => showCatModal(null, container, params, state));
}

function showCatModal(cat, container, params, state) {
  const isEdit = !!cat;
  const modal = document.getElementById('cat-modal');

  modal.querySelector('.sheet-title').textContent = isEdit ? 'Edit category' : 'Add category';
  modal.querySelector('#cat-name-input').value    = cat?.name   || '';
  modal.querySelector('#cat-budget-input').value  = cat ? cat.budget.toFixed(2) : '';

  // Type toggle
  modal.querySelectorAll('.tt-btn').forEach(btn => {
    btn.classList.toggle('on', btn.dataset.type === (cat?.type || 'variable'));
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.tt-btn').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
    });
  });

  // Icon grid
  const iconGrid = modal.querySelector('.icon-grid');
  iconGrid.innerHTML = ICONS.map(ic => `
    <button class="icon-opt ${ic === (cat?.icon || 'ti-tag') ? 'sel' : ''}" data-icon="${ic}">
      <i class="ti ${ic}"></i>
    </button>`).join('');
  iconGrid.querySelectorAll('.icon-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      iconGrid.querySelectorAll('.icon-opt').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
    });
  });

  // Delete button
  const delBtn = modal.querySelector('.btn-delete-cat');
  delBtn.style.display = isEdit ? 'block' : 'none';
  delBtn.onclick = async () => {
    if (!confirm(`Delete "${cat.name}"? This won't delete past transactions.`)) return;
    await deleteCategory(cat.id);
    modal.classList.remove('visible');
    const newCats = await getCategories();
    setAppState({ ...getAppState(), categories: newCats });
    renderCategories(container, params, { ...state, categories: newCats });
  };

  // Save
  modal.querySelector('.save-btn').onclick = async () => {
    const name   = modal.querySelector('#cat-name-input').value.trim();
    const budget = parseFloat(modal.querySelector('#cat-budget-input').value) || 0;
    const type   = modal.querySelector('.tt-btn.on')?.dataset.type || 'variable';
    const icon   = modal.querySelector('.icon-opt.sel')?.dataset.icon || 'ti-tag';
    if (!name) return;

    const existing = await getCategories();
    const newCat = {
      id:        cat?.id || genId('cat'),
      name, budget, type, icon,
      order:     cat?.order ?? existing.length,
      createdAt: cat?.createdAt || Date.now(),
    };
    await saveCategory(newCat);
    modal.classList.remove('visible');

    const newCats = await getCategories();
    setAppState({ ...getAppState(), categories: newCats });
    renderCategories(container, params, { ...state, categories: newCats });
  };

  modal.querySelector('.close-btn').onclick = () => modal.classList.remove('visible');
  modal.classList.add('visible');
}

async function exportCSV() {
  const { getTransactionsForPeriod, getAllPeriodKeys } = await import('../transactions.js');
  const keys = await getAllPeriodKeys();
  const rows = [['Date','Period','Type','Category','Amount','Note','Hours','Minutes','Hourly Rate']];

  for (const key of keys) {
    const txs = await getTransactionsForPeriod(key);
    for (const t of txs) {
      rows.push([t.date, key, t.type, t.categoryId||'', t.amount, t.note||'', t.hours||'', t.minutes||'', t.hourlyRate||'']);
    }
  }

  const csv  = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = 'float-export.csv'; a.click();
  URL.revokeObjectURL(url);
}
