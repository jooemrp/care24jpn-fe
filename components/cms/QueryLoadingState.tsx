import type { HTMLAttributes, ReactNode } from "react";

type QueryLoadingStateProps = Pick<HTMLAttributes<HTMLDivElement>, "className"> & {
  label: string;
  children?: ReactNode;
};

export type SkeletonProps = Pick<HTMLAttributes<HTMLSpanElement>, "className">;

/**
 * Semantic loading wrapper for client-owned CMS states.
 *
 * The page-specific skeleton is supplied by each feature view. The default
 * keeps the primitive useful for small query surfaces without bringing back a
 * spinner or a route-level overlay.
 */
export function QueryLoadingState({
  label,
  children,
  className = "",
}: QueryLoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={label}
      className={`w-full rounded-2xl border border-border bg-surface px-6 py-10 text-body shadow-sm sm:px-8 md:min-h-56 md:py-12 ${className}`}
    >
      <span className="sr-only">{label}</span>
      {children ?? (
        <div className="flex min-h-24 items-center justify-center">
          <Skeleton className="h-4 w-32" />
        </div>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`block rounded-lg bg-primary-light motion-safe:animate-pulse ${className}`}
    />
  );
}

export default QueryLoadingState;
