#!/usr/bin/env node
/**
 * Update your own app with APK, icon, or download URL.
 *
 * Usage:
 *   node scripts/update-own-app.js --slug my-app --apk ./app.apk
 *   node scripts/update-own-app.js --slug my-app --url https://example.com/app.apk
 *   node scripts/update-own-app.js --slug my-app --icon ./icon.png
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inspectApk } from './lib/apk.js';
import { parseArgs } from './lib/util.js';

const CUSTOM_APPS_PATH = 'data/custom-apps.json';

async function main() {
  const args = parseArgs();

  if (!args.slug) {
    console.error('Error: --slug is required');
    console.error('Usage: node scripts/update-own-app.js --slug my-app [--apk file.apk] [--url https://...] [--icon icon.png]');
    process.exit(1);
  }

  const customApps = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
  const appIndex = customApps.findIndex(a => a.slug === args.slug);

  if (appIndex === -1) {
    console.error(`Error: App with slug "${args.slug}" not found`);
    process.exit(1);
  }

  const app = customApps[appIndex];
  let updated = false;

  // Update with APK
  if (args.apk && existsSync(args.apk)) {
    try {
      console.log('⏳ Reading APK...');
      const apkData = await inspectApk(resolve(args.apk));
      app.version = apkData.versionName || app.version;
      app.size = apkData.size || app.size;
      app.min_android = apkData.minAndroid || app.min_android;
      app.permissions = apkData.permissions || app.permissions;
      app.download.checksum_sha256 = apkData.checksumSha256 || '';
      app.updated = new Date().toISOString();

      if (apkData.icon && !args.icon) {
        // TODO: Save icon to public/img/custom/
        console.log('ℹ Icon from APK not yet auto-saved (manual step needed)');
      }

      updated = true;
      console.log(`✓ APK processed: v${app.version}, ${app.size}`);
    } catch (e) {
      console.error('✗ Error reading APK:', e.message);
      process.exit(1);
    }
  }

  // Update with download URL
  if (args.url) {
    app.download.url = args.url;
    app.updated = new Date().toISOString();
    updated = true;
    console.log(`✓ Download URL updated: ${args.url}`);
  }

  // Update with icon (store URL)
  if (args.icon) {
    if (args.icon.startsWith('http')) {
      app.icon_url = args.icon;
      updated = true;
      console.log(`✓ Icon URL updated: ${args.icon}`);
    } else if (existsSync(args.icon)) {
      console.log('ℹ Local icon file provided - manual upload step needed');
      console.log(`  Save to: public/img/custom/${app.slug}.png`);
      console.log(`  Then set icon_url to: /img/custom/${app.slug}.png`);
    }
  }

  if (updated) {
    customApps[appIndex] = app;
    writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(customApps, null, 2));
    console.log(`\n✅ App "${app.slug}" updated`);
  } else {
    console.log('No updates provided. Use --apk, --url, or --icon');
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
