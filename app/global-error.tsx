"use client";

import { useEffect } from "react";
import "../styles/globals.css";
import { notoSansJP } from "./fonts";

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
// No locale is guessed here: the emergency diagnostic is language-neutral,
// while the original error message is preserved for debugging.
//
// WHY THIS SURFACE CANNOT READ THE CMS. `error.md:170` requires this file to
// be a Client Component, so it cannot await a server-only Atlas loader or
// reach the `ErrorLabelsProvider` used by `app/[lang]/error.tsx`. By the time
// this boundary renders, the root layout that would have supplied CMS data is
// precisely the tree that failed. It therefore renders only an emergency
// diagnostic and the original error message; it never bundles or substitutes
// route content from `constants/copy.ts`.
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

  const isCmsError = error.name === "CmsContentError" || error.name === "ApiRequestError";
  const title = isCmsError ? "CMS content unavailable" : "Application error";
  const message = error.message || "The application could not render this page.";

  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-bg px-6 py-24 text-center text-body">
        <title>{title}</title>
        <div className="max-w-md">
          <h1 className="text-2xl font-bold text-heading mb-2">{title}</h1>
          <p role="alert" className="text-body mb-10">
            {message}
          </p>

          <button
            type="button"
            onClick={() => retry()}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
          >
            Retry
          </button>
        </div>
      </body>
    </html>
  );
}
