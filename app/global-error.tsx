"use client";

import { useEffect } from "react";
import "../styles/globals.css";
import { notoSansJP } from "./fonts";
import { GLOBAL_ERROR_LABELS, GLOBAL_BRAND_NAME } from "@/features/cms/global-error-labels.generated";

// Next.js convention (app/global-error.tsx, node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/error.md:161-188): this file
// replaces the root layout when a throw happens inside it (e.g.
// app/[lang]/layout.tsx), so — same as global-not-found.tsx:7-12 — it
// cannot read the `[lang]` route param and must supply its own <html>/
// <body> and import global styles/fonts itself (:163, :165), even though
// the font's *definition* now lives in the shared `./fonts` module (see
// that file's comment). It MUST be "use client" (:170) and MUST NOT export
// `metadata`/`generateMetadata` (:167 — errors boundaries are Client
// Components, which don't support those exports; React's own <title>
// element is used instead). It uses the `retry` prop, not the older
// `reset` (:155-157: "In most cases, you should use retry() instead"; :331
// records `retry` became stable in v16.3.0, the version installed here).
// Both languages are shown side by side rather than guessing which one the
// visitor wanted, exactly as global-not-found.tsx already concluded for the
// same reason.
//
// WHY THIS ONE SURFACE CANNOT READ THE CMS AT RUNTIME, and what is done
// instead. Every other user-visible string on this site resolves through a
// `features/cms/` loader. This file cannot: error.md:170 requires it to be
// a Client Component, so it can neither `await getSite()` nor reach the
// `ErrorLabelsProvider` that feeds the sibling `app/[lang]/error.tsx` —
// and by the time it renders, the root layout that would have supplied
// that data is precisely the thing that threw. There is no request-time
// path to Atlas from here.
//
// So the words below come from `GLOBAL_ERROR_LABELS` /
// `GLOBAL_BRAND_NAME` in `features/cms/global-error-labels.generated.ts` —
// a module GENERATED from the LIVE CMS (`site_global_error_labels` /
// `site-brand` blocks on the "site" page, via
// scripts/atlas/generate-global-error-labels.ts after each seed). No
// `constants/*.ts` import lives in any render path any more: the copy is
// CMS-sourced, baked at seed time like the generated `atlas.types.ts`, and
// this page stays one `npm run atlas:seed` away from the dashboard.
//
// Both languages are still shown side by side here (unlike the per-locale
// `app/[lang]/error.tsx`) for the reason the header comment gives: this
// file has no `[lang]` param to choose with.
//
// `error` IS used (logged below), not just typed: same pattern as the
// sibling `app/[lang]/error.tsx`, and the one error.md itself shows
// (:33/:60 — "Log the error to an error reporting service"). A throw this
// deep (root layout) is the one place a `digest`-bearing Server Component
// error has NO other error boundary above it to be logged by, so dropping
// it silently loses the one server-side identifier (error.md:111,
// `errors.digest`) that would otherwise match this to server logs.

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const labels = GLOBAL_ERROR_LABELS;

  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-bg px-6 py-24 text-center text-body">
        <title>{`Error | ${GLOBAL_BRAND_NAME}`}</title>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-heading mb-2">
            {labels.title.ja}
          </h1>
          <p className="text-body mb-8">{labels.body.ja}</p>

          <div lang="en">
            <h2 className="text-2xl font-bold text-heading mb-2">
              {labels.title.en}
            </h2>
            <p className="text-body mb-10">{labels.body.en}</p>
          </div>

          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
          >
            {`${labels.retryLabel.ja} / ${labels.retryLabel.en}`}
          </button>
        </div>
      </body>
    </html>
  );
}
