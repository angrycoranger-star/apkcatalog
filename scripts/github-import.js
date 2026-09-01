#!/usr/bin/env node
/**
 * Build data/github-apps.json from open-source apps that publish a signed APK in
 * their GitHub releases (config/github-apps.js).
 *
 * For each repo it reads the latest release + the repo's SPDX license, gates on
 * the redistributable-license allowlist, downloads the APK, reads its manifest
 * for the real package id / version / min-Android / permissions / SHA-256, saves
 * the launcher icon, and writes a direct-download card. Summaries are composed
 * from facts — the store text is never copied.
 *
 * Usage:
 *   node scripts/github-import.js                 # all repos in the config
 *   node scripts/github-import.js --limit 2
 *   node scripts/github-import.js --dry-run
 *   GITHUB_TOKEN=… node scripts/github-import.js   # higher API rate limit
 */
import path from 'node:path';
import { writeFile, unlink, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { GITHUB_APPS } from '../config/github-apps.js';
import { inspectApk } from './lib/apk.js';
import { pickApkAsset, isRedistributable, buildCard } from './lib/github.js';
import { DATA_DIR, readJson, writeJson, withTimeout, parseArgs, log } from './lib/util.js';

const OUT_PATH = path.join(DATA_DIR, 'github-apps.json');
const META_PATH = path.join(DATA_DIR, 'github.meta.json');
const ICON_DIR = path.join(process.cwd(), 'public', 'img', 'github');
const API = 'https://api.github.com';

const args = parseArgs();
const limit = args.limit ? Number(args.limit) : Infinity;
const timeoutMs = Number(args.timeout ?? 120000);
const dryRun = Boolean(args['dry-run']);
const token = process.env.GITHUB_TOKEN || (typeof args.token === 'string' ? args.token : '');

function apiHeaders() {
  return {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'apk4orge-import',
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
}

async function getJson(url) {
  const res = await withTimeout(fetch(url, { headers: apiHeaders() }), timeoutMs, 'github api');
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

const existing = await readJson(OUT_PATH, []);
const slugByPackage = new Map(existing.map((a) => [a.package_id, a.slug]));
const takenSlugs = new Set(existing.map((a) => a.slug));

/* The hand-picked whitelist first, then anything discovered from OpenAPK
   (scripts/openapk-import.js). De-dup by repo, case-insensitive; the manual
   entry wins so its curated category sticks. Both feed the same licence gate +
   APK inspection below — discovery changes only which repos we look at. */
const discovered = await readJson(path.join(DATA_DIR, 'openapk-repos.json'), []);
const seenRepos = new Set();
const merged = [];
for (const entry of [...GITHUB_APPS, ...discovered]) {
  const key = String(entry.repo || '').toLowerCase();
  if (!key || seenRepos.has(key)) continue;
  seenRepos.add(key);
  merged.push(entry);
}

const list = merged.slice(0, limit);
const apps = [];
let skipped = 0;

for (const entry of list) {
  const repo = entry.repo;
  try {
    const meta = await getJson(`${API}/repos/${repo}`);
    const license = meta.license?.spdx_id && meta.license.spdx_id !== 'NOASSERTION' ? meta.license.spdx_id : '';
    if (!isRedistributable(license)) {
      log.warn(`${repo}: license "${license || 'unknown'}" not redistributable — skipped`);
      skipped += 1;
      continue;
    }

    const release = await getJson(`${API}/repos/${repo}/releases/latest`);
    const asset = pickApkAsset(release.assets);
    if (!asset) {
      log.warn(`${repo}: no APK asset in the latest release — skipped`);
      skipped += 1;
      continue;
    }

    const tmp = path.join(tmpdir(), `${randomBytes(8).toString('hex')}.apk`);
    try {
      const dl = await withTimeout(fetch(asset.browser_download_url), timeoutMs, 'apk download');
      if (!dl.ok) throw new Error(`asset download HTTP ${dl.status}`);
      await writeFile(tmp, Buffer.from(await dl.arrayBuffer()));

      const apk = await inspectApk(tmp);
      if (!apk.packageId) {
        log.warn(`${repo}: could not read the APK manifest — skipped`);
        skipped += 1;
        continue;
      }

      const slug =
        slugByPackage.get(apk.packageId) ??
        (buildCard({ repo, apk, categoryId: entry.category, name: entry.name, existingSlugs: takenSlugs, slugByPackage }).slug);

      let iconUrl = '';
      if (apk.icon && !dryRun) {
        await mkdir(ICON_DIR, { recursive: true });
        const ext = apk.icon.ext === 'webp' ? 'webp' : 'png';
        await writeFile(path.join(ICON_DIR, `${slug}.${ext}`), apk.icon.data);
        iconUrl = `/img/github/${slug}.${ext}`;
      } else if (apk.icon) {
        iconUrl = `/img/github/${slug}.${apk.icon.ext === 'webp' ? 'webp' : 'png'}`;
      }

      const card = buildCard({
        repo,
        license,
        sourceUrl: meta.html_url,
        releaseTag: release.tag_name,
        publishedAt: release.published_at,
        apk,
        apkUrl: asset.browser_download_url,
        iconUrl,
        categoryId: entry.category,
        name: entry.name,
        existingSlugs: takenSlugs,
        slugByPackage
      });
      takenSlugs.add(card.slug);
      apps.push(card);
      log.info(`${repo}: ${card.package_id} v${card.version} (${license})`);
    } finally {
      await unlink(tmp).catch(() => {});
    }
  } catch (error) {
    log.warn(`${repo}: ${error.message} — skipped`);
    skipped += 1;
  }
}

const meta = {
  generated_at: new Date().toISOString(),
  source: 'github-import.js',
  requested: list.length,
  count: apps.length,
  skipped
};

if (dryRun) {
  log.done(`Dry run: ${apps.length} GitHub-release cards would be written (${skipped} skipped).`);
} else {
  await writeJson(OUT_PATH, apps);
  await writeJson(META_PATH, meta);
  log.done(`Wrote ${apps.length} GitHub-release cards to data/github-apps.json (${skipped} skipped).`);
}
