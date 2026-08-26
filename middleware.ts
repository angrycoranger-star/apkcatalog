import { pickLang } from './config/geo.js';
import { LANGS } from './config/catalog.config.js';

export const config = {
  // Skip build assets and any file with an extension; only real page paths
  // reach the middleware, which keeps edge invocations low on the language
  // sites (where it no-ops anyway).
  matcher: ['/((?!_astro/|img/|releases/|favicon|sitemap|robots|.*\\.).*)']
};

const DOMAIN = process.env.SITE_DOMAIN || 'apk4orge.com';

/**
 * Runs on every project, but only the bare apex domain (apk4orge.com) has any
 * work to do: send the visitor to the language subdomain that fits their
 * country / Accept-Language, preserving the path they asked for. On a language
 * subdomain (ru./en./…) the host check fails and the request passes through.
 */
export default function middleware(request: Request): Response | undefined {
  const url = new URL(request.url);
  const host = (request.headers.get('host') || url.host).toLowerCase();

  // Only the apex acts. Anything with a subdomain (incl. *.vercel.app) passes.
  if (host !== DOMAIN && host !== `www.${DOMAIN}`) return undefined;

  const country = request.headers.get('x-vercel-ip-country');
  const lang = pickLang(country, request.headers.get('accept-language'));
  const target = LANGS.includes(lang) ? lang : 'en';

  const dest = new URL(url.pathname + url.search, `https://${target}.${DOMAIN}`);
  return Response.redirect(dest.toString(), 307);
}
