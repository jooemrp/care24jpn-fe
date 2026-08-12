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
      <div className="max-w-3xl animate-fade-up">
        {blocks.map((block, i) => {
          if (block.type === "h2") {
            return (
              <h2
                key={i}
                className="mt-10 border-l-4 border-primary pl-3 text-lg font-bold leading-snug text-heading first:mt-0"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === "h3") {
            return (
              <h3 key={i} className="mt-6 text-base font-bold leading-snug text-heading">
                {block.text}
              </h3>
            );
          }
          return (
            <p key={i} className="mt-4 text-sm leading-relaxed text-body">
              {block.text}
            </p>
          );
        })}
      </div>
    </Section>
  );
}
