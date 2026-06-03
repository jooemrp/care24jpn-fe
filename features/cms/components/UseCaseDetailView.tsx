"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCase, cta } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";
import Section from "@/components/ui/Section";
import { findSection, getField } from "@/features/cms/mapping";
import type { BilingualPageData } from "@/features/cms/types";

type Props = {
  data?: BilingualPageData;
  slug: string;
};

export default function UseCaseDetailView({ data, slug }: Props) {
  const { lang } = useLangStore();

  const fallbackItem = useCase.cases.find((c) => c.slug === slug);
  if (!data && !fallbackItem) notFound();

  const fallbackIdx = fallbackItem ? useCase.cases.indexOf(fallbackItem) : 0;

  const headingSection = data ? findSection(data.sections, "heading") : undefined;
  const title = getField(headingSection, "heading", lang) || (fallbackItem ? t(fallbackItem.title, lang) : "");
  const description = getField(headingSection, "description", lang) || (fallbackItem ? t(fallbackItem.detail, lang) : "");

  const headingMedia = headingSection?.items?.[0]?.media;
  const rawSrc = headingMedia?.file_path;
  const imageSrc = rawSrc?.match(/^(\/|https?:\/\/)/) ? rawSrc : `/images/use-case-${fallbackIdx + 1}.jpg`;
  const imageAlt = headingMedia?.alt_text || (fallbackItem ? t(fallbackItem.imageAlt, lang) : title);

  const highlightsSection = data ? findSection(data.sections, "highlights") : undefined;
  const highlights: string[] = highlightsSection?.items?.length
    ? highlightsSection.items.map((i) => i.fields.text?.[lang] ?? "").filter(Boolean)
    : (fallbackItem?.highlights?.map((h) => t(h, lang)) ?? []);

  const ctaSection = data ? findSection(data.sections, "cta") : undefined;
  const cta1 = ctaSection?.cta_buttons?.[0];
  const cta2 = ctaSection?.cta_buttons?.[1];
  const cta1Label = cta1 ? t(cta1.label, lang) : t(cta.primary, lang);
  const cta1Url = cta1?.url || "/service-flow";
  const cta2Label = cta2 ? t(cta2.label, lang) : t(cta.secondary, lang);
  const cta2Url = cta2?.url || "/pricing";

  return (
    <>
      {/* Hero banner */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up space-y-4">
            <Link
              href="/use-case"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted hover:text-primary transition"
            >
              ← {lang === "ja" ? "ご利用シーン一覧" : "All use cases"}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-heading">
              {title}
            </h1>
            <p className="text-base leading-relaxed text-body">
              {description}
            </p>
          </div>

          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border animate-fade-up [animation-delay:100ms]">
            <Image
              src={imageSrc}
              alt={imageAlt}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Section
          heading={{ ja: "このサービスの特徴", en: "Key highlights" }}
          surface
        >
          <ul className="grid gap-4 sm:grid-cols-2">
            {highlights.map((h, i) => (
              <li
                key={h}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm animate-fade-up"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className="mt-0.5 shrink-0 text-primary font-bold">✓</span>
                <span className="text-sm leading-relaxed text-body">{h}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* CTA */}
      <Section>
        <div className="rounded-2xl bg-primary-light px-6 py-10 text-center animate-fade-up">
          <h2 className="text-2xl font-bold text-heading">
            {lang === "ja" ? "このサービスについて相談する" : "Talk to us about this service"}
          </h2>
          <p className="mt-3 text-sm text-body max-w-xl mx-auto">
            {lang === "ja"
              ? "専門スタッフが丁寧にお話を伺い、最適なプランをご提案します。まずはお気軽にご連絡ください。"
              : "Our team will listen carefully and propose a plan tailored to your situation. No obligation — just a conversation."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href={cta1Url}
              className="bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
            >
              {cta1Label}
            </Link>
            <Link
              href={cta2Url}
              className="border-2 border-primary text-primary px-8 py-3 rounded-full font-medium transition hover:bg-primary-light"
            >
              {cta2Label}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
