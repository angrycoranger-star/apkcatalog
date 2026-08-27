/**
 * Parse an F-Droid v2 repository index into catalog records.
 *
 * F-Droid only lists Free/Open-Source software, and its index carries the
 * SPDX license of every app plus the SHA-256 and size of every APK it hosts.
 * That is exactly what a legal "download the file here" catalog needs: the
 * licenses below permit redistribution, so linking to (or mirroring) these
 * APKs is allowed — unlike pulling binaries off Google Play.
 *
 * The whole repository comes in one index file, so there is no per-app request
 * and no rate-limiting to worry about.
 */
import { categoryById, isGameCategory } from '../../config/catalog.config.js';

/**
 * SPDX licenses whose terms permit redistributing the built APK. F-Droid is
 * FOSS-only, but we still gate on this list so a record can never ship without
 * a license we have checked. Anything not here is skipped, not guessed.
 */
export const REDISTRIBUTABLE_LICENSES = new Set([
  '0BSD', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'BSL-1.0', 'CC0-1.0',
  'CC-BY-4.0', 'CC-BY-SA-4.0', 'EPL-1.0', 'EPL-2.0', 'EUPL-1.1', 'EUPL-1.2',
  'GPL-2.0-only', 'GPL-2.0-or-later', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'AGPL-3.0-only', 'AGPL-3.0-or-later', 'ISC', 'LGPL-2.1-only',
  'LGPL-2.1-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later', 'MIT', 'MIT-0',
  'MPL-2.0', 'Unlicense', 'WTFPL', 'Zlib'
]);

export function isRedistributable(license) {
  if (typeof license !== 'string' || !license) return false;
  // F-Droid sometimes stores composite expressions like "GPL-3.0-or-later OR MIT".
  return license
    .split(/\s+(?:OR|AND)\s+/i)
    .map((part) => part.replace(/[()]/g, '').trim())
    .some((part) => REDISTRIBUTABLE_LICENSES.has(part));
}

/** Localized F-Droid fields are { "en-US": value, ... }; take English else first. */
function localized(field, fallback = '') {
  if (field == null) return fallback;
  if (typeof field === 'string') return field;
  return field['en-US'] ?? field.en ?? Object.values(field)[0] ?? fallback;
}

/**
 * F-Droid categories don't map one-to-one onto the Play-based taxonomy, so map
 * to the closest slug and let unmatched ones fall back to tools.
 */
const CATEGORY_MAP = {
  Games: 'GAME_CASUAL',
  Connectivity: 'COMMUNICATION',
  Internet: 'COMMUNICATION',
  'Phone & SMS': 'COMMUNICATION',
  Multimedia: 'VIDEO_PLAYERS',
  Graphics: 'PHOTOGRAPHY',
  Reading: 'BOOKS_AND_REFERENCE',
  Writing: 'PRODUCTIVITY',
  Money: 'FINANCE',
  Navigation: 'MAPS_AND_NAVIGATION',
  'Science & Education': 'EDUCATION',
  'Sports & Health': 'HEALTH_AND_FITNESS',
  Security: 'TOOLS',
  System: 'TOOLS',
  Development: 'TOOLS',
  Theming: 'PERSONALIZATION',
  Time: 'PRODUCTIVITY',
  'Guides & Documentation': 'BOOKS_AND_REFERENCE'
};

function mapCategory(categories) {
  for (const category of categories ?? []) {
    if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  }
  return 'TOOLS';
}

/** Highest versionCode wins — that is the version F-Droid recommends. */
function latestVersion(versions) {
  const list = Object.values(versions ?? {});
  if (list.length === 0) return null;
  return list.sort(
    (a, b) => (b.manifest?.versionCode ?? 0) - (a.manifest?.versionCode ?? 0)
  )[0];
}

const ANDROID_BY_API = {
  21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1',
  28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15'
};

function humanSize(bytes) {
  if (typeof bytes !== 'number' || bytes <= 0) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Turn one F-Droid package into a normalized record (or null to skip it).
 * `repoUrl` is the base the APK/icon/screenshot paths hang off, e.g.
 * https://f-droid.org/repo
 */
export function parsePackage(packageName, entry, repoUrl) {
  const meta = entry?.metadata ?? {};
  const license = meta.license ?? '';
  if (!isRedistributable(license)) {
    return { skipped: true, reason: `license "${license || 'none'}" not in the redistributable set` };
  }

  const version = latestVersion(entry?.versions);
  const file = version?.file;
  if (!file?.name || !file?.sha256) {
    return { skipped: true, reason: 'no downloadable APK with a checksum' };
  }

  const base = repoUrl.replace(/\/$/, '');
  const categoryId = mapCategory(meta.categories);
  const minSdk = version?.manifest?.usesSdk?.minSdkVersion ?? null;

  const iconName = localized(meta.icon)?.name ?? localized(meta.icon);
  const screenshots = (() => {
    const phone = meta.screenshots?.phone;
    const list = localized(phone, []);
    return (Array.isArray(list) ? list : [])
      .map((s) => (s?.name ? `${base}${s.name}` : null))
      .filter(Boolean)
      .slice(0, 8);
  })();

  return {
    packageName,
    name: localized(meta.name, packageName),
    summary: localized(meta.summary, ''),
    description: localized(meta.description, ''),
    categoryId,
    isGame: isGameCategory(categoryId),
    license,
    sourceCode: meta.sourceCode || '',
    webSite: meta.webSite || '',
    authorName: meta.authorName || '',
    icon: iconName ? `${base}${typeof iconName === 'string' ? iconName : iconName.name}` : '',
    screenshots,
    versionName: version?.manifest?.versionName ? String(version.manifest.versionName) : '',
    minSdk,
    minAndroid: minSdk ? ANDROID_BY_API[minSdk] ?? `API ${minSdk}` : '',
    size: humanSize(file.size),
    sizeBytes: typeof file.size === 'number' ? file.size : null,
    apkUrl: `${base}${file.name}`,
    checksumSha256: file.sha256,
    added: meta.added ?? null,
    lastUpdated: meta.lastUpdated ?? null
  };
}

/** Parse a whole index-v2 object into { records, skipped, total }. */
export function parseIndex(index, repoUrl) {
  const packages = index?.packages ?? {};
  const records = [];
  const skipped = [];
  for (const [packageName, entry] of Object.entries(packages)) {
    const result = parsePackage(packageName, entry, repoUrl);
    if (result?.skipped) skipped.push({ packageName, reason: result.reason });
    else if (result) records.push(result);
  }
  return { records, skipped, total: Object.keys(packages).length };
}
