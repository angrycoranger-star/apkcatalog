import { rewrite } from '@vercel/edge';
import { pickLang } from './config/geo.js';
import { LANGS, LANG_HOSTS } from './config/catalog.config.js';

export const config = {
  // Skip build assets and any file with an extension; only real page paths
  // reach the middleware, which keeps edge invocations low on the language
  // sites (where it no-ops anyway).
  matcher: ['/((?!_astro/|img/|releases/|favicon|sitemap|robots|.*\\.).*)']
};

const DOMAIN = process.env.SITE_DOMAIN || 'apk4orge.com';
const LANG_HOST_SET = new Set(Object.values(LANG_HOSTS));

/**
 * Two jobs, both host-based:
 *  1. Per-app subdomain `<slug>.<lang>.<domain>` serves the pre-built
 *     /app/<slug>/ page (a rewrite, so the pretty URL stays in the bar). Only
 *     active once the wildcard domain + DNS exist; harmless otherwise, since no
 *     such host resolves.
 *  2. The bare apex redirects to the language subdomain matching the visitor's
 *     country / Accept-Language.
 * A language subdomain (ru./en./…) and *.vercel.app pass straight through.
 */
export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || url.host).toLowerCase();

  // 1. App subdomain → serve the built app page.
  const suffix = `.${DOMAIN}`;
  if (host.endsWith(suffix)) {
    const labels = host.slice(0, -suffix.length).split('.');
    // Exactly <slug>.<langhost> in front of the domain (the language home has a
    // single label, e.g. "en", and is left alone).
    if (labels.length === 2 && labels[0] && labels[0] !== 'www' && LANG_HOST_SET.has(labels[1])) {
      if (url.pathname === '/') {
        return rewrite(new URL(`/app/${labels[0]}/`, url.origin));
      }
      return undefined; // assets / other paths served as-is on this host
    }
  }

  // 2. Apex geo-redirect. Anything with a subdomain passes.
  if (host !== DOMAIN && host !== `www.${DOMAIN}`) return undefined;

  const country = request.headers.get('x-vercel-ip-country');
  const lang = pickLang(country, request.headers.get('accept-language'));
  const target = LANGS.includes(lang) ? lang : 'en';

  const dest = new URL(url.pathname + url.search, `https://${target}.${DOMAIN}`);
  return Response.redirect(dest.toString(), 307);
}
