import { isAuthed } from '../../lib/auth.js';
import { listRecentReviews } from '../../lib/reviews.js';

export const prerender = false;

/** Newest visitor comments across every app, for the moderation screen. */
export async function GET({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  try {
    return json({ ok: true, comments: await listRecentReviews(150) }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
