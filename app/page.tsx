"use client";

import Link from "next/link";
import Image from "next/image";
import Section from "@/components/ui/Section";
import ServiceCard from "@/components/ui/ServiceCard";
import { home, cta } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";

export default function HomePage() {
  const { lang } = useLang();

  return (
    <>
      {/* Hero */}
      <section className="bg-surface">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-up">
            <h1 className="whitespace-pre-line text-4xl md:text-5xl font-bold leading-tight text-heading">
              {t(home.hero.heading, lang)}
            </h1>
            <p className="mt-6 text-base leading-relaxed text-body">
              {t(home.hero.body, lang)}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
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
          <div className="relative aspect-4/5 w-full overflow-hidden rounded-2xl border border-border animate-fade-up [animation-delay:120ms]">
            <Image
              src="/images/hero.jpg"
              alt={t(home.hero.imageAlt, lang)}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Values */}
      <Section heading={home.values.heading}>
        <div className="grid gap-6 md:grid-cols-3">
          {home.values.items.map((item, i) => (
            <ServiceCard key={item.title.en} title={item.title} body={item.body} index={i} />
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section surface>
        <div className="rounded-2xl bg-accent-light px-6 py-12 text-center md:py-16 animate-fade-up">
          <h2 className="text-3xl font-bold text-heading">
            {t(home.closing.heading, lang)}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-body">
            {t(home.closing.body, lang)}
          </p>
          <Link
            href="/service-flow"
            className="mt-8 inline-flex bg-accent text-white px-8 py-3 rounded-full font-medium transition hover:opacity-90"
          >
            {t(cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
