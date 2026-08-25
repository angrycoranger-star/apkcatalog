import { UI } from './ui.js';
import { LANGS, DEFAULT_LANG, LANG_HOSTS } from '../../config/catalog.config.js';

/** The language this build is being produced for. */
export const LANG = LANGS.includes(import.meta.env.PUBLIC_SITE_LANG)
  ? import.meta.env.PUBLIC_SITE_LANG
  : DEFAULT_LANG;

export const DOMAIN = import.meta.env.PUBLIC_SITE_DOMAIN || 'apk4orge.com';

export const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || `hello@${DOMAIN}`;

/** BCP-47 tags used for `lang` attributes, Intl and hreflang. */
export const LOCALES = { ru: 'ru-RU', en: 'en-US', tr: 'tr-TR' };

export const LANG_NAMES = { ru: 'Русский', en: 'English', tr: 'Türkçe' };

/**
 * Translate a UI key for the current build language, falling back to the
 * default language and finally to the key itself so nothing renders blank.
 */
export function t(key, lang = LANG) {
  return UI[lang]?.[key] ?? UI[DEFAULT_LANG]?.[key] ?? key;
}

/** Absolute URL of another language's build of the same path. */
export function hostFor(lang, domain = DOMAIN) {
  return `https://${LANG_HOSTS[lang] ?? lang}.${domain}`;
}

export function alternateUrls(pathname, domain = DOMAIN) {
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return LANGS.map((lang) => ({
    lang,
    locale: LOCALES[lang],
    name: LANG_NAMES[lang],
    url: `${hostFor(lang, domain)}${path}`,
    current: lang === LANG
  }));
}

export function formatRating(value, lang = LANG) {
  if (typeof value !== 'number' || Number.isNaN(value) || value <= 0) return null;
  return new Intl.NumberFormat(LOCALES[lang], {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
}

export function formatNumber(value, lang = LANG) {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return new Intl.NumberFormat(LOCALES[lang], { notation: 'compact' }).format(value);
}

export function formatDate(value, lang = LANG) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(LOCALES[lang], {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
}
