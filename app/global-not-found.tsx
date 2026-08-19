import Link from "next/link";
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "../styles/globals.css";
import { brand } from "@/constants/copy";

// Next.js convention (app/global-not-found.tsx, enabled via
// next.config.ts's experimental.globalNotFound): this file bypasses the
// normal render tree entirely — including app/[lang]/layout.tsx — so it
// cannot read the `[lang]` route param and must supply its own <html>/
// <body> and import global styles/fonts itself. Both languages are shown
// side by side rather than guessing which one the visitor wanted.
const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export const metadata: Metadata = {
  title: `404 | ${brand.name}`,
  description: "The page you are looking for does not exist.",
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

          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
          >
            トップページへ / Back to home
          </Link>
        </div>
      </body>
    </html>
  );
}
