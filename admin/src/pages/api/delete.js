import { isAuthed } from '../../lib/auth.js';
import { deleteCustomApp } from '../../lib/github.js';

export const prerender = false;

/** Remove one owner card by slug. Commits the change, rebuilding the sites. */
export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const { slug } = body;
  if (!slug) return json({ error: 'slug is required' }, 400);

  try {
    const result = await deleteCustomApp(slug);
    return json({ ok: true, ...result }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
