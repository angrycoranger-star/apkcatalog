/**
 * Reads the SERP monitor's state out of the main repository and writes the
 * query list back, both through the GitHub Contents API — the scraper runs in
 * GitHub Actions, so the repository, not this app, is where that data lives.
 *
 * Env: GITHUB_TOKEN (repo contents:write), GITHUB_REPO ("owner/name"),
 *      GITHUB_BRANCH (default "main").
 */
const API = 'https://api.github.com';
const QUERIES_FILE = 'data/serp/queries.json';
const TARGETS_FILE = 'data/serp/targets.json';
const LATEST_FILE = 'data/serp/latest.json';

function config() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) throw new Error('GITHUB_TOKEN is not set');
  if (!repo || !repo.includes('/')) throw new Error('GITHUB_REPO must be "owner/name"');
  return { token, repo, branch };
}

function headers(token) {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'content-type': 'application/json'
  };
}

/** Contents API read. Returns `{ sha, data }`; a missing file is not an error. */
async function readFile(path, fallback) {
  const cfg = config();
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${path}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg.token),
    /* latest.json is rewritten daily and the API caches aggressively. */
    cache: 'no-store'
  });
  if (res.status === 404) return { sha: null, data: fallback };
  if (!res.ok) throw new Error(`GitHub read failed: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const text = Buffer.from(json.content ?? '', 'base64').toString('utf8');
  try {
    return { sha: json.sha, data: text ? JSON.parse(text) : fallback };
  } catch {
    return { sha: json.sha, data: fallback };
  }
}

async function writeJson(path, sha, data, message) {
  const cfg = config();
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${path}`, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify({
      message,
      branch: cfg.branch,
      content: Buffer.from(`${JSON.stringify(data, null, 2)}\n`, 'utf8').toString('base64'),
      ...(sha ? { sha } : {})
    })
  });
  if (!res.ok) throw new Error(`GitHub write failed: HTTP ${res.status} ${await res.text()}`);
}

export const listQueries = () => readFile(QUERIES_FILE, []).then((r) => r.data);
export const listTargets = () => readFile(TARGETS_FILE, []).then((r) => r.data);
export const readLatest = () => readFile(LATEST_FILE, { scans: {} }).then((r) => r.data);

const sameQuery = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Adds a query. `targets` is a list of target ids, or empty for "every geo".
 * Adding one that already exists merges the geos into the existing entry
 * instead of creating a duplicate the scraper would scan twice.
 */
export async function addQuery(q, targets = []) {
  const text = String(q ?? '').trim();
  if (!text) throw new Error('Запрос не может быть пустым');
  if (text.length > 120) throw new Error('Слишком длинный запрос');

  const known = new Set((await listTargets()).map((t) => t.id));
  const geos = [...new Set(targets)].filter((id) => known.has(id));

  const { sha, data } = await readFile(QUERIES_FILE, []);
  const list = Array.isArray(data) ? data : [];
  const existing = list.find((entry) => sameQuery(entry.q ?? '', text));

  if (existing) {
    /* An entry with no `targets` already means every geo — widening it further
       is a no-op, and narrowing it here would silently drop scans. */
    if (!existing.targets?.length || !geos.length) delete existing.targets;
    else existing.targets = [...new Set([...existing.targets, ...geos])];
  } else {
    list.push(geos.length ? { q: text, targets: geos } : { q: text });
  }

  await writeJson(QUERIES_FILE, sha, list, `serp: track "${text}"`);
  return list;
}

/** Removes a query entirely. Its recorded history in latest.json is left alone. */
export async function removeQuery(q) {
  const { sha, data } = await readFile(QUERIES_FILE, []);
  const list = (Array.isArray(data) ? data : []).filter((entry) => !sameQuery(entry.q ?? '', String(q ?? '')));
  await writeJson(QUERIES_FILE, sha, list, `serp: stop tracking "${q}"`);
  return list;
}
