import categoriesData from './categories.json' with { type: 'json' };

const { langs: LANGS, categories: CATEGORIES } = categoriesData;
const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));
const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function categoryChoices() {
  return CATEGORIES.map((c) => ({ slug: c.slug, label: c.label, type: c.type }));
}

/** Map a stored category id (e.g. "GAME_CASINO") back to its slug for the form. */
export function categorySlugById(id) {
  return byId.get(id)?.slug || '';
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

/** An optional web-version link; must be https when present. */
export function normalizeWebUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (!/^https:\/\//i.test(url)) throw new Error('web version URL must start with https://');
  return url;
}

/** Owner-set rating (0–5) and ratings count, both optional. Empty = unchanged. */
export function ratingFields(form = {}) {
  const out = {};
  if (form.rating !== undefined && form.rating !== null && `${form.rating}`.trim() !== '') {
    const r = Number(form.rating);
    if (!Number.isFinite(r) || r < 0 || r > 5) throw new Error('rating must be between 0 and 5');
    out.rating = Math.round(r * 10) / 10;
  }
  if (form.ratingsCount !== undefined && form.ratingsCount !== null && `${form.ratingsCount}`.trim() !== '') {
    const c = Number(form.ratingsCount);
    if (!Number.isFinite(c) || c < 0) throw new Error('ratings count must be 0 or more');
    out.ratings_count = Math.trunc(c);
  }
  return out;
}

/** Owner-only promotion flags read from the form (checkboxes + an order number). */
export function promoteFields(form = {}) {
  const order = Number(form.promoOrder);
  return {
    featured: form.featured === true || form.featured === 'on' || form.featured === 'true',
    pinned: form.pinned === true || form.pinned === 'on' || form.pinned === 'true',
    promo_order: Number.isFinite(order) ? Math.trunc(order) : 999
  };
}

/**
 * Build a custom-apps.json record from the form fields + the inspected APK.
 * `form`: { name, developer, categorySlug, description, screenshots[] (urls),
 *           webUrl, featured, pinned, promoOrder }
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
    web_url: normalizeWebUrl(form.webUrl),
    ...ratingFields(form),
    ...promoteFields(form),
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

/**
 * Build a patch (partial record) for editing an existing card. Only the fields
 * present in `form` are changed; passing a new `apk`+`blob` also swaps the APK,
 * its derived facts and (optionally) the icon. `existing` is the current record.
 */
export function buildPatch({ form = {}, apk = null, blob = null, existing = {} }) {
  const patch = {};

  if (form.categorySlug) {
    const category = bySlug.get(form.categorySlug);
    if (!category) throw new Error(`unknown category "${form.categorySlug}"`);
    patch.category = category.id;
  }

  if (typeof form.name === 'string' || typeof form.description === 'string') {
    const name = (form.name ?? '').trim();
    const summary = (form.description ?? '').trim();
    patch.translations = {};
    for (const lang of LANGS) {
      const t = {};
      if (typeof form.name === 'string') t.name = name;
      if (typeof form.description === 'string') t.summary = summary;
      patch.translations[lang] = t;
    }
  }

  if (typeof form.developer === 'string') patch.developer = form.developer.trim();
  if (typeof form.webUrl === 'string') patch.web_url = normalizeWebUrl(form.webUrl);
  if (Array.isArray(form.screenshots)) patch.screenshots = form.screenshots.filter(Boolean).slice(0, 8);

  // Promotion fields are always set together from the edit form's controls.
  if ('featured' in form || 'pinned' in form || 'promoOrder' in form) {
    Object.assign(patch, promoteFields(form));
  }

  // Rating / ratings count only change when a value is actually provided.
  Object.assign(patch, ratingFields(form));

  // Replacing the APK: recompute version/size/min-Android/permissions/checksum.
  if (apk && blob?.apkUrl) {
    if (!apk.packageId) throw new Error('could not read the package id from the new APK');
    if (!/^[a-f0-9]{64}$/i.test(apk.checksumSha256 || '')) throw new Error('missing APK checksum');
    patch.package_id = apk.packageId;
    patch.version = apk.versionName || '';
    patch.size = apk.size || '';
    patch.min_android = apk.minAndroid || '';
    patch.permissions = apk.permissions || [];
    if (blob.iconUrl) patch.icon_url = blob.iconUrl;
    patch.download = {
      ...(existing.download || {}),
      type: 'direct',
      url: blob.apkUrl,
      checksum_sha256: apk.checksumSha256,
      updated: new Date().toISOString().slice(0, 10)
    };
  }

  return patch;
}

export { LANGS };
