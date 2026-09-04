"use client";

import Image from "next/image";
import { IconPhone } from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { SafeInternalLink } from "./HomeLinks";

export function HomeContactSection({
  content,
  contactCta,
  lang,
}: {
  content: HomeContent["contact"];
  contactCta: { ja: string; en: string };
  lang: Lang;
}) {
  const phoneHref = `tel:${content.phone.replace(/[^0-9+]/g, "")}`;

  return (
    <Section surface lang={lang}>
      <div
        id="contact"
        className="scroll-mt-36 rounded-2xl bg-primary-light px-6 py-8 text-center animate-fade-up md:py-12"
      >
        <p className="text-sm font-medium text-primary">
          {t(content.leadInOrnamentStart, lang)} {t(content.leadIn, lang)}{" "}
          {t(content.leadInOrnamentEnd, lang)}
        </p>
        <h2 className="mt-2 text-2xl font-bold text-heading md:text-3xl">
          {t(content.heading, lang)}
        </h2>

        <div className="mt-8 flex flex-col items-center justify-center gap-6 sm:flex-row">
          <a
            href={phoneHref}
            className="flex items-center gap-2 text-3xl font-bold text-heading md:text-4xl"
          >
            <PhoneIcon />
            {content.phone}
          </a>
          <SafeInternalLink
            href={content.ctaHref}
            lang={lang}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
          >
            {t(contactCta, lang)}
          </SafeInternalLink>
        </div>

        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          <div className="flex h-20 w-48 shrink-0 items-center justify-center rounded-lg bg-white px-3 py-2">
            <a
              href="https://mics.tokyo/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition opacity-90 hover:opacity-100"
            >
              <Image
                src={content.micsLogo}
                alt={t(content.micsLogoAlt, lang)}
                width={401}
                height={140}
                className="h-auto max-h-14 w-auto"
              />
            </a>
          </div>
          <div className="flex h-20 w-auto shrink-0 items-center justify-center rounded-lg bg-white p-1">
            <Image
              src={content.isoLogo}
              alt={t(content.isoLogoAlt, lang)}
              width={257}
              height={182}
              className="h-[4.5rem] w-auto"
            />
          </div>
          <p className="whitespace-pre-line text-left text-xs leading-relaxed text-muted">
            {t(content.isms, lang)}
          </p>
        </div>
      </div>
    </Section>
  );
}

function PhoneIcon() {
  return <IconPhone className="h-7 w-9 text-primary" stroke={1.6} aria-hidden="true" />;
}
