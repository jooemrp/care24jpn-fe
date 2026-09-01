import Link from "next/link";
import Image from "next/image";
import { t, localizeHref, type Lang } from "@/features/lang/i18n";
import type { Bilingual } from "@/constants/copy";
import type { SiteContent } from "@/features/cms/site";
/**
 * Reference `width`/`height` for `public/images/logo.png` — the file
 * `site_brand.logo` falls back to, and (today) the only file it resolves
 * to. Navbar and Footer both render the SAME field, so both must pass
 * `next/image` the SAME numbers, sourced from here rather than two
 * independently-guessed pairs (this file's old 320×120, ratio 2.6667, and
 * Navbar.tsx's old 427×160, ratio 2.6688 — TWO DIFFERENT ratios for one
 * image). Exported from here rather than Navbar.tsx because this module
 * carries no `"use client"` boundary, so a plain numeric constant crosses
 * cleanly into either component; Navbar imports it back from here.
 *
 * NOT the file's raw 5600×2101 (ratio 2.6654), on purpose. `next/image`
 * uses this `width` — not the caller's `w-*` display class — as the
 * baseline for its automatic 1x/2x `srcSet` (see
 * `node_modules/next/dist/client/image-component.js#generateImgAttrs`):
 * it picks the smallest configured `deviceSizes`/`imageSizes` entry
 * >= width for 1x and >= width*2 for 2x
 * (`node_modules/next/dist/shared/lib/image-config.js`, max 3840). At
 * 5600, BOTH the 1x target (5600) and the 2x target (11200) exceed every
 * configured size, so both collapse to the same 3840 entry and dedupe
 * into a single non-responsive candidate — verified live via
 * `npm run atlas:verify`, where this exact prop change made every 1x/2x
 * pair (previously `640 1x, 1080 2x` / `384 1x, 640 2x`) collapse to one
 * `3840 1x`, i.e. every visitor's browser downloading a needlessly huge
 * fixed image regardless of DPI. 560×210 keeps 2x (1120) comfortably
 * under 3840, so `next/image` still emits real 1x/2x candidates, while
 * landing on the SAME simple 8:3 ratio (2.6667) the old Footer value
 * already used — the closest clean ratio to the real file's 2.6654,
 * within 0.05%, without the srcSet regression. Displayed size is still
 * controlled by each caller's own `w-*`/`h-auto` classes, per
 * https://nextjs.org/docs/app/api-reference/components/image.
 */
export const LOGO_INTRINSIC_WIDTH = 560;
export const LOGO_INTRINSIC_HEIGHT = 210;

/**
 * `tokushohoHeading` resolves the tokushoho footer link's label — that
 * union member in `site.footer.legalLinks` carries `key: "tokushoho"`
 * instead of its own `label`, same as constants/copy.ts#footer.legalLinks,
 * so the label follows the document's own heading. `AppShell` reads it
 * (see the note there) and passes it down; this component stays synchronous.
 */
export default function Footer({
  lang,
  site,
  tokushohoHeading,
}: {
  lang: Lang;
  site: SiteContent;
  tokushohoHeading: Bilingual;
}) {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-6 py-14">
        {/* Brand */}
        <Image
          src={site.brand.logo}
          alt={t(site.brand.logoAlt, lang)}
          width={LOGO_INTRINSIC_WIDTH}
          height={LOGO_INTRINSIC_HEIGHT}
          className="h-auto w-32"
        />
        {t(site.footer.description, lang) ? (
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-body">
            {t(site.footer.description, lang)}
          </p>
        ) : null}

        {/* Legal / company links */}
        <ul className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-border/60 pt-7">
          {site.footer.legalLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={localizeHref(link.href, lang)}
                className="text-xs text-muted transition hover:text-primary"
              >
                {t("key" in link ? tokushohoHeading : link.label, lang)}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <p className="text-xs text-muted">{t(site.footer.legal, lang)}</p>
        </div>
      </div>
    </footer>
  );
}
