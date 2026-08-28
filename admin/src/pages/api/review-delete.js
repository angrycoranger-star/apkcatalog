import { isAuthed } from '../../lib/auth.js';
import { deleteReview } from '../../lib/reviews.js';

export const prerender = false;

/** Moderation: remove one visitor comment by slug + id. Owner-only. */
export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const { slug, id } = body;
  if (!slug || !id) return json({ error: 'slug and id are required' }, 400);

  try {
    return json(await deleteReview(slug, id), 200);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
