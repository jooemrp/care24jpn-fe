"use client";

import Link from "next/link";
import Image from "next/image";
import type { Bilingual } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

type ServiceCardProps = {
  title: Bilingual;
  body: Bilingual;
  image?: {
    src: string;
    alt: Bilingual;
  };
  /** When provided the whole card becomes a link. */
  href?: string;
  index?: number;
};

export default function ServiceCard({ title, body, image, href, index = 0 }: ServiceCardProps) {
  const { lang } = useLangStore();

  const inner = (
    <>
      {image && (
        <div className="relative aspect-3/2 w-full">
          <Image
            src={image.src}
            alt={t(image.alt, lang)}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}
      <div className="p-6 space-y-2">
        <h3 className="text-lg font-bold text-heading">{t(title, lang)}</h3>
        <p className="text-sm leading-relaxed text-body">{t(body, lang)}</p>
        {href && (
          <p className="pt-1 text-xs font-medium text-primary">
            {lang === "ja" ? "詳しく見る →" : "Learn more →"}
          </p>
        )}
      </div>
    </>
  );

  const cls =
    "block rounded-2xl border border-border bg-surface shadow-sm transition-shadow duration-200 hover:shadow-md overflow-hidden animate-fade-up";

  if (href) {
    return (
      <Link href={href} className={cls} style={{ animationDelay: `${index * 80}ms` }}>
        {inner}
      </Link>
    );
  }

  return (
    <article className={cls} style={{ animationDelay: `${index * 80}ms` }}>
      {inner}
    </article>
  );
}
