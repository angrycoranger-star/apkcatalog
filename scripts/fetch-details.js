#!/usr/bin/env node
/**
 * Step 2 of the pipeline — turn package ids into catalog cards.
 *
 * Walks data/package-ids.json, calls app({ appId, lang, country }) once per
 * language, and writes/updates data/apps.json.
 *
 * Two rules the catalog depends on:
 *   - Icons and screenshots are stored as the URLs Google already serves. The
 *     site hotlinks them; nothing is re-hosted here.
 *   - The developer's own description is never republished. Summaries come
 *     from lib/summarize.js, which writes from structured facts (or, with
 *     --llm, asks Claude for an independent blurb).
 *
 * Runs every 1-2 weeks (see .github/workflows/fetch-details.yml).
 *
 * Usage:
 *   node scripts/fetch-details.js
 *   node scripts/fetch-details.js --limit 25 --langs ru,en
 *   node scripts/fetch-details.js --only com.whatsapp --llm
 *   node scripts/fetch-details.js --stale-days 7      # skip recently refreshed cards
 */
import path from 'node:path';
import { LANGS, LANG_LOCALES, DEFAULT_LANG, categoryById, isGameCategory } from '../config/catalog.config.js';
import {
  DATA_DIR,
  readJson,
  writeJson,
  throttle,
  withRetry,
  withTimeout,
  requestOptions,
  loadScraper,
  isPermanentError,
  slugify,
  uniqueSlug,
  parseArgs,
  asList,
  log
} from './lib/util.js';
import { composeSummary, summarizeWithClaude, createClaudeClient } from './lib/summarize.js';

const PACKAGES_PATH = path.join(DATA_DIR, 'package-ids.json');
const APPS_PATH = path.join(DATA_DIR, 'apps.json');
const META_PATH = path.join(DATA_DIR, 'apps.meta.json');

/** A package missing this many runs in a row is dropped from the id list. */
const MAX_FAILURES = 3;

const args = parseArgs();
const langs = asList(args.langs, LANGS).filter((lang) => LANGS.includes(lang));
const only = asList(args.only, null);
const limit = args.limit ? Number(args.limit) : Infinity;
const delayMs = Number(args.delay ?? process.env.REQUEST_DELAY_MS ?? 1200);
const timeoutMs = Number(args.timeout ?? process.env.REQUEST_TIMEOUT_MS ?? 20000);
const staleDays = Number(args['stale-days'] ?? 0);
const dryRun = Boolean(args['dry-run']);
const useLlm = Boolean(args.llm);

if (langs.length === 0) {
  log.error(`No valid languages selected. Known languages: ${LANGS.join(', ')}`);
  process.exit(1);
}

const gplay = await loadScraper(args.client);

const packagesFile = await readJson(PACKAGES_PATH, null);
if (!packagesFile?.packages?.length) {
  log.error('data/package-ids.json is missing or empty. Run `npm run discovery` first.');
  process.exit(1);
}

const existingApps = (await readJson(APPS_PATH, [])) ?? [];
const byPackage = new Map(existingApps.map((app) => [app.package_id, app]));
/* Slugs are permanent: a card's URL must not change when its title changes. */
const takenSlugs = new Set(existingApps.map((app) => app.slug));

let claude = null;
if (useLlm) {
  claude = await createClaudeClient();
  if (!claude) {
    log.warn('--llm requested but @anthropic-ai/sdk is not installed; falling back to composed summaries.');
  } else {
    log.info('LLM summaries enabled (claude-opus-5).');
  }
}

const staleCutoff = staleDays > 0 ? Date.now() - staleDays * 86_400_000 : null;

let queue = packagesFile.packages;
if (only) queue = queue.filter((entry) => only.includes(entry.package_id));
if (staleCutoff) {
  queue = queue.filter((entry) => {
    const fetchedAt = byPackage.get(entry.package_id)?.fetched_at;
    return !fetchedAt || new Date(fetchedAt).getTime() < staleCutoff;
  });
}
queue = queue.slice(0, limit);

log.info(
  `Fetching ${queue.length} packages x ${langs.length} languages ` +
    `(delay ${delayMs}ms${dryRun ? ', dry run' : ''})`
);

const fetchApp = (appId, lang) => {
  const locale = LANG_LOCALES[lang];
  return withRetry(
    () =>
      withTimeout(
        gplay.app({
          appId,
          lang: locale.lang,
          country: locale.country,
          requestOptions: requestOptions(timeoutMs)
        }),
        timeoutMs,
        `${appId}/${lang}`
      ),
    { label: `${appId}/${lang}`, log }
  );
};

const stats = { updated: 0, created: 0, failed: 0, dropped: 0, llm: 0 };
const failedPackages = new Map();
const results = [];

for (const [index, entry] of queue.entries()) {
  const appId = entry.package_id;
  const previous = byPackage.get(appId);
  const progress = `[${index + 1}/${queue.length}]`;

  /** Per-language payloads; the default language provides the shared facts. */
  const payloads = {};
  let permanentlyGone = false;

  for (const [langIndex, lang] of langs.entries()) {
    try {
      payloads[lang] = await fetchApp(appId, lang);
    } catch (error) {
      if (isPermanentError(error)) {
        permanentlyGone = true;
        log.warn(`${progress} ${appId}: unavailable (${error.message})`);
        break;
      }
      log.warn(`${progress} ${appId}/${lang}: ${error.message}`);
      if (langIndex === 0) {
        log.warn(`${progress} ${appId}: skipping remaining languages this run`);
        break;
      }
    }
    await throttle(delayMs);
  }

  const base = payloads[DEFAULT_LANG] ?? payloads[langs[0]] ?? Object.values(payloads)[0];

  if (permanentlyGone || !base) {
    stats.failed += 1;
    const failures = (entry.failures ?? 0) + 1;
    failedPackages.set(appId, failures);

    if (previous && failures >= MAX_FAILURES) {
      byPackage.delete(appId);
      stats.dropped += 1;
      log.warn(`${progress} ${appId}: dropped after ${failures} failed runs.`);
    } else if (previous) {
      // Keep serving the last good card while the failure might be transient.
      results.push(previous);
    }
    continue;
  }

  const categoryId = base.genreId ?? entry.category ?? 'OTHER';
  const category = categoryById(categoryId);
  const rating = typeof base.score === 'number' ? Number(base.score.toFixed(2)) : null;

  const facts = {
    packageId: appId,
    developer: base.developer ?? '',
    isGame: isGameCategory(categoryId),
    rating,
    ratingsCount: typeof base.ratings === 'number' ? base.ratings : null,
    installs: base.installs ?? base.maxInstalls?.toLocaleString?.('en') ?? '',
    size: typeof base.size === 'string' ? base.size : '',
    contentRating: base.contentRating ?? ''
  };

  /* Ask Claude once for every language, or fall back to composed blurbs. */
  let llmSummaries = null;
  if (claude) {
    try {
      llmSummaries = await summarizeWithClaude({
        facts: { ...facts, name: base.title, categoryLabel: category.labels[DEFAULT_LANG] },
        storeText: base.summary || base.description || '',
        langs,
        client: claude
      });
      if (llmSummaries) stats.llm += 1;
    } catch (error) {
      log.warn(`${progress} ${appId}: LLM summary failed (${error.message}); composing instead.`);
    }
  }

  const translations = { ...(previous?.translations ?? {}) };
  for (const lang of langs) {
    const payload = payloads[lang] ?? base;
    const name = payload.title || previous?.translations?.[lang]?.name || appId;
    const summary =
      llmSummaries?.[lang] ??
      composeSummary(
        { ...facts, name, categoryLabel: category.labels[lang] ?? category.labels[DEFAULT_LANG] },
        lang
      );
    translations[lang] = { name, summary };
  }

  const slug =
    previous?.slug ??
    uniqueSlug(
      slugify(translations.en?.name ?? translations[DEFAULT_LANG]?.name ?? appId, appId),
      takenSlugs
    );
  takenSlugs.add(slug);

  const now = new Date().toISOString();
  const record = {
    slug,
    package_id: appId,
    icon_url: base.icon ?? '',
    screenshots: Array.isArray(base.screenshots) ? base.screenshots.slice(0, 8) : [],
    category: categoryId,
    rating,
    ratings_count: facts.ratingsCount,
    size: facts.size,
    version: base.version && base.version !== 'VARY' ? base.version : '',
    installs: facts.installs,
    developer: facts.developer,
    content_rating: facts.contentRating,
    translations,
    google_play_url: `https://play.google.com/store/apps/details?id=${appId}`,
    updated: base.updated ? new Date(base.updated).toISOString() : (previous?.updated ?? null),
    added_at: previous?.added_at ?? now,
    fetched_at: now
  };

  results.push(record);
  byPackage.delete(appId);
  if (previous) stats.updated += 1;
  else stats.created += 1;

  if ((index + 1) % 25 === 0) log.info(`${progress} …${stats.created} new, ${stats.updated} updated`);
}

/* Cards that were not part of this run (--limit, --only, --stale-days) keep
   their previous content rather than vanishing from the site. */
const untouched = [...byPackage.values()];

/* Sample records exist only so the site renders before any collection has
   happened. Once real cards land, drop them. */
const realCards = [...results, ...untouched].filter((app) => !app.sample);
const droppedSamples = results.length + untouched.length - realCards.length;
const apps = realCards.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

const meta = {
  generated_at: new Date().toISOString(),
  source: 'fetch-details.js',
  sample: false,
  count: apps.length,
  languages: langs,
  dropped_samples: droppedSamples,
  summaries: claude ? 'claude' : 'composed',
  run: stats
};

if (dryRun) {
  log.done(`Dry run: ${apps.length} cards would be written. ${JSON.stringify(stats)}`);
} else {
  await writeJson(APPS_PATH, apps);
  await writeJson(META_PATH, meta);

  /* Record failure streaks so repeatedly missing packages age out of the list. */
  const packages = packagesFile.packages
    .map((item) => {
      const failures = failedPackages.get(item.package_id);
      if (failures === undefined) return { ...item, failures: 0 };
      return { ...item, failures, unavailable_since: item.unavailable_since ?? new Date().toISOString() };
    })
    .filter((item) => (item.failures ?? 0) < MAX_FAILURES);

  const prunedIds = packagesFile.packages.length - packages.length;
  await writeJson(PACKAGES_PATH, { ...packagesFile, packages, total: packages.length });

  log.done(
    `Wrote ${apps.length} cards to data/apps.json — ` +
      `${stats.created} new, ${stats.updated} updated, ${stats.failed} failed, ` +
      `${stats.dropped} cards removed, ${prunedIds} package ids pruned` +
      (droppedSamples > 0 ? `, ${droppedSamples} sample cards dropped` : '') +
      (claude ? `, ${stats.llm} LLM summaries` : '')
  );
}

/* The scraper's throttle helper leaves a polling interval behind, so exit
   explicitly rather than waiting for an event loop that never drains. stdout is
   a pipe under CI, so flush it before exiting or the last lines are lost. */
await new Promise((resolve) => process.stdout.write('', resolve));
process.exit(0);
