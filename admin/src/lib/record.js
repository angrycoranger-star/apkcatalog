import categoriesData from './categories.json' with { type: 'json' };

const { langs: LANGS, categories: CATEGORIES } = categoriesData;
const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function categoryChoices() {
  return CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, type: c.type }));
}

/** URL-safe slug; Cyrillic/Turkish transliterated, matches the site's rules. */
const TRANSLIT = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',ç:'c',ğ:'g',ı:'i',ö:'o',ş:'s',ü:'u'
};
export function slugify(value, fallback = 'app') {
  const slug = String(value ?? '')
    .toLowerCase()
    .split('').map((ch) => TRANSLIT[ch] ?? ch).join('')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60).replace(/-+$/g, '');
  return slug || fallback;
}

export function uniqueSlug(base, taken) {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

/**
 * Build a custom-apps.json record from the form fields + the inspected APK.
 * `form`: { name, developer, categorySlug, description, screenshots[] (urls) }
 * `apk`:  inspectApk() result
 * `blob`: { apkUrl, iconUrl }
 * The typed name/description are stored for every language (the site falls back
 * per-field, so one text shows everywhere until it is translated).
 */
export function buildRecord({ form, apk, blob, existingSlugs = new Set() }) {
  const category = bySlug.get(form.categorySlug);
  if (!category) throw new Error(`unknown category "${form.categorySlug}"`);

  const name = (form.name || '').trim();
  if (!name) throw new Error('name is required');
  const packageId = apk.packageId;
  if (!packageId) throw new Error('could not read the package id from the APK');
  if (!/^[a-f0-9]{64}$/i.test(apk.checksumSha256 || '')) throw new Error('missing APK checksum');
  if (!blob?.apkUrl?.startsWith('https://')) throw new Error('missing APK download URL');

  const slug = uniqueSlug(slugify(name, packageId.split('.').pop()), existingSlugs);
  const summary = (form.description || '').trim();

  const translations = {};
  for (const lang of LANGS) {
    translations[lang] = { name, summary };
  }

  const now = new Date().toISOString();
  return {
    slug,
    custom: true,
    source: 'owner',
    package_id: packageId,
    category: category.id,
    developer: (form.developer || '').trim(),
    version: apk.versionName || '',
    size: apk.size || '',
    min_android: apk.minAndroid || '',
    icon_url: blob.iconUrl || '',
    screenshots: Array.isArray(form.screenshots) ? form.screenshots.filter(Boolean).slice(0, 8) : [],
    permissions: apk.permissions || [],
    translations,
    download: {
      type: 'direct',
      url: blob.apkUrl,
      checksum_sha256: apk.checksumSha256,
      updated: now.slice(0, 10)
    },
    added_at: now,
    updated: now
  };
}

export { LANGS };
