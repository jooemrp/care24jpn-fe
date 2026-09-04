"use client";

import Link from "next/link";
import Section from "@/components/ui/Section";
import StepFlow from "@/components/ui/StepFlow";
import { localizeHref, t, type Lang } from "@/features/lang/i18n";
import type { ServiceFlowContent } from "@/features/cms/pages-map";

export function ServiceFlowContentView({
  content,
  lang,
  primaryCta,
}: {
  content: ServiceFlowContent;
  lang: Lang;
  primaryCta: { ja: string; en: string };
}) {
  return (
    <>
      <Section
        heading={content.hero.heading}
        level="h1"
        lang={lang}
      >
        <p className="max-w-2xl text-lg leading-relaxed text-body">
          {t(content.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <StepFlow steps={content.steps} lang={lang} />
        <div className="mt-12 animate-fade-up">
          <Link
            href={localizeHref(content.hero.ctaHref, lang)}
            className="inline-flex min-h-11 items-center rounded-full bg-primary px-8 py-4 text-lg font-bold text-white transition hover:bg-primary-mid"
          >
            {t(primaryCta, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
