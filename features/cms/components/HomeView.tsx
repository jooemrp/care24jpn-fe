"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/ui/Section";
import ServiceCard from "@/components/ui/ServiceCard";
import { home as fallbackHome, cta } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData } from "@/features/cms/types";

export default function HomeView({ data }: { data?: BilingualPageData }) {
  const { lang } = useLangStore();

  const heroSection = data ? findSection(data.sections, "hero") : undefined;
  const solutionsSection = data ? findSection(data.sections, "solutions") : undefined;
  const closingSection = data ? findSection(data.sections, "closing") : undefined;

  const heroHeading = getField(heroSection, "heading", lang) || t(fallbackHome.hero.heading, lang);
  const heroBody = getField(heroSection, "sub_heading", lang) || t(fallbackHome.hero.body, lang);
  const heroCtas = heroSection?.cta_buttons ?? [];
  const heroImageAlt = getField(heroSection, "image_alt", lang) || t(fallbackHome.hero.imageAlt, lang);

  const valuesHeading = getField(solutionsSection, "heading", lang) || t(fallbackHome.values.heading, lang);
  const valuesItems = solutionsSection?.items?.length
    ? solutionsSection.items.map((item) => ({
        title: item.fields.title?.[lang] ?? "",
        body: item.fields.description?.[lang] ?? "",
      }))
    : fallbackHome.values.items.map((item) => ({
        title: t(item.title, lang),
        body: t(item.body, lang),
      }));

  const closingHeading = getField(closingSection, "heading", lang) || t(fallbackHome.closing.heading, lang);
  const closingBody = getField(closingSection, "body", lang) || t(fallbackHome.closing.body, lang);
  const closingCTA = closingSection?.cta_buttons?.[0];
  const closingCTALabel = closingCTA ? t(closingCTA.label, lang) : t(cta.primary, lang);
  const closingCTAUrl = closingCTA?.url || "/service-flow";

  const activeCtas = heroCtas.length > 0
    ? heroCtas
    : [
        { url: "/service-flow", label: { ja: t(cta.primary, lang), en: t(cta.primary, lang) } },
        { url: "/pricing", label: { ja: t(cta.secondary, lang), en: t(cta.secondary, lang) } },
      ];

  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-up">
            <h1 className="whitespace-pre-line text-4xl md:text-5xl font-bold leading-tight text-heading">
              {heroHeading}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-body">
              {heroBody}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              {activeCtas.map((ctaBtn, i) => (
                <Link
                  key={ctaBtn.url}
                  href={ctaBtn.url}
                  className={`px-8 py-3 rounded-full font-medium transition ${
                    i === 0
                      ? "bg-primary text-white hover:bg-primary-mid"
                      : "border-2 border-primary text-primary hover:bg-primary-light"
                  }`}
                >
                  {t(ctaBtn.label, lang)}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border animate-fade-up [animation-delay:120ms]">
            <Image
              src="/images/hero.jpg"
              alt={heroImageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values / Solutions */}
      <Section heading={valuesHeading ? { ja: valuesHeading, en: valuesHeading } : undefined}>
        <div className="grid gap-6 md:grid-cols-3">
          {valuesItems.map((item, i) => (
            <ServiceCard
              key={item.title}
              title={{ ja: item.title, en: item.title }}
              body={{ ja: item.body, en: item.body }}
              index={i}
            />
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section surface>
        <div className="rounded-2xl bg-accent-light px-6 py-12 text-center md:py-16 animate-fade-up">
          <h2 className="text-3xl font-bold text-heading">
            {closingHeading}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body">
            {closingBody}
          </p>
          <Link
            href={closingCTAUrl}
            className="mt-8 inline-flex bg-accent text-white px-8 py-3 rounded-full font-medium transition hover:opacity-90"
          >
            {closingCTALabel}
          </Link>
        </div>
      </Section>
    </>
  );
}
