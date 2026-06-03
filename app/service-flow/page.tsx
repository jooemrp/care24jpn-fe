"use client";

import Link from "next/link";
import Section from "@/components/ui/Section";
import StepFlow from "@/components/ui/StepFlow";
import { serviceFlow, cta } from "@/constants/copy";
import { useLang, t } from "@/context/LanguageContext";

export default function ServiceFlowPage() {
  const { lang } = useLang();

  return (
    <>
      <Section heading={serviceFlow.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(serviceFlow.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <StepFlow steps={serviceFlow.steps} />
        <div className="mt-12 animate-fade-up">
          <Link
            href="/pricing"
            className="inline-flex bg-primary text-white px-8 py-3 rounded-full font-medium transition hover:bg-primary-mid"
          >
            {t(cta.primary, lang)}
          </Link>
        </div>
      </Section>
    </>
  );
}
