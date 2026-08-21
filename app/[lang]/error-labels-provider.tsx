"use client";

import { createContext, useContext, type ReactNode } from "react";
import { errorPage as fallbackErrorPage } from "@/constants/copy";
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
 * 05-server-and-client-components.md:347-351, whose own worked example
 * (`ThemeProvider`, same file, lines 353-398) is the shape this file follows:
 * a `"use client"` module exporting a `createContext`-backed Provider,
 * imported and rendered from a Server Component layout.
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
 * The default export is `constants/copy.ts#errorPage` — the FALLBACK layer,
 * not a placeholder. `getSite()` itself already returns that exact object
 * when Atlas is unreachable (`features/cms/site-map.ts#FALLBACK.errorPage`),
 * so this default only matters for a component that renders
 * `useErrorLabels()` with no `<ErrorLabelsProvider>` ancestor at all (e.g. a
 * future test) — not for the CMS-down path, which already flows through the
 * Provider with fallback data as its `value`.
 */
const ErrorLabelsContext = createContext<SiteContent["errorPage"]>(fallbackErrorPage);

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
  return useContext(ErrorLabelsContext);
}
