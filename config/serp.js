/**
 * What the SERP monitor watches. Every scan is one (query × target) pair, so
 * keep the product small — this scrapes Google directly, and volume is what
 * gets an IP challenged.
 */

/**
 * Search targets. `gl` is the country of the search, `hl` the interface
 * language, `domain` the Google frontend used. `uule` is optional and pins the
 * search to a city (base64 canonical-name blob Google accepts on `&uule=`);
 * leave it out for country-level results.
 */
export const TARGETS = [
  { id: 'ru', label: 'Россия', domain: 'www.google.com', gl: 'ru', hl: 'ru' },
  { id: 'tr', label: 'Türkiye', domain: 'www.google.com', gl: 'tr', hl: 'tr' },
  { id: 'uz', label: 'Oʻzbekiston', domain: 'www.google.com', gl: 'uz', hl: 'uz' }
];

/**
 * Queries to track. `targets` limits a query to some of the targets above;
 * omit it to run the query everywhere.
 */
export const QUERIES = [
  { q: 'скачать apk', targets: ['ru'] },
  { q: 'apk indir', targets: ['tr'] },
  { q: 'apk yuklab olish', targets: ['uz'] }
];

/** How deep the tracked list goes. Ten is what the notification reports. */
export const TOP_N = 10;

/** Domains that are ours — moves on these are always worth a notification. */
export const OWN_DOMAINS = ['apk4orge.com'];

export const SETTINGS = {
  /**
   * A position move smaller than this on a foreign domain is noise (Google
   * shuffles neighbours constantly). Entering or leaving the top-N always
   * counts, whatever this is set to, and so does any move on an own domain.
   */
  moveThreshold: 2,
  /** Random pause between requests, ms. Sequential, never parallel. */
  delayMs: [20000, 45000],
  /** Retries per scan when Google answers with a challenge or an error. */
  retries: 2,
  requestTimeoutMs: 30000
};
