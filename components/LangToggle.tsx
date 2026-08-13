"use client";

import { usePathname, useRouter } from "next/navigation";
import { localizeHref, type Lang } from "@/features/lang/i18n";

/**
 * Language switch pill, shared by Navbar (with a 44px hit area appended via
 * `className`) and Footer (no `className` — no extra hit area).
 *
 * Stays a `<button>` (not a `<Link>`) so it can compute the sibling-language
 * path from the *current* pathname at click time via `localizeHref`, rather
 * than baking a static href.
 */
export default function LangToggle({
  lang,
  className,
}: {
  lang: Lang;
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
      aria-label={lang === "ja" ? "Switch to English" : "日本語に切り替える"}
    >
      <span className={lang === "en" ? "font-bold text-primary" : "text-muted"}>
        EN
      </span>
      <span className="text-border">/</span>
      <span className={lang === "ja" ? "font-bold text-primary" : "text-muted"}>
        JP
      </span>
    </button>
  );
}
