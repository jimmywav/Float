// router.js — Client-side view router (no URL changes, pure in-memory)
// Views: dashboard, transactions, gig, history, settings, categories

import { renderDashboard }    from './ui/dashboard.js';
import { renderTransactions } from './ui/transactions.js';
import { renderGig }          from './ui/gig.js';
import { renderHistory }      from './ui/history.js';
import { renderSettings }     from './ui/settings.js';
import { renderCategories }   from './ui/settings.js';

let _currentView   = 'dashboard';
let _currentParams = {};
let _state         = null; // shared app state (settings, categories)

const VIEW_RENDERERS = {
  dashboard:    renderDashboard,
  transactions: renderTransactions,
  gig:          renderGig,
  history:      renderHistory,
  settings:     renderSettings,
  categories:   renderCategories,
};

/** Set the shared state so all views can access it */
export function setAppState(state) {
  _state = state;
}

export function getAppState() {
  return _state;
}

/** Navigate to a view, optionally with params */
export function navigate(view, params = {}) {
  _currentView   = view;
  _currentParams = params;
  renderCurrentView();
  closeDrawer();
}

export function currentView() {
  return _currentView;
}

/** Re-render the current view (after data changes) */
export function rerender() {
  renderCurrentView();
}

function renderCurrentView() {
  const main = document.getElementById('main');
  if (!main) return;

  const renderer = VIEW_RENDERERS[_currentView];
  if (!renderer) {
    main.innerHTML = `<div class="empty-state">View not found: ${_currentView}</div>`;
    return;
  }

  renderer(main, _currentParams, _state);
  updateDrawerActiveItem(_currentView);
}

function updateDrawerActiveItem(view) {
  document.querySelectorAll('.dr-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
}

function closeDrawer() {
  const drawer = document.getElementById('drawer');
  if (drawer) drawer.classList.remove('open');
}
