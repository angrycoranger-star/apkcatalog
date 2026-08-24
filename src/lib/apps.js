import rawApps from '../../data/apps.json';
import meta from '../../data/apps.meta.json';
import { LANG } from '../i18n/index.js';
import { DEFAULT_LANG } from '../../config/catalog.config.js';
import { categoryById, isGameCategory } from '../../config/catalog.config.js';

export const DATA_META = meta;

/**
 * Turn a stored record into everything a template needs for the current
 * language. Translations fall back to the default language and then to the
 * package id, so a partially collected record still renders.
 */
function normalize(app, lang) {
  const tr = app.translations?.[lang] ?? app.translations?.[DEFAULT_LANG] ?? {};
  const category = categoryById(app.category);
  const name = tr.name || app.package_id;

  return {
    slug: app.slug,
    packageId: app.package_id,
    name,
    summary: tr.summary || '',
    icon: app.icon_url || '',
    screenshots: Array.isArray(app.screenshots) ? app.screenshots : [],
    category,
    categorySlug: category.slug,
    categoryLabel: category.labels[lang] ?? category.labels[DEFAULT_LANG],
    type: isGameCategory(app.category) ? 'game' : 'app',
    rating: typeof app.rating === 'number' ? app.rating : null,
    ratingsCount: typeof app.ratings_count === 'number' ? app.ratings_count : null,
    size: app.size || '',
    version: app.version || '',
    installs: app.installs || '',
    developer: app.developer || '',
    contentRating: app.content_rating || '',
    updatedAt: app.updated || null,
    addedAt: app.added_at || null,
    url: app.google_play_url || `https://play.google.com/store/apps/details?id=${app.package_id}`,
    href: `/app/${app.slug}/`
  };
}

/** Records that cannot render a card are dropped rather than half-shown. */
function isRenderable(app) {
  return Boolean(app?.slug && app?.package_id);
}

const ALL = rawApps
  .filter(isRenderable)
  .map((app) => normalize(app, LANG));

export function getAllApps() {
  return ALL;
}

export function getApps() {
  return ALL.filter((a) => a.type === 'app');
}

export function getGames() {
  return ALL.filter((a) => a.type === 'game');
}

export function getByType(type) {
  return type === 'game' ? getGames() : getApps();
}

export function getBySlug(slug) {
  return ALL.find((a) => a.slug === slug) ?? null;
}

/** Categories that actually hold at least one entry, with their counts. */
export function usedCategories(type) {
  const counts = new Map();
  for (const app of ALL) {
    if (type && app.type !== type) continue;
    const key = app.category.slug;
    const entry = counts.get(key) ?? { category: app.category, label: app.categoryLabel, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

const byRating = (a, b) =>
  (b.rating ?? 0) - (a.rating ?? 0) || (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0);

/** "Popular" = most rated; a proxy for reach that needs no extra source. */
export function popularApps(limit = 12) {
  return [...ALL]
    .sort((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0) || byRating(a, b))
    .slice(0, limit);
}

export function topRatedApps(limit = 12) {
  return [...ALL]
    .filter((a) => (a.ratingsCount ?? 0) >= 100)
    .sort(byRating)
    .slice(0, limit);
}

export function recentApps(limit = 12) {
  return [...ALL]
    .filter((a) => a.addedAt)
    .sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt))
    .slice(0, limit);
}

export function sortApps(list, mode) {
  const copy = [...list];
  if (mode === 'name') return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (mode === 'updated') {
    return copy.sort((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0));
  }
  return copy.sort(byRating);
}

/** Same-category neighbours shown at the bottom of a listing page. */
export function similarApps(app, limit = 6) {
  return ALL.filter((a) => a.slug !== app.slug && a.categorySlug === app.categorySlug)
    .sort(byRating)
    .slice(0, limit);
}

/**
 * Payload for the client-side search box. Kept intentionally small — only the
 * fields the results dropdown renders — so the index stays cheap to download.
 */
export function searchIndex() {
  return ALL.map((a) => ({
    s: a.slug,
    n: a.name,
    d: a.developer,
    c: a.categoryLabel,
    i: a.icon,
    r: a.rating,
    t: a.type
  }));
}
