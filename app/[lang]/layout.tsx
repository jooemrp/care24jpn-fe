import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Noto_Sans_JP } from "next/font/google";
import "../../styles/globals.css";
import AppShell from "@/components/AppShell";
import JsonLd, { organizationJsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/constants/site";
import { isLang } from "@/features/lang/i18n";
import { getSite } from "@/features/cms/site";

// Dashboard edits must appear immediately, with no rebuild — see
// `features/cms/client.ts`'s `cache: "no-store"` on the delivery fetch.
// That option alone only stops the *fetch* from being cached; it does not
// stop Next from prerendering and caching the *route's rendered output* at
// build time (this route has no per-request API, so without this it looks
// static to the build). `dynamic = "force-dynamic"` here forces every
// route under `app/[lang]` to render fresh per request instead, per the
// route segment config docs (`node_modules/next/dist/docs/01-app/02-guides/
// caching-without-cache-components.md`) — this project doesn't use Cache
// Components (no `cacheComponents` flag in next.config.ts), so this is the
// applicable model.
export const dynamic = "force-dynamic";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-sans-jp",
});

export async function generateStaticParams() {
  return [{ lang: "ja" }, { lang: "en" }];
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  const site = await getSite();

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${site.brand.name} — ${site.brand.tagline[lang]}`,
      template: `%s | ${site.brand.name}`,
    },
    description: site.brand.tagline[lang],
    alternates: {
      // "ja" is the default, prefix-less language (see features/lang/i18n.ts).
      canonical: lang === "ja" ? "/" : `/${lang}`,
      languages: {
        ja: "/",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      locale: lang === "ja" ? "ja_JP" : "en_US",
      siteName: site.brand.name,
    },
    icons: {
      icon: "/care24jpn.ico",
    },
  };
}

export default async function RootLayout({
  children,
  params,
}: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();

  // Deduped with the `getSite()` call in generateMetadata above (React
  // cache()) — dedup happens per request, so this is not a second fetch.
  const site = await getSite();

  return (
    <html
      lang={lang}
      className={`${notoSansJP.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-body">
        <JsonLd data={organizationJsonLd(site)} />
        <AppShell lang={lang}>{children}</AppShell>
      </body>
    </html>
  );
}
