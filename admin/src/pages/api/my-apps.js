import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const CUSTOM_APPS_PATH = join(__dir, '../../../data/custom-apps.json');

export async function POST({ request }) {
  const action = new URL(request.url).searchParams.get('action');

  if (action === 'list') {
    try {
      const data = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
      return new Response(JSON.stringify({ apps: data }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  const body = await request.json();

  if (action === 'add') {
    try {
      const apps = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
      const existingSlugs = new Set(apps.map(a => a.slug));

      // Генерируем уникальный slug
      let slug = slugify(body.name, body.package_id);
      let counter = 1;
      const baseSlug = slug;
      while (existingSlugs.has(slug)) {
        slug = `${baseSlug}-${counter++}`;
      }

      const newApp = {
        slug,
        custom: true,
        package_id: body.package_id,
        category: body.category,
        developer: body.developer || 'You',
        version: body.version || '1.0.0',
        size: body.size || '',
        min_android: body.min_android || '',
        icon_url: body.icon_url || '',
        screenshots: [],
        permissions: body.permissions || [],
        translations: body.translations || {},
        open_source: false,
        source: 'custom',
        source_code: '',
        download: {
          type: 'direct',
          url: body.download_url || '',
          checksum_sha256: body.checksum_sha256 || '',
          updated: new Date().toISOString().slice(0, 10)
        },
        added_at: new Date().toISOString(),
        updated: new Date().toISOString()
      };

      apps.push(newApp);
      writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(apps, null, 2));

      return new Response(JSON.stringify({ slug, app: newApp }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  if (action === 'update') {
    try {
      const apps = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
      const idx = apps.findIndex(a => a.slug === body.slug);
      if (idx === -1) throw new Error('App not found');

      apps[idx] = { ...apps[idx], ...body, updated: new Date().toISOString() };
      writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(apps, null, 2));

      return new Response(JSON.stringify({ app: apps[idx] }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  if (action === 'delete') {
    try {
      const apps = JSON.parse(readFileSync(CUSTOM_APPS_PATH, 'utf8') || '[]');
      const filtered = apps.filter(a => a.slug !== body.slug);
      writeFileSync(CUSTOM_APPS_PATH, JSON.stringify(filtered, null, 2));

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { 'content-type': 'application/json' }
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { 'content-type': 'application/json' }
  });
}

function slugify(name, packageId) {
  const base = String(name).toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!base) {
    const parts = String(packageId).split('.');
    return parts[parts.length - 1] || 'app';
  }
  return base;
}
