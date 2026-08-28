import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { put } from '@vercel/blob';
import { inspectApk } from './apk.js';

/**
 * Read an APK back from its Blob URL (server→Blob, so the ~4.5 MB request limit
 * never applies), inspect its manifest/checksum, and upload the launcher icon.
 * Returns { apk, iconUrl }. The temp file is always cleaned up.
 */
export async function inspectApkUrl(apkUrl, { slugHintBase } = {}) {
  const tmp = path.join(tmpdir(), `${randomBytes(8).toString('hex')}.apk`);
  try {
    const res = await fetch(apkUrl);
    if (!res.ok) throw new Error(`could not read the uploaded APK (HTTP ${res.status})`);
    await writeFile(tmp, Buffer.from(await res.arrayBuffer()));

    const apk = await inspectApk(tmp);
    if (!apk.packageId) throw new Error(`not a readable APK: ${apk.manifestError || 'no manifest'}`);

    let iconUrl = '';
    if (apk.icon) {
      const hint = (slugHintBase || apk.packageId).toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      const blob = await put(`icons/${hint}-${Date.now()}.${apk.icon.ext}`, apk.icon.data, {
        access: 'public',
        contentType: apk.icon.ext === 'webp' ? 'image/webp' : 'image/png'
      });
      iconUrl = blob.url;
    }
    return { apk, iconUrl };
  } finally {
    await unlink(tmp).catch(() => {});
  }
}
