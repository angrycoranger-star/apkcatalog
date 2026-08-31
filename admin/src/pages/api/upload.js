import { isAuthed } from '../../lib/auth.js';
import { buildRecord } from '../../lib/record.js';
import { inspectApkUrl } from '../../lib/ingest.js';
import { appendCustomApp, existingKeys } from '../../lib/github.js';

export const prerender = false;

/**
 * Finalise an upload: the APK and screenshots are already in Blob (client
 * upload), so this reads the APK back from its Blob URL to compute the SHA-256
 * and manifest, uploads the extracted icon, builds the card and commits it to
 * data/custom-apps.json — which triggers the four sites to rebuild.
 */
export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);

  let form;
  try {
    form = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const {
    apkUrl, screenshots = [], name, developer, categorySlug, description, descriptions,
    webUrl, featured, pinned, promoOrder, rating, ratingsCount
  } = form;
  if (!apkUrl?.startsWith('https://')) return json({ error: 'missing APK upload' }, 400);
  if (!name || !categorySlug) return json({ error: 'name and category are required' }, 400);

  try {
    const { apk, iconUrl } = await inspectApkUrl(apkUrl, { slugHintBase: name });

    const { slugs, packages } = await existingKeys();
    if (packages.has(apk.packageId)) {
      return json({ error: `${apk.packageId} is already listed` }, 409);
    }

    const record = buildRecord({
      form: { name, developer, categorySlug, description, descriptions, screenshots, webUrl, featured, pinned, promoOrder, rating, ratingsCount },
      apk,
      blob: { apkUrl, iconUrl },
      existingSlugs: slugs
    });

    const { slug } = await appendCustomApp(record);
    return json({ ok: true, slug, package_id: apk.packageId, version: apk.versionName }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
