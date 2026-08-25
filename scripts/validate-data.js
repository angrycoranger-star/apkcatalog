#!/usr/bin/env node
/**
 * Integrity check for data/apps.json. Run it in CI before a build so a bad
 * collector run cannot ship broken cards.
 *
 * Usage: node scripts/validate-data.js
 */
import path from 'node:path';
import { LANGS, categoryById, FALLBACK_CATEGORY } from '../config/catalog.config.js';
import { DATA_DIR, readJson, log } from './lib/util.js';

const apps = await readJson(path.join(DATA_DIR, 'apps.json'), null);

if (!Array.isArray(apps)) {
  log.error('data/apps.json is missing or is not an array.');
  process.exit(1);
}

const errors = [];
const warnings = [];
const slugs = new Set();
const packages = new Set();

const isHttps = (url) => typeof url === 'string' && url.startsWith('https://');

for (const [index, app] of apps.entries()) {
  const where = `apps[${index}] (${app?.slug ?? app?.package_id ?? 'unknown'})`;

  if (!app?.slug) errors.push(`${where}: missing slug`);
  else if (slugs.has(app.slug)) errors.push(`${where}: duplicate slug "${app.slug}"`);
  else slugs.add(app.slug);

  if (!app?.package_id) errors.push(`${where}: missing package_id`);
  else if (packages.has(app.package_id)) errors.push(`${where}: duplicate package_id`);
  else packages.add(app.package_id);

  if (!/^https:\/\/play\.google\.com\/store\/apps\/details\?id=/.test(app?.google_play_url ?? '')) {
    errors.push(`${where}: google_play_url must point at the official Google Play listing`);
  }

  // The catalog links to Play only; an APK URL anywhere in a record is a bug.
  const serialized = JSON.stringify(app);
  if (/\.apk(\b|["'?])/i.test(serialized)) {
    errors.push(`${where}: record references an .apk file`);
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

log.done(`data/apps.json is valid: ${apps.length} cards, ${warnings.length} warning(s).`);
