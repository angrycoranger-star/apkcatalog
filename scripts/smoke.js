#!/usr/bin/env node
/**
 * Offline end-to-end check of the collector pipeline.
 *
 * Runs discovery.js and fetch-details.js against the fixture scraper, writing
 * into a scratch data directory so the repository's dataset is untouched, then
 * validates the result. No network access required.
 *
 * Usage: npm run smoke
 */
import { mkdtemp, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { readJson, log } from './lib/util.js';

const dataDir = await mkdtemp(path.join(tmpdir(), 'apkcatalog-smoke-'));
const env = { ...process.env, CATALOG_DATA_DIR: dataDir };

function run(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve() : reject(new Error(`${script} exited with code ${code}`))
    );
  });
}

const client = ['--client', './scripts/lib/fixture-scraper.js'];

try {
  await run('scripts/discovery.js', [
    ...client, '--countries', 'ru,tr', '--categories', 'GAME_PUZZLE,TOOLS', '--num', '8', '--delay', '5'
  ]);
  await run('scripts/fetch-details.js', [...client, '--delay', '5', '--timeout', '5000']);
  await run('scripts/fdroid-import.js', ['--index', 'scripts/fixtures/fdroid-index.json', '--repo', 'https://f-droid.org/repo']);
  await run('scripts/openapk-import.js', ['--dir', 'scripts/fixtures/openapk']);
  await run('scripts/validate-data.js', []);

  const apps = await readJson(path.join(dataDir, 'apps.json'), []);
  const packages = await readJson(path.join(dataDir, 'package-ids.json'), { packages: [] });

  if (apps.length === 0) throw new Error('pipeline produced no cards');
  const missingSummary = apps.filter((app) => !app.translations?.ru?.summary);
  if (missingSummary.length > 0) throw new Error(`${missingSummary.length} cards have no Russian summary`);

  const fdroid = await readJson(path.join(dataDir, 'fdroid-apps.json'), []);
  if (fdroid.length === 0) throw new Error('F-Droid import produced no cards');
  const unlicensed = fdroid.filter((a) => !a.license || a.source !== 'fdroid');
  if (unlicensed.length > 0) throw new Error(`${unlicensed.length} F-Droid cards missing a license`);

  const openapk = await readJson(path.join(dataDir, 'openapk-repos.json'), []);
  if (openapk.length === 0) throw new Error('OpenAPK discovery produced no repos');
  const badRepo = openapk.filter((r) => !/^[^/\s]+\/[^/\s]+$/.test(r.repo || ''));
  if (badRepo.length > 0) throw new Error(`${badRepo.length} OpenAPK entries have a malformed repo ref`);

  log.done(
    `Smoke test passed: ${packages.packages.length} package ids -> ${apps.length} scraped, ` +
      `${fdroid.length} F-Droid cards, ${openapk.length} OpenAPK repos.`
  );
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
