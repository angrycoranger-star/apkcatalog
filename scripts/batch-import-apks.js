#!/usr/bin/env node
/**
 * Batch import APK files from a directory into custom-apps.json
 *
 * Usage:
 *   node scripts/batch-import-apks.js ./apks-folder
 *   node scripts/batch-import-apks.js # uses ./uploads/apks by default
 */

import { readdirSync, unlinkSync } from 'node:fs';
import { readFileSync, writeFileSync } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { inspectApk } from './lib/apk.js';
import { slugify, uniqueSlug } from './lib/util.js';

const CUSTOM_APPS_PATH = 'data/custom-apps.json';

async function main() {
  const apkDir = process.argv[2] || 'uploads/apks';

  console.log(`\n📦 Batch APK Import\n`);
  console.log(`📁 Scanning: ${apkDir}\n`);

  let files;
  try {
    files = readdirSync(apkDir).filter(f => f.endsWith('.apk'));
  } catch (err) {
    console.error(`❌ Folder not found: ${apkDir}`);
    console.error(`\nCreate folder and add APK files:\n  mkdir -p ${apkDir}\n  cp your-apps/*.apk ${apkDir}/\n`);
    process.exit(1);
  }

  if (!files.length) {
    console.log(`⚠️  No APK files found in ${apkDir}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} APK file(s)\n`);

  const customApps = JSON.parse(await readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
  const existingSlugs = new Set(customApps.map(a => a.slug));
  const existingPackages = new Set(customApps.map(a => a.package_id));

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    const apkPath = join(apkDir, file);
    const appName = basename(file, '.apk');

    try {
      console.log(`⏳ ${file}...`);

      const apkData = await inspectApk(apkPath);

      if (!apkData.packageId) {
        console.log(`   ❌ Could not read package ID\n`);
        errors++;
        continue;
      }

      // Пропускаем если уже есть
      if (existingPackages.has(apkData.packageId)) {
        console.log(`   ⊘ Already imported (${apkData.packageId})\n`);
        skipped++;
        continue;
      }

      const slug = uniqueSlug(slugify(appName, apkData.packageId), existingSlugs);

      const newApp = {
        slug,
        custom: true,
        package_id: apkData.packageId,
        category: 'TOOLS', // Пользователь поправит потом
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

      console.log(`   ✅ ${apkData.packageId} v${apkData.versionName}`);
      console.log(`      Size: ${apkData.size}, Min: ${apkData.minAndroid}`);
      console.log(`      Slug: ${slug}\n`);
      imported++;
    } catch (err) {
      console.log(`   ❌ ${err.message}\n`);
      errors++;
    }
  }

  // Сохраняем
  if (imported > 0) {
    await writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(customApps, null, 2));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Imported: ${imported}`);
  console.log(`   ⊘ Skipped: ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📝 Total in catalog: ${customApps.length}\n`);

  if (imported > 0) {
    console.log(`Next steps:`);
    console.log(`1. Edit each app in /admin/my-apps`);
    console.log(`2. Set correct category`);
    console.log(`3. Add download URLs`);
    console.log(`4. Site rebuilds automatically after 1-2 min\n`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
