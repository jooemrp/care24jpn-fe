"use client";

import type { Bilingual } from "@/constants/copy";
import type { Lang } from "@/features/lang/i18n";
import type { HomeContent as HomeContentData } from "../types";
import { HomeAboutSection } from "./HomeAboutSection";
import { HomeApplySection } from "./HomeApplySection";
import { HomeContactSection } from "./HomeContactSection";
import { HomeCoursesSection } from "./HomeCoursesSection";
import { HomeExamplesSection } from "./HomeExamplesSection";
import { HomeFlowSection } from "./HomeFlowSection";
import { HomeHeroSection } from "./HomeHeroSection";
import { HomePricingSection } from "./HomePricingSection";
import { HomeProblemsSection } from "./HomeProblemsSection";
import { HomeResolutionSection } from "./HomeResolutionSection";

/**
 * Pure content composition kept separate from query state so it can be
 * server-render tested with a prefetched snapshot and reused by the boundary.
 */
export function HomeContentView({
  content,
  lang,
  contactCta,
}: {
  content: HomeContentData;
  lang: Lang;
  contactCta: Bilingual;
}) {
  return (
    <>
      <HomeHeroSection content={content.hero} lang={lang} />
      <HomeAboutSection content={content.about} lang={lang} />
      <HomeProblemsSection content={content.problems} lang={lang} />
      <HomePricingSection
        content={content.pricingSummary}
        pricingDetailsLink={content.pricingDetailsLink}
        lang={lang}
      />
      <HomeResolutionSection content={content.hero} lang={lang} />
      <HomeCoursesSection
        careCourse={content.careCourse}
        nursingCourse={content.nursingCourse}
        pricingDetailsLink={content.pricingDetailsLink}
        lang={lang}
      />
      <HomeExamplesSection content={content.examples} lang={lang} />
      <HomeFlowSection content={content.flow} lang={lang} />
      <HomeApplySection content={content.apply} lang={lang} />
      <HomeContactSection
        content={content.contact}
        contactCta={contactCta}
        lang={lang}
      />
    </>
  );
}
