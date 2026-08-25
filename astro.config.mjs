import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import { LANGS, DEFAULT_LANG } from './config/catalog.config.js';

const lang = LANGS.includes(process.env.SITE_LANG) ? process.env.SITE_LANG : DEFAULT_LANG;
const domain = process.env.SITE_DOMAIN || 'apk4orge.com';

/**
 * One static build per language. The language is chosen by SITE_LANG at build
 * time and the whole site is emitted at the root of its own subdomain, so no
 * language prefix ever appears in a URL.
 */
export default defineConfig({
  site: `https://${lang}.${domain}`,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory'
  },
  vite: {
    plugins: [tailwindcss()],
    define: {
      'import.meta.env.PUBLIC_SITE_LANG': JSON.stringify(lang),
      'import.meta.env.PUBLIC_SITE_DOMAIN': JSON.stringify(domain)
    }
  }
});
