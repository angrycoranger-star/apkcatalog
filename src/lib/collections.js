import raw from '../../data/collections.json';
import { getAllApps } from './apps.js';
import { LANG } from '../i18n/index.js';
import { DEFAULT_LANG } from '../../config/catalog.config.js';

/**
 * Editorial collections — hand-curated lists ("secure messengers", "browsers
 * without tracking", …) that group existing catalog cards under an original
 * intro. Apps are referenced by slug or package id; unknown refs are skipped,
 * and a collection with nothing resolvable is dropped so no empty page ships.
 */
function localize(collection) {
  const tr = collection.translations?.[LANG] ?? collection.translations?.[DEFAULT_LANG] ?? {};
  return {
    slug: collection.slug,
    title: tr.title || collection.slug,
    intro: tr.intro || '',
    metaDescription: tr.meta || (tr.intro || '').split('\n\n')[0] || '',
    featured: collection.featured === true,
    order: typeof collection.order === 'number' ? collection.order : 999,
    refs: Array.isArray(collection.apps) ? collection.apps : []
  };
}

function build() {
  const all = getAllApps();
  const bySlug = new Map(all.map((a) => [a.slug, a]));
  const byPackage = new Map(all.map((a) => [a.packageId, a]));

  return raw
    .map(localize)
    .map((c) => {
      const apps = [];
      const seen = new Set();
      for (const ref of c.refs) {
        const app = bySlug.get(ref) || byPackage.get(ref);
        if (app && !seen.has(app.slug)) {
          seen.add(app.slug);
          apps.push(app);
        }
      }
      const { refs, ...rest } = c;
      return { ...rest, apps };
    })
    .filter((c) => c.apps.length > 0)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

const ALL = build();

export function getCollections() {
  return ALL;
}

export function getCollection(slug) {
  return ALL.find((c) => c.slug === slug) ?? null;
}

export function featuredCollections(limit = 6) {
  return ALL.filter((c) => c.featured).slice(0, limit);
}
