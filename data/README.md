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

## custom-apps.json — your own listings

Apps that are **not** discovered from Google Play (your own releases, or a
listing you want to place by hand) live in `data/custom-apps.json`. The
collectors never touch this file, so nothing here is overwritten by a refresh.

A custom record uses the same shape as a scraped one, plus:

```jsonc
{
  "slug": "my-app",
  "custom": true,
  "package_id": "com.mycompany.myapp",
  "category": "TOOLS",
  "developer": "My studio",
  "version": "1.4.0",
  "size": "24 MB",
  "min_android": "8.0",
  "icon_url": "/img/apps/my-app/icon.png",
  "screenshots": ["/img/apps/my-app/1.png"],
  "permissions": ["android.permission.INTERNET"],
  "translations": { "ru": {…}, "en": {…}, "tr": {…}, "uz": {…} },
  "download": {
    "type": "direct",              // play | store | direct | web
    "url": "https://dl.example.com/my-app-1.4.0.apk",
    "store": "RuStore",            // only for type "store"
    "checksum_sha256": "…",        // required for type "direct"
    "updated": "2026-08-25"
  }
}
```

`download.type` decides the button label, the notice under it and the JSON-LD:

| type | button leads to | notes |
|---|---|---|
| `play` | Google Play listing | same as a scraped card |
| `store` | third-party store (RuStore, AppGallery, …) | set `store` for the label |
| `direct` | your own APK file | needs `version` + `checksum_sha256` |
| `web` | a web app / PWA | nothing to install |

A custom entry that reuses a scraped `slug` or `package_id` **overrides** the
scraped card, so you can also correct a summary or re-categorise an app.

Populate one straight from an APK you own:

```bash
npm run add-apk -- ./builds/myapp-1.4.0.apk
```

It reads the package id, version, min Android, size, SHA-256, permissions and a
launcher icon from the file (it never modifies the APK), asks for the few
things the file can't provide, drafts summaries in every language, extracts the
icon into `public/img/apps/<slug>/`, and appends the record. For a `direct`
download it prints the SHA-256 and the filename to upload — the binary is
hosted on your CDN / release host, never committed to the repo.

## fdroid-apps.json — open-source apps (F-Droid)

A legally distributable catalog of Free/Open-Source Android apps, imported from
the F-Droid repository index. Unlike Google Play, F-Droid publishes each app's
SPDX license and the SHA-256 of every APK it hosts, so the download button can
point straight at the real file — the licenses in
`scripts/lib/fdroid.js` (`REDISTRIBUTABLE_LICENSES`) permit it.

Records are custom-shaped (`custom: true`, `download.type: "direct"`) plus:

```jsonc
{
  "source": "fdroid",
  "open_source": true,
  "license": "GPL-3.0-or-later",     // SPDX; gated by the validator
  "source_code": "https://…",        // shown as a "View source" link
  "download": { "type": "direct", "url": "https://f-droid.org/repo/…apk", "checksum_sha256": "…" }
}
```

The whole F-Droid repo comes in one index, so import is a single request with no
rate-limiting:

```bash
npm run fdroid                                  # f-droid.org
npm run fdroid -- --repo https://apt.izzysoft.de/fdroid/repo   # another repo
npm run fdroid -- --index ./index-v2.json       # offline / a saved index
```

The validator refuses any F-Droid card whose license is not in the
redistributable set, so a non-free app can never ship. The download currently
links to F-Droid's hosted APK; to serve the file from your own CDN instead,
mirror it and rewrite `download.url` (the checksum stays valid).
