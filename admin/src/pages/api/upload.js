import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { put } from '@vercel/blob';
import { isAuthed } from '../../lib/auth.js';
import { inspectApk } from '../../lib/apk.js';
import { buildRecord } from '../../lib/record.js';
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

  const { apkUrl, screenshots = [], name, developer, categorySlug, description } = form;
  if (!apkUrl?.startsWith('https://')) return json({ error: 'missing APK upload' }, 400);
  if (!name || !categorySlug) return json({ error: 'name and category are required' }, 400);

  // Pull the APK back from Blob to inspect it (server→Blob, no request limit).
  const tmp = path.join(tmpdir(), `${randomBytes(8).toString('hex')}.apk`);
  try {
    const res = await fetch(apkUrl);
    if (!res.ok) return json({ error: `could not read the uploaded APK (HTTP ${res.status})` }, 400);
    await writeFile(tmp, Buffer.from(await res.arrayBuffer()));

    const apk = await inspectApk(tmp);
    if (!apk.packageId) {
      return json({ error: `not a readable APK: ${apk.manifestError || 'no manifest'}` }, 400);
    }

    const { slugs, packages } = await existingKeys();
    if (packages.has(apk.packageId)) {
      return json({ error: `${apk.packageId} is already listed` }, 409);
    }

    // Store the launcher icon pulled from the APK (small, well under limits).
    let iconUrl = '';
    if (apk.icon) {
      const slugHint = (name || apk.packageId).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const blob = await put(`icons/${slugHint}-${Date.now()}.${apk.icon.ext}`, apk.icon.data, {
        access: 'public',
        contentType: apk.icon.ext === 'webp' ? 'image/webp' : 'image/png'
      });
      iconUrl = blob.url;
    }

    const record = buildRecord({
      form: { name, developer, categorySlug, description, screenshots },
      apk,
      blob: { apkUrl, iconUrl },
      existingSlugs: slugs
    });

    const { slug } = await appendCustomApp(record);
    return json({ ok: true, slug, package_id: apk.packageId, version: apk.versionName }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
