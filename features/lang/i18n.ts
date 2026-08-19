/**
 * Server-safe language module.
 *
 * No "use client" directive and no zustand import here on purpose: this file
 * is importable from both Server and Client Components (e.g. to build
 * localized hrefs during server-side rendering). It is the sole source of
 * language state in the app — `lang` is resolved from the route segment
 * (app/[lang]/...) and prop-drilled from there; there is no client-side
 * language store.
 */

export type Lang = "ja" | "en";

export const LANGS = ["ja", "en"] as const;

/**
 * The default language has no URL prefix — proxy.ts rewrites bare paths
 * ("/", "/pricing", ...) to "/ja/..." internally, and redirects any
 * incoming "/ja/..." link to its prefix-less equivalent. "en" keeps its
 * "/en" prefix.
 */
export const DEFAULT_LANG: Lang = "ja";

export function t(text: { ja: string; en: string }, lang: Lang): string {
  return text[lang];
}

export function isLang(v: string): v is Lang {
  return v === "ja" || v === "en";
}

/**
 * Rewrite an internal href to be prefixed with the given language.
 *
 * Left untouched:
 *  - pure fragments ("#contact")
 *  - anything with a scheme ("tel:...", "mailto:...", "https://...", "//...")
 *
 * Otherwise the href is treated as an app-relative path (optionally already
 * prefixed with "/ja" or "/en", optionally followed by a "#hash"), and is
 * rewritten to be prefixed with `lang` exactly once — except the default
 * language, which is prefix-less. The root path becomes the bare "/<lang>"
 * (no trailing slash) for non-default languages, and a hash on the root
 * path is appended directly ("/<lang>#hash", not "/<lang>/#hash").
 */
export function localizeHref(href: string, lang: Lang): string {
  if (href.startsWith("#")) {
    return href;
  }

  if (
    href.includes("://") ||
    href.startsWith("tel:") ||
    href.startsWith("mailto:") ||
    href.startsWith("//")
  ) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const path = hashIndex === -1 ? href : href.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : href.slice(hashIndex);

  let bare: string;
  if (path === "/ja" || path === "/en") {
    bare = "/";
  } else if (path.startsWith("/ja/") || path.startsWith("/en/")) {
    bare = path.slice(3);
  } else {
    bare = path;
  }

  if (lang === DEFAULT_LANG) {
    return `${bare}${hash}`;
  }

  const newPath = bare === "/" || bare === "" ? `/${lang}` : `/${lang}${bare}`;

  return `${newPath}${hash}`;
}
