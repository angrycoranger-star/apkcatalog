/**
 * Helpers for the GitHub-releases collector. Pure and side-effect free so they
 * can be unit-tested without the network or a real APK. Redistribution is gated
 * on the same SPDX-license allowlist as F-Droid — only open-source apps whose
 * license permits it get a direct-download card.
 */
import { isRedistributable } from './fdroid.js';
import { LANGS, DEFAULT_LANG, categoryById, isGameCategory } from '../../config/catalog.config.js';
import { composeSummary } from './summarize.js';
import { slugify, uniqueSlug } from './util.js';

export { isRedistributable };

/**
 * Choose the APK asset to publish from a release's asset list. Prefers a
 * universal build, avoids debug builds, and falls back to the largest .apk.
 * Returns the asset object or null.
 */
export function pickApkAsset(assets = []) {
  const apks = assets.filter((a) => /\.apk$/i.test(a.name || '') && !/debug/i.test(a.name || ''));
  if (!apks.length) return null;
  const universal = apks.find((a) => /universal/i.test(a.name));
  if (universal) return universal;
  const arm64 = apks.find((a) => /arm64|aarch64/i.test(a.name));
  if (arm64) return arm64;
  // No ABI hint (usually a single fat APK) → prefer it; else the biggest file.
  const plain = apks.filter((a) => !/(x86|armeabi|arm64|aarch64|mips)/i.test(a.name));
  const pool = plain.length ? plain : apks;
  return pool.reduce((best, a) => ((a.size || 0) > (best.size || 0) ? a : best), pool[0]);
}

/** `owner/name` → a readable developer/name fallback when the manifest is thin. */
export function repoParts(repo) {
  const [owner = '', name = ''] = String(repo).split('/');
  return { owner, name };
}

/**
 * Assemble a catalog card from a repo + its latest release + the inspected APK.
 * `apk` is the inspectApk() result. `slugByPackage`/`existingSlugs` keep slugs
 * permanent across runs. Facts-only summaries, exactly like the other sources.
 */
export function buildCard({
  repo, license, sourceUrl, releaseTag, publishedAt, apk, apkUrl, iconUrl,
  categoryId, name, existingSlugs = new Set(), slugByPackage = new Map()
}) {
  const { owner, name: repoName } = repoParts(repo);
  const displayName = name || repoName;
  const category = categoryById(categoryId);
  const developer = owner || '—';

  const slug =
    slugByPackage.get(apk.packageId) ??
    uniqueSlug(slugify(displayName, apk.packageId), existingSlugs);

  const facts = {
    packageId: apk.packageId,
    developer,
    isGame: isGameCategory(category.id),
    rating: null,
    ratingsCount: null,
    installs: '',
    size: apk.size,
    contentRating: ''
  };

  const translations = {};
  for (const lang of LANGS) {
    const label = category.labels[lang] ?? category.labels[DEFAULT_LANG];
    translations[lang] = {
      name: displayName,
      summary: composeSummary({ ...facts, name: displayName, categoryLabel: label }, lang, { hideStore: true })
    };
  }

  const now = new Date();
  return {
    slug,
    custom: true,
    source: 'github',
    open_source: true,
    package_id: apk.packageId,
    category: category.id,
    developer,
    version: apk.versionName || releaseTag || '',
    size: apk.size || '',
    min_android: apk.minAndroid || '',
    license: license || '',
    source_code: sourceUrl || `https://github.com/${repo}`,
    icon_url: iconUrl || '',
    screenshots: [],
    permissions: apk.permissions || [],
    translations,
    download: {
      type: 'direct',
      url: apkUrl,
      checksum_sha256: apk.checksumSha256,
      updated: (publishedAt ? new Date(publishedAt) : now).toISOString().slice(0, 10)
    },
    added_at: (publishedAt ? new Date(publishedAt) : now).toISOString(),
    updated: (publishedAt ? new Date(publishedAt) : now).toISOString()
  };
}
