import type { ReactNode } from "react";
import type { Bilingual } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";

type SectionProps = {
  id?: string;
  heading?: Bilingual;
  children: ReactNode;
  surface?: boolean;
  className?: string;
  level?: "h1" | "h2";
  lang: Lang;
};

export default function Section({ id, heading, children, surface = false, className = "", level = "h2", lang }: SectionProps) {
  const HeadingTag = level;

  return (
    <section id={id} className={`${surface ? "bg-surface" : ""} py-12 md:py-20 ${className}`}>
      <div className="max-w-5xl mx-auto px-6">
        {heading && (
          <header className="mb-10 animate-fade-up">
            <HeadingTag className="text-3xl font-bold text-heading mb-1">{t(heading, lang)}</HeadingTag>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
