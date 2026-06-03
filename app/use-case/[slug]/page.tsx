"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCase, cta } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";
import Section from "@/components/ui/Section";

type Props = { params: Promise<{ slug: string }> };

export default function UseCaseDetailPage({ params }: Props) {
  const { lang } = useLang();

  /* Next.js 16 passes params as a Promise — unwrap with React.use() */
  const { slug } = require("react").use(params) as { slug: string };
  const item = useCase.cases.find((c) => c.slug === slug);
  if (!item) notFound();

  const idx = useCase.cases.indexOf(item);
  const imageSrc = `/images/use-case-${idx + 1}.jpg`;

  return (
    <>
      {/* Hero banner */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-12 md:py-16 grid md:grid-cols-2 gap-10 items-center">
          <div className="animate-fade-up space-y-4">
            {/* Back link */}
            <Link
              href="/use-case"
              className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-muted hover:text-primary transition"
            >
              ← {lang === "jp" ? "ご利用シーン一覧" : "All use cases"}
            </Link>
            <h1 className="text-3xl md:text-4xl font-bold text-heading">
              {t(item.title, lang)}
            </h1>
            <p className="text-base leading-relaxed text-body">
              {t(item.detail, lang)}
            </p>
          </div>

          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border animate-fade-up [animation-delay:100ms]">
            <Image
              src={imageSrc}
              alt={t(item.imageAlt, lang)}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Highlights */}
      <Section
        heading={{ jp: "このサービスの特徴", en: "Key highlights" }}
        surface
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {item.highlights.map((h, i) => (
            <li
              key={h.en}
              className="flex gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm animate-fade-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span className="mt-0.5 shrink-0 text-primary font-bold">✓</span>
              <span className="text-sm leading-relaxed text-body">{t(h, lang)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* CTA */}
      <Section>
        <div className="rounded-2xl bg-primary-light px-6 py-10 text-center animate-fade-up">
          <h2 className="text-2xl font-bold text-heading">
            {lang === "jp" ? "このサービスについて相談する" : "Talk to us about this service"}
          </h2>
          <p className="mt-3 text-sm text-body max-w-xl mx-auto">
            {lang === "jp"
              ? "専門スタッフが丁寧にお話を伺い、最適なプランをご提案します。まずはお気軽にご連絡ください。"
              : "Our team will listen carefully and propose a plan tailored to your situation. No obligation — just a conversation."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link
              href="/service-flow"
              className="bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
            >
              {t(cta.primary, lang)}
            </Link>
            <Link
              href="/pricing"
              className="border-2 border-primary text-primary px-8 py-3 rounded-full font-medium transition hover:bg-primary-light"
            >
              {t(cta.secondary, lang)}
            </Link>
          </div>
        </div>
      </Section>
    </>
  );
}
