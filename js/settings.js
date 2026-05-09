// settings.js — Settings management + first-run defaults
import db from './db.js';

export const DEFAULT_CATEGORIES = [
  { id: 'cat_rent',    name: 'Rent',          type: 'fixed',    budget: 0,   icon: 'ti-home',           order: 0 },
  { id: 'cat_wifi',    name: 'Wifi',           type: 'fixed',    budget: 0,   icon: 'ti-wifi',           order: 1 },
  { id: 'cat_phone',   name: 'Phone plan',     type: 'fixed',    budget: 0,   icon: 'ti-device-mobile',  order: 2 },
  { id: 'cat_groc',    name: 'Groceries',      type: 'variable', budget: 0,   icon: 'ti-shopping-cart',  order: 3 },
  { id: 'cat_eat',     name: 'Eating out',     type: 'variable', budget: 0,   icon: 'ti-coffee',         order: 4 },
  { id: 'cat_trans',   name: 'Transport',      type: 'variable', budget: 0,   icon: 'ti-car',            order: 5 },
];

const DEFAULTS = {
  income:          0,
  payCycle:        'fortnightly',  // 'fortnightly' | 'weekly'
  payDay:          2,              // 0=Sun … 6=Sat (2 = Tuesday)
  rollover:        false,
  alertPace:       true,
  alertOver:       true,
  alertSummary:    false,
  seeded:          false,
};

/** Get a single setting value */
export async function getSetting(key) {
  const row = await db.get('settings', key);
  return row ? row.value : DEFAULTS[key];
}

/** Set a single setting */
export async function setSetting(key, value) {
  await db.put('settings', { key, value });
}

/** Get all settings as a flat object */
export async function getAllSettings() {
  const rows = await db.getAll('settings');
  const out = { ...DEFAULTS };
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Seed the database on first run */
export async function seedIfNeeded() {
  const seeded = await getSetting('seeded');
  if (seeded) return;

  // Write all defaults
  for (const [key, value] of Object.entries(DEFAULTS)) {
    await db.put('settings', { key, value });
  }

  // Write default categories
  for (const cat of DEFAULT_CATEGORIES) {
    await db.put('categories', { ...cat, createdAt: Date.now() });
  }

  await db.put('settings', { key: 'seeded', value: true });
}

/** Get all categories sorted by order */
export async function getCategories() {
  const cats = await db.getAll('categories');
  return cats.sort((a, b) => a.order - b.order);
}

/** Save a category (insert or update) */
export async function saveCategory(cat) {
  await db.put('categories', { ...cat, updatedAt: Date.now() });
}

/** Delete a category */
export async function deleteCategory(id) {
  await db.delete('categories', id);
}

/** Generate a short UUID-ish ID */
export function genId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
