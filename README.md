# Care 24 Japan — Frontend

The marketing/informational site for Care 24 Japan, built with Next.js (App Router), React 19, TypeScript, and Tailwind CSS 4. All page content is served from Atlas CMS.

## Prerequisites

- **Node.js 22+** (developed on v22.20.0; not pinned by an `engines` field or `.nvmrc`)
- **pnpm 11.9.0** — pinned via `packageManager` in [package.json](package.json). This project is pnpm-only: the npm lockfile was deliberately removed once pnpm became canonical, so use `pnpm`, not `npm`, for every command below.

## Getting Started

```bash
pnpm install
cp .env.example .env   # then fill in the values — see Environment below
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. The default locale (`ja`) is served prefix-less (e.g. `/`, `/pricing`); `/ja/...` links redirect to their prefix-less equivalent, and non-default locales keep their prefix (e.g. `/en/pricing`). See [proxy.ts](proxy.ts).

## Environment

**The app does not run without environment variables.** Every page reads Atlas at request time, so an unconfigured `.env` yields `CMS_NOT_CONFIGURED` on every route rather than a working site with placeholder content. [.env.example](.env.example) documents each variable in full; the essentials:

| Variable | Required for | Notes |
| --- | --- | --- |
| `ATLAS_BASE_URL` | dev + build | Backend base URL, no trailing slash. The SDK appends `/api/v1/public` itself. |
| `ATLAS_API_KEY` | dev + build | Delivery key (`atlas_live_`). Read-only, published content only. Read at **runtime** by the server. |
| `CONTACT_API_URL` | contact form | Backend contact endpoint that [features/contact/service.ts](features/contact/service.ts) relays to (with `ATLAS_API_KEY` as `X-API-Key`). Must include the `/api/v1/public/contact` path. |
| `NEXT_PUBLIC_SITE_URL` | production build | Canonical origin, no trailing slash. Drives `metadataBase`, sitemap, robots, canonicals, and `og:url`. |
| `ATLAS_MGMT_KEY` | seeding scripts only | Management key (`atlas_mgmt_`). **Never imported by app runtime code** — only the manually-run `atlas:*` scripts. |

None of these are `NEXT_PUBLIC_` except `NEXT_PUBLIC_SITE_URL`; the Atlas keys are server-side only and must stay that way.

Two gates fail the build on purpose rather than shipping a silently-broken site:

- [next.config.ts](next.config.ts) throws when `ATLAS_BASE_URL` or `ATLAS_API_KEY` is missing **on Vercel** (set both for Production and Preview).
- [constants/site.ts](constants/site.ts) throws when `NEXT_PUBLIC_SITE_URL` is missing in a production build, so canonical URLs can never fall back to whatever host the build ran on.

Note that `.env.example` ships a working Vercel preview URL for `NEXT_PUBLIC_SITE_URL`. Because `cp` copies it verbatim, production **must** override it in the Vercel dashboard once the final domain is decided.

## Scripts

```bash
pnpm dev      # start the dev server (webpack)
pnpm build    # production build (webpack)
pnpm start    # start the production server
pnpm lint     # run ESLint
pnpm test     # unit tests (Node's built-in runner; no bundler, no network)
```

The `test` script globs its files with POSIX `find` and `$(...)`, so **on Windows it must run under a POSIX shell** — `cmd.exe` fails immediately with `'sort)' is not recognized`. Use Git Bash, WSL, or pass `--script-shell=bash`.

### Atlas CMS

```bash
pnpm atlas:schema   # push content types + fields to the workspace (hard-fails on drift)
pnpm atlas:seed     # full pipeline: schema, media upload, then all five seeds
pnpm atlas:media    # upload public/images/* into the media library, refresh media-manifest.json
pnpm atlas:types    # regenerate features/cms/atlas.types.ts from the live schema
pnpm atlas:drift    # pre-seed gate: has anyone edited live content since the last seed?
pnpm atlas:verify   # HTML parity gate (see below)
```

See [scripts/atlas/README.md](scripts/atlas/README.md) for what each script does, the order `atlas:seed` runs them in, and why. These scripts need `ATLAS_MGMT_KEY` and are run manually — they are never part of a build.

**Seeding replaces pages wholesale.** `PUT /pages/:slug` is a full replace, not a merge, and the pipeline has no rollback, backup, or content versioning. A dashboard edit to a seeded page is silently deleted by the next `atlas:seed` — no error, no diff. So run `pnpm atlas:drift` *before* seeding: it re-fetches live content over the read-only delivery path and diffs it against a committed snapshot, turning "nobody has edited this" into a checked invariant. That snapshot's validity expires the moment you seed, so every seed run must be followed by `npx tsx scripts/atlas/drift-check.ts --write` (add `--only=<slugs>` when you touched only some) to refresh it — otherwise the next drift check reports false positives.

There is also `pnpm assets:generate-revision` ([scripts/generate-revision-assets.ts](scripts/generate-revision-assets.ts)), which uses `OPENAI_API_KEY` to generate revision imagery locally.

`pnpm atlas:verify` builds the site twice — once against the live CMS and once with
Atlas deliberately unconfigured — then compares 29 pre-migration baseline snapshots
(committed under `scripts/atlas/baseline/`) and all 26 CMS-on/CMS-off URL pairs.

Every differing line must be accounted for or the gate fails. It is accounted for in one
of three ways, and the distinction matters: an identical line that merely moved position;
a *class*, which proves two lines differ **only** in the named respect by canonicalizing
that respect away and requiring the rest to match exactly; or an *accepted residual* — a
real difference that was investigated and accepted, pinned to an exact count, so the
next occurrence still fails. Nothing is silently dropped to make the diff look clean.

## Data Fetching

Content flows **server → prefetch → hydrated client query**, so routes stay Server Components while feature views can refetch under the same key during client navigation.

- **[lib/bff.ts](lib/bff.ts)** is the server-only Atlas delivery adapter. It reads credentials through a `const env = process.env` copy rather than `process.env.ATLAS_API_KEY` directly — Next inlines the latter at build time, which would bake an empty value into the Vercel bundle instead of reading the project environment at runtime.
- **[lib/bff-core.ts](lib/bff-core.ts)** holds the actual request implementation, dependency-free and environment-free so it can be tested in isolation (8s default timeout).
- **[lib/api.ts](lib/api.ts)** defines the serializable `ApiResult<T>` contract (`{ success: true, data }` | `{ success: false, error }`) plus `ApiRequestError`. It imports nothing server-only, so values cross the Server Action / client boundary safely.
- **[components/query/CmsQueryBoundary.tsx](components/query/CmsQueryBoundary.tsx)** prefetches one CMS query on the server and dehydrates it into the browser QueryClient.
- **[lib/query-keys.ts](lib/query-keys.ts)** is the single source of truth for query identities — static keys frozen by reference, parameterized ones as small factories.
- **[components/providers.tsx](components/providers.tsx)** configures the client QueryClient (60s `staleTime`, 5m `gcTime`, one retry, no refetch on focus).

A typical route composes these directly — see [app/[lang]/company/page.tsx](app/%5Blang%5D/company/page.tsx).

Because this boundary is load-bearing for credential safety, it is guarded by an assertion test rather than convention alone: [lib/bff-architecture.test.ts](lib/bff-architecture.test.ts) reads the source of `lib/bff.ts` and `next.config.ts` and fails if the runtime-env pattern or the Vercel build gate is removed. Several features carry their own `*-architecture.test.ts` in the same spirit.

## Internationalization

Routes are backed internally by a language segment, `app/[lang]/...`, where `lang` is `ja` (default) or `en`. The default locale (`ja`) has no URL prefix — [proxy.ts](proxy.ts) rewrites bare paths to `/ja/...` internally and 308-redirects any incoming `/ja/...` link to its prefix-less form; `en` keeps its `/en` prefix. There is no client-side language store — `lang` is resolved from the route segment and passed down from there. See [features/lang/i18n.ts](features/lang/i18n.ts) for the language helpers (`t`, `isLang`, `localizeHref`).

## Project Structure

- [app/[lang]/](app/%5Blang%5D) — localized routes: home, pricing, fees, company, contact, faq, service-flow, use-case, compensation, cancellation-policy, quasi-mandate, tokushoho, privacy, terms-for-users, terms-for-care-supporters
- [app/api/contact/](app/api/contact) — same-origin proxy for contact submissions (the `connect-src 'self'` CSP is what forces submissions through it rather than straight to Atlas); [app/sitemap.ts](app/sitemap.ts) and [app/robots.txt/](app/robots.txt) — generated sitemap and robots
- [lib/](lib) — server-only BFF adapter, the `ApiResult` contract, and TanStack query keys (see Data Fetching)
- [features/](features) — per-domain modules, most following an `actions.ts` / `hooks.ts` / `components/` shape:
  - [cms/](features/cms) — Atlas client, generated `atlas.types.ts`, block→content mappings, typed CMS errors
  - [home/](features/home), [rates/](features/rates), [company/](features/company), [contact/](features/contact), [faq/](features/faq), [service-flow/](features/service-flow), [use-case/](features/use-case) — page domains
  - [seo/](features/seo) — page metadata, JSON-LD, Organization schema
  - [lang/](features/lang) — i18n utilities
- [components/](components) — shared UI (`Navbar`, `Footer`, `AppShell`, `LangToggle`, `LegalDocPage`, `TableOfContents`, `JsonLd`, `providers.tsx`), plus [cms/](components/cms) (loading/error/empty states), [query/](components/query), [contact/](components/contact), [faq/](components/faq), and [ui/](components/ui)
- [constants/](constants) — site config, copy, pricing, legal content, FAQ, SEO defaults
- [scripts/atlas/](scripts/atlas) — manual CMS seeding, schema, and verification scripts
- [styles/](styles) — global styles

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the visual design language (colors, logo usage, aesthetic direction).

## Audits

Point-in-time reviews, written in Indonesian. Each states its own scope and method; check the date before acting on one.

- [PERFORMANCE-AUDIT.md](PERFORMANCE-AUDIT.md) — caching strategy, server/client component boundary, asset pipeline (2026-09-04, static analysis only — no runtime measurements yet)
- [CMS-INTEGRATION-AUDIT.md](CMS-INTEGRATION-AUDIT.md) — Atlas CMS integration coverage, verified against 26 rendered routes (2026-08-20)
- [UI-UX-AUDIT.md](UI-UX-AUDIT.md) — design consistency and accessibility across 12 routes × 2 locales (2026-08-13)
- [SEO-AEO-AUDIT.md](SEO-AEO-AUDIT.md) — search/answer-engine readiness across 11 routes (2026-08-12; predates the CMS migration)
- [SEO-AEO-COPY-PROPOSALS.md](SEO-AEO-COPY-PROPOSALS.md) — draft copy for the SEO/AEO fixes, never implemented (2026-08-12)
- [ATLAS-CMS-STUDY.md](ATLAS-CMS-STUDY.md) — pre-implementation Atlas research (2026-08-19), carrying a post-implementation correction notice: three of its central conclusions were disproved

## Important Note for AI Agents

This project pins a Next.js version with breaking changes relative to older conventions. Before writing Next.js code, read [AGENTS.md](AGENTS.md) and the relevant guide under `node_modules/next/dist/docs/`.

## Deployment

Deployed on [Vercel](https://vercel.com). Set `ATLAS_BASE_URL`, `ATLAS_API_KEY`, `CONTACT_API_URL`, and `NEXT_PUBLIC_SITE_URL` on the project for both Production and Preview — the build fails deliberately without them (see Environment). See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
