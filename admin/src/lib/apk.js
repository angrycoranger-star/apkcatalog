import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import ApkReader from 'adbkit-apkreader';
import yauzl from 'yauzl';

/** Streamed SHA-256 so a large APK never loads into memory twice. */
export function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('error', reject)
      .on('data', (c) => hash.update(c))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

const ANDROID_BY_API = {
  21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1',
  28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15'
};
export const androidForApi = (api) =>
  typeof api === 'number' ? ANDROID_BY_API[api] ?? `API ${api}` : '';

export function humanSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const DENSITY_RANK = { xxxhdpi: 6, xxhdpi: 5, xhdpi: 4, hdpi: 3, tvdpi: 2, mdpi: 1, ldpi: 0 };

function listEntries(path) {
  return new Promise((resolve, reject) => {
    const names = [];
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('entry', (e) => { names.push(e.fileName); zip.readEntry(); });
      zip.on('end', () => resolve(names));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

export function pickIconEntry(entries) {
  const candidates = entries.filter(
    (n) =>
      /^res\/[^/]*(mipmap|drawable)[^/]*\/.*(ic_launcher|launcher|icon)[^/]*\.(png|webp)$/i.test(n) &&
      !/adaptive|foreground|background|round|monochrome/i.test(n)
  );
  if (candidates.length === 0) return null;
  const score = (n) => DENSITY_RANK[n.match(/-(\w*dpi)/i)?.[1]?.toLowerCase()] ?? 0;
  return candidates.sort((a, b) => score(b) - score(a))[0];
}

export function extractEntry(path, entryName) {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('entry', (e) => {
        if (e.fileName !== entryName) return zip.readEntry();
        zip.openReadStream(e, (er, stream) => {
          if (er) return reject(er);
          const chunks = [];
          stream.on('data', (c) => chunks.push(c));
          stream.on('end', () => resolve(Buffer.concat(chunks)));
          stream.on('error', reject);
        });
      });
      zip.on('end', () => resolve(null));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

/** Read package id, version, min Android, size, SHA-256 and a launcher icon. */
export async function inspectApk(path) {
  const [{ size }, checksum, entries] = await Promise.all([
    stat(path),
    sha256File(path),
    listEntries(path)
  ]);

  let manifest = null;
  let manifestError = null;
  try {
    manifest = await (await ApkReader.open(path)).readManifest();
  } catch (e) {
    manifestError = e.message;
  }

  const iconEntry = pickIconEntry(entries);
  let icon = null;
  if (iconEntry) {
    const data = await extractEntry(path, iconEntry);
    if (data) icon = { ext: iconEntry.split('.').pop().toLowerCase(), data };
  }

  const minSdk = manifest?.usesSdk?.minSdkVersion ?? null;
  return {
    packageId: manifest?.package ?? null,
    versionName: manifest?.versionName != null ? String(manifest.versionName) : null,
    minSdk,
    minAndroid: androidForApi(minSdk),
    permissions: (manifest?.usesPermissions ?? []).map((p) => p.name).filter(Boolean),
    sizeBytes: size,
    size: humanSize(size),
    checksumSha256: checksum,
    icon,
    manifestError
  };
}
