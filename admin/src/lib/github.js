/**
 * Append a card to data/custom-apps.json in the main repository via the GitHub
 * Contents API, and commit it. The push is what makes the four static sites
 * rebuild, so the new card appears a minute or two later.
 *
 * Env: GITHUB_TOKEN (repo contents:write), GITHUB_REPO ("owner/name"),
 *      GITHUB_BRANCH (default "main").
 */
const API = 'https://api.github.com';
const FILE = 'data/custom-apps.json';

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

async function getFile({ repo, branch, token }) {
  const res = await fetch(`${API}/repos/${repo}/contents/${FILE}?ref=${encodeURIComponent(branch)}`, {
    headers: headers(token)
  });
  if (res.status === 404) return { sha: null, list: [] };
  if (!res.ok) throw new Error(`GitHub read failed: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const content = Buffer.from(json.content, 'base64').toString('utf8');
  const list = JSON.parse(content || '[]');
  return { sha: json.sha, list: Array.isArray(list) ? list : [] };
}

/**
 * Add one record. Returns { slug } on success. `injectFetch` is only for tests.
 * Rejects a duplicate package_id so the same app can't be listed twice.
 */
export async function appendCustomApp(record) {
  const cfg = config();
  const { sha, list } = await getFile(cfg);

  if (list.some((a) => a.package_id === record.package_id)) {
    throw new Error(`${record.package_id} is already listed`);
  }
  const taken = new Set(list.map((a) => a.slug));
  if (taken.has(record.slug)) {
    // buildRecord already de-dupes, but guard against a race.
    let i = 2;
    while (taken.has(`${record.slug}-${i}`)) i += 1;
    record = { ...record, slug: `${record.slug}-${i}` };
  }

  const next = [...list, record];
  const body = {
    message: `feat(data): add "${record.translations?.en?.name || record.slug}" via admin`,
    content: Buffer.from(`${JSON.stringify(next, null, 2)}\n`, 'utf8').toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${FILE}`, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub commit failed: HTTP ${res.status} ${await res.text()}`);
  return { slug: record.slug };
}

/** Current slugs/package ids, so the form can warn about duplicates early. */
export async function existingKeys() {
  const { list } = await getFile(config());
  return {
    slugs: new Set(list.map((a) => a.slug)),
    packages: new Set(list.map((a) => a.package_id))
  };
}
