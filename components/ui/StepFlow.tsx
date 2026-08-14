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

/**
 * The four steps, as numbered nodes on a dashed rail.
 *
 * Deliberately the same visual language as the home page's ご利用の流れ
 * section: a visitor who arrives here from there should recognise the same
 * sequence, not meet a second, thinner version of it. The rail is drawn per
 * item (node to node) rather than as one border on the list, so it stops at
 * the last node instead of trailing past it.
 */
export default function StepFlow({ steps, lang }: StepFlowProps) {
  return (
    <ol className="max-w-3xl">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li
            key={step.title.en}
            className="relative flex gap-6 pb-12 last:pb-0 animate-fade-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            {!last && (
              <span
                className="absolute bottom-0 left-7 top-14 w-0 border-l-2 border-dashed border-primary/25"
                aria-hidden="true"
              />
            )}
            {/* Just the numeral: the home page's badge stacks a 8px "STEP"
                label above it, which is under this page's 18px floor. */}
            <span className="z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold tabular-nums text-white shadow-[0_4px_12px_rgba(43,126,193,0.25)]">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="pt-3 text-2xl font-bold leading-snug text-heading">
                {t(step.title, lang)}
              </h3>
              <p className="mt-2.5 text-lg leading-relaxed text-body">
                {t(step.body, lang)}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
