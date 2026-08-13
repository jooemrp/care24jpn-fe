import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Section from "@/components/ui/Section";
import { useCase, cta } from "@/constants/copy";
import { t, localizeHref, isLang } from "@/features/lang/i18n";

// Title/description are short JA strings; the root layout's title.template
// appends the brand name, so the brand must not be repeated here.
export async function generateMetadata({
  params,
}: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return {
    title: lang === "ja" ? "ご利用シーン" : "Use cases",
    description:
      lang === "ja"
        ? "退院後のサポート、認知症のケア、レスパイトケア、終末期ケアなど、Care 24 Japanの在宅ケアがお役に立てるさまざまな暮らしの場面をご紹介します。"
        : "After hospital discharge, dementia care, respite for families, end-of-life home care — the everyday situations where Care 24 Japan's in-home care helps.",
    alternates: {
      canonical: `/${lang}/use-case`,
      languages: {
        ja: "/ja/use-case",
        en: "/en/use-case",
      },
    },
  };
}

export default async function UseCasePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  return (
    <>
      <Section heading={useCase.hero.heading} level="h1" lang={lang}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(useCase.hero.body, lang)}
        </p>
      </Section>

      <Section surface lang={lang}>
        <div className="flex flex-col gap-16">
          {useCase.cases.map((c, i) => (
            <article
              key={c.slug}
              id={c.slug}
              className="grid gap-8 md:grid-cols-2 md:items-start animate-fade-up"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="relative aspect-16/10 w-full overflow-hidden rounded-2xl border border-border">
                <Image
                  src={`/images/use-case-${i + 1}.webp`}
                  alt={t(c.imageAlt, lang)}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>

              <div>
                <h2 className="text-2xl font-bold text-heading">{t(c.title, lang)}</h2>
                <p className="mt-2 text-sm font-medium text-muted">{t(c.body, lang)}</p>
                <p className="mt-4 text-base leading-relaxed text-body">{t(c.detail, lang)}</p>
                <ul className="mt-6 flex flex-col gap-2">
                  {c.highlights.map((h, hi) => (
                    <li key={hi} className="flex items-start gap-2 text-sm text-body">
                      <span
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      {t(h, lang)}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section lang={lang}>
        <div className="animate-fade-up">
          <Link
            href={localizeHref("/pricing", lang)}
            className="inline-flex bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
          >
            {t(cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
