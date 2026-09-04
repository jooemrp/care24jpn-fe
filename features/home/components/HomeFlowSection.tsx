"use client";

import Image from "next/image";
import { IconArrowDown, IconArrowRight } from "@tabler/icons-react";
import Section from "@/components/ui/Section";
import { QueryEmptyState } from "@/components/cms/QueryEmptyState";
import { queryStates } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";
import type { HomeContent } from "../types";

export function HomeFlowSection({
  content,
  lang,
}: {
  content: HomeContent["flow"];
  lang: Lang;
}) {
  return (
    <Section surface heading={content.heading} lang={lang}>
      {content.steps.length > 0 ? (
        <ol className="mx-auto grid max-w-5xl grid-cols-1 gap-y-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] md:items-start md:gap-x-1 lg:gap-x-2">
          {content.steps.flatMap((step, index) => {
            const last = index === content.steps.length - 1;
            const nodes = [
              <li
                key={step.number}
                className="flex animate-fade-up flex-col items-center text-center"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <span className="relative flex h-28 w-28 items-center justify-center md:h-32 md:w-32">
                  <span className="absolute inset-0 overflow-hidden rounded-full border-4 border-primary/20 shadow-sm">
                    <FlowStepIcon src={step.image} />
                  </span>
                  <span className="absolute -top-1 left-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold tracking-wide text-white shadow-sm">
                    {step.number}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-bold leading-snug text-heading md:text-base lg:text-lg">
                  {t(step.title, lang)}
                </h3>
                <p className="mt-2 max-w-[14rem] text-sm leading-relaxed text-body">
                  {t(step.body, lang)}
                </p>
              </li>,
            ];

            if (!last) {
              nodes.push(
                <li
                  key={`arrow-${step.number}`}
                  className="flex items-center justify-center text-primary md:h-32"
                  aria-hidden="true"
                >
                  <span className="md:hidden">
                    <IconArrowDown className="h-6 w-4" stroke={2} aria-hidden="true" />
                  </span>
                  <span className="hidden md:block">
                    <IconArrowRight className="h-5 w-10" stroke={2} aria-hidden="true" />
                  </span>
                </li>,
              );
            }

            return nodes;
          })}
        </ol>
      ) : (
        <QueryEmptyState title={t(queryStates.empty, lang)} />
      )}
    </Section>
  );
}

function FlowStepIcon({ src }: { src: string }) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt=""
      width={256}
      height={256}
      className="h-full w-full object-cover"
    />
  );
}
