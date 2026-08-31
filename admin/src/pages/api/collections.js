import { isAuthed } from '../../lib/auth.js';
import { readCollections, writeCollections } from '../../lib/collections-store.js';

export const prerender = false;

/** GET the editorial collections; POST replaces the whole list. Owner-only. */
export async function GET({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  try {
    return json({ ok: true, collections: await readCollections() }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }
  try {
    const saved = await writeCollections(body.collections || []);
    return json({ ok: true, count: saved.length }, 200);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
