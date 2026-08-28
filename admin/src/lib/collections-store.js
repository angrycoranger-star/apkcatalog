/**
 * Read and write data/collections.json (editorial collections) via the GitHub
 * Contents API — same mechanism as custom apps, separate file. A commit here
 * rebuilds the four sites, so an edited collection appears a minute or two later.
 */
const API = 'https://api.github.com';
const FILE = 'data/collections.json';
const LANGS = ['ru', 'en', 'tr', 'uz'];

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

async function getFile(cfg) {
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${FILE}?ref=${encodeURIComponent(cfg.branch)}`, {
    headers: headers(cfg.token)
  });
  if (res.status === 404) return { sha: null, list: [] };
  if (!res.ok) throw new Error(`GitHub read failed: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const list = JSON.parse(Buffer.from(json.content, 'base64').toString('utf8') || '[]');
  return { sha: json.sha, list: Array.isArray(list) ? list : [] };
}

export async function readCollections() {
  const { list } = await getFile(config());
  return list;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Clean and validate the incoming array, or throw. Empty collections are kept
 *  (the site skips ones with no resolvable apps), but the shape must be sound. */
export function sanitize(collections) {
  if (!Array.isArray(collections)) throw new Error('collections must be an array');
  const seen = new Set();
  return collections.map((c, i) => {
    const slug = String(c.slug || '').trim().toLowerCase();
    if (!SLUG_RE.test(slug)) throw new Error(`row ${i + 1}: slug must be kebab-case (a-z, 0-9, -)`);
    if (seen.has(slug)) throw new Error(`duplicate slug "${slug}"`);
    seen.add(slug);

    const apps = Array.isArray(c.apps)
      ? c.apps.map((s) => String(s).trim()).filter(Boolean)
      : String(c.apps || '').split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);

    const translations = {};
    for (const lang of LANGS) {
      const t = c.translations?.[lang] || {};
      translations[lang] = {
        title: String(t.title || '').trim().slice(0, 120),
        intro: String(t.intro || '').trim().slice(0, 4000)
      };
    }

    const order = Number(c.order);
    return {
      slug,
      featured: c.featured === true || c.featured === 'on' || c.featured === 'true',
      order: Number.isFinite(order) ? Math.trunc(order) : 100,
      apps,
      translations
    };
  });
}

export async function writeCollections(collections) {
  const clean = sanitize(collections);
  const cfg = config();
  const { sha } = await getFile(cfg);
  const body = {
    message: `chore(data): update collections via admin (${clean.length})`,
    content: Buffer.from(`${JSON.stringify(clean, null, 2)}\n`, 'utf8').toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${FILE}`, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub commit failed: HTTP ${res.status} ${await res.text()}`);
  return clean;
}
