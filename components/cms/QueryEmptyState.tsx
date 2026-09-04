import type { HTMLAttributes } from "react";

type QueryEmptyStateProps = Pick<HTMLAttributes<HTMLDivElement>, "className"> & {
  title: string;
  message?: string;
};

export function QueryEmptyState({ title, message, className = "" }: QueryEmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={title}
      className={`w-full rounded-2xl border border-border bg-surface p-8 text-center text-body shadow-sm sm:p-9 md:p-10 ${className}`}
    >
      <p className="font-semibold text-heading">{title}</p>
      {message ? <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p> : null}
    </div>
  );
}

export default QueryEmptyState;
