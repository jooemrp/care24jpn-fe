"use client";

import Link from "next/link";
import { IconArrowRight } from "@tabler/icons-react";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";
import { isSafeExternalHref, safeLocalizedHref } from "./HomeLinks";
import { PhraseText } from "@/components/PhraseText";

/**
 * The three apply buttons, shared by the hero and the apply section so both
 * show the same layout: new user (left) and staff (right) side by side at
 * equal height, with the returning-user button directly under the left one.
 * Source order is user, returning user, staff so the mobile stack keeps that
 * order; from `md` the staff button is pinned to the top-right cell.
 */
export function HomeApplyButtons({
  content,
  lang,
  size = "default",
  className = "",
}: {
  content: HomeContent["apply"];
  lang: Lang;
  size?: "default" | "compact";
  className?: string;
}) {
  const compact = size === "compact";
  return (
    <div
      className={`grid md:grid-cols-2 ${compact ? "gap-3" : "gap-4"} ${className}`}
    >
      <ApplyBanner
        href={content.user.href}
        eyebrow={t(content.user.eyebrow, lang)}
        label={t(content.user.label, lang)}
        tone="accent"
        external={isSafeExternalHref(content.user.href)}
        size={size}
        lang={lang}
        delay={0}
      />
      <ApplyBanner
        href={content.userRepeat.href}
        label={t(content.userRepeat.label, lang)}
        tone="accent"
        emphasis="secondary"
        external={isSafeExternalHref(content.userRepeat.href)}
        size={size}
        lang={lang}
        delay={40}
      />
      <ApplyBanner
        href={content.staff.href}
        eyebrow={t(content.staff.eyebrow, lang)}
        label={t(content.staff.label, lang)}
        tone="primary"
        external={isSafeExternalHref(content.staff.href)}
        size={size}
        lang={lang}
        delay={80}
        className="md:col-start-2 md:row-start-1"
      />
    </div>
  );
}

function ApplyBanner({
  href,
  eyebrow,
  label,
  tone,
  emphasis = "primary",
  external = false,
  size = "default",
  lang,
  delay,
  className: extraClassName = "",
}: {
  href: string;
  /** Small line above the label. The secondary (returning-user) banner has none. */
  eyebrow?: string;
  label: string;
  tone: "accent" | "primary";
  emphasis?: "primary" | "secondary";
  external?: boolean;
  size?: "default" | "compact";
  lang: Lang;
  delay: number;
  className?: string;
}) {
  const accent = tone === "accent";
  const isPrimary = emphasis === "primary";
  const compact = size === "compact";
  const className = isPrimary
    ? [
        "group grid grid-cols-[minmax(0,1fr)_auto] items-start gap-y-2",
        compact
          ? "gap-x-3 rounded-2xl px-4 py-5"
          : "gap-x-5 rounded-2xl px-7 py-8",
        "text-white ring-1 ring-inset ring-white/15",
        "animate-fade-up transition duration-200 motion-safe:hover:-translate-y-0.5",
        "motion-reduce:transition-none",
        "focus-visible:outline-2 focus-visible:outline-offset-3",
        accent
          ? "bg-accent-deep shadow-[0_4px_16px_-6px_rgba(122,32,68,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(122,32,68,0.65)] focus-visible:outline-accent-deep"
          : "bg-primary-deep shadow-[0_4px_16px_-6px_rgba(16,66,105,0.5)] hover:shadow-[0_20px_36px_-18px_rgba(16,66,105,0.65)] focus-visible:outline-primary-deep",
      ].join(" ")
    : [
        // One centered line; the arrow is pinned to the right edge so the
        // label stays centered on the button, not on the space left of it.
        "group relative flex items-center justify-center",
        compact ? "min-h-14 px-11 py-3" : "min-h-16 px-14 py-4",
        "rounded-2xl border-2 bg-surface",
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
      <span
        className={`col-start-1 row-start-1 self-end ${
          compact ? "text-xs sm:text-sm" : "text-base"
        } font-semibold leading-relaxed text-white [text-wrap:balance]`}
      >
        {eyebrow}
      </span>
      <span
        className={`col-start-1 row-start-2 self-end ${
          compact ? "text-[1.0625rem]" : "text-xl"
        } font-bold leading-tight tracking-tight [text-wrap:balance]${
          compact ? "" : " sm:text-2xl lg:text-[1.875rem]"
        }`}
      >
        <PhraseText text={label} />
      </span>
      <span
        aria-hidden="true"
        className={`col-start-2 row-start-1 row-span-2 flex shrink-0 items-center justify-center self-center rounded-full bg-white/15 ring-1 ring-inset ring-white/25 transition duration-200 group-hover:bg-white group-hover:ring-white motion-reduce:transition-none ${
          compact ? "h-9 w-9" : "h-12 w-12"
        } ${
          accent ? "group-hover:text-accent-deep" : "group-hover:text-primary-deep"
        }`}
      >
        <ArrowRightIcon className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  ) : (
    <>
      <span
        className={`text-center font-bold leading-snug [text-wrap:balance] ${
          compact ? "text-[0.9375rem]" : "text-lg sm:text-xl"
        }`}
      >
        <PhraseText text={label} />
      </span>
      <span
        aria-hidden="true"
        className={`absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 shrink-0 items-center justify-center rounded-full text-white transition duration-200 motion-reduce:transition-none ${
          accent ? "bg-accent-deep" : "bg-primary-deep"
        }`}
      >
        <ArrowRightIcon className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" />
      </span>
    </>
  );

  const props = { style, className: `${className} ${extraClassName}`.trim() };
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
