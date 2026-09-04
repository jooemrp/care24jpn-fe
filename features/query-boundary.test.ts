import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

const clientModules = [
  "features/use-case/hooks.ts",
  "features/use-case/components/use-case-view.tsx",
  "features/use-case/components/use-case-content.tsx",
  "features/service-flow/hooks.ts",
  "features/service-flow/components/service-flow-view.tsx",
  "features/service-flow/components/service-flow-content.tsx",
  "features/company/hooks.ts",
  "features/company/components/company-view.tsx",
  "features/company/components/company-content.tsx",
];

test("client query modules contain no server-only imports or Atlas secrets", () => {
  for (const relativePath of clientModules) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.doesNotMatch(
      source,
      /server-only|features\/cms\/client|@\/lib\/bff|process\.env|ATLAS_API_KEY|ATLAS_BASE_URL|@latellu\/atlas-sdk/,
    );
  }
});

test("feature actions are the only server boundary for query reads", () => {
  for (const relativePath of [
    "features/use-case/actions.ts",
    "features/service-flow/actions.ts",
    "features/company/actions.ts",
  ]) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.match(source, /^"use server";/);
  }
});

test("CmsQueryBoundary keeps its stable server hydration contract", () => {
  const source = readFileSync(
    resolve(process.cwd(), "components/query/CmsQueryBoundary.tsx"),
    "utf8",
  );

  assert.match(source, /export default async function CmsQueryBoundary/);
  assert.match(source, /queryKey:\s*readonly unknown\[\]/);
  assert.match(source, /queryFn:\s*\(\)\s*=>\s*Promise<unknown>/);
  assert.match(source, /children:\s*ReactNode/);
  assert.match(source, /queryClient\.prefetchQuery/);
  assert.match(source, /dehydrate\(queryClient\)/);
  assert.match(source, /<HydrationBoundary state=\{dehydrate\(queryClient\)\}>/);
});

test("simple CMS pages are thin server-prefetched route shells", () => {
  const routes = [
    {
      path: "app/[lang]/use-case/page.tsx",
      key: "useCase",
      loader: "getUseCaseContent",
      view: "UseCaseView",
    },
    {
      path: "app/[lang]/service-flow/page.tsx",
      key: "serviceFlow",
      loader: "getServiceFlowContent",
      view: "ServiceFlowView",
    },
    {
      path: "app/[lang]/company/page.tsx",
      key: "company",
      loader: "getCompanyContent",
      view: "CompanyView",
    },
  ] as const;

  for (const route of routes) {
    const source = readFileSync(resolve(process.cwd(), route.path), "utf8");
    assert.match(source, /CmsQueryBoundary/);
    assert.match(
      source,
      new RegExp(
        `import\\s*\\{\\s*${route.loader}\\s*\\}\\s*from\\s*["']@/features/cms/pages["']`,
      ),
    );
    assert.match(source, new RegExp(`queryKey=\\{queryKeys\\.${route.key}\\}`));
    assert.match(source, new RegExp(`queryFn=\\{\\(\\) => ${route.loader}\\(\\)\\}`));
    assert.match(source, new RegExp(`<${route.view}\\s+lang=\\{lang\\}`));
    assert.doesNotMatch(source, /getSite/);
    assert.doesNotMatch(source, /<Section|<StepFlow|<Image|<Link/);
  }
});

test("client navigation keeps the current page until the prefetched route commits", () => {
  const appShell = readFileSync(resolve(process.cwd(), "components/AppShell.tsx"), "utf8");
  const layout = readFileSync(resolve(process.cwd(), "app/[lang]/layout.tsx"), "utf8");

  assert.doesNotMatch(appShell, /async function AppShell/);
  assert.doesNotMatch(appShell, /getSite|getLegalHeading/);
  assert.match(appShell, /SiteCtaProvider/);
  assert.match(layout, /<AppShell[\s\S]*site=\{site\}[\s\S]*tokushohoHeading=\{tokushohoHeading\}/);
  assert.equal(
    existsSync(resolve(process.cwd(), "app/[lang]/loading.tsx")),
    false,
    "route navigation must keep the current page until the prefetched route commits",
  );
});

test("shared shell uses strict CMS content for footer and JSON-LD inputs", () => {
  const layout = readFileSync(resolve(process.cwd(), "app/[lang]/layout.tsx"), "utf8");
  const appShell = readFileSync(resolve(process.cwd(), "components/AppShell.tsx"), "utf8");
  const footer = readFileSync(resolve(process.cwd(), "components/Footer.tsx"), "utf8");
  const jsonLd = readFileSync(resolve(process.cwd(), "components/JsonLd.tsx"), "utf8");
  const pageMetadata = readFileSync(
    resolve(process.cwd(), "features/seo/pageMetadata.ts"),
    "utf8",
  );
  const legalDocPage = readFileSync(
    resolve(process.cwd(), "components/LegalDocPage.tsx"),
    "utf8",
  );

  assert.match(layout, /getHome/);
  assert.match(layout, /homeContact=\{home\.contact\}/);
  assert.match(appShell, /homeContact/);
  assert.match(footer, /homeContact\.isoLogo/);
  assert.doesNotMatch(footer, /ISO_LOGO_SRC|from ["']@\/constants\/copy/);
  assert.match(jsonLd, /getCompanyContent/);
  assert.doesNotMatch(jsonLd, /fallbackCompany|from ["']@\/constants\/copy/);
  assert.match(pageMetadata, /getPageMetaStrict/);
  assert.doesNotMatch(pageMetadata, /fallbackOgImage/);
  assert.doesNotMatch(legalDocPage, /tocLabel\?|目次|Table of Contents/);
});

test("hydrated query views keep content visible during background refetch", () => {
  const viewContracts = [
    {
      path: "features/use-case/components/use-case-view.tsx",
      loadingComponent: "UseCaseLoadingState",
    },
    {
      path: "features/service-flow/components/service-flow-view.tsx",
      loadingComponent: "ServiceFlowLoadingState",
    },
    {
      path: "features/company/components/company-view.tsx",
      loadingComponent: "CompanyLoadingState",
    },
    {
      path: "features/rates/components/RatesView.tsx",
      loadingComponent: "RatesLoadingState",
    },
    {
      path: "features/home/components/HomeView.tsx",
      loadingComponent: "HomeLoadingState",
    },
  ] as const;

  for (const { path, loadingComponent } of viewContracts) {
    const source = readFileSync(resolve(process.cwd(), path), "utf8");
    assert.match(source, /query\.isPending/);
    assert.doesNotMatch(source, /query\.isFetching/);
    assert.match(source, new RegExp(loadingComponent));
  }
});

test("CMS-backed views never substitute bundled content", () => {
  for (const relativePath of [
    "features/home/components/HomeContent.tsx",
    "features/rates/components/RatesContent.tsx",
    "features/service-flow/components/service-flow-view.tsx",
    "features/use-case/components/use-case-view.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.doesNotMatch(source, /fallbackCta|sitePrimaryCta\s*\?\?/);
  }
});

test("shared CMS CTA context fails closed without a default bundle value", () => {
  const provider = readFileSync(
    resolve(process.cwd(), "components/site-cta-provider.tsx"),
    "utf8",
  );
  assert.match(provider, /CmsContentError/);
  assert.doesNotMatch(provider, /createContext<[^>]+>\(null\)/);
});

test("route error labels fail closed without a constants default", () => {
  const provider = readFileSync(
    resolve(process.cwd(), "app/[lang]/error-labels-provider.tsx"),
    "utf8",
  );
  assert.match(provider, /CmsContentError/);
  assert.doesNotMatch(provider, /fallbackErrorPage|createContext<[^>]+>\([^)]*fallback/);
});

test("global error stays an emergency diagnostic without bundled page copy", () => {
  const globalError = readFileSync(resolve(process.cwd(), "app/global-error.tsx"), "utf8");
  assert.doesNotMatch(globalError, /@\/constants\/copy|errorPage/);
  assert.match(globalError, /error\.message/);
});

test("rates content does not render an un-migrated constants label", () => {
  const ratesContent = readFileSync(
    resolve(process.cwd(), "features/rates/components/RatesContent.tsx"),
    "utf8",
  );
  assert.doesNotMatch(
    ratesContent,
    /from ["']@\/constants\/pricing["'][^;\n]*cancellationLinkLabel/,
  );
  assert.match(ratesContent, /rates\.pricing\.cancellationLinkLabel/);
});

test("light semantic tokens and query states avoid theme switching", () => {
  const css = readFileSync(resolve(process.cwd(), "styles/globals.css"), "utf8");
  const tableOfContents = readFileSync(
    resolve(process.cwd(), "components/TableOfContents.tsx"),
    "utf8",
  );
  const providers = readFileSync(resolve(process.cwd(), "components/providers.tsx"), "utf8");
  const darkVariant = ["dark", ":"].join("");
  const darkSelector = [".", "dark"].join("");
  const themeProvider = ["Theme", "Provider"].join("");
  const themeContext = ["Theme", "Context"].join("");
  const themeHook = ["use", "Theme"].join("");
  const systemThemeQuery = ["prefers", "color-scheme"].join("-");
  const themeDataAttribute = ["data", "theme"].join("-");

  assert.match(css, /:root\s*\{\s*color-scheme:\s*light;/);
  assert.match(css, /--color-danger-bg/);
  assert.doesNotMatch(css, /@custom-variant/);
  assert.doesNotMatch(css, new RegExp(systemThemeQuery));
  assert.doesNotMatch(css, new RegExp(themeDataAttribute));
  assert.doesNotMatch(css, new RegExp(`${darkSelector}\\s*\\{`));
  assert.doesNotMatch(providers, new RegExp(`${themeProvider}|${themeContext}|${themeHook}`));
  assert.match(providers, /QueryClientProvider/);
  assert.match(tableOfContents, /bg-surface/);
  assert.doesNotMatch(tableOfContents, /bg-white/);

  for (const relativePath of [
    "components/cms/QueryLoadingState.tsx",
    "components/cms/QueryErrorState.tsx",
    "components/cms/QueryEmptyState.tsx",
  ]) {
    const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");
    assert.doesNotMatch(source, new RegExp(`${darkVariant}(?:bg|border|text)-`));
  }
});
