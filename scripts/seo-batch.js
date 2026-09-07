#!/usr/bin/env node
/**
 * Helper for the hand-written SEO description backfill (data/seo-descriptions.json).
 *
 * The open-source collectors (F-Droid, GitHub) rewrite their data files every
 * week, so localized descriptions can't live there. Instead they live in
 * data/seo-descriptions.json, keyed by package id, and src/lib/apps.js overlays
 * them at build time. This script drives filling that store in batches:
 *
 *   node scripts/seo-batch.js --list --limit 15            # next 15 to write (GitHub first)
 *   node scripts/seo-batch.js --list --limit 15 --source fdroid
 *   node scripts/seo-batch.js --merge batch.json           # merge {pkg:{ru,en,tr,uz}} in
 *   node scripts/seo-batch.js --stats                      # how many done / left
 *
 * The `--list` output gives, per app: package id, name, developer, category
 * label, and the current (usually English) source summary to localize from.
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { categoryById, DEFAULT_LANG, LANGS } from '../config/catalog.config.js';
import { DATA_DIR, readJson, writeJson, parseArgs, log } from './lib/util.js';

const STORE_PATH = path.join(DATA_DIR, 'seo-descriptions.json');
const args = parseArgs();

const store = await readJson(STORE_PATH, {});
const github = await readJson(path.join(DATA_DIR, 'github-apps.json'), []);
const fdroid = await readJson(path.join(DATA_DIR, 'fdroid-apps.json'), []);

/* GitHub first (smaller, higher-profile), then F-Droid. */
const pool = [
  ...github.map((a) => ({ ...a, _source: 'github' })),
  ...fdroid.map((a) => ({ ...a, _source: 'fdroid' }))
];
const pending = pool.filter((a) => a.package_id && !store[a.package_id]);

if (args.stats || (!args.list && !args.merge)) {
  const done = Object.keys(store).length;
  log.info(`SEO descriptions: ${done} written, ${pending.length} pending (${github.length} GitHub + ${fdroid.length} F-Droid = ${pool.length} open-source cards).`);
}

if (args.list) {
  const limit = args.limit ? Number(args.limit) : 15;
  const source = typeof args.source === 'string' ? args.source : null;
  const rows = pending
    .filter((a) => !source || a._source === source)
    .slice(0, limit)
    .map((a) => {
      const tr = a.translations?.[DEFAULT_LANG] ?? a.translations?.en ?? {};
      const enTr = a.translations?.en ?? tr;
      return {
        package_id: a.package_id,
        source: a._source,
        name: (enTr.name || tr.name || a.package_id),
        developer: a.developer || '',
        category: categoryById(a.category).labels.en,
        source_summary: (enTr.summary || tr.summary || '').slice(0, 600)
      };
    });
  process.stdout.write(JSON.stringify(rows, null, 2) + '\n');
}

if (args.merge) {
  const file = typeof args.merge === 'string' ? args.merge : null;
  if (!file) { log.error('--merge needs a file path'); process.exit(1); }
  const batch = JSON.parse(await readFile(file, 'utf8'));
  let added = 0;
  let bad = 0;
  for (const [pkg, langs] of Object.entries(batch)) {
    if (!langs || typeof langs !== 'object') { bad += 1; continue; }
    const clean = {};
    for (const lang of LANGS) {
      if (typeof langs[lang] === 'string' && langs[lang].trim()) clean[lang] = langs[lang].trim();
    }
    if (Object.keys(clean).length === 0) { bad += 1; continue; }
    store[pkg] = { ...store[pkg], ...clean };
    added += 1;
  }
  await writeJson(STORE_PATH, store);
  log.done(`Merged ${added} package(s) into data/seo-descriptions.json (${bad} skipped). Total now ${Object.keys(store).length}.`);
}
