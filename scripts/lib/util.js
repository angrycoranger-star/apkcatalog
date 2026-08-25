import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
/* CATALOG_DATA_DIR lets the smoke test drive the pipeline against a scratch
   directory instead of the repository's real dataset. */
export const DATA_DIR = process.env.CATALOG_DATA_DIR
  ? path.resolve(process.env.CATALOG_DATA_DIR)
  : path.join(ROOT, 'data');

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Backstop only. It rejects the caller but cannot abort the underlying socket,
 * so `requestOptions` below is what actually cancels a stalled request.
 */
export function withTimeout(promise, ms, label = 'request') {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

/**
 * Loads the scraper. Defaults to google-play-scraper; `--client <module>`
 * swaps in a local module, which is how the offline smoke test runs without
 * touching the network.
 */
export async function loadScraper(clientPath) {
  const specifier =
    typeof clientPath === 'string' && clientPath.length > 0
      ? (clientPath.startsWith('.') ? path.resolve(process.cwd(), clientPath) : clientPath)
      : 'google-play-scraper';
  const module = await import(specifier);
  return module.default ?? module;
}

/**
 * Politeness delay between scraper calls. Jitter keeps a long run from
 * hammering Google on a perfectly regular beat.
 */
export function throttle(baseMs, jitterRatio = 0.35) {
  const jitter = baseMs * jitterRatio * (Math.random() * 2 - 1);
  return sleep(Math.max(0, Math.round(baseMs + jitter)));
}

/**
 * Request options handed to google-play-scraper, which forwards them to got.
 *
 * `timeout.request` is the one that matters: it aborts the socket instead of
 * leaving it open. Without it an abandoned request keeps a handle referenced
 * and the process never exits after the work is done.
 *
 * `retry: 0` disables got's own internal retrying — withRetry() already owns
 * the retry policy, and stacking the two multiplies every slow request.
 */
export function requestOptions(timeoutMs) {
  return {
    timeout: { request: timeoutMs },
    retry: 0
  };
}

/** A slow endpoint is common; retrying it four times is what burns a run. */
export function isTimeoutError(error) {
  return /timed out|ETIMEDOUT|ESOCKETTIMEDOUT/i.test(String(error?.message ?? error));
}

/** Errors that mean "this package will never resolve" — do not retry those. */
export function isPermanentError(error) {
  const message = String(error?.message ?? error);
  return /404|not found|App not found/i.test(message);
}

/**
 * Retry with exponential backoff. Rate-limit responses get a longer floor
 * because Google keeps returning 429 for a while once it starts.
 */
export async function withRetry(
  fn,
  { retries = 3, timeoutRetries = 1, baseDelay = 1500, label = 'request', log = console } = {}
) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const budget = isTimeoutError(error) ? timeoutRetries : retries;
      if (isPermanentError(error) || attempt >= budget) break;

      const rateLimited = /429|too many requests/i.test(String(error?.message ?? ''));
      const delay = (rateLimited ? 8000 : baseDelay) * 2 ** attempt;
      log.warn?.(
        `${label} failed (attempt ${attempt + 1}/${budget + 1}): ${error.message}. ` +
          `Retrying in ${Math.round(delay / 1000)}s`
      );
      await sleep(delay);
    }
  }
  throw lastError;
}

const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '',
  э: 'e', ю: 'yu', я: 'ya',
  ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u'
};

/** URL-safe slug from an app name; Cyrillic and Turkish letters transliterate. */
export function slugify(value, fallback = '') {
  const slug = String(value ?? '')
    .toLowerCase()
    .split('')
    .map((char) => TRANSLIT[char] ?? char)
    .join('')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');

  return slug || slugify(fallback) || 'app';
}

/** Keeps slugs unique when two apps share a display name. */
export function uniqueSlug(base, taken) {
  if (!taken.has(base)) return base;
  let index = 2;
  while (taken.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export async function readJson(file, fallback = null) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return fallback;
    throw error;
  }
}

/** Write via a temp file + rename so a crashed run never truncates the dataset. */
export async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temp, file);
}

/** Minimal argv parser: --flag, --key value, --key=value. */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const [key, inline] = token.slice(2).split('=');
    if (inline !== undefined) {
      args[key] = inline;
    } else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
      args[key] = argv[i + 1];
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

export function asList(value, fallback) {
  if (value === undefined || value === true) return fallback;
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const stamp = () => new Date().toISOString().slice(11, 19);

export const log = {
  info: (message) => console.log(`[${stamp()}] ${message}`),
  warn: (message) => console.warn(`[${stamp()}] ! ${message}`),
  error: (message) => console.error(`[${stamp()}] ✗ ${message}`),
  done: (message) => console.log(`[${stamp()}] ✓ ${message}`)
};
