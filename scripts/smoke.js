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
  await run('scripts/validate-data.js', []);

  const apps = await readJson(path.join(dataDir, 'apps.json'), []);
  const packages = await readJson(path.join(dataDir, 'package-ids.json'), { packages: [] });

  if (apps.length === 0) throw new Error('pipeline produced no cards');
  const missingSummary = apps.filter((app) => !app.translations?.ru?.summary);
  if (missingSummary.length > 0) throw new Error(`${missingSummary.length} cards have no Russian summary`);

  log.done(`Smoke test passed: ${packages.packages.length} package ids -> ${apps.length} cards.`);
} finally {
  await rm(dataDir, { recursive: true, force: true });
}
