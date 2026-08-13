"use client";

import { useEffect } from "react";

// Standard Next.js error boundary signature — no lang param is available
// here either (errors can occur before params resolve), so the message is
// shown bilingually, matching not-found.tsx.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex-1 flex items-center justify-center px-6 py-24 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-heading mb-2">
          エラーが発生しました
        </h1>
        <p className="text-body mb-8">
          しばらくしてから再度お試しください。
        </p>

        <h2 className="text-2xl font-bold text-heading mb-2">
          Something went wrong
        </h2>
        <p className="text-body mb-10">
          Please try again in a moment.
        </p>

        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
        >
          再試行 / Try again
        </button>
      </div>
    </section>
  );
}
