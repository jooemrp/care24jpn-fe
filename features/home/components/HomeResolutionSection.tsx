"use client";

import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { PyramidStatement } from "./HomeHeroSection";

export function HomeResolutionSection({
  content,
  lang,
}: {
  content: HomeContent["hero"];
  lang: Lang;
}) {
  return (
    <div className="flex flex-col items-center bg-surface px-6 pb-8 pt-2 md:pb-10">
      <PyramidStatement badge={t(content.badge, lang)} resolve={t(content.resolve, lang)} />
      <p className="mx-auto mt-8 max-w-2xl animate-fade-up text-center text-base leading-relaxed text-heading md:text-lg">
        {t(content.assist, lang)}
      </p>
    </div>
  );
}
