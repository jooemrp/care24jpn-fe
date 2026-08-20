"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { langFromPathname } from "@/features/lang/i18n";

// Standard Next.js error boundary signature (node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/error.md:25-31) — `params`
// is NOT part of it, and errors can occur before the route's params
// resolve anyway. But unlike not-found.tsx (which has no signal at all),
// this file IS "use client" already, so `usePathname()` is available —
// and proxy.ts's rewrite means the pathname it reads is exactly the
// browser-visible URL localizeHref's own rule is written against. See
// langFromPathname's doc comment (features/lang/i18n.ts) for why
// usePathname was chosen over useParams here.
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex-1 flex items-center justify-center px-6 py-24 text-center">
      <div className="max-w-md">
        {lang === "ja" ? (
          <>
            <h1 className="text-2xl font-bold text-heading mb-2">
              エラーが発生しました
            </h1>
            <p className="text-body mb-10">
              しばらくしてから再度お試しください。
            </p>
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              再試行
            </button>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-heading mb-2">
              Something went wrong
            </h1>
            <p className="text-body mb-10">
              Please try again in a moment.
            </p>
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </section>
  );
}
