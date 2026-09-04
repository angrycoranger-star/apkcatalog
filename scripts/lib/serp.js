import { setTimeout as delay } from 'node:timers/promises';
import { SETTINGS, TOP_N } from '../../config/serp.js';

/**
 * Desktop UA strings. Google serves a different (and much harder to parse)
 * layout to clients it reads as bots or as very old browsers, so these have to
 * look like a current desktop Chrome/Firefox.
 */
const AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0'
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/** Inclusive random integer, used for the pause between scans. */
export const randomInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

/**
 * Raised when Google answers with a consent wall or a captcha instead of
 * results. It is reported rather than swallowed: a scan that silently returns
 * an empty top-10 would read as "everything dropped out" downstream.
 */
export class BlockedError extends Error {
  constructor(kind) {
    super(`Google returned a ${kind} page instead of results`);
    this.name = 'BlockedError';
    this.kind = kind;
  }
}

/**
 * SERP_PROXY routes scans through an outbound proxy. Node's global fetch has no
 * proxy support of its own, so this reaches for undici's dispatcher when a
 * proxy is actually configured, and stays out of the way otherwise.
 */
let dispatcherPromise;
function proxyDispatcher() {
  const url = process.env.SERP_PROXY;
  if (!url) return Promise.resolve(undefined);
  dispatcherPromise ??= import('undici')
    .then(({ ProxyAgent }) => new ProxyAgent(url))
    .catch(() => {
      throw new Error('SERP_PROXY is set but the `undici` package is not installed (npm i undici)');
    });
  return dispatcherPromise;
}

function searchUrl({ domain, gl, hl, uule }, query) {
  const params = new URLSearchParams({
    q: query,
    gl,
    hl,
    num: String(TOP_N + 10),
    /* pws=0 drops personalisation; filter=0 keeps near-duplicate hosts so the
       ranking we record is the raw one, not Google's collapsed view. */
    pws: '0',
    filter: '0'
  });
  if (uule) params.set('uule', uule);
  return `https://${domain}/search?${params}`;
}

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SETTINGS.requestTimeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      dispatcher: await proxyDispatcher(),
      headers: {
        'user-agent': pick(AGENTS),
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'accept-encoding': 'gzip, deflate, br',
        'sec-ch-ua-mobile': '?0',
        'upgrade-insecure-requests': '1',
        /* Pre-answers the EU consent interstitial, which otherwise replaces the
           result page entirely. */
        cookie: 'CONSENT=YES+cb; SOCS=CAISHAgBEhJnd3NfMjAyNDA1MDgtMF9SQzIaAmVuIAEaBgiA_LyyBg'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

const decode = (s) =>
  s
    .replace(/<[^>]*>/g, '')
    .replace(/&(#\d+|#x[0-9a-f]+|amp|quot|lt|gt|nbsp|#39);/gi, (m, e) => {
      if (e[0] === '#') return String.fromCodePoint(Number(e[1] === 'x' ? `0x${e.slice(2)}` : e.slice(1)));
      return { amp: '&', quot: '"', lt: '<', gt: '>', nbsp: ' ' }[e.toLowerCase()] ?? m;
    })
    .replace(/\s+/g, ' ')
    .trim();

const SKIP_HOSTS = /(^|\.)(google\.[a-z.]+|googleusercontent\.com|gstatic\.com|youtube\.com\/redirect|schema\.org|blogger\.com|policies\.google\.com)$/i;

/**
 * Narrows the page to the organic column. Ads carry an `<h3>` inside their
 * anchor exactly like a result does, so they cannot be told apart at the anchor
 * level — but they live outside the result container, which can.
 */
function organicSection(html) {
  const start = html.search(/<div[^>]*\bid="(rso|search)"/i);
  const body = start === -1 ? html : html.slice(start);
  /* Belt and braces for the layouts where an ad block sits inside the column. */
  return body.replace(/<div[^>]*\b(id="(tads|tadsb|bottomads)"|data-text-ad)[\s\S]{0,4000}?<\/div>/gi, '');
}

/**
 * Organic results out of a result page. Google's markup changes constantly, so
 * rather than matching a class name this looks for the one structural invariant
 * an organic result has and an ad or a widget does not: an outbound anchor with
 * an `<h3>` title inside it.
 */
export function parseResults(html, limit = TOP_N) {
  const results = [];
  const seen = new Set();
  const anchor = /<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]{0,600}?)<\/a>/gi;

  for (const match of organicSection(html).matchAll(anchor)) {
    const [, rawHref, inner] = match;
    const title = inner.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    if (!title) continue;

    let href = rawHref;
    if (href.startsWith('/url?')) href = new URLSearchParams(href.slice(5)).get('q') ?? '';
    if (!href.startsWith('http')) continue;

    let url;
    try {
      url = new URL(decode(href));
    } catch {
      continue;
    }
    if (SKIP_HOSTS.test(url.hostname)) continue;

    const domain = url.hostname.replace(/^www\./, '');
    if (seen.has(url.href)) continue;
    seen.add(url.href);

    results.push({ position: results.length + 1, domain, url: url.href, title: decode(title[1]) });
    if (results.length >= limit) break;
  }
  return results;
}

/** True when the page is a captcha/consent wall rather than a result page. */
function blockedKind(status, html) {
  if (status === 429) return 'rate-limit (HTTP 429)';
  if (/\/sorry\/index|recaptcha|unusual traffic/i.test(html)) return 'captcha';
  if (/consent\.google\.|Before you continue/i.test(html)) return 'consent';
  if (status >= 400) return `HTTP ${status}`;
  return null;
}

/**
 * One query in one target, with retries. Throws BlockedError when Google
 * challenges us — the caller records that as a failed scan and keeps the
 * previous ranking, instead of reporting a phantom wipe-out.
 */
export async function scan(target, query) {
  let last;
  for (let attempt = 0; attempt <= SETTINGS.retries; attempt++) {
    if (attempt) await delay(randomInt(30000, 60000));
    try {
      const response = await get(searchUrl(target, query));
      const html = await response.text();

      const kind = blockedKind(response.status, html);
      if (kind) throw new BlockedError(kind);

      const results = parseResults(html);
      if (!results.length) throw new BlockedError('unparseable (layout changed or soft block)');
      return results;
    } catch (error) {
      last = error;
    }
  }
  throw last;
}
