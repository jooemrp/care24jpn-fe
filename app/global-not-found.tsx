import Link from "next/link";
import type { Metadata } from "next";
import "../styles/globals.css";
import { notoSansJP } from "./fonts";
import { brand } from "@/constants/copy";
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

export const metadata: Metadata = {
  title: `404 | ${brand.name}`,
  description:
    "お探しのページが見つかりません。 / The page you are looking for does not exist.",
};

export default function GlobalNotFound() {
  return (
    <html lang="ja" className={`${notoSansJP.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col items-center justify-center bg-bg px-6 py-24 text-center text-body">
        <div className="max-w-md">
          <p className="text-sm font-bold tracking-wide text-primary mb-4">404</p>

          <h1 className="text-2xl font-bold text-heading mb-2">
            お探しのページが見つかりません
          </h1>
          <p className="text-body mb-8">
            このページは移動または削除された可能性があります。
          </p>

          <div lang="en">
            <h2 className="text-2xl font-bold text-heading mb-2">
              Page not found
            </h2>
            <p className="text-body mb-10">
              The page you are looking for may have been moved or removed.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={localizeHref("/", "ja")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              トップページへ
            </Link>
            <Link
              href={localizeHref("/", "en")}
              lang="en"
              className="inline-flex items-center gap-2 rounded-full border border-primary px-8 py-3 font-medium text-primary transition hover:bg-primary/10"
            >
              Back to home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
