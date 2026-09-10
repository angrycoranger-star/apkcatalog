#!/usr/bin/env node
/**
 * Add your own app to the catalog with optional APK extraction.
 * Interactive script - asks for app details and optionally processes APK.
 *
 * Usage:
 *   node scripts/add-own-app.js
 *   node scripts/add-own-app.js --name "MyApp" --package "com.example.app"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { inspectApk } from './lib/apk.js';
import { composeSummary } from './lib/summarize.js';
import { slugify, uniqueSlug } from './lib/util.js';

const CUSTOM_APPS_PATH = 'data/custom-apps.json';
const LANGS = ['en', 'ru', 'tr', 'uz'];
const CATEGORIES = {
  COMMUNICATION: 'Communication',
  TOOLS: 'Tools & Utilities',
  PERSONALIZATION: 'Personalization',
  PRODUCTIVITY: 'Productivity',
  GAMES: 'Games',
  MEDIA: 'Media & Video',
  SOCIAL: 'Social',
  BUSINESS: 'Business',
  EDUCATION: 'Education',
  HEALTH: 'Health & Fitness'
};

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise(resolve => rl.question(prompt, resolve));
}

async function main() {
  console.log('\n📱 Add Your Own App to Catalog\n');

  const name = await question('App name: ');
  const packageId = await question('Package ID (com.example.app): ');

  console.log('\nCategories:');
  Object.entries(CATEGORIES).forEach(([key, val]) => {
    console.log(`  ${key.padEnd(20)} - ${val}`);
  });
  const category = await question('Category: ');

  const apkPath = await question('APK path (leave empty to add later): ');
  const iconPath = await question('Icon path (leave empty to extract from APK): ');

  let apkData = null;
  let extractedIcon = null;

  // Process APK if provided
  if (apkPath && existsSync(apkPath)) {
    try {
      console.log('\n⏳ Reading APK...');
      apkData = await inspectApk(resolve(apkPath));
      console.log(`✓ Package: ${apkData.packageId}`);
      console.log(`✓ Version: ${apkData.versionName}`);
      console.log(`✓ Min Android: ${apkData.minAndroid}`);
      console.log(`✓ Size: ${apkData.size}`);

      if (apkData.icon && !iconPath) {
        extractedIcon = apkData.icon;
        console.log('✓ Icon extracted from APK');
      }
    } catch (e) {
      console.error('✗ Error reading APK:', e.message);
      process.exit(1);
    }
  }

  const customApps = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
  const existingSlugs = new Set(customApps.map(a => a.slug));

  const appPackageId = apkData?.packageId || packageId;
  const appName = name || (apkData?.name || 'My App');

  const slug = uniqueSlug(slugify(appName, appPackageId), existingSlugs);

  const facts = {
    packageId: appPackageId,
    developer: 'You',
    isGame: category.toUpperCase().includes('GAME'),
    rating: null,
    ratingsCount: null,
    installs: '',
    size: apkData?.size || '',
    contentRating: ''
  };

  const translations = {};
  for (const lang of LANGS) {
    translations[lang] = {
      name: appName,
      summary: composeSummary({ ...facts, name: appName, categoryLabel: CATEGORIES[category] || category }, lang, { hideStore: true })
    };
  }

  const app = {
    slug,
    custom: true,
    package_id: appPackageId,
    category: category.toUpperCase(),
    developer: 'You',
    version: apkData?.versionName || '1.0.0',
    size: apkData?.size || '',
    min_android: apkData?.minAndroid || '',
    icon_url: '',
    screenshots: [],
    permissions: apkData?.permissions || [],
    translations,
    open_source: false,
    source: 'custom',
    source_code: '',
    download: {
      type: 'direct',
      url: '',
      checksum_sha256: apkData?.checksumSha256 || '',
      updated: new Date().toISOString().slice(0, 10)
    },
    added_at: new Date().toISOString(),
    updated: new Date().toISOString()
  };

  customApps.push(app);
  writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(customApps, null, 2));

  console.log('\n✅ App added to data/custom-apps.json');
  console.log(`📌 Slug: ${slug}`);
  console.log(`\nNext steps:`);
  console.log('1. If you have an APK later:');
  console.log(`   node scripts/update-own-app.js --slug ${slug} --apk ./app.apk`);
  console.log('\n2. If you have a download URL:');
  console.log(`   node scripts/update-own-app.js --slug ${slug} --url https://example.com/app.apk`);
  console.log('\n3. To add icon:');
  console.log(`   node scripts/update-own-app.js --slug ${slug} --icon ./icon.png`);

  rl.close();
}

main().catch(e => {
  console.error('Error:', e.message);
  rl.close();
  process.exit(1);
});
