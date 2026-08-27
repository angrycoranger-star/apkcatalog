import { isAuthed } from './lib/auth.js';

/** Public paths reachable without a session. Everything else needs the cookie. */
const PUBLIC = new Set(['/login', '/api/login']);

/**
 * Gate the whole panel. An unauthenticated browser request is bounced to the
 * login page; an unauthenticated API call gets a 401. Static assets Astro
 * emits under /_astro/ are always allowed.
 */
export function onRequest(context, next) {
  const { pathname } = context.url;
  if (pathname.startsWith('/_astro/') || pathname === '/favicon.svg') return next();
  if (PUBLIC.has(pathname)) return next();

  if (!isAuthed(context.request)) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401,
        headers: { 'content-type': 'application/json' }
      });
    }
    return context.redirect('/login', 302);
  }
  return next();
}
