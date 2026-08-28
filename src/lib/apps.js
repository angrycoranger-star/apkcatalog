import rawApps from '../../data/apps.json';
import customApps from '../../data/custom-apps.json';
import fdroidApps from '../../data/fdroid-apps.json';
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
    // Custom (self-listed) cards own their download target; scraped cards
    // always point at the official Google Play listing.
    custom: app.custom === true,
    // Owner-only promotion + web-version fields (set from the admin panel).
    featured: app.featured === true,
    pinned: app.pinned === true,
    promoOrder: typeof app.promo_order === 'number' ? app.promo_order : 999,
    webUrl: app.web_url || '',
    download: normalizeDownload(app),
    minAndroid: app.min_android || '',
    permissions: Array.isArray(app.permissions) ? app.permissions : [],
    openSource: app.open_source === true,
    license: app.license || '',
    sourceCode: app.source_code || '',
    fdroid: app.source === 'fdroid',
    checksum: app.download?.checksum_sha256 || '',
    url: downloadUrl(app),
    href: `/app/${app.slug}/`
  };
}

/**
 * Where a card's button sends the visitor. Scraped cards go to Google Play.
 * Custom cards carry an explicit download block: a store listing, a direct
 * file, or a web app. `type` drives the button label and its warnings.
 */
function normalizeDownload(app) {
  if (!app.custom) {
    return { type: 'play', url: app.google_play_url || `https://play.google.com/store/apps/details?id=${app.package_id}` };
  }
  const d = app.download ?? {};
  const type = ['play', 'store', 'direct', 'web'].includes(d.type) ? d.type : 'web';
  return {
    type,
    url: d.url || '',
    store: d.store || '',
    checksumSha256: d.checksum_sha256 || '',
    updated: d.updated || null
  };
}

function downloadUrl(app) {
  if (!app.custom) {
    return app.google_play_url || `https://play.google.com/store/apps/details?id=${app.package_id}`;
  }
  return app.download?.url || '#';
}

/** Records that cannot render a card are dropped rather than half-shown. */
function isRenderable(app) {
  return Boolean(app?.slug && app?.package_id);
}

/* Custom cards come first and win on slug/package collisions, so a self-listed
   entry can also override a scraped one (fix a summary, re-categorise, etc.).
   custom-apps.json is never touched by the collectors. */
function mergeSources(custom, scraped) {
  const seenSlug = new Set();
  const seenPkg = new Set();
  const out = [];
  for (const app of [...custom.map((a) => ({ ...a, custom: true })), ...scraped]) {
    if (!isRenderable(app)) continue;
    if (seenSlug.has(app.slug) || seenPkg.has(app.package_id)) continue;
    seenSlug.add(app.slug);
    seenPkg.add(app.package_id);
    out.push(app);
  }
  return out;
}

const ALL = mergeSources(
  [...customApps, ...fdroidApps],
  rawApps
).map((app) => normalize(app, LANG));

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

/**
 * Wrap a comparator so owner-pinned cards float to the top (in their chosen
 * promoOrder), and everything else keeps the given order. Lets a self-listed
 * app be promoted to the head of a section without touching its ranking data.
 */
function pinnedFirst(cmp) {
  return (a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.pinned && b.pinned && a.promoOrder !== b.promoOrder) return a.promoOrder - b.promoOrder;
    return cmp(a, b);
  };
}

/**
 * The owner-curated "Featured" block on the home page: only apps explicitly
 * marked featured in the admin panel, in the order the owner set.
 */
export function featuredApps(limit = 14) {
  return ALL.filter((a) => a.featured)
    .sort((a, b) => a.promoOrder - b.promoOrder || new Date(b.addedAt ?? 0) - new Date(a.addedAt ?? 0))
    .slice(0, limit);
}

/** "Popular" = most rated; a proxy for reach that needs no extra source. */
export function popularApps(limit = 12) {
  return [...ALL]
    .sort(pinnedFirst((a, b) => (b.ratingsCount ?? 0) - (a.ratingsCount ?? 0) || byRating(a, b)))
    .slice(0, limit);
}

export function topRatedApps(limit = 12) {
  return [...ALL]
    .filter((a) => a.pinned || (a.ratingsCount ?? 0) >= 100)
    .sort(pinnedFirst(byRating))
    .slice(0, limit);
}

export function recentApps(limit = 12) {
  return [...ALL]
    .filter((a) => a.addedAt)
    .sort(pinnedFirst((a, b) => new Date(b.addedAt) - new Date(a.addedAt)))
    .slice(0, limit);
}

export function sortApps(list, mode) {
  const copy = [...list];
  if (mode === 'name') return copy.sort(pinnedFirst((a, b) => a.name.localeCompare(b.name)));
  if (mode === 'updated') {
    return copy.sort(pinnedFirst((a, b) => new Date(b.updatedAt ?? 0) - new Date(a.updatedAt ?? 0)));
  }
  return copy.sort(pinnedFirst(byRating));
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
