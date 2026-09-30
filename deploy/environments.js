/**
 * Where the thematic sites (config/sites.config.js) are served, per
 * environment. One file drives both the builds (scripts/build-sites.js) and the
 * web-server config (scripts/caddyfile.js), so domains are never listed twice.
 *
 * Every site is served on <lang>.<domain> for each language in LANGS; the bare
 * <domain> redirects to the visitor's language.
 *
 *   local       — your own machine: http on :8080 under *.localhost, which
 *                 browsers resolve to 127.0.0.1 with no hosts-file edits.
 *   production  — the VPS. The domains below are placeholders until the real
 *                 ones are chosen; Caddy obtains HTTPS certificates itself.
 */
export const ENVIRONMENTS = {
  local: {
    scheme: 'http',
    port: 8080,
    domains: {
      games: 'games.localhost',
      apps: 'apps.localhost',
      'oss-tools': 'tools.localhost',
      'oss-apps': 'open.localhost'
    },
    // Directory Caddy serves from; relative paths resolve against the repo.
    root: 'dist-sites',
    // Local runs skip pre-compression: Caddy compresses on the fly anyway.
    compress: false,
    // No CDN in front locally, so no country header — language comes from
    // Accept-Language only.
    countryHeader: null
  },

  production: {
    scheme: 'https',
    port: null,
    domains: {
      games: 'games.example.com',
      apps: 'apps.example.com',
      'oss-tools': 'tools.example.com',
      'oss-apps': 'open.example.com'
    },
    // Symlink switched to the latest release by the deploy.
    root: '/srv/site/current',
    // Pre-compressed .br/.gz copies, served by Caddy's `precompressed`.
    compress: true,
    // Set to e.g. 'CF-IPCountry' if a CDN in front passes the visitor's country;
    // the apex redirect then prefers it over Accept-Language (config/geo.js).
    countryHeader: null
  }
};

export function getEnvironment(name) {
  const env = ENVIRONMENTS[name];
  if (!env) {
    throw new Error(`Unknown environment "${name}". Known: ${Object.keys(ENVIRONMENTS).join(', ')}`);
  }
  return env;
}
