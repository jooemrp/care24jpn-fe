import { Noto_Sans_JP } from "next/font/google";

/**
 * Single shared definition of the site's Japanese font.
 *
 * Used by `app/[lang]/layout.tsx`, `app/global-not-found.tsx` and
 * `app/global-error.tsx`. The latter two are Next.js convention files that
 * bypass the root layout entirely (see their own file comments), so they
 * cannot inherit this font from `RootLayout` and must still import AND
 * apply it themselves (own `<html className={notoSansJP.variable}>`). What
 * is shared here is the *definition* (weights, subsets, css variable name),
 * not the usage — before this file existed, three separate
 * `Noto_Sans_JP({...})` call sites could (and did: this run added the
 * third one, in `global-error.tsx`) silently drift apart.
 *
 * `subsets: ["latin"]` on a Japanese font was flagged by the 2026-08-12 SEO
 * audit as suspicious. Investigated (ST-FIX3, second pass) and confirmed
 * to be a FALSE ALARM — Japanese text on this site does render in this
 * self-hosted Noto Sans JP, not a system fallback:
 *
 * - `node_modules/next/dist/compiled/@next/font/dist/google/font-data.json`
 *   (Next's own bundled Google Fonts metadata) lists Noto Sans JP's ONLY
 *   valid `subsets` values as `cyrillic`, `latin`, `latin-ext`,
 *   `vietnamese` — there is no `"japanese"` subset for this family at all.
 *   `validate-google-font-function-call.js:31-35` hard-errors the build if
 *   an unlisted subset is requested, so `subsets: ["japanese"]` would not
 *   even be a legal value here.
 * - `subsets` does not filter which glyphs get self-hosted.
 *   `get-google-fonts-url.js` builds the `fonts.googleapis.com/css2`
 *   request with no subset parameter at all — Google always returns every
 *   unicode-range-split `@font-face` block for the family, for every
 *   script it supports. `loader.js:100-102` keeps that entire response;
 *   `find-font-files-in-css.js` downloads and self-hosts EVERY font file
 *   in it. `subsets` only sets the `preloadFontFile` flag per file (i.e.
 *   which ones get a `<link rel=preload>` priority hint) — it changes
 *   loading priority, not glyph coverage.
 * - Verified empirically, not just from source: built the site
 *   (`npm run build && npm start`) and fetched the actual served CSS
 *   chunk. It contains 373 `@font-face { font-family: 'Noto Sans JP'; ... }`
 *   blocks self-hosted at `/_next/static/media/*.woff2`, including
 *   unicode-ranges covering hiragana/katakana (e.g. `u+3094-3096`,
 *   `u+30f7-30fa`) and common-use kanji (e.g. `u+4e00` 一, `u+4eba` 人,
 *   `u+65e5`/`u+5e74` etc.). `styles/globals.css:35`'s
 *   `--font-sans: var(--font-noto-sans-jp), ...` is what body/heading text
 *   actually uses, and resolves straight into this font. So `subsets` is
 *   correct as-is; nothing here was changed.
 */
export const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});
