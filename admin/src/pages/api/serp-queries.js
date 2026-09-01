import { isAuthed } from '../../lib/auth.js';
import { addQuery, listQueries, removeQuery } from '../../lib/serp-store.js';

export const prerender = false;

/**
 * The tracked-query list behind the SERP dashboard. GET lists it; POST adds a
 * query (`{ q, targets }`) or removes one (`{ q, remove: true }`). Every write
 * is a commit to data/serp/queries.json, which the next scheduled scan reads.
 */
export async function GET({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  try {
    return json({ ok: true, queries: await listQueries() }, 200);
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
    const queries = body.remove
      ? await removeQuery(body.q)
      : await addQuery(body.q, Array.isArray(body.targets) ? body.targets : []);
    return json({ ok: true, queries }, 200);
  } catch (error) {
    return json({ error: error.message }, 400);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
