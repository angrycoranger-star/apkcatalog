#!/usr/bin/env node
/**
 * Shows how the catalog splits across the thematic sites (config/sites.config.js)
 * and checks that the split is a partition: every card lands on exactly one
 * site. Exits non-zero if a card matches no site or several, so the check can
 * run in CI before the per-site builds.
 *
 *   npm run sites
 */
import path from 'node:path';
import { SITE_IDS, SITES, sitesOf, sourceOf } from '../config/sites.config.js';
import { isGameCategory } from '../config/catalog.config.js';
import { DATA_DIR, readJson, log } from './lib/util.js';

const scraped = (await readJson(path.join(DATA_DIR, 'apps.json'), [])) ?? [];
const custom = (await readJson(path.join(DATA_DIR, 'custom-apps.json'), [])) ?? [];
const fdroid = (await readJson(path.join(DATA_DIR, 'fdroid-apps.json'), [])) ?? [];
const github = (await readJson(path.join(DATA_DIR, 'github-apps.json'), [])) ?? [];

/* Same precedence as src/lib/apps.js: custom/F-Droid/GitHub first, then the
   scraped cards; the first record for a slug or package id wins. */
const seenSlug = new Set();
const seenPkg = new Set();
const cards = [];
for (const app of [...custom, ...fdroid, ...github, ...(Array.isArray(scraped) ? scraped : [])]) {
  if (!app?.slug || !app?.package_id) continue;
  if (seenSlug.has(app.slug) || seenPkg.has(app.package_id)) continue;
  seenSlug.add(app.slug);
  seenPkg.add(app.package_id);
  cards.push(app);
}

const bySite = Object.fromEntries(SITE_IDS.map((id) => [id, []]));
const orphans = [];
const overlaps = [];
for (const app of cards) {
  const hits = sitesOf(app);
  if (hits.length === 0) orphans.push(app);
  else if (hits.length > 1) overlaps.push({ app, hits });
  for (const id of hits) bySite[id].push(app);
}

log.info(`Catalog: ${cards.length} cards across ${SITE_IDS.length} sites.`);
for (const id of SITE_IDS) {
  const list = bySite[id];
  const games = list.filter((a) => isGameCategory(a.category)).length;
  const sources = {};
  for (const a of list) sources[sourceOf(a)] = (sources[sourceOf(a)] ?? 0) + 1;
  const src = Object.entries(sources).map(([k, v]) => `${k} ${v}`).join(', ');
  const name = SITES[id].labels.en['site.name'];
  console.log(
    `  ${id.padEnd(10)} ${String(list.length).padStart(5)}  ` +
      `(games ${games}, apps ${list.length - games}; ${src})  ${name}`
  );
}

if (orphans.length) {
  log.error(`${orphans.length} card(s) match no site, e.g. ${orphans.slice(0, 5).map((a) => a.package_id).join(', ')}`);
}
if (overlaps.length) {
  const sample = overlaps.slice(0, 5).map(({ app, hits }) => `${app.package_id} → ${hits.join('+')}`).join('; ');
  log.error(`${overlaps.length} card(s) match several sites, e.g. ${sample}`);
}
if (orphans.length || overlaps.length) process.exit(1);
log.done('Every card belongs to exactly one site.');
