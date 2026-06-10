"use client";

import Section from "@/components/ui/Section";
import ServiceCard from "@/components/ui/ServiceCard";
import { useCase } from "@/constants/copy";
import { useLangStore, t } from "@/features/lang/store";

export default function ServiceDetailsPage() {
  const { lang } = useLangStore();

  return (
    <>
      <Section heading={useCase.hero.heading}>
        <p className="max-w-2xl text-base leading-relaxed text-body">
          {t(useCase.hero.body, lang)}
        </p>
      </Section>

      <Section surface>
        <div className="grid gap-6 md:grid-cols-2">
          {useCase.cases.map((item, i) => (
            <ServiceCard
              key={item.slug}
              title={item.title}
              body={item.body}
              image={{ src: `/images/use-case-${i + 1}.jpg`, alt: item.imageAlt }}
              index={i}
            />
          ))}
        </div>
      </Section>
    </>
  );
}
