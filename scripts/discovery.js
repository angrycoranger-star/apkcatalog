#!/usr/bin/env node
/**
 * Step 1 of the pipeline — build the list of packages worth cataloguing.
 *
 * Walks the matrix [countries] x [top game + app categories], pulls the
 * TOP_FREE collection for each combination, deduplicates by package id and
 * writes data/package-ids.json. It stores no card content: fetch-details.js
 * owns that.
 *
 * Runs monthly (see .github/workflows/discovery.yml).
 *
 * Usage:
 *   node scripts/discovery.js
 *   node scripts/discovery.js --countries ru,tr --categories GAME_PUZZLE --num 20
 *   node scripts/discovery.js --dry-run
 */
import path from 'node:path';
import {
  DISCOVERY_COUNTRIES,
  DISCOVERY_CATEGORIES,
  DISCOVERY_COLLECTION,
  DISCOVERY_NUM,
  LANG_LOCALES,
  DEFAULT_LANG
} from '../config/catalog.config.js';
import {
  DATA_DIR,
  readJson,
  writeJson,
  throttle,
  withRetry,
  withTimeout,
  loadScraper,
  parseArgs,
  asList,
  log
} from './lib/util.js';

const PACKAGES_PATH = path.join(DATA_DIR, 'package-ids.json');

const args = parseArgs();
const countries = asList(args.countries, DISCOVERY_COUNTRIES);
const categories = asList(args.categories, DISCOVERY_CATEGORIES);
const collection = typeof args.collection === 'string' ? args.collection : DISCOVERY_COLLECTION;
const num = Number(args.num ?? DISCOVERY_NUM);
const delayMs = Number(args.delay ?? process.env.REQUEST_DELAY_MS ?? 1500);
const dryRun = Boolean(args['dry-run']);
const timeoutMs = Number(args.timeout ?? process.env.REQUEST_TIMEOUT_MS ?? 30000);

const gplay = await loadScraper(args.client);

if (!gplay.collection[collection]) {
  log.error(`Unknown collection "${collection}". Expected one of: ${Object.keys(gplay.collection).join(', ')}`);
  process.exit(1);
}

const unknownCategories = categories.filter((category) => !gplay.category[category]);
if (unknownCategories.length > 0) {
  log.error(`Unknown categories: ${unknownCategories.join(', ')}`);
  process.exit(1);
}

/** Existing entries are kept so first_seen survives across runs. */
const existing = (await readJson(PACKAGES_PATH, { packages: [] })).packages ?? [];
const known = new Map(existing.map((entry) => [entry.package_id, entry]));

const now = new Date().toISOString();
const seen = new Map();
let requests = 0;
let failures = 0;

log.info(
  `Discovery: ${countries.length} countries x ${categories.length} categories, ` +
    `collection=${collection}, num=${num}${dryRun ? ' (dry run)' : ''}`
);

for (const country of countries) {
  for (const category of categories) {
    const label = `${country}/${category}`;
    try {
      const results = await withRetry(
        () =>
          withTimeout(
            gplay.list({
              category,
              collection: gplay.collection[collection],
              num,
              country,
              // Locale only changes the titles we discard here; the country
              // is what actually selects a different storefront ranking.
              lang: LANG_LOCALES[DEFAULT_LANG].lang,
              throttle: 10
            }),
            timeoutMs,
            label
          ),
        { label, log }
      );
      requests += 1;

      results.forEach((item, index) => {
        const id = item.appId;
        if (!id) return;

        const entry = seen.get(id) ?? {
          package_id: id,
          countries: [],
          categories: [],
          best_rank: index + 1
        };
        if (!entry.countries.includes(country)) entry.countries.push(country);
        if (!entry.categories.includes(category)) entry.categories.push(category);
        entry.best_rank = Math.min(entry.best_rank, index + 1);
        seen.set(id, entry);
      });

      log.info(`${label}: ${results.length} results (unique so far: ${seen.size})`);
    } catch (error) {
      failures += 1;
      log.warn(`${label}: giving up — ${error.message}`);
    }

    await throttle(delayMs);
  }
}

if (seen.size === 0) {
  log.error('No packages discovered; leaving data/package-ids.json untouched.');
  process.exit(failures > 0 ? 1 : 0);
}

const packages = [...seen.values()]
  .map((entry) => {
    const previous = known.get(entry.package_id);
    return {
      package_id: entry.package_id,
      // The discovery category is a starting point; fetch-details.js
      // overwrites it with the genreId Google reports for the app itself.
      category: entry.categories[0],
      categories: entry.categories,
      countries: entry.countries,
      best_rank: entry.best_rank,
      first_seen: previous?.first_seen ?? now,
      last_seen: now
    };
  })
  .sort((a, b) => a.best_rank - b.best_rank || a.package_id.localeCompare(b.package_id));

/* Packages that dropped out of every chart stay in the file — their cards are
   still valid — but the stale last_seen marks them for later pruning. */
const dropped = existing.filter((entry) => !seen.has(entry.package_id));
const merged = [...packages, ...dropped];

const payload = {
  generated_at: now,
  collection,
  num,
  countries,
  categories,
  total: merged.length,
  new_this_run: packages.filter((entry) => entry.first_seen === now).length,
  still_charting: packages.length,
  no_longer_charting: dropped.length,
  packages: merged
};

if (dryRun) {
  log.done(
    `Dry run: ${payload.total} packages (${payload.new_this_run} new, ${dropped.length} off-chart). Nothing written.`
  );
} else {
  await writeJson(PACKAGES_PATH, payload);
  log.done(
    `Wrote ${payload.total} packages to data/package-ids.json ` +
      `(${payload.new_this_run} new, ${dropped.length} off-chart, ${requests} requests, ${failures} failed combinations).`
  );
}
