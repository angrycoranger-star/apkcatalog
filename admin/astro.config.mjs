import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Server-rendered: the admin needs request handlers (auth, file endpoints), so
// it runs on Vercel's Node functions rather than as a static export.
export default defineConfig({
  output: 'server',
  adapter: vercel(),
  security: { checkOrigin: true }
});
