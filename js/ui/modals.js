// ui/modals.js — Bottom sheets and modals
import { addExpense, addGigRun, updateTransaction, deleteTransaction } from '../transactions.js';
import { getCategories } from '../settings.js';
import { rerender, getAppState } from '../router.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtAUD(n) {
  return '$' + Math.abs(n).toFixed(2);
}

function showSheet(el) {
  el.classList.add('visible');
  document.body.classList.add('sheet-open');
}

function hideSheet(el) {
  el.classList.remove('visible');
  document.body.classList.remove('sheet-open');
}

function getSheetContainer() {
  return document.getElementById('sheet-container');
}

// ─── FAB Speed Dial ───────────────────────────────────────────────────────────

export function initFAB() {
  const fab = document.getElementById('fab');
  const dial = document.getElementById('fab-dial');

  fab?.addEventListener('click', () => {
    dial.classList.toggle('visible');
  });

  document.getElementById('fab-expense')?.addEventListener('click', () => {
    dial.classList.remove('visible');
    showExpenseSheet();
  });

  document.getElementById('fab-gig')?.addEventListener('click', () => {
    dial.classList.remove('visible');
    showGigSheet();
  });

  // Tap elsewhere closes dial
  document.addEventListener('touchstart', e => {
    if (!fab.contains(e.target) && !dial.contains(e.target)) {
      dial.classList.remove('visible');
    }
  }, { passive: true });
}

// ─── Expense Bottom Sheet ─────────────────────────────────────────────────────

export async function showExpenseSheet(existingTx = null) {
  const state      = getAppState();
  const categories = state.categories.filter(c => c.type === 'variable');
  const stats      = state.lastStats;

  const el = document.getElementById('expense-sheet');
  const isEdit = !!existingTx;

  // Populate category grid
  const catGrid = el.querySelector('.cat-grid');
  catGrid.innerHTML = categories.map(cat => {
    const rem = stats?.byCategory?.[cat.id]?.remaining ?? cat.budget;
    const sel = existingTx?.categoryId === cat.id;
    return `
      <button class="cat-btn ${sel ? 'sel' : ''}" data-id="${cat.id}" data-rem="${rem}">
        <i class="ti ${cat.icon}"></i>
        <span>${cat.name}</span>
      </button>`;
  }).join('');

  // Amount input
  const amtInput  = el.querySelector('.amt-val-input');
  const remHint   = el.querySelector('.amt-hint');
  const noteInput = el.querySelector('.note-input');
  const saveBtn   = el.querySelector('.save-btn');
  const titleEl   = el.querySelector('.sheet-title');

  titleEl.textContent = isEdit ? 'Edit expense' : 'Log expense';
  amtInput.value = existingTx ? existingTx.amount.toFixed(2) : '';
  noteInput.value = existingTx?.note || '';

  let selectedCatId = existingTx?.categoryId || categories[0]?.id || null;

  function updateHint() {
    const btn = catGrid.querySelector(`[data-id="${selectedCatId}"]`);
    if (!btn) return;
    const rem = parseFloat(btn.dataset.rem);
    const amt = parseFloat(amtInput.value) || 0;
    const after = rem - amt;
    remHint.textContent = after >= 0
      ? `${fmtAUD(rem)} remaining in ${btn.querySelector('span').textContent}`
      : `${fmtAUD(Math.abs(after))} over ${btn.querySelector('span').textContent} budget`;
    remHint.className = 'amt-hint' + (after < 0 ? ' warn' : '');
  }

  // Select first cat by default
  catGrid.querySelector(`[data-id="${selectedCatId}"]`)?.classList.add('sel');
  updateHint();

  catGrid.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    catGrid.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('sel'));
    btn.classList.add('sel');
    selectedCatId = btn.dataset.id;
    updateHint();
  });

  amtInput.addEventListener('input', updateHint);

  saveBtn.onclick = async () => {
    const amount = parseFloat(amtInput.value);
    if (!amount || amount <= 0 || !selectedCatId) return;

    if (isEdit) {
      await updateTransaction(existingTx.id, {
        categoryId: selectedCatId,
        amount,
        note: noteInput.value,
      }, state.settings);
    } else {
      await addExpense({ categoryId: selectedCatId, amount, note: noteInput.value }, state.settings);
    }

    hideSheet(el);
    await rerender();
  };

  el.querySelector('.close-btn').onclick = () => hideSheet(el);
  el.querySelector('.sheet-handle').onclick = () => hideSheet(el);

  showSheet(el);
}

// ─── Gig Run Bottom Sheet ─────────────────────────────────────────────────────

export async function showGigSheet(existingTx = null) {
  const state  = getAppState();
  const el     = document.getElementById('gig-sheet');
  const isEdit = !!existingTx;

  const amtInput  = el.querySelector('.gig-amt-input');
  const hrInput   = el.querySelector('.gig-hr-input');
  const minInput  = el.querySelector('.gig-min-input');
  const noteInput = el.querySelector('.gig-note-input');
  const rateEl    = el.querySelector('.rate-preview');
  const saveBtn   = el.querySelector('.save-btn');
  const titleEl   = el.querySelector('.sheet-title');

  titleEl.textContent = isEdit ? 'Edit gig run' : 'Log gig run';
  amtInput.value  = existingTx ? existingTx.amount.toFixed(2) : '';
  hrInput.value   = existingTx?.hours   ?? 0;
  minInput.value  = existingTx?.minutes ?? 0;
  noteInput.value = existingTx?.note    || '';

  function updateRate() {
    const amt = parseFloat(amtInput.value) || 0;
    const hrs = (parseInt(hrInput.value) || 0) + (parseInt(minInput.value) || 0) / 60;
    if (amt > 0 && hrs > 0) {
      rateEl.textContent = `Est. ${fmtAUD(amt / hrs)}/hr for this run`;
      rateEl.style.display = 'block';
    } else {
      rateEl.style.display = 'none';
    }
  }

  [amtInput, hrInput, minInput].forEach(i => i.addEventListener('input', updateRate));
  updateRate();

  saveBtn.onclick = async () => {
    const amount  = parseFloat(amtInput.value);
    const hours   = parseInt(hrInput.value)  || 0;
    const minutes = parseInt(minInput.value) || 0;
    if (!amount || amount <= 0) return;

    if (isEdit) {
      await updateTransaction(existingTx.id, {
        amount, hours, minutes, note: noteInput.value
      }, state.settings);
    } else {
      await addGigRun({ amount, hours, minutes, note: noteInput.value }, state.settings);
    }

    hideSheet(el);
    await rerender();
  };

  el.querySelector('.close-btn').onclick = () => hideSheet(el);
  el.querySelector('.sheet-handle').onclick = () => hideSheet(el);

  showSheet(el);
}

// ─── Delete Confirmation ──────────────────────────────────────────────────────

export function showDeleteConfirm(tx, catName) {
  const el      = document.getElementById('delete-modal');
  const titleEl = el.querySelector('.del-tx-name');
  const metaEl  = el.querySelector('.del-tx-meta');

  titleEl.textContent = tx.note || (tx.type === 'gig' ? 'Gig run' : catName || 'Transaction');
  metaEl.textContent  = tx.type === 'gig'
    ? `Gig run · ${fmtAUD(tx.amount)}`
    : `${catName} · ${fmtAUD(tx.amount)}`;

  el.querySelector('.btn-confirm-delete').onclick = async () => {
    await deleteTransaction(tx.id);
    el.classList.remove('visible');
    await rerender();
  };

  el.querySelector('.btn-cancel-delete').onclick = () => el.classList.remove('visible');
  el.classList.add('visible');
}
