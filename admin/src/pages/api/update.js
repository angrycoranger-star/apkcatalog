import { isAuthed } from '../../lib/auth.js';
import { buildPatch } from '../../lib/record.js';
import { inspectApkUrl } from '../../lib/ingest.js';
import { listCustomApps, updateCustomApp } from '../../lib/github.js';

export const prerender = false;

/**
 * Edit an existing owner card. Any subset of fields may be sent; passing a new
 * `apkUrl` (already client-uploaded to Blob) also swaps the APK and its derived
 * facts. Commits the change, which rebuilds the four sites.
 */
export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);

  let form;
  try {
    form = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const { slug, apkUrl } = form;
  if (!slug) return json({ error: 'slug is required' }, 400);

  try {
    const existing = (await listCustomApps()).find((a) => a.slug === slug);
    if (!existing) return json({ error: `no card with slug "${slug}"` }, 404);

    // Optional APK replacement: re-inspect the freshly uploaded file.
    let apk = null;
    let blob = null;
    if (apkUrl) {
      if (!apkUrl.startsWith('https://')) return json({ error: 'bad APK URL' }, 400);
      const inspected = await inspectApkUrl(apkUrl, { slugHintBase: form.name || slug });
      apk = inspected.apk;
      blob = { apkUrl, iconUrl: inspected.iconUrl };
    }

    const patch = buildPatch({ form, apk, blob, existing });
    if (Object.keys(patch).length === 0) return json({ error: 'nothing to change' }, 400);

    const record = await updateCustomApp(slug, patch);
    return json({ ok: true, slug: record.slug, version: record.version }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
