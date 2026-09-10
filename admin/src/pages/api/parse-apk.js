import { writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { dirname, fileURLToPath } from 'node:url';
import { inspectApk } from '../../lib/apk.js';

const __dir = dirname(fileURLToPath(import.meta.url));

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const file = formData.get('apk');

    if (!file) {
      return new Response(JSON.stringify({ error: 'No APK file provided' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    // Сохраняем APK во временный файл
    const tmpPath = join(tmpdir(), `${randomBytes(8).toString('hex')}.apk`);

    try {
      const buffer = await file.arrayBuffer();
      await writeFile(tmpPath, Buffer.from(buffer));

      // Парсим APK
      const apkData = await inspectApk(tmpPath);

      return new Response(JSON.stringify({
        version: apkData.versionName || '',
        size: apkData.size || '',
        min_android: apkData.minAndroid || '',
        permissions: apkData.permissions || [],
        checksum_sha256: apkData.checksumSha256 || '',
        has_icon: !!apkData.icon,
        icon_ext: apkData.icon?.ext || 'png'
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } finally {
      await unlink(tmpPath).catch(() => {});
    }
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message || 'Error parsing APK'
    }), {
      status: 400,
      headers: { 'content-type': 'application/json' }
    });
  }
}
