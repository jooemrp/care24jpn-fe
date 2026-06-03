"use client";

import Section from "@/components/ui/Section";
import ServiceCard from "@/components/ui/ServiceCard";
import { useCase as fallback } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData } from "@/features/cms/types";

export default function UseCaseView({ data }: { data?: BilingualPageData }) {
  const { lang } = useLangStore();

  const headingSection = data ? findSection(data.sections, "heading") : undefined;
  const heroHeading = getField(headingSection, "heading", lang) || t(fallback.hero.heading, lang);
  const heroBody = getField(headingSection, "sub_heading", lang) || t(fallback.hero.body, lang);

  const casesSection = data ? findSection(data.sections, "cases") : undefined;
  const cards = casesSection?.items?.length
    ? casesSection.items.map((item, i) => ({
        slug: item.icon_key ?? "",
        title: item.fields.title ?? { ja: "", en: "" },
        body: item.fields.body ?? { ja: "", en: "" },
        imageAlt: item.media?.alt_text
          ? { ja: item.media.alt_text, en: item.media.alt_text }
          : { ja: "", en: "" },
        imageSrc: item.media?.file_path?.match(/^(\/|https?:\/\/)/)
          ? item.media.file_path
          : `/images/use-case-${i + 1}.jpg`,
      }))
    : fallback.cases.map((c, i) => ({
        slug: c.slug,
        title: c.title,
        body: c.body,
        imageAlt: c.imageAlt,
        imageSrc: `/images/use-case-${i + 1}.jpg`,
      }));

  return (
    <>
      <Section heading={heroHeading ? { ja: heroHeading, en: heroHeading } : undefined}>
        {heroBody && (
          <p className="max-w-2xl text-base leading-relaxed text-body">{heroBody}</p>
        )}
      </Section>

      <Section surface>
        <div className="grid gap-6 md:grid-cols-2">
          {cards.map((item, i) => (
            <ServiceCard
              key={item.slug || String(i)}
              title={item.title}
              body={item.body}
              image={{ src: item.imageSrc, alt: item.imageAlt }}
              href={item.slug ? `/use-case/${item.slug}` : undefined}
              index={i}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
