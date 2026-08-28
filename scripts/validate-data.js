#!/usr/bin/env node
/**
 * Integrity check for data/apps.json. Run it in CI before a build so a bad
 * collector run cannot ship broken cards.
 *
 * Usage: node scripts/validate-data.js
 */
import path from 'node:path';
import { LANGS, categoryById, FALLBACK_CATEGORY } from '../config/catalog.config.js';
import { isRedistributable } from './lib/fdroid.js';
import { DATA_DIR, readJson, log } from './lib/util.js';

const scraped = await readJson(path.join(DATA_DIR, 'apps.json'), null);
const custom = await readJson(path.join(DATA_DIR, 'custom-apps.json'), []);
const fdroid = await readJson(path.join(DATA_DIR, 'fdroid-apps.json'), []);
const github = await readJson(path.join(DATA_DIR, 'github-apps.json'), []);

if (!Array.isArray(scraped)) {
  log.error('data/apps.json is missing or is not an array.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const slugs = new Set();
const packages = new Set();

const isHttps = (url) => typeof url === 'string' && url.startsWith('https://');

const apps = [
  ...custom.map((a) => ({ app: a, custom: true, source: 'custom-apps.json' })),
  ...fdroid.map((a) => ({ app: a, custom: true, source: 'fdroid-apps.json' })),
  ...github.map((a) => ({ app: a, custom: true, source: 'github-apps.json' })),
  ...scraped.map((a) => ({ app: a, custom: false, source: 'apps.json' }))
];

for (const [index, entry] of apps.entries()) {
  const { app, custom: isCustom, source } = entry;
  const where = `${source}[${index}] (${app?.slug ?? app?.package_id ?? 'unknown'})`;

  if (!app?.slug) errors.push(`${where}: missing slug`);
  else if (slugs.has(app.slug)) errors.push(`${where}: duplicate slug "${app.slug}"`);
  else slugs.add(app.slug);

  if (!app?.package_id) errors.push(`${where}: missing package_id`);
  else if (packages.has(app.package_id)) errors.push(`${where}: duplicate package_id`);
  else packages.add(app.package_id);

  if (isCustom) {
    // Self-listed cards carry an explicit download target instead.
    const d = app?.download ?? {};
    const type = d.type;
    if (!['play', 'store', 'direct', 'web'].includes(type)) {
      errors.push(`${where}: download.type must be one of play, store, direct, web`);
    }
    if (!isHttps(d.url) && !(type === 'direct' && typeof d.url === 'string' && d.url.startsWith('/'))) {
      errors.push(`${where}: download.url must be an https URL (or a local path for a direct APK)`);
    }
    if (type === 'direct') {
      // A direct file must be verifiable and versioned.
      if (!/^[a-f0-9]{64}$/i.test(d.checksum_sha256 ?? '')) {
        errors.push(`${where}: a direct APK needs a 64-hex download.checksum_sha256`);
      }
      if (!app?.version) errors.push(`${where}: a direct APK needs a version`);
    }
    if (type === 'store' && !d.store) {
      warnings.push(`${where}: store download has no store name (button label will be generic)`);
    }
    // Open-source (F-Droid / GitHub) cards must carry a redistributable license.
    if ((app?.source === 'fdroid' || app?.source === 'github') && !isRedistributable(app?.license)) {
      errors.push(`${where}: open-source card has a non-redistributable or missing license "${app?.license ?? ''}"`);
    }
  } else {
    if (!/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/.test(app?.google_play_url ?? '')) {
      errors.push(`${where}: google_play_url must point at the official Google Play listing`);
    }
    // Scraped cards link to Play only; an APK URL in one is a bug.
    if (/\.apk(\b|["'?])/i.test(JSON.stringify(app))) {
      errors.push(`${where}: scraped record references an .apk file`);
    }
  }

  if (categoryById(app?.category) === FALLBACK_CATEGORY && app?.category !== FALLBACK_CATEGORY.id) {
    warnings.push(`${where}: unknown category "${app?.category}" — falls back to "${FALLBACK_CATEGORY.slug}"`);
  }

  for (const lang of LANGS) {
    const translation = app?.translations?.[lang];
    if (!translation?.name) warnings.push(`${where}: no ${lang} name`);
    if (!translation?.summary) warnings.push(`${where}: no ${lang} summary`);
  }

  if (app?.icon_url && !isHttps(app.icon_url) && !app.icon_url.startsWith('/')) {
    errors.push(`${where}: icon_url is neither https nor a local path`);
  }
  for (const shot of app?.screenshots ?? []) {
    if (!isHttps(shot) && !shot.startsWith('/')) {
      errors.push(`${where}: screenshot is neither https nor a local path`);
    }
  }

  // Owner-only web-version link (adds a "play in browser" button on the card).
  if (app?.web_url && !isHttps(app.web_url)) {
    errors.push(`${where}: web_url must be an https URL`);
  }

  if (app?.rating !== null && app?.rating !== undefined) {
    if (typeof app.rating !== 'number' || app.rating < 0 || app.rating > 5) {
      errors.push(`${where}: rating ${app.rating} is out of the 0-5 range`);
    }
  }
}

for (const warning of warnings.slice(0, 20)) log.warn(warning);
if (warnings.length > 20) log.warn(`…and ${warnings.length - 20} more warnings`);
for (const error of errors) log.error(error);

if (errors.length > 0) {
  log.error(`${errors.length} error(s) in data/apps.json`);
  process.exit(1);
}

log.done(`Dataset is valid: ${scraped.length} scraped + ${custom.length} custom + ${fdroid.length} F-Droid + ${github.length} GitHub = ${apps.length} cards, ${warnings.length} warning(s).`);
