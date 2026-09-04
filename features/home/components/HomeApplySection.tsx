"use client";

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { isSafeExternalHref, safeLocalizedHref } from "./HomeLinks";

export function HomeApplySection({
  content,
  lang,
}: {
  content: HomeContent["apply"];
  lang: Lang;
}) {
  return (
    <Section surface lang={lang}>
      <div className="grid gap-4 md:grid-cols-2">
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
          href={content.staff.href}
          eyebrow={t(content.staff.eyebrow, lang)}
          label={t(content.staff.label, lang)}
          tone="primary"
          emphasis="secondary"
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
        "sm:row-span-2 sm:grid-rows-subgrid",
        "animate-fade-up transition duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3",
        accent
          ? "bg-accent-deep shadow-[0_4px_16px_-6px_rgba(122,32,68,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(122,32,68,0.65)] focus-visible:outline-accent-deep"
          : "bg-primary-deep shadow-[0_4px_16px_-6px_rgba(16,66,105,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(16,66,105,0.65)] focus-visible:outline-primary-deep",
      ].join(" ")
    : [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1.5",
        "rounded-xl border border-primary/25 bg-surface px-5 py-5 text-heading",
        "sm:row-span-2 sm:grid-rows-subgrid",
        "animate-fade-up transition duration-200",
        "hover:border-primary/40 hover:bg-primary-light/50",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-primary",
      ].join(" ");

  const style = { animationDelay: `${delay}ms` };
  const children = isPrimary ? (
    <>
      <span className="col-start-1 row-start-1 self-end text-sm font-medium leading-relaxed text-white/90">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-2xl font-bold leading-tight tracking-tight md:text-[1.875rem]">
        {label}
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
      <span className="col-start-1 row-start-1 self-end text-xs font-medium leading-relaxed text-muted">
        {eyebrow}
      </span>
      <span className="col-start-1 row-start-2 self-end text-lg font-semibold leading-snug text-heading md:text-xl">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="col-start-2 row-start-1 row-span-2 flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full bg-primary/10 text-primary ring-1 ring-inset ring-primary/15 transition duration-200 group-hover:bg-primary group-hover:text-white group-hover:ring-primary motion-reduce:transition-none"
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
