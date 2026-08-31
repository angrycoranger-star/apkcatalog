import { getReviews, addReview } from '../../lib/reviews.js';

export const prerender = false;

// Public endpoint: read reviews for an app and post a new one. No cookie — it is
// exempted from the auth middleware. CORS is open for GET/POST (no credentials),
// so the static language sites on their own origins can call it.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
};

// Best-effort per-IP throttle. In-memory, so only within one warm instance —
// a backstop against a single bad actor, not a real rate limiter.
const lastPost = new Map();
const MIN_INTERVAL_MS = 15_000;

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function GET({ request }) {
  const slug = new URL(request.url).searchParams.get('slug');
  if (!slug) return json({ error: 'slug is required' }, 400);
  try {
    return json(await getReviews(slug), 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function POST({ request, clientAddress }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const { slug, name, text, rating, website } = body;
  if (!slug) return json({ error: 'slug is required' }, 400);

  // Honeypot: bots fill hidden fields. Pretend success without storing.
  if (website) return json({ ok: true, skipped: true }, 200);

  const ip = clientAddress || request.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const prev = lastPost.get(ip) || 0;
  if (now - prev < MIN_INTERVAL_MS) return json({ error: 'too many requests, slow down' }, 429);

  try {
    const result = await addReview(slug, { name, text, rating });
    lastPost.set(ip, now);
    return json({ ok: true, ...result }, 200);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...CORS }
  });
}
