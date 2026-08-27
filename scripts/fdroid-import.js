#!/usr/bin/env node
/**
 * Build data/fdroid-apps.json from an F-Droid v2 repository index.
 *
 * F-Droid lists only Free/Open-Source software and publishes the SPDX license
 * of every app, so these APKs may be redistributed — the catalog can point the
 * download button straight at the real file (with its SHA-256 shown) instead of
 * bouncing to Google Play. The whole repo arrives in one index, so there is one
 * HTTP request and no rate-limiting.
 *
 * It never copies a developer's store text: summaries are composed from facts,
 * exactly like the scraped catalog.
 *
 * Usage:
 *   node scripts/fdroid-import.js                       # fetch f-droid.org
 *   node scripts/fdroid-import.js --repo https://apt.izzysoft.de/fdroid/repo
 *   node scripts/fdroid-import.js --index ./index-v2.json   # offline / fixture
 *   node scripts/fdroid-import.js --limit 200
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { LANGS, DEFAULT_LANG, categoryById } from '../config/catalog.config.js';
import { parseIndex } from './lib/fdroid.js';
import { composeSummary } from './lib/summarize.js';
import { DATA_DIR, readJson, writeJson, withTimeout, slugify, uniqueSlug, parseArgs, log } from './lib/util.js';

const OUT_PATH = path.join(DATA_DIR, 'fdroid-apps.json');
const META_PATH = path.join(DATA_DIR, 'fdroid.meta.json');

const args = parseArgs();
const repoUrl = typeof args.repo === 'string' ? args.repo : 'https://f-droid.org/repo';
const indexUrl = `${repoUrl.replace(/\/$/, '')}/index-v2.json`;
const limit = args.limit ? Number(args.limit) : Infinity;
const timeoutMs = Number(args.timeout ?? 120000);
const dryRun = Boolean(args['dry-run']);

async function loadIndex() {
  if (typeof args.index === 'string') {
    log.info(`Reading index from ${args.index}`);
    return JSON.parse(await readFile(args.index, 'utf8'));
  }
  log.info(`Fetching ${indexUrl} …`);
  const res = await withTimeout(fetch(indexUrl), timeoutMs, 'index fetch');
  if (!res.ok) throw new Error(`index fetch failed: HTTP ${res.status}`);
  return res.json();
}

const index = await loadIndex();
const { records, skipped, total } = parseIndex(index, repoUrl);
log.info(`Index: ${total} packages → ${records.length} redistributable, ${skipped.length} skipped`);

const existing = await readJson(OUT_PATH, []);
/* Slugs are permanent so a card's URL never changes. */
const slugByPackage = new Map(existing.map((a) => [a.package_id, a.slug]));
const takenSlugs = new Set(existing.map((a) => a.slug));

const chosen = records.slice(0, limit);
const apps = [];

for (const rec of chosen) {
  const category = categoryById(rec.categoryId);
  const developer = rec.authorName || hostOf(rec.sourceCode) || '—';

  const slug =
    slugByPackage.get(rec.packageName) ??
    uniqueSlug(slugify(rec.name, rec.packageName), takenSlugs);
  takenSlugs.add(slug);

  const facts = {
    packageId: rec.packageName,
    developer,
    isGame: rec.isGame,
    rating: null,
    ratingsCount: null,
    installs: '',
    size: rec.size,
    contentRating: ''
  };

  const translations = {};
  for (const lang of LANGS) {
    const label = category.labels[lang] ?? category.labels[DEFAULT_LANG];
    translations[lang] = {
      name: rec.name,
      summary: composeSummary({ ...facts, name: rec.name, categoryLabel: label }, lang, { hideStore: true })
    };
  }

  apps.push({
    slug,
    custom: true,
    source: 'fdroid',
    open_source: true,
    package_id: rec.packageName,
    category: rec.categoryId,
    developer,
    version: rec.versionName,
    size: rec.size,
    min_android: rec.minAndroid,
    license: rec.license,
    source_code: rec.sourceCode,
    icon_url: rec.icon,
    screenshots: rec.screenshots,
    translations,
    download: {
      type: 'direct',
      url: rec.apkUrl,
      checksum_sha256: rec.checksumSha256,
      updated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString().slice(0, 10) : null
    },
    added_at: rec.added ? new Date(rec.added).toISOString() : new Date().toISOString(),
    updated: rec.lastUpdated ? new Date(rec.lastUpdated).toISOString() : null
  });
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

const meta = {
  generated_at: new Date().toISOString(),
  source: 'fdroid-import.js',
  repo: repoUrl,
  index_packages: total,
  redistributable: records.length,
  skipped: skipped.length,
  count: apps.length
};

if (dryRun) {
  log.done(`Dry run: ${apps.length} F-Droid cards would be written (repo ${repoUrl}).`);
} else {
  await writeJson(OUT_PATH, apps);
  await writeJson(META_PATH, meta);
  log.done(`Wrote ${apps.length} F-Droid cards to data/fdroid-apps.json (${skipped.length} non-redistributable skipped).`);
}
