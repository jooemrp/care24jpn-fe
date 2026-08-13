import type { Bilingual } from "@/constants/copy";
import { t, type Lang } from "@/features/lang/i18n";

export type Step = {
  title: Bilingual;
  body: Bilingual;
};

type StepFlowProps = {
  steps: Step[];
  lang: Lang;
};

export default function StepFlow({ steps, lang }: StepFlowProps) {
  return (
    <ol className="relative space-y-10 border-l border-border pl-8">
      {steps.map((step, i) => (
        <li
          key={step.title.en}
          className="relative animate-fade-up"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <span
            className="absolute left-[-2.55rem] flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-white"
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <h3 className="text-lg font-bold text-heading">{t(step.title, lang)}</h3>
          <p className="mt-2 text-sm leading-relaxed text-body">{t(step.body, lang)}</p>
        </li>
      ))}
    </ol>
  );
}
