"use client";

import type { ReactNode } from "react";
import type { Bilingual } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

type SectionProps = {
  heading?: Bilingual;
  children: ReactNode;
  surface?: boolean;
  className?: string;
};

export default function Section({ heading, children, surface = false, className = "" }: SectionProps) {
  const { lang } = useLangStore();

  return (
    <section className={`${surface ? "bg-surface" : ""} py-12 md:py-20 ${className}`}>
      <div className="max-w-5xl mx-auto px-6">
        {heading && (
          <header className="mb-10 animate-fade-up">
            <h2 className="text-3xl font-bold text-heading mb-1">{t(heading, lang)}</h2>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
