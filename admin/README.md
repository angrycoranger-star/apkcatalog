# apk4orge · admin upload panel

A tiny, password-protected panel for listing **your own** apps in the catalog.
It runs as a separate Vercel project (server-rendered), while the four public
sites stay static.

What it does, end to end:

1. You log in with a single password.
2. You fill in a name, developer, category, description, and pick an APK file
   (plus optional screenshots).
3. The APK and screenshots are uploaded **straight from your browser to Vercel
   Blob**, so the ~4.5 MB serverless request limit never applies.
4. The server reads the APK back from Blob and pulls out the version, size,
   minimum Android, permissions, launcher icon and SHA-256 checksum — you don't
   type any of that.
5. It commits a new record to `data/custom-apps.json` in the repo via the
   GitHub API. That commit triggers the four public sites to rebuild, and the
   card appears at `/app/<slug>/` a minute or two later.

The panel never hosts anyone else's APKs — it only publishes files you upload.

## Layout

```
admin/
  astro.config.mjs      # output: 'server', @astrojs/vercel adapter
  src/
    middleware.js       # gate: everything but /login needs a valid cookie
    lib/
      auth.js           # HMAC-signed session cookie, constant-time password check
      apk.js            # read manifest + icon + checksum from an .apk
      record.js         # build a custom-apps.json record (+ slug rules)
      github.js         # append the record via the GitHub Contents API
      categories.json   # snapshot of the catalog's category taxonomy
    pages/
      login.astro       # password form
      index.astro       # the upload form (client-side Blob upload)
      api/
        login.js        # POST password -> sets cookie
        logout.js       # POST clears cookie
        categories.js   # GET category choices
        blob-token.js   # issues client-upload tokens (auth-gated)
        upload.js       # finalizes: inspect APK, commit the card
```

## Environment variables

Copy `.env.example` to `.env` for local runs, and set the same keys in the
Vercel project settings for production. See `.env.example` for the full list:

| Variable | Purpose |
| --- | --- |
| `ADMIN_PASSWORD` | The single password that unlocks the panel. |
| `ADMIN_SECRET` | Random string (≥16 chars) that signs the session cookie. |
| `GITHUB_TOKEN` | Token with `contents:write` on the catalog repo. |
| `GITHUB_REPO` | `owner/name` of the repo to commit to. |
| `GITHUB_BRANCH` | Branch to commit to (default `main`). |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token — injected automatically on Vercel once a Blob store is linked; set it only for local runs. |
| `ANTHROPIC_API_KEY` | Optional — enables the "Generate with Claude" SEO-description button. Without it, that button returns an error and you write descriptions by hand. |

Generate a secret:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## Local development

```
cd admin
npm install
cp .env.example .env   # then fill in the values
npm run dev
```

Open the printed URL, log in with `ADMIN_PASSWORD`, and upload. Note that Blob
uploads and the GitHub commit hit real services, so a local run publishes a
real card — use a scratch branch via `GITHUB_BRANCH` if you're just testing.

## Deploying on Vercel

The public sites and the admin panel are **separate Vercel projects** pointing
at the same repo:

1. Create a new Vercel project from this repo with **Root Directory = `admin/`**.
2. Add a **Blob store** and link it to the project (this provides
   `BLOB_READ_WRITE_TOKEN` automatically).
3. Set `ADMIN_PASSWORD`, `ADMIN_SECRET`, `GITHUB_TOKEN`, `GITHUB_REPO` and
   `GITHUB_BRANCH` in the project's Environment Variables.
4. Give it its own domain (e.g. `admin.apk4orge.com`). It's `noindex` and behind
   the password, so it never competes with the public sites for ranking.

Because it's a distinct project, redeploys of the admin panel don't touch the
four static builds, and vice versa.

## SEO descriptions with Claude

The upload and edit forms have a **"Generate with Claude"** button. It drafts an
original, SEO-friendly description for the app — in **all four languages at once**
— from the name, developer and category (via `lib/seo.js` → `claude-opus-5`,
facts-only, low effort). The Russian text lands in the field to edit; the four
per-language texts are submitted with the card and stored in its `translations`,
so each language subdomain gets native copy. Needs `ANTHROPIC_API_KEY`; the
button is a no-op error without it. It writes from the facts only — no copied or
invented claims — matching how the catalog's own summaries are generated.

## Managing, promoting and web versions

- `/` uploads a new app. Besides the file, description and screenshots, it can
  set a **web-version URL** (adds a "Play in browser" button on the card, handy
  for iPhone users) and **promotion**: show the app in the home page's
  "Featured" block, pin it to the top of the Popular/New sections, and set an
  order number (lower = higher).
- `/manage` lists the apps you've listed, with edit and delete.
- `/edit?slug=…` edits any field, toggles the web version and promotion, and can
  **replace the APK** with a new version (re-derives version, size, min-Android,
  permissions and SHA-256). Uploading new screenshots there replaces the set.

These are stored as extra fields on the record (`web_url`, `featured`,
`pinned`, `promo_order`) and read by the static site — no runtime needed.

## Visitor reviews (comments + ratings)

The admin project also hosts the **public** review service the static sites call:

- `GET /api/reviews?slug=…` — a card's comments + the aggregate user rating.
- `POST /api/reviews` — leave a comment + 1–5 rating (public, no login). Guards:
  a honeypot field, a per-IP throttle, and length caps. Comments publish
  immediately.
- `GET /api/reviews-recent` / `POST /api/review-delete` — owner-only moderation,
  surfaced on the **`/reviews`** page (delete spam; it leaves the card at once).

Reviews are stored as one JSON blob per app (`reviews/<slug>.json`) in the same
Blob store — no extra datastore to provision. (Writes are read-modify-write, fine
for low traffic; a busy site would want an atomic store.) `/api/reviews` is CORS-open
for GET/POST so the language sites on their own origins can call it.

To switch reviews on, point the static builds at this deployment by setting
`PUBLIC_API_BASE` (e.g. `https://apk4orge-admin.vercel.app`) in the four site
projects. Empty → the reviews block is hidden.

## Security notes

- Every route except `/login` and `/api/login` requires a valid session cookie
  (checked in `middleware.js`); API routes return `401`, pages redirect to login.
- The cookie is HttpOnly, Secure, SameSite=Strict, and HMAC-signed with
  `ADMIN_SECRET`; it expires after 12 hours.
- The password is compared in constant time (HMAC digests), so it doesn't leak
  timing.
- Blob upload tokens are only issued to an authenticated session, and are scoped
  to `.apk` (≤512 MB) or images (≤8 MB).
- Never commit `.env` — it's already covered by the repo's `.gitignore`.
