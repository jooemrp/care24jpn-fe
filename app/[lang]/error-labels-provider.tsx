"use client";

import { createContext, useContext, type ReactNode } from "react";
import { CmsContentError } from "@/features/cms/errors";
import type { SiteContent } from "@/features/cms/site";

/**
 * Carries `app/[lang]/error.tsx`'s CMS-editable copy from
 * `app/[lang]/layout.tsx` (a Server Component, which already awaits
 * `getSite()`) down to the error boundary, which is a Client Component and
 * therefore cannot `await` anything itself — the standard error.js signature
 * (node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/
 * error.md:25-31) hands it only `{ error, retry }`, no route `params` and no
 * room for a custom prop.
 *
 * "React context is not supported in Server Components. To use context,
 * create a Client Component that accepts children" — verbatim from
 * node_modules/next/dist/docs/01-app/01-getting-started/
 * 05-server-and-client-components.md:347-351. This file follows that
 * context-backed Provider pattern: a `"use client"` module exporting a
 * `createContext`-backed Provider, imported and rendered from a Server
 * Component layout.
 *
 * SAFE TO RENDER WHENEVER `app/[lang]/error.tsx` RENDERS. `error.md:96`
 * ("[error.js] does not wrap the layout.js ... above it in the same
 * segment. To handle errors in the root layout, use global-error.js") means
 * a failure INSIDE `app/[lang]/layout.tsx` itself (including its own
 * `getSite()` call) never reaches this segment's `error.tsx` at all — it
 * escapes straight to `app/global-error.tsx`. So by the time this error
 * boundary is showing anything, `RootLayout` — and the `<ErrorLabelsProvider>`
 * it renders around `children` — already ran to completion, and the context
 * value below is never the default.
 *
 * There is deliberately no default value. A missing provider is an invalid
 * CMS boundary and throws a typed error instead of silently importing the
 * old constants copy.
 */
const ErrorLabelsContext = createContext<SiteContent["errorPage"] | undefined>(undefined);

export function ErrorLabelsProvider({
  value,
  children,
}: {
  value: SiteContent["errorPage"];
  children: ReactNode;
}) {
  return <ErrorLabelsContext.Provider value={value}>{children}</ErrorLabelsContext.Provider>;
}

export function useErrorLabels(): SiteContent["errorPage"] {
  const value = useContext(ErrorLabelsContext);
  if (!value) {
    throw new CmsContentError(
      "CMS_MISSING_REQUIRED_FIELD",
      'Required CMS field "site.error-page" is unavailable.',
      ["site.error-page"],
      "site",
    );
  }
  return value;
}
