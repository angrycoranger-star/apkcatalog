#!/usr/bin/env node
/**
 * Turn an APK you own into a catalog card in data/custom-apps.json.
 *
 * Reads package id, version, min Android, size, SHA-256, permissions and a
 * launcher icon straight from the file, asks for the few things the APK can't
 * tell us (slug, category, display names), drafts summaries in every language,
 * and copies the icon into public/img/apps/<slug>/.
 *
 * It never modifies the APK — it only reads it.
 *
 * Usage:
 *   node scripts/add-apk.js ./builds/myapp-1.4.0.apk
 *   node scripts/add-apk.js ./myapp.apk --slug my-app --category tools \
 *     --name "Моё приложение" --download direct --host https://dl.example.com/myapp.apk
 *   node scripts/add-apk.js ./myapp.apk --download store --store RuStore \
 *     --url https://rustore.ru/catalog/app/com.my.app
 *
 * --download: direct (default, hosts the file) | store | web | play
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { inspectApk } from './lib/apk.js';
import { composeSummary } from './lib/summarize.js';
import {
  LANGS,
  DEFAULT_LANG,
  categoryBySlug,
  categoryById,
  isGameCategory
} from '../config/catalog.config.js';
import { DATA_DIR, ROOT, readJson, writeJson, slugify, uniqueSlug, parseArgs, log } from './lib/util.js';

const CUSTOM_PATH = path.join(DATA_DIR, 'custom-apps.json');
const args = parseArgs();
const apkPath = args._[0];

if (!apkPath) {
  log.error('Usage: node scripts/add-apk.js <file.apk> [--slug ..] [--category ..] [--download direct|store|web|play]');
  process.exit(1);
}

const interactive = stdin.isTTY;
const rl = interactive ? readline.createInterface({ input: stdin, output: stdout }) : null;
const ask = async (question, fallback = '') => {
  if (!interactive) return fallback;
  const answer = (await rl.question(fallback ? `${question} [${fallback}]: ` : `${question}: `)).trim();
  return answer || fallback;
};
const done = () => rl?.close();

log.info(`Reading ${apkPath} …`);
const info = await inspectApk(apkPath);

if (info.manifestError) {
  log.warn(`Could not read the manifest (${info.manifestError}); you'll need to enter package id and version by hand.`);
}
log.info(
  `package=${info.packageId ?? '?'} version=${info.versionName ?? '?'} ` +
    `minAndroid=${info.minAndroid || '?'} size=${info.size} permissions=${info.permissions.length}`
);

const existing = await readJson(CUSTOM_PATH, []);
const takenSlugs = new Set(existing.map((a) => a.slug));

const packageId = args.package || info.packageId || (await ask('Package id (com.example.app)'));
if (!packageId) {
  log.error('A package id is required.');
  done();
  process.exit(1);
}
if (existing.some((a) => a.package_id === packageId)) {
  log.error(`custom-apps.json already has ${packageId}. Edit it there instead.`);
  done();
  process.exit(1);
}

const version = args.version || info.versionName || (await ask('Version', '1.0.0'));

// Category, validated against the taxonomy.
let categorySlug = args.category;
while (!categoryBySlug(categorySlug)) {
  if (categorySlug) log.warn(`Unknown category "${categorySlug}".`);
  categorySlug = await ask('Category slug (e.g. tools, communication, action)');
}
const category = categoryBySlug(categorySlug);

const developer = args.developer || (await ask('Developer / author'));
const defaultName = args.name || packageId.split('.').pop();
const primaryName = args.name || (await ask(`Display name (${DEFAULT_LANG})`, defaultName));

const slug = uniqueSlug(slugify(args.slug || primaryName, packageId), takenSlugs);

// Download target.
const type = ['direct', 'store', 'web', 'play'].includes(args.download) ? args.download : 'direct';
const download = { type };
if (type === 'direct') {
  // The site links to the file; the APK is hosted wherever --host points.
  const host = args.host || (await ask('Public base URL where the APK will be hosted (blank = local /releases path)'));
  const fileName = `${slug}-${version}.apk`;
  download.url = host ? `${host.replace(/\/$/, '')}/${fileName}` : `/releases/${fileName}`;
  download.checksum_sha256 = info.checksumSha256;
  download.updated = new Date().toISOString().slice(0, 10);
  log.info(`Direct download URL: ${download.url}`);
  log.info(`Copy the APK there as "${fileName}" (SHA-256 ${info.checksumSha256}).`);
} else if (type === 'store') {
  download.store = args.store || (await ask('Store name (RuStore, AppGallery, Galaxy Store, …)'));
  download.url = args.url || (await ask('Store listing URL'));
} else if (type === 'web') {
  download.url = args.url || (await ask('Web app URL'));
} else {
  download.url = args.url || `https://play.google.com/store/apps/details?id=${packageId}`;
}

// Icon: prefer the one pulled from the APK, else leave the placeholder.
let iconUrl = '';
if (info.icon) {
  const dir = path.join(ROOT, 'public', 'img', 'apps', slug);
  await mkdir(dir, { recursive: true });
  const iconName = `icon.${info.icon.ext === 'webp' ? 'webp' : 'png'}`;
  await writeFile(path.join(dir, iconName), info.icon.data);
  iconUrl = `/img/apps/${slug}/${iconName}`;
  log.info(`Icon extracted → public${iconUrl}`);
} else {
  log.warn('No launcher icon found in the APK; add one to public/img/apps/' + slug + '/ and set icon_url.');
}

// Names + drafted summaries per language. The draft is written from facts, so
// it never copies anyone's store text; edit it afterwards to taste.
const facts = {
  packageId,
  name: primaryName,
  developer,
  isGame: isGameCategory(category.id),
  rating: null,
  ratingsCount: null,
  installs: '',
  size: info.size,
  contentRating: ''
};

const translations = {};
for (const lang of LANGS) {
  const name = args[`name_${lang}`] || primaryName;
  translations[lang] = {
    name,
    summary: composeSummary(
      { ...facts, name, categoryLabel: category.labels[lang] ?? category.labels[DEFAULT_LANG] },
      lang,
      { hideStore: type !== 'play' }
    )
  };
}

const record = {
  slug,
  custom: true,
  package_id: packageId,
  category: category.id,
  developer,
  version,
  size: info.size,
  min_android: info.minAndroid,
  icon_url: iconUrl,
  screenshots: [],
  permissions: info.permissions,
  translations,
  download,
  added_at: new Date().toISOString(),
  updated: new Date().toISOString()
};

await writeJson(CUSTOM_PATH, [...existing, record]);
done();

log.done(`Added "${primaryName}" → /app/${slug}/  (data/custom-apps.json now has ${existing.length + 1} card(s)).`);
log.info('Next: add screenshots to public/img/apps/' + slug + '/, refine the summaries, then `npm run data:validate`.');
if (type === 'direct') {
  log.info('Remember to upload the APK to its host — the card links there, the repo does not carry the binary.');
}
