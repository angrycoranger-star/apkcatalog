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
import { composeSummary, cleanDescription } from './lib/summarize.js';
import { DATA_DIR, readJson, writeJson, withTimeout, slugify, uniqueSlug, parseArgs, log } from './lib/util.js';

const OUT_PATH = path.join(DATA_DIR, 'fdroid-apps.json');
const META_PATH = path.join(DATA_DIR, 'fdroid.meta.json');

const args = parseArgs();

/* F-Droid-format repositories to merge, in priority order: the main F-Droid
   archive first, then IzzyOnDroid (a much larger F-Droid-compatible repo of
   open-source apps built from GitHub releases). Override with a comma-separated
   --repo list. The same SPDX-license allowlist gates every repo. */
const DEFAULT_REPOS = [
  'https://f-droid.org/repo',
  'https://apt.izzysoft.de/fdroid/repo'
];
const repos = typeof args.repo === 'string'
  ? args.repo.split(',').map((s) => s.trim()).filter(Boolean)
  : DEFAULT_REPOS;
const limit = args.limit ? Number(args.limit) : Infinity;
const timeoutMs = Number(args.timeout ?? 120000);
const dryRun = Boolean(args['dry-run']);

async function loadIndex(repo) {
  if (typeof args.index === 'string') {
    log.info(`Reading index from ${args.index}`);
    return JSON.parse(await readFile(args.index, 'utf8'));
  }
  const indexUrl = `${repo.replace(/\/$/, '')}/index-v2.json`;
  log.info(`Fetching ${indexUrl} …`);
  const res = await withTimeout(fetch(indexUrl), timeoutMs, 'index fetch');
  if (!res.ok) throw new Error(`index fetch failed: HTTP ${res.status} (${repo})`);
  return res.json();
}

/* Merge the repos; the first occurrence of a package id wins, so a f-droid.org
   build is kept over an IzzyOnDroid one for the same app. */
const seen = new Set();
const records = [];
let total = 0;
let skippedTotal = 0;
for (const repo of repos) {
  const index = await loadIndex(repo);
  const parsed = parseIndex(index, repo);
  total += parsed.total;
  skippedTotal += parsed.skipped.length;
  let added = 0;
  for (const rec of parsed.records) {
    if (seen.has(rec.packageName)) continue;
    seen.add(rec.packageName);
    records.push(rec);
    added += 1;
  }
  log.info(`  ${repo}: ${parsed.total} packages → ${parsed.records.length} redistributable, ${added} new, ${parsed.skipped.length} skipped`);
}
log.info(`Merged ${records.length} redistributable cards from ${repos.length} repo(s)`);

const existing = await readJson(OUT_PATH, []);

/* Slugs and package ids must be unique across the WHOLE catalog, not just this
   source — validate-data.js rejects the build otherwise. Gather what the other
   sources already own so an F-Droid card never collides with a Play / GitHub /
   custom card; a package already covered elsewhere is skipped, not duplicated. */
const otherSources = [
  ...(await readJson(path.join(DATA_DIR, 'custom-apps.json'), [])),
  ...(await readJson(path.join(DATA_DIR, 'github-apps.json'), [])),
  ...(await readJson(path.join(DATA_DIR, 'apps.json'), []))
];
const otherSlugs = new Set();
const otherPackages = new Set();
for (const a of otherSources) {
  if (a?.slug) otherSlugs.add(a.slug);
  if (a?.package_id) otherPackages.add(a.package_id);
}

/* Keep an existing card's slug for URL stability — unless another source has
   since claimed it, in which case drop it so this card regenerates a unique
   slug and yields the original name to the stronger source. */
const slugByPackage = new Map(
  existing.filter((a) => a.slug && !otherSlugs.has(a.slug)).map((a) => [a.package_id, a.slug])
);
const takenSlugs = new Set([
  ...existing.map((a) => a.slug).filter((s) => s && !otherSlugs.has(s)),
  ...otherSlugs
]);

const chosen = records.slice(0, limit);
const apps = [];
let crossSkipped = 0;

for (const rec of chosen) {
  /* Already listed by another source (Play / GitHub / custom) — skip it so the
     catalog carries the app once, and the build stays collision-free. */
  if (otherPackages.has(rec.packageName)) {
    crossSkipped += 1;
    continue;
  }

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

  /* Prefer the app's own F-Droid description (Free, redistributable metadata)
     over a facts-only stub. It is usually English, so it shows in every build
     until Claude localizes it; still far better than "Tools app, 198 KB". */
  const realDesc = cleanDescription(rec.description || rec.summary);

  const translations = {};
  for (const lang of LANGS) {
    const label = category.labels[lang] ?? category.labels[DEFAULT_LANG];
    translations[lang] = {
      name: rec.name,
      summary: realDesc || composeSummary({ ...facts, name: rec.name, categoryLabel: label }, lang, { hideStore: true })
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
  repos,
  index_packages: total,
  redistributable: records.length,
  skipped: skippedTotal,
  cross_source_skipped: crossSkipped,
  count: apps.length
};

if (dryRun) {
  log.done(`Dry run: ${apps.length} F-Droid cards would be written from ${repos.length} repo(s) (${crossSkipped} already in another source).`);
} else {
  await writeJson(OUT_PATH, apps);
  await writeJson(META_PATH, meta);
  log.done(`Wrote ${apps.length} F-Droid cards to data/fdroid-apps.json (${skippedTotal} non-redistributable, ${crossSkipped} already in another source).`);
}
