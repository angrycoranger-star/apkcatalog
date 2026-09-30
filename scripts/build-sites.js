#!/usr/bin/env node
/**
 * Builds every thematic site × language into one tree that a single web server
 * can serve by host name:
 *
 *   dist-sites/<site>/<lang>/…    (site ids from config/sites.config.js)
 *
 * Domains, URL scheme and port come from deploy/environments.js, so canonical,
 * hreflang and language-switcher links point at the right hosts for that
 * environment.
 *
 *   npm run sites:build                          # local, everything
 *   npm run sites:build -- --sites games --langs ru,en
 *   npm run sites:build -- --env production      # + .br/.gz copies
 *
 * Options:
 *   --env <name>       environment from deploy/environments.js (default: local)
 *   --sites a,b        subset of sites (default: all)
 *   --langs ru,en      subset of languages (default: all)
 *   --out <dir>        output directory (default: dist-sites)
 *   --compress / --no-compress   write pre-compressed .br/.gz copies
 *                      (default: the environment's `compress`)
 */
import { spawnSync } from 'node:child_process';
import { readdir, rm, stat, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import zlib from 'node:zlib';
import { LANGS } from '../config/catalog.config.js';
import { SITE_IDS } from '../config/sites.config.js';
import { getEnvironment } from '../deploy/environments.js';
import { ROOT, parseArgs, asList, log } from './lib/util.js';

const args = parseArgs();
const envName = typeof args.env === 'string' ? args.env : 'local';
const env = getEnvironment(envName);
const sites = asList(args.sites, SITE_IDS);
const langs = asList(args.langs, LANGS);
const outRoot = path.resolve(ROOT, typeof args.out === 'string' ? args.out : 'dist-sites');
const compress = args['no-compress'] ? false : args.compress ? true : env.compress;

for (const id of sites) {
  if (!SITE_IDS.includes(id)) throw new Error(`Unknown site "${id}". Known: ${SITE_IDS.join(', ')}`);
  if (!env.domains[id]) throw new Error(`No domain for site "${id}" in environment "${envName}".`);
}
for (const lang of langs) {
  if (!LANGS.includes(lang)) throw new Error(`Unknown language "${lang}". Known: ${LANGS.join(', ')}`);
}

const astroBin = path.join(ROOT, 'node_modules', 'astro', 'astro.js');

async function countFiles(dir, predicate = () => true) {
  let count = 0;
  let bytes = 0;
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await countFiles(full, predicate);
      count += sub.count;
      bytes += sub.bytes;
    } else if (predicate(entry.name)) {
      count += 1;
      bytes += (await stat(full)).size;
    }
  }
  return { count, bytes };
}

/* Pre-compression: text assets only; Caddy's `precompressed br gzip` serves
   the .br/.gz sibling when the client accepts it. */
const COMPRESSIBLE = /\.(html|css|js|mjs|json|xml|txt|svg|webmanifest)$/i;
const brotli = promisify(zlib.brotliCompress);
const gzip = promisify(zlib.gzip);

async function listFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await listFiles(full, out);
    else if (COMPRESSIBLE.test(entry.name)) out.push(full);
  }
  return out;
}

async function precompress(dir) {
  const files = await listFiles(dir);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const file = files[next++];
      const data = await readFile(file);
      if (data.length < 256) continue;
      const [br, gz] = await Promise.all([
        brotli(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 } }),
        gzip(data, { level: 9 })
      ]);
      await writeFile(`${file}.br`, br);
      await writeFile(`${file}.gz`, gz);
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  return files.length;
}

const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(0)} MB`;
const started = Date.now();
const rows = [];

log.info(
  `Building ${sites.length} site(s) × ${langs.length} language(s) for "${envName}" into ${path.relative(ROOT, outRoot) || '.'}` +
    (compress ? ' (with .br/.gz)' : '')
);

for (const site of sites) {
  for (const lang of langs) {
    const outDir = path.join(outRoot, site, lang);
    const host = `${lang}.${env.domains[site]}${env.port ? `:${env.port}` : ''}`;
    const t0 = Date.now();
    await rm(outDir, { recursive: true, force: true });

    const result = spawnSync(process.execPath, [astroBin, 'build', '--outDir', outDir], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        SITE_ID: site,
        SITE_LANG: lang,
        SITE_DOMAIN: env.domains[site],
        SITE_URL_SCHEME: env.scheme,
        SITE_URL_PORT: env.port ? String(env.port) : ''
      }
    });
    if (result.status !== 0) {
      process.stderr.write(result.stdout.slice(-4000));
      process.stderr.write(result.stderr.slice(-4000));
      log.error(`Build failed: ${site}/${lang}`);
      process.exit(1);
    }

    const pages = (await countFiles(outDir, (name) => name.endsWith('.html'))).count;
    const compressed = compress ? await precompress(outDir) : 0;
    const { bytes } = await countFiles(outDir);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    rows.push({ site, lang, host, pages, bytes });
    log.done(
      `${site}/${lang}: ${pages} pages, ${mb(bytes)}` +
        (compress ? `, ${compressed} files pre-compressed` : '') +
        ` in ${secs}s → ${env.scheme}://${host}/`
    );
  }
}

const totalPages = rows.reduce((sum, r) => sum + r.pages, 0);
const totalBytes = rows.reduce((sum, r) => sum + r.bytes, 0);
log.done(
  `Built ${rows.length} variant(s): ${totalPages} pages, ${mb(totalBytes)} in ${((Date.now() - started) / 1000).toFixed(0)}s.`
);
