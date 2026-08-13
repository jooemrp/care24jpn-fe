import { formatYen, type CourseRates } from "@/constants/pricing";
import { t, type Lang } from "@/features/lang/i18n";

type CourseRateCardProps = {
  course: CourseRates;
  lang: Lang;
  /** Which brand colour this course carries — matches the home page. */
  tone: "primary" | "accent";
};

/**
 * One course's rates, as a card rather than a flat table.
 *
 * The rows split by whether they carry a time band (`detail`): those are the
 * two basic rates and become the headline pair, side by side, so day and
 * night can be compared at a glance instead of reading as two rows with the
 * identical label "Basic rate (per hour)". Everything without a time band is
 * an add-on and sits underneath as a plain list.
 */
export default function CourseRateCard({ course, lang, tone }: CourseRateCardProps) {
  const accent = tone === "accent";
  const timed = course.rows.filter((row) => row.detail);
  const extras = course.rows.filter((row) => !row.detail);

  // The timed rows normally share one label ("Basic rate (per hour)"), so it
  // is printed once above the pair. If the data ever diverges, each cell
  // prints its own label instead of silently showing the wrong one.
  const sharedLabel =
    timed.length > 0 && timed.every((row) => row.label.ja === timed[0].label.ja)
      ? timed[0].label
      : null;

  return (
    <section
      className={`overflow-hidden rounded-2xl border-2 bg-surface ${
        accent ? "border-accent" : "border-primary"
      }`}
    >
      {/* Solid header in the course's own colour — same flat, no-ornament
          language as the apply banners on the home page. 24px bold white on
          these fills clears WCAG AA as large text.
          The inner span carries the colour: globals.css sets an unlayered
          `h1..h4 { color: var(--color-heading) }` that outranks `text-white`
          on the heading element itself. */}
      <h2 className={`px-7 py-5 text-2xl font-bold ${accent ? "bg-accent" : "bg-primary"}`}>
        <span className="text-white">{t(course.name, lang)}</span>
      </h2>

      <div className="p-7">
        {sharedLabel && (
          <p className="text-lg font-bold text-muted">{t(sharedLabel, lang)}</p>
        )}

        <div className="mt-3 grid gap-px overflow-hidden rounded-xl bg-border sm:grid-cols-2">
          {timed.map((row) => (
            <div key={row.key} className="bg-surface px-5 py-5">
              {!sharedLabel && (
                <p className="text-lg font-bold text-muted">{t(row.label, lang)}</p>
              )}
              <p className="text-lg text-body">{row.detail && t(row.detail, lang)}</p>
              <p
                className={`mt-1 text-4xl font-bold tabular-nums ${
                  accent ? "text-accent" : "text-primary"
                }`}
              >
                {formatYen(row.price)}
              </p>
            </div>
          ))}
        </div>

        {extras.length > 0 && (
          <dl className="mt-6 divide-y divide-border border-t border-border">
            {extras.map((row) => (
              <div key={row.key} className="flex items-baseline justify-between gap-4 py-4">
                <dt className="text-lg text-body">{t(row.label, lang)}</dt>
                <dd className="text-lg font-bold tabular-nums text-heading">
                  {formatYen(row.price)}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
