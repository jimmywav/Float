// drawer.js — Drawer open/close + swipe gestures

let touchStartX = 0;
let touchStartY = 0;
let drawerOpen  = false;

export function initDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  const toggle  = document.getElementById('drawer-toggle');

  if (!drawer) return;

  // Hamburger button
  toggle?.addEventListener('click', () => toggleDrawer());

  // Overlay tap closes drawer
  overlay?.addEventListener('click', () => closeDrawer());

  // Drawer nav items
  drawer.querySelectorAll('.dr-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      import('./router.js').then(({ navigate }) => navigate(el.dataset.view));
    });
  });

  // Global swipe detection
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
}

function onTouchStart(e) {
  touchStartX = e.changedTouches[0].clientX;
  touchStartY = e.changedTouches[0].clientY;
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;

  // Only register mostly-horizontal swipes
  if (Math.abs(dy) > Math.abs(dx) * 1.5) return;

  if (!drawerOpen && dx > 70 && touchStartX < 35) {
    // Swipe right from left edge → open drawer
    openDrawer();
  } else if (drawerOpen && dx < -60) {
    // Swipe left → close drawer
    closeDrawer();
  }
}

export function openDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  drawer?.classList.add('open');
  overlay?.classList.add('visible');
  drawerOpen = true;
}

export function closeDrawer() {
  const drawer  = document.getElementById('drawer');
  const overlay = document.getElementById('drawer-overlay');
  drawer?.classList.remove('open');
  overlay?.classList.remove('visible');
  drawerOpen = false;
}

export function toggleDrawer() {
  drawerOpen ? closeDrawer() : openDrawer();
}

/**
 * Init swipe-to-reveal on transaction items.
 * Call after transactions are rendered into the DOM.
 */
export function initSwipeItems() {
  let activeItem = null;

  document.querySelectorAll('.tx-swipe').forEach(item => {
    let startX = 0;
    let startedOnItem = false;

    item.addEventListener('touchstart', e => {
      startX = e.changedTouches[0].clientX;
      startedOnItem = true;
    }, { passive: true });

    item.addEventListener('touchend', e => {
      if (!startedOnItem) return;
      startedOnItem = false;
      const dx = e.changedTouches[0].clientX - startX;

      if (dx < -55) {
        // Swipe left → reveal
        if (activeItem && activeItem !== item) {
          activeItem.classList.remove('revealed');
        }
        item.classList.add('revealed');
        activeItem = item;
      } else if (dx > 30) {
        // Swipe right → hide
        item.classList.remove('revealed');
        if (activeItem === item) activeItem = null;
      }
    }, { passive: true });
  });

  // Tap anywhere else collapses revealed items
  document.addEventListener('touchstart', e => {
    if (activeItem && !activeItem.contains(e.target)) {
      activeItem.classList.remove('revealed');
      activeItem = null;
    }
  }, { passive: true });
}
