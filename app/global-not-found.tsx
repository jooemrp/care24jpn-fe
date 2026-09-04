import Link from "next/link";
import type { Metadata } from "next";
import "../styles/globals.css";
import { notoSansJP } from "./fonts";
import { getSite } from "@/features/cms/site";
import { localizeHref } from "@/features/lang/i18n";

// Next.js convention (app/global-not-found.tsx, enabled via
// next.config.ts's experimental.globalNotFound): this file bypasses the
// normal render tree entirely — including app/[lang]/layout.tsx — so it
// cannot read the `[lang]` route param and must supply its own <html>/
// <body> and import global styles/fonts itself, even though the font's
// *definition* now lives in the shared `./fonts` module (see that file's
// comment). Both languages are shown side by side rather than guessing
// which one the visitor wanted.
//
// Same reasoning applies to the "back home" link below: a single
// `href="/"` always sends an EN visitor's 404 to the JA homepage, and this
// file has no `[lang]` param and no pathname prop to read (unlike
// app/[lang]/error.tsx, this is not even "use client", so there is no
// usePathname() either — Next never hands global-not-found a request
// object). Offering both homepage links, run through the project's own
// `localizeHref`, is the only honest fix: it costs one extra link and
// removes the silent misroute entirely, instead of guessing.

// CMS-DRIVEN, via `getSite()` — the `site_not_found_labels` block on the
// "site" page (scripts/atlas/schema.ts, seeded by scripts/atlas/
// seed-site.ts). Until this landed, the whole 404 page was the one
// user-facing surface with no CMS representation of any kind: not a field
// that existed and went unread, but no content type at all. Unlike its
// sibling `global-error.tsx` — which error.md:170 forces to be a Client
// Component and so can never reach a loader — this file is a Server
// Component, so it can simply await like every other route here.
//
// `generateMetadata` replaces the previous static `metadata` export because
// the description now comes from the CMS. not-found.md:185 states
// `global-not-found.js` accepts either. Both locales are joined with " / "
// for the same reason the body shows both: no `[lang]` param to choose
// with.
//
// `getSite()` is strict (features/cms/site.ts): if Atlas cannot provide the
// not-found labels, the typed CMS failure is allowed to reach the framework
// error surface instead of silently rendering bundled copy.
/** Same reason as `app/manifest.ts`'s: without this, Next's static pass
 * trips `getSite()`'s `no-store` fetch, and the resulting
 * `DynamicServerError` is caught and logged by the build as a failed dynamic
 * attempt on every build. Declaring the route dynamic skips that attempt. */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { brand, notFoundPage } = await getSite();

  return {
    title: `404 | ${brand.name}`,
    description: `${notFoundPage.metaDescription.ja} / ${notFoundPage.metaDescription.en}`,
  };
}

export default async function GlobalNotFound() {
  const { notFoundPage } = await getSite();

  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-bg px-6 py-24 text-center text-body">
        <div className="max-w-md">
          <p className="text-sm font-bold tracking-wide text-primary mb-4">
            {notFoundPage.eyebrow}
          </p>

          <h1 className="text-2xl font-bold text-heading mb-2">
            {notFoundPage.title.ja}
          </h1>
          <p className="text-body mb-8">{notFoundPage.body.ja}</p>

          <div lang="en">
            <h2 className="text-2xl font-bold text-heading mb-2">
              {notFoundPage.title.en}
            </h2>
            <p className="text-body mb-10">{notFoundPage.body.en}</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={localizeHref("/", "ja")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              {notFoundPage.homeLabel.ja}
            </Link>
            <Link
              href={localizeHref("/", "en")}
              lang="en"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 font-medium text-primary transition hover:bg-primary/10"
            >
              {notFoundPage.homeLabel.en}
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
