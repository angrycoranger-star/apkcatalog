import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import ApkReader from 'adbkit-apkreader';
import yauzl from 'yauzl';

/** SHA-256 of a file, streamed so a large APK never loads into memory. */
export function sha256File(path) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    createReadStream(path)
      .on('error', reject)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')));
  });
}

/** minSdkVersion → the marketing Android version most people recognise. */
const ANDROID_BY_API = {
  21: '5.0', 22: '5.1', 23: '6.0', 24: '7.0', 25: '7.1', 26: '8.0', 27: '8.1',
  28: '9', 29: '10', 30: '11', 31: '12', 32: '12L', 33: '13', 34: '14', 35: '15'
};

export function androidVersionForApi(api) {
  if (typeof api !== 'number') return '';
  return ANDROID_BY_API[api] ?? `API ${api}`;
}

/** Human-readable size, matching how stores present download size. */
export function humanSize(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** List the entry names inside an APK (a plain ZIP) without extracting. */
function listZipEntries(path) {
  return new Promise((resolve, reject) => {
    const names = [];
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('entry', (entry) => {
        names.push(entry.fileName);
        zip.readEntry();
      });
      zip.on('end', () => resolve(names));
      zip.on('error', reject);
      zip.readEntry();
    });
  });
}

const DENSITY_RANK = {
  xxxhdpi: 6, xxhdpi: 5, xhdpi: 4, hdpi: 3, tvdpi: 2, mdpi: 1, ldpi: 0, nodpi: 0, anydpi: -1
};

/**
 * The manifest points at the launcher icon by resource id, which only
 * resources.arsc could resolve. Rather than parse that, pick the highest
 * raster launcher icon by filename convention — good enough to seed a card,
 * and the ingester lets the user override it.
 */
export function pickIconEntry(entries) {
  const candidates = entries.filter(
    (name) =>
      /^res\/[^/]*(mipmap|drawable)[^/]*\/.*(ic_launcher|launcher|icon)[^/]*\.(png|webp)$/i.test(name) &&
      !/adaptive|foreground|background|round|monochrome/i.test(name)
  );
  if (candidates.length === 0) return null;

  const score = (name) => {
    const density = name.match(/-(\w*dpi)/i)?.[1]?.toLowerCase();
    return DENSITY_RANK[density] ?? 0;
  };
  return candidates.sort((a, b) => score(b) - score(a))[0];
}

/** Extract one ZIP entry to a Buffer. */
export function extractEntry(path, entryName) {
  return new Promise((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (err, zip) => {
      if (err) return reject(err);
      zip.on('entry', (entry) => {
        if (entry.fileName !== entryName) return zip.readEntry();
        zip.openReadStream(entry, (streamErr, stream) => {
          if (streamErr) return reject(streamErr);
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

/**
 * Read everything a catalog card needs straight from an APK the user owns:
 * package id, version, min Android, size, checksum, permissions, and the
 * name+bytes of a launcher icon when one can be found.
 */
export async function inspectApk(path) {
  const [{ size }, checksum, entries] = await Promise.all([
    stat(path),
    sha256File(path),
    listZipEntries(path)
  ]);

  let manifest = null;
  let manifestError = null;
  try {
    const reader = await ApkReader.open(path);
    manifest = await reader.readManifest();
  } catch (error) {
    manifestError = error.message;
  }

  const iconEntry = pickIconEntry(entries);
  let icon = null;
  if (iconEntry) {
    const data = await extractEntry(path, iconEntry);
    if (data) icon = { name: iconEntry, ext: iconEntry.split('.').pop().toLowerCase(), data };
  }

  const minSdk = manifest?.usesSdk?.minSdkVersion ?? null;

  return {
    packageId: manifest?.package ?? null,
    versionName: manifest?.versionName != null ? String(manifest.versionName) : null,
    versionCode: manifest?.versionCode ?? null,
    minSdk,
    minAndroid: androidVersionForApi(minSdk),
    permissions: (manifest?.usesPermissions ?? []).map((p) => p.name).filter(Boolean),
    sizeBytes: size,
    size: humanSize(size),
    checksumSha256: checksum,
    icon,
    manifestError
  };
}
