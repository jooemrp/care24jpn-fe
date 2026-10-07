"use client";

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { isSafeExternalHref, safeLocalizedHref } from "./HomeLinks";
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
      <div className="grid gap-4 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-4">
          <ApplyBanner
            href={content.user.href}
            eyebrow={t(content.user.eyebrow, lang)}
            label={t(content.user.label, lang)}
            tone="accent"
            external={isSafeExternalHref(content.user.href)}
            lang={lang}
            delay={0}
          />
          <ApplyBanner
            href={content.userRepeat.href}
            eyebrow={t(content.userRepeat.eyebrow, lang)}
            label={t(content.userRepeat.label, lang)}
            tone="accent"
            emphasis="secondary"
            external={isSafeExternalHref(content.userRepeat.href)}
            lang={lang}
            delay={40}
          />
        </div>
        <ApplyBanner
          href={content.staff.href}
          eyebrow={t(content.staff.eyebrow, lang)}
          label={t(content.staff.label, lang)}
          tone="primary"
          external={isSafeExternalHref(content.staff.href)}
          lang={lang}
          delay={80}
        />
      </div>
    </Section>
  );
}

function ApplyBanner({
  href,
  eyebrow,
  label,
  tone,
  emphasis = "primary",
  external = false,
  lang,
  delay,
}: {
  href: string;
  eyebrow: string;
  label: string;
  tone: "accent" | "primary";
  emphasis?: "primary" | "secondary";
  external?: boolean;
  lang: Lang;
  delay: number;
}) {
  const accent = tone === "accent";
  const isPrimary = emphasis === "primary";
  const className = isPrimary
    ? [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-2",
        "rounded-2xl px-7 py-8 text-white ring-1 ring-inset ring-white/15",
        "animate-fade-up transition duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3",
        accent
          ? "bg-accent-deep shadow-[0_4px_16px_-6px_rgba(122,32,68,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(122,32,68,0.65)] focus-visible:outline-accent-deep"
          : "bg-primary-deep shadow-[0_4px_16px_-6px_rgba(16,66,105,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(16,66,105,0.65)] focus-visible:outline-primary-deep",
      ].join(" ")
    : [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-5 gap-y-1",
        "rounded-2xl border-2 bg-surface px-7 py-5",
        "animate-fade-up transition duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3",
        accent
          ? "border-accent-deep text-accent-deep hover:bg-accent-deep/5 focus-visible:outline-accent-deep"
          : "border-primary-deep text-primary-deep hover:bg-primary-deep/5 focus-visible:outline-primary-deep",
      ].join(" ");

  const style = { animationDelay: `${delay}ms` };
  const children = isPrimary ? (
    <>
      <span className="col-start-1 row-start-1 self-end text-base font-semibold leading-relaxed text-white [text-wrap:balance]">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-xl font-bold leading-tight tracking-tight [text-wrap:balance] sm:text-2xl lg:text-[1.875rem]">
        <PhraseText text={label} />
      </span>
      <span
        aria-hidden="true"
        className={`col-start-2 row-start-1 row-span-2 flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 transition duration-200 group-hover:bg-white group-hover:ring-white motion-reduce:transition-none ${
          accent ? "group-hover:text-accent-deep" : "group-hover:text-primary-deep"
        }`}
      >
        <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  ) : (
    <>
      <span className="col-start-1 row-start-1 self-end text-sm font-medium leading-relaxed text-muted">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-lg font-bold leading-snug [text-wrap:balance] sm:text-xl">
        <PhraseText text={label} />
      </span>
      <span
        aria-hidden="true"
        className={`col-start-2 row-start-1 row-span-2 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full text-white transition duration-200 motion-reduce:transition-none ${
          accent ? "bg-accent-deep" : "bg-primary-deep"
        }`}
      >
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  );

  const props = { style, className };
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  }
  if (href.startsWith("#")) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return (
    <Link href={safeLocalizedHref(href, lang)} {...props}>
      {children}
    </Link>
  );
}

function ArrowRightIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <IconArrowRight className={className} stroke={2.5} aria-hidden="true" />;
}
