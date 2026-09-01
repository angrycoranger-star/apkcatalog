#!/usr/bin/env node
/**
 * Build data/openapk-repos.json — a discovery feed of GitHub repos taken from
 * the OpenAPK curated list (github.com/mobilenetworkltd/openapk, CC0).
 *
 * This does NOT touch any APK. It only reads the markdown category files, keeps
 * the rows whose "Repo" link is on GitHub, and writes { repo, category, name }
 * for each. The GitHub-releases collector (github-import.js) then merges this
 * feed with the hand-picked config/github-apps.js, and it is that collector
 * which gates on the SPDX licence and reads the real APK from each release.
 *
 * Usage:
 *   node scripts/openapk-import.js                 # fetch from GitHub raw
 *   node scripts/openapk-import.js --limit 100     # cap discovered repos
 *   node scripts/openapk-import.js --dry-run       # print, don't write
 *   node scripts/openapk-import.js --dir ./fixtures/openapk   # offline, local files
 */
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { OPENAPK_CATEGORY, OPENAPK_CATEGORIES, parseCategory, mergeRows } from './lib/openapk.js';
import { DATA_DIR, writeJson, withTimeout, parseArgs, log } from './lib/util.js';

const RAW_BASE = 'https://raw.githubusercontent.com/mobilenetworkltd/openapk/main/categories';
const OUT_PATH = path.join(DATA_DIR, 'openapk-repos.json');
const META_PATH = path.join(DATA_DIR, 'openapk.meta.json');

const args = parseArgs();
const limit = args.limit ? Number(args.limit) : Infinity;
const timeoutMs = Number(args.timeout ?? 30000);
const dryRun = Boolean(args['dry-run']);
const localDir = typeof args.dir === 'string' ? args.dir : '';

async function loadCategory(cat) {
  if (localDir) {
    try {
      return await readFile(path.join(localDir, `${cat}.md`), 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }
  const res = await withTimeout(fetch(`${RAW_BASE}/${cat}.md`), timeoutMs, `openapk ${cat}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${cat}.md`);
  return res.text();
}

const rowsByCategory = [];
let filesRead = 0;

for (const cat of OPENAPK_CATEGORIES) {
  try {
    const markdown = await loadCategory(cat);
    if (markdown == null) {
      log.warn(`${cat}.md not found — skipped`);
      continue;
    }
    filesRead += 1;
    const rows = parseCategory(markdown, OPENAPK_CATEGORY[cat]);
    log.info(`${cat}: ${rows.length} GitHub apps`);
    rowsByCategory.push(rows);
  } catch (error) {
    log.warn(`${cat}: ${error.message} — skipped`);
  }
}

let repos = mergeRows(rowsByCategory);
const discovered = repos.length;
if (Number.isFinite(limit)) repos = repos.slice(0, limit);

const meta = {
  generated_at: new Date().toISOString(),
  source: 'openapk-import.js',
  upstream: 'github.com/mobilenetworkltd/openapk (CC0)',
  files_read: filesRead,
  discovered,
  written: repos.length
};

if (dryRun) {
  for (const r of repos) log.info(`  ${r.repo} → ${r.category} (${r.name})`);
  log.done(`Dry run: ${repos.length} GitHub repos would be written (${discovered} discovered).`);
} else {
  await writeJson(OUT_PATH, repos);
  await writeJson(META_PATH, meta);
  log.done(`Wrote ${repos.length} GitHub repos to data/openapk-repos.json (${discovered} discovered, ${filesRead} category files).`);
}
