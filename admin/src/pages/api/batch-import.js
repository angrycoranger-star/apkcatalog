import { writeFile, unlink, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { dirname, fileURLToPath } from 'node:url';
import { inspectApk } from '../../lib/apk.js';

const __dir = dirname(fileURLToPath(import.meta.url));
const CUSTOM_APPS_PATH = join(__dir, '../../../data/custom-apps.json');

function slugify(name, packageId) {
  const base = String(name).toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) {
    const parts = String(packageId).split('.');
    return parts[parts.length - 1] || 'app';
  }
  return base;
}

function uniqueSlug(base, taken) {
  let slug = base;
  let counter = 1;
  while (taken.has(slug)) {
    slug = `${base}-${counter++}`;
  }
  return slug;
}

export async function POST({ request }) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('apks');

    if (!files.length) {
      return new Response(JSON.stringify({ error: 'No APK files provided' }), {
        status: 400,
        headers: { 'content-type': 'application/json' }
      });
    }

    const customApps = JSON.parse(await readFile(CUSTOM_APPS_PATH, 'utf8') || '[]');
    const existingSlugs = new Set(customApps.map(a => a.slug));
    const existingPackages = new Set(customApps.map(a => a.package_id));

    const results = [];
    let imported = 0;
    let skipped = 0;

    for (const file of files) {
      const tmpPath = join(tmpdir(), `${randomBytes(8).toString('hex')}.apk`);

      try {
        const buffer = await file.arrayBuffer();
        await writeFile(tmpPath, Buffer.from(buffer));

        const apkData = await inspectApk(tmpPath);

        if (!apkData.packageId) {
          results.push({
            file: file.name,
            status: 'error',
            message: 'Could not read package ID'
          });
          continue;
        }

        if (existingPackages.has(apkData.packageId)) {
          results.push({
            file: file.name,
            status: 'skipped',
            message: 'Already imported',
            package: apkData.packageId
          });
          skipped++;
          continue;
        }

        const appName = file.name.replace(/\.apk$/i, '');
        const slug = uniqueSlug(slugify(appName, apkData.packageId), existingSlugs);

        const newApp = {
          slug,
          custom: true,
          package_id: apkData.packageId,
          category: 'TOOLS',
          developer: 'You',
          version: apkData.versionName || '1.0.0',
          size: apkData.size || '',
          min_android: apkData.minAndroid || '',
          icon_url: '',
          screenshots: [],
          permissions: apkData.permissions || [],
          translations: {
            en: { name: appName, summary: `${appName} is an app for Android.` },
            ru: { name: appName, summary: `${appName} - приложение для Android.` },
            tr: { name: appName, summary: `${appName}, Android için bir uygulamadır.` },
            uz: { name: appName, summary: `${appName} Android uchun ilova.` }
          },
          open_source: false,
          source: 'custom',
          source_code: '',
          download: {
            type: 'direct',
            url: '',
            checksum_sha256: apkData.checksumSha256 || '',
            updated: new Date().toISOString().slice(0, 10)
          },
          added_at: new Date().toISOString(),
          updated: new Date().toISOString()
        };

        customApps.push(newApp);
        existingSlugs.add(slug);
        existingPackages.add(apkData.packageId);

        results.push({
          file: file.name,
          status: 'imported',
          package: apkData.packageId,
          version: apkData.versionName,
          slug
        });

        imported++;
      } catch (err) {
        results.push({
          file: file.name,
          status: 'error',
          message: err.message
        });
      } finally {
        await unlink(tmpPath).catch(() => {});
      }
    }

    if (imported > 0) {
      await writeFile(CUSTOM_APPS_PATH, JSON.stringify(customApps, null, 2));
    }

    return new Response(JSON.stringify({
      imported,
      skipped,
      total: customApps.length,
      results
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message || 'Error processing APKs'
    }), {
      status: 500,
      headers: { 'content-type': 'application/json' }
    });
  }
}
