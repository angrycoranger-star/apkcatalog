import { isAuthed } from '../../lib/auth.js';
import { generateDescriptions } from '../../lib/seo.js';

export const prerender = false;

/**
 * Draft an SEO description for one of the owner's apps in all four languages,
 * via Claude. Owner-only. The client fills the description field with the result
 * and submits the per-language texts with the card.
 */
export async function POST({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);

  let form;
  try {
    form = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const { name, developer, categoryLabel, packageId, version, isGame, keywords } = form;
  if (!name && !packageId) return json({ error: 'add a name first' }, 400);

  try {
    const translations = await generateDescriptions({ name, developer, categoryLabel, packageId, version, isGame, keywords });
    return json({ ok: true, translations }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
