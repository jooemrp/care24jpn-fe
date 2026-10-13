"use client";

import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { HomeApplyButtons } from "./HomeApplyButtons";
import { ResponsiveCopy } from "@/components/ResponsiveCopy";
import { PhraseText } from "@/components/PhraseText";

export function HomeApplySection({
  content,
  lang,
}: {
  content: HomeContent["apply"];
  lang: Lang;
}) {
  return (
    <Section surface lang={lang}>
      <div className="mb-8 text-center md:mb-10">
        <h2 className="text-2xl font-bold text-heading [text-wrap:balance] md:text-3xl">
          <PhraseText text={t(content.consult.heading, lang)} />
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-[13px] leading-relaxed text-body md:text-lg">
          <ResponsiveCopy
            text={content.consult.body}
            mobileText={content.consult.bodyMobile}
            lang={lang}
            mode="desktop-only"
          />
        </p>
      </div>
      <HomeApplyButtons content={content} lang={lang} />
    </Section>
  );
}
