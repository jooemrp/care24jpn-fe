# Atlas CMS seeding scripts

One-off Node scripts that provision and populate the live Atlas workspace
this site reads from (`features/cms/*`). Not part of the app's runtime
bundle — nothing here is ever imported by `app/` or `features/`.

## Running everything

```sh
cd marketing-web
npm run atlas:seed
```

Runs `schema.ts`, then `upload-media.ts`, then `seed-site.ts`,
`seed-home.ts`, `seed-legal.ts`, `seed-rates.ts`, `seed-pages.ts` (the last
five in parallel — see "Why this order" below). Prints a per-stage summary
(created/unchanged marker counts, duration) and exits non-zero the moment a
stage fails, naming exactly which one.

The npm scripts, all run from `marketing-web/`:

| Script               | Does                                                     |
| -------------------- | -------------------------------------------------------- |
| `npm run atlas:schema` | Content types + fields only (`schema.ts`)              |
| `npm run atlas:seed`   | Full pipeline: schema, media upload, then all five seeds (`seed-all.ts`) |
| `npm run atlas:verify` | HTML parity gate (`verify-html-parity.ts`) — **builds and starts the app twice**, so don't run it while a dev server or another build is using `.next` |
| `npm run atlas:types`  | Regenerates `features/cms/atlas.types.ts` from the live workspace via `@latellu/atlas-cli` |

Unlike `atlas:types` — which has to pass `--url="$ATLAS_BASE_URL"` explicitly
so the CLI doesn't fall back to `ATLAS_API_URL` and hit the wrong workspace —
the `tsx` scripts read `ATLAS_BASE_URL` themselves through
`requireAtlasEnv()` and throw if it's missing. There is no fallback URL for
them to silently pick up.

You can also run any single script directly, e.g.
`npx tsx scripts/atlas/seed-home.ts` — useful when only one page's content
changed and you don't want to touch the others.

### Required environment

Read from `marketing-web/.env` (see `.env.example` if present, or copy the
keys below):

| Variable          | Used for                                        |
| ----------------- | ------------------------------------------------ |
| `ATLAS_BASE_URL`  | Base URL of the Atlas backend (no trailing slash) |
| `ATLAS_MGMT_KEY`  | `atlas_mgmt_...` — schema + content writes        |
| `ATLAS_API_KEY`   | `atlas_live_...` — read-only delivery key. Used by `upload-media.ts` to check whether a media asset in the manifest still exists, and by the app's delivery client (`features/cms/client.ts`). Optional for the scripts: without it `upload-media.ts` trusts its manifest instead of re-checking |

**`ATLAS_MGMT_KEY` must never reach runtime app code.** It has
`content:write` / `content:publish` / `media:write` / `schema:write` scope —
enough to rewrite the entire site. It is read only by scripts under
`scripts/atlas/` (via `requireAtlasEnv()` / `createScriptManagementClient()`
in `lib.ts`), run manually from a trusted machine, never bundled into a
request handler, a Server Component, or anything that ships to a browser.
The app itself only ever holds `ATLAS_API_KEY` (delivery, read-only,
published-content-only).

## Running it twice: what happens

Nothing observable changes the second time — the page count, the slugs, the
block counts and the content are all identical:

- `schema.ts`: every content type and field already exists → all skipped,
  nothing created. A field whose live `field_type` / `localizable` /
  `required` no longer matches the spec in `schema.ts` is NOT skipped: it
  throws (see the schema-drift pitfall below).
- `upload-media.ts`: every asset already in `media-manifest.json` is
  confirmed present through the delivery API and reused → `0 uploaded,
  8 reused`, and the manifest comes out byte-identical apart from
  `generated_at`. It re-uploads only an asset that was actually deleted from
  Atlas.
- `seed-*.ts`: all five go through one helper,
  `lib.ts#ensurePublishedPage`. It sends the complete desired page to
  `PUT /pages/:slug` and only falls back to `POST /pages` on a 404, so an
  existing page is updated in place — never duplicated — and the publish
  call is skipped entirely when the page is already published.

One caveat worth knowing: a rerun *does* rewrite every page's blocks, and
the backend implements that as delete-all-then-recreate, so block ids and
`updated_at` change even when the content is byte-identical. Idempotent in
content and page count, not a literal database no-op. Don't build anything
that assumes block ids survive a reseed.

Verified by hand on 2026-08-20 against `api-c24jp`: 15 pages before
`npm run atlas:seed`, 15 pages after, every stage reporting `+0 created`.
See "Verifying the result" below for the numbers that must stay flat.

## Why this order

`schema.ts` creates the 30 block content types (`is_block: true`). Every
`seed-*.ts` script resolves a `block_type_id` by looking up those content
types by slug (`getContentType()` / `resolveBlockTypeId()` in `lib.ts`) —
if schema hasn't run yet, or a type is missing, the seed script throws
immediately naming the missing type rather than writing a page with a bad
block type id. So `schema` is a hard prerequisite and `seed-all.ts` runs it
first, sequentially, and only proceeds to the seed scripts if it exits 0.

`upload-media.ts` is the second hard prerequisite. It uploads
`public/images/*` into the Atlas media library and writes
`scripts/atlas/media-manifest.json`; `seed-site.ts`, `seed-home.ts` and
`seed-pages.ts` read that manifest (`requireMediaManifest()` /
`mediaId()` in `lib.ts`) to fill their `image` fields, and throw if it isn't
there. It does not itself depend on `schema.ts` — media and content types are
disjoint — but `seed-all.ts` still runs the two prerequisites one after the
other so a failing prerequisite is unambiguous in the log.

The five `seed-*.ts` scripts write to disjoint page slugs — `site`, `home`,
the 7 `legal-*` pages, `rates`/`pricing`/`fees`, and
`service-flow`/`use-case`/`company` never overlap — and share no other
mutable state, so `seed-all.ts` runs them concurrently to cut wall-clock
time. If you ever add a seed script that touches a slug another one already
owns, pull it out of the parallel batch.

## Verifying the result

Delivery API (`ATLAS_API_KEY`) — page count, unique slugs, block counts:

```sh
set -a; source .env; set +a

# 15 pages, all unique slugs
curl -s "$ATLAS_BASE_URL/api/v1/public/pages?limit=50" \
  -H "X-API-Key: $ATLAS_API_KEY" | python3 -c "
import json,sys
b = json.load(sys.stdin)
slugs = [p['slug'] for p in b['data']]
print('total_data:', b['meta']['total_data'])
print('count:', len(slugs), 'unique:', len(set(slugs)) == len(slugs))
"

# block counts for a few pages that have a known expected count
for slug in home site rates; do
  curl -s "$ATLAS_BASE_URL/api/v1/public/pages/$slug" -H "X-API-Key: $ATLAS_API_KEY" \
    | python3 -c "import json,sys; b=json.load(sys.stdin); print('$slug:', len(b['data']['blocks']), 'blocks')"
done
```

Expected: 15 pages / 15 unique slugs, `home` 29 blocks, `site` 14 blocks,
`rates` 10 blocks. None of these should change between two consecutive
`seed-all.ts` runs.

Content types are **not** exposed on the delivery plane — check them with
the management key instead:

```sh
set -a; source .env; set +a
curl -s "$ATLAS_BASE_URL/api/v1/manage/content-types?limit=50" \
  -H "X-API-Key: $ATLAS_MGMT_KEY" | python3 -c "
import json,sys
print('total_data:', json.load(sys.stdin)['meta']['total_data'])
"
```

Expected: 30.

## Pitfalls the team already hit (don't rediscover these)

- **Publishing an already-published page is a 400, not a no-op.** The
  management SDK's `pages.publish(slug)` throws
  `AtlasError` with `status === 400` and a message matching
  `/cannot be published from status 'published'/` on a second call.
  `ensurePublishedPage` skips the call when the page it just updated already
  reported `status: "published"`, and still catches exactly that message if
  the status changed underneath it — any other publish error is rethrown.
  `seed-all.ts` does not add its own publish step on top, it only calls the
  scripts.
- **Page slug uniqueness is enforced in application code only, not by the
  database.** Re-verified live on 2026-08-20 with a throwaway slug: a second
  sequential `POST /pages` with an existing slug *does* return 409. But the
  check behind it is a read-then-insert
  (`page/usecase/create_page.go#checkSlugUnique`) over a NON-unique index
  (migration `20260606161646`: `CREATE INDEX ... ON pages(workspace_id,
  slug)` — no `UNIQUE`), so two concurrent creates of the same slug can both
  pass it and leave two rows, after which `GET /pages/:slug` returns
  whichever one the query picks (possibly the unpublished one). Don't rely on
  create-then-catch-409 for pages: `ensurePublishedPage` updates first and
  only creates on a 404, which never races.
- **`PUT /pages/:slug` with an empty body is only a no-op on the *deployed*
  backend.** It was once used here as a "safe existence probe". The backend
  source in this monorepo (`page/usecase/update_page.go#updateBlocks`) calls
  `deleteExistingBlocks` *before* its `len(blocks) == 0` early return — i.e.
  that build would strip every block off the page you were merely probing.
  The deployed build does not (verified live: block id unchanged after an
  empty `PUT`), but nothing here depends on that difference any more.
- **A changed field type in `schema.ts` cannot be applied by re-running it.**
  There is no update-field endpoint on the management plane. `schema.ts` now
  fails loudly with an `AtlasManageError` naming the field and both values
  when a live field's `field_type` / `localizable` / `required` disagrees
  with the spec, instead of printing `already exists` and letting the seed
  scripts write new-shaped data into the old field. Fixing it means
  migrating the field by hand (or renaming it in `schema.ts`). `label` and
  `sort_order` are not compared — both are editable in the dashboard and
  neither changes the stored shape.
- **The delivery API hands back media URLs, not the media ids you seeded.**
  This is the single most surprising thing about `image` fields.
  `page/usecase/public_get_page.go#expandBlockMedia` collects every
  UUID-shaped string value in a block's `data` (and its translations),
  batch-resolves the ones that are media in this workspace, and rewrites them
  to the public URL before the response leaves the backend
  (`common/mediaref`). So the stored value is a media id — which is what the
  dashboard writes and what `seed-*.ts` must write — but
  `features/cms/client.ts` sees a `https://...` string. Do NOT call
  `media.get()` on it: by then the id is gone and you get
  `400 invalid input provided`. Corollary: **width/height do not come through
  the page response.** An `<Image>` on a CMS-served picture needs `fill` or
  its own literal `width`/`height` in JSX.
- **The media library cannot be listed with either key this repo holds.**
  `GET /api/v1/media` is behind `SessionAuth` + `RequireActiveAccount`
  (a dashboard login) — a management key gets
  `401 missing authorization header`. The management plane exposes only
  `POST /media/upload`, `PUT /media/:id`, `DELETE /media/:id`; delivery
  exposes only `GET /api/v1/public/media/:id`. Nothing maps a filename back
  to an id, which is exactly why `media-manifest.json` exists and must be
  committed — lose it and a re-run uploads eight duplicates it has no way to
  detect.
- **WebP uploads are rejected.** `media/usecase/upload_media.go
  #extractImageDimensions` calls `image.DecodeConfig` with only
  `image/gif`, `image/jpeg` and `image/png` registered (no
  `golang.org/x/image/webp` in `backend/go.mod`), so a `.webp` fails with
  `400 invalid input provided: failed to extract image dimensions: image:
  unknown format`. `upload-media.ts` transcodes WebP to JPEG with `sharp`
  before uploading.
- **The upload size limit is 1MB, not the 10MB the backend advertises.**
  Atlas's own `maxFileSize` is 10MB, but the deployment sits behind nginx
  1.24 with its default `client_max_body_size` — a 1.38MB PNG returned a
  bare `413` from nginx before the app ever saw it. That is why
  `upload-media.ts` transcodes to JPEG q92 (64-146KB per file) rather than
  lossless PNG (500KB-1.4MB).
- **The backend normalizes content-type slugs: underscores become
  hyphens.** Send `page_hero`, get back `page-hero`. `lib.ts`'s
  `normalizeSlug()` / `ensureContentType()` account for this; anything that
  looks up a content type by the underscored slug you originally asked for
  will get a 404.
- **The management SDK subpath is ESM-only.** `@latellu/atlas-sdk/management`
  has no `require` condition in its `exports` map, and these scripts run
  under `tsx`'s CJS transform (no `"type": "module"` in `package.json`), so
  a static `import { createManagementClient } from "@latellu/atlas-sdk/management"`
  throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. Every script that needs it goes
  through `createScriptManagementClient()` in `lib.ts`, which loads it with
  a dynamic `import()` instead — that always resolves through Node's ESM
  resolver regardless of the caller's own module system. If you add a new
  script and need `AtlasError` or another named export from that subpath,
  dynamic-`import()` it the same way rather than adding a static import.

## Files

| File               | Purpose                                                       |
| ------------------ | -------------------------------------------------------------- |
| `lib.ts`           | Shared env loading, management client factory, schema REST helpers, media-manifest read/write, and `ensurePublishedPage` (the one page-write path) |
| `schema.ts`        | Creates/verifies the 30 block content types                    |
| `upload-media.ts`  | Uploads `public/images/*` to the Atlas media library, writes `media-manifest.json` |
| `media-manifest.json` | Generated. `public/images/` filename -> `{ id, url, width, height, mime_type, uploaded_as }`. Commit it: it is the only index of which media id is which file |
| `seed-site.ts`     | `site` page (header/footer chrome)                              |
| `seed-home.ts`     | `home` page (29 blocks)                                         |
| `seed-legal.ts`    | 7 `legal-*` pages                                                |
| `seed-rates.ts`    | `rates`, `pricing`, `fees` pages                                 |
| `seed-pages.ts`    | `service-flow`, `use-case`, `company` pages                     |
| `seed-all.ts`      | Runs all of the above in dependency order, in one command       |
| `verify-html-parity.ts` | Renders every route CMS-on vs CMS-off vs the pre-migration baseline and diffs the HTML |
