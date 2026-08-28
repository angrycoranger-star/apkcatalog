import { isAuthed } from '../../lib/auth.js';
import { categorySlugById } from '../../lib/record.js';
import { listCustomApps } from '../../lib/github.js';

export const prerender = false;

/**
 * The owner's listed apps with everything the management + edit screens render.
 * `?slug=` returns just that one card as { ok, app } for the edit form.
 */
export async function GET({ request }) {
  if (!isAuthed(request)) return json({ error: 'unauthorized' }, 401);
  try {
    const wanted = new URL(request.url).searchParams.get('slug');
    const list = await listCustomApps();
    const apps = list.map(shape);
    if (wanted) {
      const app = apps.find((a) => a.slug === wanted);
      if (!app) return json({ error: `no card with slug "${wanted}"` }, 404);
      return json({ ok: true, app }, 200);
    }
    return json({ ok: true, apps }, 200);
  } catch (error) {
    return json({ error: error.message }, 500);
  }
}

function shape(a) {
  return {
    slug: a.slug,
    name: a.translations?.ru?.name || a.translations?.en?.name || a.slug,
    description: a.translations?.ru?.summary || a.translations?.en?.summary || '',
    developer: a.developer || '',
    category: a.category || '',
    categorySlug: categorySlugById(a.category),
    version: a.version || '',
    icon_url: a.icon_url || '',
    screenshots: Array.isArray(a.screenshots) ? a.screenshots : [],
    web_url: a.web_url || '',
    featured: a.featured === true,
    pinned: a.pinned === true,
    promo_order: typeof a.promo_order === 'number' ? a.promo_order : 999,
    package_id: a.package_id || ''
  };
}

function json(body, status) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}
