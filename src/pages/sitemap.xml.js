import { getAllApps, usedCategories, DATA_META } from '../lib/apps.js';
import { getCollections } from '../lib/collections.js';

/* Hand-rolled rather than pulled from @astrojs/sitemap: this build needs
   per-entry hreflang alternates pointing at the other language subdomains. */
import { LANGS } from '../../config/catalog.config.js';
import { hostFor, LOCALES, DOMAIN } from '../i18n/index.js';

function alternates(path) {
  return LANGS.map(
    (lang) =>
      `<xhtml:link rel="alternate" hreflang="${LOCALES[lang]}" href="${hostFor(lang, DOMAIN)}${path}"/>`
  ).join('');
}

function url(site, path, { lastmod, priority, changefreq }) {
  return [
    '<url>',
    `<loc>${new URL(path, site).href}</loc>`,
    alternates(path),
    lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : '',
    changefreq ? `<changefreq>${changefreq}</changefreq>` : '',
    priority ? `<priority>${priority}</priority>` : '',
    '</url>'
  ].join('');
}

export function GET({ site }) {
  const generated = DATA_META?.generated_at ?? new Date().toISOString();

  const entries = [
    url(site, '/', { lastmod: generated, priority: '1.0', changefreq: 'daily' }),
    url(site, '/apps/', { lastmod: generated, priority: '0.9', changefreq: 'daily' }),
    url(site, '/games/', { lastmod: generated, priority: '0.9', changefreq: 'daily' }),
    ...usedCategories('app').map((entry) =>
      url(site, `/apps/${entry.category.slug}/`, { lastmod: generated, priority: '0.7', changefreq: 'weekly' })
    ),
    ...usedCategories('game').map((entry) =>
      url(site, `/games/${entry.category.slug}/`, { lastmod: generated, priority: '0.7', changefreq: 'weekly' })
    ),
    url(site, '/collections/', { lastmod: generated, priority: '0.7', changefreq: 'weekly' }),
    ...getCollections().map((c) =>
      url(site, `/collections/${c.slug}/`, { lastmod: generated, priority: '0.6', changefreq: 'weekly' })
    ),
    ...getAllApps().map((app) =>
      url(site, app.href, { lastmod: app.updatedAt ?? generated, priority: '0.6', changefreq: 'weekly' })
    ),
    ...['/privacy/', '/disclaimer/', '/contact/'].map((path) =>
      url(site, path, { priority: '0.3', changefreq: 'yearly' })
    )
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`;

  return new Response(xml, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
