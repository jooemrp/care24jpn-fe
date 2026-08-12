"use client";

import Section from "@/components/ui/Section";
import type { LegalDoc } from "@/constants/legal";
import { useLangStore, t } from "@/features/lang/store";

/**
 * Renders a client-provided legal document (privacy policy, terms, etc.) in a
 * long-form reading layout: a table of contents card, then pure typography —
 * no boxes around the text. Body styles live in `.legal-body` (globals.css)
 * because they are relational (heading after paragraph, first child, ...).
 *
 * The JA and EN bodies are separate full texts, so the active language picks
 * the whole block list rather than translating block by block.
 */
export default function LegalDocPage({ doc }: { doc: LegalDoc }) {
  const { lang } = useLangStore();
  const blocks = doc.body[lang];

  const sections = blocks
    .map((block, i) => ({ ...block, i }))
    .filter((block) => block.type === "h2");

  return (
    <Section heading={doc.heading}>
      <div className="max-w-[42rem]">
        {/* Table of contents — section list built from the document itself */}
        {sections.length > 2 && (
          <nav
            aria-label={lang === "ja" ? "目次" : "Table of contents"}
            className="mb-12 overflow-hidden rounded-2xl border border-border/60 bg-white animate-fade-up"
          >
            <p className="border-b border-border/40 px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-heading">
              {lang === "ja" ? "目次" : "Table of Contents"}
            </p>
            <ol className="px-5 py-3">
              {sections.map((section, n) => (
                <li key={section.i}>
                  <a
                    href={`#sec-${section.i}`}
                    className="flex items-baseline gap-3 py-1.5 text-sm leading-snug text-body transition hover:text-primary"
                  >
                    <span className="shrink-0 text-xs font-medium tabular-nums text-muted">
                      {String(n + 1).padStart(2, "0")}
                    </span>
                    {section.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="legal-body animate-fade-up">
          {blocks.map((block, i) => {
            if (block.type === "h2") {
              return (
                <h2 key={i} id={`sec-${i}`}>
                  {block.text}
                </h2>
              );
            }
            if (block.type === "h3") {
              return <h3 key={i}>{block.text}</h3>;
            }
            return <p key={i}>{block.text}</p>;
          })}
        </div>
      </div>
    </Section>
  );
}
