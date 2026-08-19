import type { MetadataRoute } from "next";

import { SITE_URL } from "@/constants/site";
import { DEFAULT_LANG, LANGS, type Lang } from "@/features/lang/i18n";

const routes = [
  "/",
  "/pricing",
  "/service-flow",
  "/company",
  "/fees",
  "/privacy",
  "/terms-for-users",
  "/terms-for-care-supporters",
  "/tokushoho",
  "/quasi-mandate",
  "/compensation",
  "/cancellation-policy",
  "/use-case",
];

function localizedUrl(lang: Lang, route: string): string {
  const suffix = route === "/" ? "" : route;
  // "ja" is the default, prefix-less language (see features/lang/i18n.ts).
  return lang === DEFAULT_LANG
    ? `${SITE_URL}${suffix || "/"}`
    : `${SITE_URL}/${lang}${suffix}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return routes.flatMap((route) => {
    const languages = Object.fromEntries(
      LANGS.map((lang) => [lang, localizedUrl(lang, route)]),
    ) as Record<Lang, string>;

    const alternates = { languages };

    return LANGS.map((lang) => ({
      url: languages[lang],
      lastModified,
      alternates,
    }));
  });
}
