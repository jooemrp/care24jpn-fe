"use client";

import Section from "@/components/ui/Section";
import type { LegalDoc } from "@/constants/legal";
import { useLangStore, t } from "@/features/lang/store";

/**
 * Renders a client-provided legal document (privacy policy, terms, etc.).
 * The JA and EN bodies are separate full texts, so the active language picks
 * the whole block list rather than translating block by block.
 */
export default function LegalDocPage({ doc }: { doc: LegalDoc }) {
  const { lang } = useLangStore();
  const blocks = doc.body[lang];

  return (
    <Section heading={doc.heading}>
      <div className="max-w-3xl rounded-3xl border border-border/50 bg-white p-6 shadow-[0_8px_24px_rgba(27,31,94,0.04)] animate-fade-up sm:p-8 md:p-12">
        {blocks.map((block, i) => {
          if (block.type === "h2") {
            return (
              <h2
                key={i}
                className="mt-12 rounded-xl bg-primary-light/50 px-5 py-3 text-base font-bold leading-snug text-heading first:mt-0 md:text-lg"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "h3") {
            return (
              <h3
                key={i}
                className="mt-8 flex items-baseline gap-2.5 text-[15px] font-bold leading-snug text-heading md:text-base"
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 translate-y-px rounded-[3px] bg-primary/70"
                  aria-hidden="true"
                />
                {block.text}
              </h3>
            );
          }
          return (
            <p key={i} className="mt-5 text-[15px] leading-[1.9] text-body">
              {block.text}
            </p>
          );
        })}
      </div>
    </Section>
  );
}
