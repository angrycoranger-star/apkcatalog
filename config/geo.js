import { LANGS } from './catalog.config.js';

/**
 * Where a visitor with no recognisable country or language is sent. English is
 * the international edition — distinct from the build's DEFAULT_LANG (ru).
 */
export const APEX_DEFAULT = 'en';

/**
 * Country → catalog language. Covers the storefronts the catalog targets
 * (ru/tr/uz) plus the russophone CIS, and falls through to English.
 */
const COUNTRY_LANG = {
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TJ: 'ru', AM: 'ru', AZ: 'ru', MD: 'ru', GE: 'ru',
  UZ: 'uz',
  TR: 'tr', CY: 'tr'
};

/** First language tag in an Accept-Language header that we publish. */
function fromAcceptLanguage(header) {
  if (!header) return null;
  for (const part of header.split(',')) {
    const tag = part.split(';')[0].trim().toLowerCase();
    const base = tag.split('-')[0];
    if (LANGS.includes(base)) return base;
  }
  return null;
}

/**
 * Decide which language subdomain a visitor to the apex should land on.
 * Country (from the edge geo header) wins; Accept-Language is the fallback;
 * then the default language.
 */
export function pickLang(country, acceptLanguage) {
  const byCountry = country ? COUNTRY_LANG[country.toUpperCase()] : null;
  if (byCountry && LANGS.includes(byCountry)) return byCountry;

  const byHeader = fromAcceptLanguage(acceptLanguage);
  if (byHeader) return byHeader;

  return APEX_DEFAULT;
}
