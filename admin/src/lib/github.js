/**
 * Read and write data/custom-apps.json in the main repository via the GitHub
 * Contents API. Every write is a commit, and the push is what makes the four
 * static sites rebuild, so a change appears a minute or two later.
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

async function putList(cfg, sha, list, message) {
  const body = {
    message,
    content: Buffer.from(`${JSON.stringify(list, null, 2)}\n`, 'utf8').toString('base64'),
    branch: cfg.branch,
    ...(sha ? { sha } : {})
  };
  const res = await fetch(`${API}/repos/${cfg.repo}/contents/${FILE}`, {
    method: 'PUT',
    headers: headers(cfg.token),
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`GitHub commit failed: HTTP ${res.status} ${await res.text()}`);
}

/**
 * Add one record. Returns { slug } on success.
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

  await putList(cfg, sha, [...list, record], `feat(data): add "${record.translations?.en?.name || record.slug}" via admin`);
  return { slug: record.slug };
}

/** The whole custom-apps list, for the management screen. */
export async function listCustomApps() {
  const { list } = await getFile(config());
  return list;
}

/**
 * Merge `patch` into the record with this slug and commit. `patch` is a shallow
 * set of fields to overwrite (translations is merged one level deeper so a
 * single language can change without dropping the others). Returns the record.
 */
export async function updateCustomApp(slug, patch) {
  const cfg = config();
  const { sha, list } = await getFile(cfg);
  const index = list.findIndex((a) => a.slug === slug);
  if (index === -1) throw new Error(`no card with slug "${slug}"`);

  // If the package id changes (APK replaced), it must stay unique.
  if (patch.package_id && list.some((a, i) => i !== index && a.package_id === patch.package_id)) {
    throw new Error(`${patch.package_id} is already listed`);
  }

  const current = list[index];
  const merged = {
    ...current,
    ...patch,
    translations: patch.translations
      ? Object.fromEntries(
          Object.keys({ ...current.translations, ...patch.translations }).map((lang) => [
            lang,
            { ...current.translations?.[lang], ...patch.translations?.[lang] }
          ])
        )
      : current.translations,
    updated: new Date().toISOString()
  };
  const next = [...list];
  next[index] = merged;

  await putList(cfg, sha, next, `chore(data): update "${merged.translations?.en?.name || slug}" via admin`);
  return merged;
}

/** Remove the record with this slug and commit. Returns { removed: slug }. */
export async function deleteCustomApp(slug) {
  const cfg = config();
  const { sha, list } = await getFile(cfg);
  if (!list.some((a) => a.slug === slug)) throw new Error(`no card with slug "${slug}"`);
  const next = list.filter((a) => a.slug !== slug);
  await putList(cfg, sha, next, `chore(data): remove "${slug}" via admin`);
  return { removed: slug };
}

/** Current slugs/package ids, so the form can warn about duplicates early. */
export async function existingKeys() {
  const { list } = await getFile(config());
  return {
    slugs: new Set(list.map((a) => a.slug)),
    packages: new Set(list.map((a) => a.package_id))
  };
}
