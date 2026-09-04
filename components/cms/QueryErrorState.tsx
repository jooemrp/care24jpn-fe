"use client";

import type { HTMLAttributes } from "react";

type QueryErrorStateProps = Pick<HTMLAttributes<HTMLDivElement>, "className"> & {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  title?: string;
};

export function QueryErrorState({
  message,
  retryLabel,
  onRetry,
  title,
  className = "",
}: QueryErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`w-full rounded-2xl border border-danger-border bg-danger-bg px-6 py-8 text-danger-text shadow-sm sm:px-8 sm:py-9 md:p-10 ${className}`}
    >
      <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
        <div>
          {title ? <p className="font-bold">{title}</p> : null}
          <p className={title ? "mt-1 text-sm leading-relaxed" : "text-sm leading-relaxed"}>
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={onRetry}
          aria-label={retryLabel}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-danger-border bg-surface px-5 py-2.5 text-sm font-semibold text-danger-text transition hover:bg-danger-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger-text"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

export default QueryErrorState;
