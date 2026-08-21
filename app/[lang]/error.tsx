"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { langFromPathname, t } from "@/features/lang/i18n";
import { useErrorLabels } from "./error-labels-provider";

// Standard Next.js error boundary signature (node_modules/next/dist/docs/
// 01-app/03-api-reference/03-file-conventions/error.md:25-31) — `params`
// is NOT part of it, and errors can occur before the route's params
// resolve anyway. But unlike not-found.tsx (which has no signal at all),
// this file IS "use client" already, so `usePathname()` is available —
// and proxy.ts's rewrite means the pathname it reads is exactly the
// browser-visible URL localizeHref's own rule is written against. See
// langFromPathname's doc comment (features/lang/i18n.ts) for why
// usePathname was chosen over useParams here.
//
// Title/body/retry-button text are CMS-editable (F-1 audit fix) via
// `useErrorLabels()` — see error-labels-provider.tsx's doc comment for why a
// Context Provider (not a prop) is how a Client Component error boundary,
// which `getSite()` cannot reach directly, gets that data from
// `app/[lang]/layout.tsx`. Once the JA/EN copy was pulled out of the JSX
// there was no longer any reason to duplicate the whole `<h1>/<p>/<button>`
// tree per language — `t()` resolves each `Bilingual` value against the
// current `lang`, same as every other bilingual label in this codebase, and
// the rendered HTML per language is unchanged (same tag order, same classes,
// same text content each side previously hardcoded).
export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const pathname = usePathname();
  const lang = langFromPathname(pathname);
  const labels = useErrorLabels();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="flex-1 flex items-center justify-center px-6 py-24 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold text-heading mb-2">
          {t(labels.title, lang)}
        </h1>
        <p className="text-body mb-10">{t(labels.body, lang)}</p>
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-medium text-white transition hover:bg-primary-mid"
        >
          {t(labels.retryLabel, lang)}
        </button>
      </div>
    </section>
  );
}
