#!/usr/bin/env node
/**
 * Serves the tree built by `npm run sites:build` locally, the same way the VPS
 * will: one Caddy instance, every site × language on its own host name.
 *
 *   npm run sites:build      # once (or after changes)
 *   npm run sites:serve      # then open http://ru.games.localhost:8080/
 *
 * *.localhost resolves to 127.0.0.1 in Chrome, Edge and Firefox without any
 * hosts-file edits (Safari needs hosts entries — see deploy/README.md).
 * Needs the `caddy` binary on PATH, or its path in CADDY_BIN.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LANGS } from '../config/catalog.config.js';
import { SITE_IDS } from '../config/sites.config.js';
import { getEnvironment } from '../deploy/environments.js';
import { renderCaddyfile } from './caddyfile.js';
import { ROOT, log } from './lib/util.js';

const env = getEnvironment('local');
const siteRoot = path.resolve(ROOT, env.root);
const caddy = process.env.CADDY_BIN || 'caddy';

if (!existsSync(siteRoot)) {
  log.error(`${env.root}/ not found — run "npm run sites:build" first.`);
  process.exit(1);
}

const probe = spawnSync(caddy, ['version'], { encoding: 'utf8' });
if (probe.error || probe.status !== 0) {
  log.error('Caddy is not installed (or not on PATH). Install it, then rerun:');
  console.error('  macOS:    brew install caddy');
  console.error('  Windows:  winget install CaddyServer.Caddy   (or: scoop install caddy)');
  console.error('  Linux:    https://caddyserver.com/docs/install  (apt/dnf packages)');
  console.error('  Or download a binary from https://github.com/caddyserver/caddy/releases');
  console.error('  and point CADDY_BIN at it.');
  process.exit(1);
}

const config = path.join(siteRoot, 'Caddyfile');
await writeFile(config, renderCaddyfile('local', { root: siteRoot }));

const port = env.port ? `:${env.port}` : '';
log.info(`Caddy ${probe.stdout.trim().split(' ')[0]} — serving ${path.relative(ROOT, siteRoot)}/`);
for (const site of SITE_IDS) {
  const domain = env.domains[site];
  const built = LANGS.filter((lang) => existsSync(path.join(siteRoot, site, lang, 'index.html')));
  if (built.length === 0) continue;
  console.log(`  ${site.padEnd(10)} ${built.map((lang) => `${env.scheme}://${lang}.${domain}${port}/`).join('  ')}`);
  console.log(`  ${''.padEnd(10)} ${env.scheme}://${domain}${port}/  → redirects to the browser's language`);
}
console.log('Stop with Ctrl+C.');

const child = spawn(caddy, ['run', '--config', config, '--adapter', 'caddyfile'], { stdio: 'inherit' });
const stop = () => child.kill('SIGINT');
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
child.on('exit', (code) => process.exit(code ?? 0));
