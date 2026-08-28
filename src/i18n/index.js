import { UI } from './ui.js';
import { LANGS, DEFAULT_LANG, LANG_HOSTS } from '../../config/catalog.config.js';

/** The language this build is being produced for. */
export const LANG = LANGS.includes(import.meta.env.PUBLIC_SITE_LANG)
  ? import.meta.env.PUBLIC_SITE_LANG
  : DEFAULT_LANG;

export const DOMAIN = import.meta.env.PUBLIC_SITE_DOMAIN || 'apk4orge.com';

export const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || `hello@${DOMAIN}`;

/** BCP-47 tags used for `lang` attributes, Intl and hreflang. */
export const LOCALES = { ru: 'ru-RU', en: 'en-US', tr: 'tr-TR', uz: 'uz-UZ' };

export const LANG_NAMES = { ru: 'Русский', en: 'English', tr: 'Türkçe', uz: 'O‘zbekcha' };

/**
 * Translate a UI key for the current build language, falling back to the
 * default language and finally to the key itself so nothing renders blank.
 */
export function t(key, lang = LANG, vars = null) {
  let value = UI[lang]?.[key] ?? UI[DEFAULT_LANG]?.[key] ?? key;
  if (vars) {
    for (const [name, replacement] of Object.entries(vars)) {
      value = value.replaceAll(`{${name}}`, replacement);
    }
  }
  return value;
}

/** Absolute URL of another language's build of the same path. */
export function hostFor(lang, domain = DOMAIN) {
  return `https://${LANG_HOSTS[lang] ?? lang}.${domain}`;
}

/**
 * Per-app subdomains. When PUBLIC_APP_SUBDOMAINS=1 an app is addressed at
 * <slug>.<lang>.<domain> (served there by the edge middleware, which rewrites
 * to the built /app/<slug>/ page); otherwise it keeps the path form. The flag
 * lets the whole scheme ship dark and switch on only once the wildcard domain
 * and DNS exist.
 */
export const APP_SUBDOMAINS = import.meta.env.PUBLIC_APP_SUBDOMAINS === '1';

/** Absolute URL of an app for a language, in whichever scheme is active. */
export function appUrlFor(slug, lang = LANG, domain = DOMAIN) {
  return APP_SUBDOMAINS
    ? `https://${slug}.${LANG_HOSTS[lang] ?? lang}.${domain}/`
    : `${hostFor(lang, domain)}/app/${slug}/`;
}

/** Link to an app on the current language: absolute subdomain, or relative path. */
export function appHref(slug) {
  return APP_SUBDOMAINS ? appUrlFor(slug, LANG) : `/app/${slug}/`;
}

/** hreflang alternates for one app page across every language. */
export function appAlternates(slug, domain = DOMAIN) {
  return LANGS.map((lang) => ({
    lang,
    locale: LOCALES[lang],
    name: LANG_NAMES[lang],
    url: appUrlFor(slug, lang, domain),
    current: lang === LANG
  }));
}

/**
 * A catalog (non-app) link. Under the subdomain scheme these must be absolute
 * to the language host, so navigating away from an app subdomain returns to the
 * catalog instead of resolving under the app's own host; otherwise plain paths.
 */
export function navHref(path) {
  return APP_SUBDOMAINS ? `${hostFor(LANG)}${path}` : path;
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
