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
    // `scroll-mt-36` (144px) only matters when this section is an anchor
    // target: the header is sticky and 130px tall, so without the margin an
    // in-page link (#service-details, #contact) parks the section heading
    // underneath it.
    <section
      id={id}
      className={`${surface ? "bg-surface" : ""} py-8 md:py-12 ${id ? "scroll-mt-36" : ""} ${className}`}
    >
      <div className="max-w-5xl mx-auto px-6">
        {heading && (
          <header className="mb-6 md:mb-8 animate-fade-up">
            <HeadingTag className="text-3xl font-bold text-heading mb-1">{t(heading, lang)}</HeadingTag>
          </header>
        )}
        {children}
      </div>
    </section>
  );
}
