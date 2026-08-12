"use client";

import Section from "@/components/ui/Section";
import { legalStub } from "@/constants/copy";
import type { Bilingual } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

/**
 * Placeholder for legal pages whose source documents (privacy policy, terms,
 * etc.) have not been shared by the client yet. Swap the body for the real
 * content once each document arrives.
 */
export default function LegalStubPage({ heading }: { heading: Bilingual }) {
  const { lang } = useLangStore();

  return (
    <Section heading={heading}>
      <p className="max-w-2xl text-sm leading-relaxed text-body animate-fade-up">
        {t(legalStub.notice, lang)}
      </p>
    </Section>
  );
}
