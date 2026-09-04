"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "nextjs-toploader/app";
import { localizeHref, type Lang } from "@/features/lang/i18n";

/**
 * Language switch pill, shared by Navbar (with a 44px hit area appended via
 * `className`) and Footer (no `className` — no extra hit area).
 *
 * Stays a `<button>` (not a `<Link>`) so it can compute the sibling-language
 * path from the *current* pathname at click time via `localizeHref`, rather
 * than baking a static href.
 *
 * `useRouter` comes from `nextjs-toploader/app` (not `next/navigation`) so
 * this programmatic push also drives the top progress bar mounted in
 * `app/[lang]/layout.tsx` — its shim starts the bar when the pushed href
 * differs from the current pathname, and completes it once the new path
 * commits.
 *
 * `label`, `shortJa` and `shortEn` are pre-resolved by the Server Component
 * caller — Navbar/Footer hold the CMS-backed `site` content, this
 * Client Component does not fetch it itself. `shortJa`/`shortEn` are not run
 * through `t()`: they are the two options' own abbreviations (both shown at
 * once, one bold depending on `lang`), not a message translated per
 * language — see `constants/copy.ts#ui.langShortJa` for why.
 */
export default function LangToggle({
  lang,
  label,
  shortJa,
  shortEn,
  className,
}: {
  lang: Lang;
  label: string;
  shortJa: string;
  shortEn: string;
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = () => {
    const siblingLang: Lang = lang === "ja" ? "en" : "ja";
    const newPath = localizeHref(pathname, siblingLang);
    // Read the query string here (in the click handler, not at render time)
    // so this never participates in static prerendering and needs no
    // Suspense boundary — see dev-fix-langtoggle-suspense.md.
    const q = window.location.search;
    router.push(q ? `${newPath}${q}` : newPath, { scroll: false });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium transition hover:border-primary hover:text-primary${
        className ? ` ${className}` : ""
      }`}
      aria-label={label}
    >
      <span className={lang === "en" ? "font-bold text-primary" : "text-muted"}>
        {shortEn}
      </span>
      <span className="text-border">/</span>
      <span className={lang === "ja" ? "font-bold text-primary" : "text-muted"}>
        {shortJa}
      </span>
    </button>
  );
}
