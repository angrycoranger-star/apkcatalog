import { readFileSync } from 'node:fs';

/**
 * What the SERP monitor watches. Every scan is one (query × target) pair, so
 * keep the product small — this scrapes Google directly, and volume is what
 * gets an IP challenged.
 */

/** Reads one of the JSON files the monitor and the admin dashboard share. */
function loadJson(name, fallback) {
  try {
    const parsed = JSON.parse(readFileSync(new URL(`../data/serp/${name}`, import.meta.url), 'utf8'));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Search targets, from data/serp/targets.json. `gl` is the country of the
 * search, `hl` the interface language, `domain` the Google frontend used.
 * `uule` is optional and pins the search to a city (the base64 canonical-name
 * blob Google accepts on `&uule=`); leave it out for country-level results.
 * The file is shared with the admin dashboard, which reads it over the GitHub
 * API to offer the geo choices when a query is added.
 */
export const TARGETS = loadJson('targets.json', []);

/**
 * Queries to track. They live in data/serp/queries.json rather than in this
 * file because the admin dashboard adds and removes them at runtime (it commits
 * that file through the GitHub API); an entry is `{ q, targets? }`, where
 * `targets` limits a query to some of the targets above and omitting it runs
 * the query everywhere.
 */
export function loadQueries() {
  return loadJson('queries.json', []).filter((entry) => entry?.q);
}

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
