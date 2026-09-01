/**
 * Parser for the OpenAPK curated list (github.com/mobilenetworkltd/openapk) — a
 * CC0 catalogue of open-source Android apps kept as one markdown file per
 * category. We use it ONLY as a discovery feed: from each row we take the
 * upstream GitHub repo, and the GitHub-releases collector then does the real
 * work — gate on the repo's SPDX licence, download the APK from the official
 * release, read its manifest. Nothing from OpenAPK's own text or download
 * mirror is copied; the list just tells us which repos to look at.
 *
 * Rows whose "Repo" link is not on github.com (Codeberg, GitLab, SourceForge…)
 * are dropped, because the collector only understands GitHub releases.
 *
 * Pure and network-free so it can be unit-tested against a fixture.
 */

/** OpenAPK category file basename (no .md) → our catalog category id. */
export const OPENAPK_CATEGORY = {
  connectivity: 'TOOLS',
  development: 'TOOLS',
  food: 'FOOD_AND_DRINK',
  games: 'GAME_ARCADE',
  graphics: 'ART_AND_DESIGN',
  internet: 'TOOLS',
  messaging: 'COMMUNICATION',
  money: 'FINANCE',
  office: 'PRODUCTIVITY',
  multimedia: 'VIDEO_PLAYERS',
  navigation: 'MAPS_AND_NAVIGATION',
  'phone-and-sms': 'COMMUNICATION',
  reading: 'BOOKS_AND_REFERENCE',
  religion: 'LIFESTYLE',
  'science-and-education': 'EDUCATION',
  security: 'TOOLS',
  'sports-and-health': 'HEALTH_AND_FITNESS',
  system: 'TOOLS',
  theming: 'PERSONALIZATION',
  time: 'PRODUCTIVITY',
  writing: 'PRODUCTIVITY',
  xposed: 'TOOLS'
};

/** The category files we read, in a stable order. */
export const OPENAPK_CATEGORIES = Object.keys(OPENAPK_CATEGORY);

/* The "Repo" anchor specifically — not the "by @owner" profile link, which has
   no repo segment. Owner/name are the two path parts of a github.com repo. */
const REPO_LINK =
  /href="https?:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)\/([A-Za-z0-9._-]+?)\/?"[^>]*>\s*Repo\s*<\//i;
const NAME = /<b>([^<]+)<\/b>/i;
/* The openapk.net app URL carries the package id as its second path segment,
   which always looks like a reverse-domain (has at least one dot). */
const PACKAGE = /openapk\.net\/[^/"]+\/([A-Za-z0-9_]+(?:\.[A-Za-z0-9_]+)+)\//i;

/* Owners that are GitHub sections, never real repo owners. */
const NON_OWNER = /^(sponsors|about|topics|features|marketplace|orgs|users|apps)$/i;

function decodeEntities(text) {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Parse one category markdown file into discovery rows.
 * Returns [{ repo: 'owner/name', category, name, packageId|null }].
 */
export function parseCategory(markdown, categoryId) {
  const rows = [];
  for (const line of String(markdown).split('\n')) {
    if (!line.startsWith('|')) continue; // only table rows
    const repoMatch = line.match(REPO_LINK);
    if (!repoMatch) continue; // no GitHub repo → skip (Codeberg/GitLab/etc.)

    const owner = repoMatch[1];
    let name = repoMatch[2];
    if (NON_OWNER.test(owner)) continue;
    name = name.replace(/\.git$/i, '');
    if (!name) continue;

    const nameMatch = line.match(NAME);
    const pkgMatch = line.match(PACKAGE);
    rows.push({
      repo: `${owner}/${name}`,
      category: categoryId,
      name: nameMatch ? decodeEntities(nameMatch[1]) : name,
      packageId: pkgMatch ? pkgMatch[1] : null
    });
  }
  return rows;
}

/**
 * Merge rows from every category, de-duplicating by repo (case-insensitive).
 * The first occurrence wins, so a repo keeps the category of the first file it
 * appears in. Returns [{ repo, category, name }] — the shape github-import
 * consumes, minus packageId (the manifest is the source of truth for that).
 */
export function mergeRows(rowsByCategory) {
  const seen = new Set();
  const merged = [];
  for (const rows of rowsByCategory) {
    for (const row of rows) {
      const key = row.repo.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({ repo: row.repo, category: row.category, name: row.name });
    }
  }
  return merged;
}
