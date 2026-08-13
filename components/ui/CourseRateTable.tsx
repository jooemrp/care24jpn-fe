import { formatYen, type CourseRates } from "@/constants/pricing";
import { t, type Lang } from "@/features/lang/i18n";

type CourseRateTableProps = {
  course: CourseRates;
  lang: Lang;
};

export default function CourseRateTable({ course, lang }: CourseRateTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <table className="w-full text-left text-sm">
        <tbody>
          {course.rows.map((row, i) => (
            <tr
              key={row.key}
              className={i % 2 === 0 ? "bg-surface" : "bg-primary-light/30"}
            >
              <td className="px-6 py-4 align-top text-body">
                <p className="font-medium text-heading">{t(row.label, lang)}</p>
                {row.detail && (
                  <p className="mt-1 text-xs text-muted">{t(row.detail, lang)}</p>
                )}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right align-top font-bold text-heading">
                {formatYen(row.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
