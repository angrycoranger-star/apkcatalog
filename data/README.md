# data/

| File | Written by | Read by | Refresh |
|---|---|---|---|
| `package-ids.json` | `scripts/discovery.js` | `scripts/fetch-details.js` | monthly |
| `apps.json` | `scripts/fetch-details.js` | the Astro build | every 1–2 weeks |
| `apps.meta.json` | `scripts/fetch-details.js` | the Astro build (sample banner) | with `apps.json` |

`apps.json` is the single source of truth for all three language builds. One
record holds the language-independent facts once and the per-language name and
summary under `translations`:

```jsonc
{
  "slug": "tile-quest",                  // permanent; the card's URL
  "package_id": "com.example.tilequest",
  "icon_url": "https://play-lh.googleusercontent.com/…",  // hotlinked, never re-hosted
  "screenshots": ["https://play-lh.googleusercontent.com/…"],
  "category": "GAME_PUZZLE",             // Google genreId; mapped in config/catalog.config.js
  "rating": 4.7,
  "ratings_count": 964100,
  "size": "87M",
  "version": "2.1.0",
  "installs": "10,000,000+",
  "developer": "Roundtable Studio",
  "content_rating": "Everyone",
  "translations": {
    "ru": { "name": "…", "summary": "…" },
    "en": { "name": "…", "summary": "…" },
    "tr": { "name": "…", "summary": "…" }
  },
  "google_play_url": "https://play.google.com/store/apps/details?id=com.example.tilequest",
  "updated": "2026-08-01T00:00:00.000Z",
  "added_at": "2026-07-04T00:00:00.000Z",
  "fetched_at": "2026-08-20T03:14:00.000Z"
}
```

Two invariants the validator enforces (`npm run data:validate`):

- `slug` never changes once assigned — card URLs are permanent.
- No record may reference an `.apk` file. The catalog links to Google Play only.

The dataset currently checked in is **sample data** (`apps.meta.json` has
`"sample": true`, and the site shows a banner while that flag is set). Replace
it by running the collectors:

```bash
npm run discovery      # writes package-ids.json
npm run fetch-details  # writes apps.json + apps.meta.json
```
