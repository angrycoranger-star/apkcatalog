# APK Catalog — multilingual Android app & game directory

A statically generated catalog of Android apps and games. Each card shows an
icon, screenshots, a short original summary, rating, size and developer, and
links out to the official Google Play listing.

**The site hosts no APK files.** The only download path offered anywhere is the
"Open in Google Play" button, which points at `play.google.com`. The dataset
validator fails the build if any record so much as references an `.apk` URL.

- **Stack:** Astro 5 (static output) · Tailwind CSS 4 · Node.js collector scripts · Vercel
- **Languages:** Russian, English, Turkish, Uzbek — one independent build per subdomain
- **Data:** shared `data/apps.json`, refreshed by two scheduled scrapers

---

## Quick start

```bash
npm install
npm run dev            # http://localhost:4321 in Russian
SITE_LANG=en npm run dev
npm run build:all      # dist/ru, dist/en, dist/tr, dist/uz
```

The repository ships with **sample data** so the site runs before any scraping.
While `data/apps.meta.json` has `"sample": true`, every page shows a banner
saying so. Replace it with real data:

```bash
npm run discovery      # ~1-2 min per country x category combination
npm run fetch-details  # 3 requests per app (one per language)
npm run data:validate
```

## Multilingual model

Language is a **build-time** choice, not a route prefix. `SITE_LANG` selects the
language; the site is emitted at the root of its own subdomain.

| Subdomain | `SITE_LANG` | Example URL |
|---|---|---|
| `ru.<domain>` | `ru` | `https://ru.apk4orge.com/app/tile-quest/` |
| `en.<domain>` | `en` | `https://en.apk4orge.com/app/tile-quest/` |
| `tr.<domain>` | `tr` | `https://tr.apk4orge.com/app/tile-quest/` |
| `uz.<domain>` | `uz` | `https://uz.apk4orge.com/app/tile-quest/` |

All four read the same `data/apps.json`, picking their copy out of each
record's `translations` block. Every page emits `hreflang` alternates pointing
at its counterparts on the other subdomains, plus `x-default` to Russian, so
the builds are understood as one site rather than duplicates.

A language with no translation yet falls back to Russian per field, so a new
language ships readable pages immediately and fills in as cards are refreshed.

Adding another language means: add it to `LANGS` and `LANG_LOCALES` in
`config/catalog.config.js`, add its dictionary to `src/i18n/ui.js` and
`src/i18n/legal.js`, add labels to the `CATEGORIES` table, then run
`fetch-details.js` to fill in the new translations.

## Pages

| Route | Contents |
|---|---|
| `/` | search, popular and top-rated swipe carousels, category grids |
| `/apps/`, `/games/` | full listing with category filters and a sort control |
| `/apps/<category>/`, `/games/<category>/` | prerendered per-category listings |
| `/app/<slug>/` | icon, screenshots, summary, rating, size, spec table, Google Play button |
| `/privacy/`, `/disclaimer/`, `/contact/` | legal pages, translated per language |
| `/search-index.json`, `/sitemap.xml`, `/robots.txt` | generated endpoints |

Category filters are real links to prerendered pages, so filtering works with
JavaScript disabled and every filtered view is independently indexable. Search
is client-side: the box lazily fetches `/search-index.json` (a trimmed
per-language index) on first interaction, and matches names and developers
case- and diacritic-insensitively, so `muzik` finds `Müzik`.

## The data pipeline

```
discovery.js  ──>  data/package-ids.json  ──>  fetch-details.js  ──>  data/apps.json  ──>  astro build
  (monthly)                                      (every 1-2 weeks)
```

### `scripts/discovery.js` — which apps to catalog

Walks the matrix **[ru, tr, uz] × [10 game + 10 app categories]**, taking
`collection: TOP_FREE`, `num: 50` per combination (600 rows → roughly 400–500
unique ids), deduplicates by `package_id` and writes `data/package-ids.json`.
Packages that fall off every chart keep their card but are marked with a stale
`last_seen`.

```bash
node scripts/discovery.js
node scripts/discovery.js --countries ru,tr --categories GAME_PUZZLE --num 20
node scripts/discovery.js --dry-run
```

### `scripts/fetch-details.js` — filling the cards

Calls `app({ appId, lang, country })` once per language and writes
`data/apps.json`. Notable behaviour:

- **Icons and screenshots stay on Google's servers.** Records store the URLs
  Google already serves; nothing is copied to our origin.
- **Slugs are permanent.** An existing card keeps its slug even if the app is
  renamed, so URLs never break.
- **Missing packages age out.** A 404 is not retried; the previous card keeps
  serving, and after 3 consecutive failed runs the id is pruned.
- **Rate limiting.** A jittered delay (`REQUEST_DELAY_MS`, default 1200 ms)
  between calls, exponential backoff on failure, and a longer floor on 429.
- **Timeouts abort the socket.** The per-request ceiling
  (`REQUEST_TIMEOUT_MS`, default 20 s) is handed to `got` via `requestOptions`,
  so a stalled request is cancelled rather than abandoned. Timeouts get one
  retry, not three, and a package whose first language never answers is skipped
  for the rest of the run — slow listings would otherwise dominate the runtime.
- **Resumable.** `--stale-days 7` skips cards refreshed within the last week.
- **Sample data is disposable.** Records flagged `sample: true` are dropped as
  soon as real cards exist, so the seed dataset cannot linger in production.

```bash
node scripts/fetch-details.js --limit 25 --langs ru,en
node scripts/fetch-details.js --only com.whatsapp --llm
node scripts/fetch-details.js --stale-days 7
```

### Summaries are written, not copied

Developer descriptions are never republished. `scripts/lib/summarize.js` offers
two ways to get an original 2–3 sentence blurb per language:

1. **Composed (default).** Writes from structured facts only — kind, genre,
   developer, rating, installs, size, age rating. Because it never reads the
   store text, it cannot paraphrase it. Sentence patterns are selected by a
   stable hash of the package id, so a thousand cards don't read like one
   sentence repeated.
2. **`--llm` (opt-in).** Sends those same facts plus the store text as
   *background* to Claude (`claude-opus-5`), instructed to write independently
   rather than translate or restructure the original. Needs `ANTHROPIC_API_KEY`
   and `npm i @anthropic-ai/sdk`; falls back to composed summaries on any error.

### Testing the pipeline offline

`scripts/lib/fixture-scraper.js` is a stand-in for `google-play-scraper` that
returns deterministic fake records and fails on one package id on purpose.

```bash
npm run smoke   # runs both collectors + the validator against a scratch dir
npm test        # validate the shipped dataset, then smoke
```

Any script takes `--client ./scripts/lib/fixture-scraper.js` to use it.

## Listing your own apps

Not everything is on Google Play. Apps you publish yourself — or any listing you
want to place by hand — live in `data/custom-apps.json`, a file the collectors
never touch. They merge into the same catalog as scraped cards: same search,
categories, sitemap and `hreflang`.

Seed one straight from an APK you own — the tool reads it, it never modifies it:

```bash
npm run add-apk -- ./builds/myapp-1.4.0.apk
```

It pulls package id, version, min Android, size, SHA-256, permissions and the
launcher icon out of the file, drafts summaries in all four languages, and
writes the record. The download button adapts to `download.type`:

- **direct** — your own APK, hosted on your CDN/release host (never in the repo);
  the card shows a SHA-256 checksum and an "Unknown sources" note.
- **store** — a third-party store listing (RuStore, AppGallery, Galaxy Store).
- **web** — a web app / PWA, nothing to install.
- **play** — a Google Play listing you're placing manually.

A custom card that reuses a scraped `slug`/`package_id` overrides it, so this is
also how you fix a summary or re-categorise a scraped app. Full field reference:
`data/README.md`. The legal position for self-hosted APKs is stated on the
`/disclaimer/` page in all four languages.

## Open-source apps (F-Droid)

Beyond scraped Google Play listings and your own uploads, the catalog imports
**Free/Open-Source apps from F-Droid** — a legally distributable inventory. F-Droid
publishes each app's SPDX license and every APK's SHA-256, so these cards get a
real **direct download** (with checksum and a link to the source), an "Open
source" badge, and the license on the spec table — the APKMirror-style
"download the file here" model, but only for files a license lets us distribute.

```bash
npm run fdroid            # one request pulls the whole F-Droid index
```

`scripts/lib/fdroid.js` gates on a redistributable-license allowlist, and the
validator fails the build if any F-Droid card carries a non-free license. Cards
land in `data/fdroid-apps.json` (a source the Play collectors never touch) and
merge into the same search, categories and sitemap. Full reference:
`data/README.md`.

## Scheduled refreshes

| Workflow | Schedule | Does |
|---|---|---|
| `.github/workflows/discovery.yml` | monthly (1st, 02:00 UTC) | refresh `package-ids.json` |
| `.github/workflows/fetch-details.yml` | nightly, 03:00 UTC | refresh a chunk of `apps.json`, validate, build, commit |
| `.github/workflows/fdroid.yml` | weekly (Mon, 04:00 UTC) | refresh the open-source (F-Droid) catalog |
| `.github/workflows/ci.yml` | every push / PR | validate, smoke test, build all languages |

Both data workflows commit to the repository; the push is what triggers Vercel
to rebuild the four sites.

**Why the refresh is chunked.** Discovery finds roughly 2000+ packages, and each
one costs a request per language — far more than a single job can work through.
The nightly run therefore takes `CHUNK_LIMIT` (600) of the cards that have not
been refreshed within `STALE_DAYS` (10), so the backlog is covered in a few
nights and every card stays under ten days old. Both are `env:` values in the
workflow, and a manual run can override them per invocation.

## Deploying to Vercel

Create **four Vercel projects from this one repository** — they differ only by
an environment variable.

| Project | Env vars | Domain |
|---|---|---|
| `apk4orge-ru` | `SITE_LANG=ru`, `SITE_DOMAIN=apk4orge.com` | `ru.apk4orge.com` |
| `apk4orge-en` | `SITE_LANG=en`, `SITE_DOMAIN=apk4orge.com` | `en.apk4orge.com` |
| `apk4orge-tr` | `SITE_LANG=tr`, `SITE_DOMAIN=apk4orge.com` | `tr.apk4orge.com` |
| `apk4orge-uz` | `SITE_LANG=uz`, `SITE_DOMAIN=apk4orge.com` | `uz.apk4orge.com` |

Each uses the stock `npm run build` → `dist` (see `vercel.json`). Add each
subdomain under the project's Domains tab and point a CNAME at
`cname.vercel-dns.com`. A push to the default branch rebuilds all four.

The bare apex (`apk4orge.com`) is handled by `middleware.ts` (Vercel Edge
Middleware): it geo-redirects a visitor to the language subdomain that fits
their `x-vercel-ip-country` (falling back to `Accept-Language`, then English),
preserving the path. The middleware ships in all four projects but only acts on
the apex host — attach `apk4orge.com` (and `www.`) to one project, usually the
`ru` one. Language decision logic lives in `config/geo.js` and is unit-tested.

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `SITE_LANG` | `ru` | build — selects the language (`ru`/`en`/`tr`/`uz`) |
| `SITE_DOMAIN` | `apk4orge.com` | build — canonical + hreflang URLs |
| `PUBLIC_CONTACT_EMAIL` | `hello@<domain>` | contact and legal pages |
| `REQUEST_DELAY_MS` | `1200` | collectors — delay between requests |
| `REQUEST_TIMEOUT_MS` | `20000` | collectors — per-request timeout (aborts the socket) |
| `ANTHROPIC_API_KEY` | — | `fetch-details.js --llm` |
| `CATALOG_DATA_DIR` | `./data` | collectors — used by the smoke test |

## Layout

```
config/catalog.config.js   languages, discovery matrix, category taxonomy (shared)
data/                      apps.json, package-ids.json, apps.meta.json
scripts/                   discovery.js, fetch-details.js, validate-data.js, smoke.js
  lib/                     util.js, summarize.js, fixture-scraper.js
src/i18n/                  ui.js (interface copy), legal.js (privacy/disclaimer)
src/lib/apps.js            loads apps.json, normalizes it for the build language
src/components/            AppCard, Carousel, SearchBox, CategoryChips, Screenshots…
src/pages/                 routes, plus sitemap/robots/search-index endpoints
```

`config/catalog.config.js` is deliberately shared by the site and the scrapers,
so a category can never exist in one and not the other.

## Legal position

The catalog is independent and not affiliated with Google LLC. Google Play, the
Google Play logo and Android are trademarks of Google LLC; app names, icons and
screenshots belong to their owners and are shown to identify listings. The
`/disclaimer/` page states this in all four languages, and `/contact/`
documents the takedown route for rights holders.
