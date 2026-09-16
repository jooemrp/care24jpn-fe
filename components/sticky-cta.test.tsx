import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StickyCta from "./StickyCta";
import { SiteCtaProvider } from "./site-cta-provider";

test("sticky CTA renders the requested phone and information actions", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      SiteCtaProvider,
      {
        primaryCta: { ja: "無料相談を予約する", en: "Book a free consultation" },
        primaryHref: "/contact",
        contactPhone: {
          display: "0120-001-224",
          tel: "0120001224",
          note: {
            ja: "24時間365日、お気軽にお問い合わせください。",
            en: "Contact us 24 hours a day, 365 days a year.",
          },
        },
        stickyPhoneLabel: { ja: "電話をかける", en: "Call" },
        stickyRequestLabel: { ja: "資料請求", en: "Request information" },
      } as React.ComponentProps<typeof SiteCtaProvider>,
      React.createElement(StickyCta, { lang: "ja" }),
    ),
  );

  assert.match(html, /href="tel:0120001224"/);
  assert.match(html, /0120-001-224/);
  assert.match(html, /電話をかける/);
  assert.match(html, /href="\/contact"/);
  assert.match(html, /資料請求/);
  assert.match(html, /24時間365日、お気軽にお問い合わせください。/);
  assert.match(html, /data-sticky-cta="true"/);
  assert.match(html, /fixed inset-x-0 bottom-0 z-\[70\] border-t/);
  assert.match(html, /grid-cols-2.*md:grid-cols-\[0\.85fr_1fr_0\.85fr\]/);
  assert.match(html, /hidden min-h-20.*md:flex/);
  assert.match(html, /min-h-16/);
  assert.match(html, /data-sticky-cta="true" aria-hidden="true"/);
  assert.match(html, /pointer-events-none translate-y-full opacity-0/);
  assert.match(html, /motion-reduce:transition-none/);
  assert.doesNotMatch(html, /mx-auto max-w-6xl rounded-2xl bg-primary p-2/);
});

test("sticky CTA keeps a published legacy workspace usable before new CMS labels are seeded", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      SiteCtaProvider,
      {
        primaryCta: { ja: "無料相談を予約する", en: "Book a free consultation" },
        primaryHref: "/contact",
        contactPhone: {
          display: "0120-001-224",
          tel: "0120001224",
          note: {
            ja: "24時間365日、お気軽にお問い合わせください。",
            en: "Contact us 24 hours a day, 365 days a year.",
          },
        },
      } as React.ComponentProps<typeof SiteCtaProvider>,
      React.createElement(StickyCta, { lang: "ja" }),
    ),
  );

  assert.match(html, /電話をかける/);
  assert.match(html, /資料請求/);
  assert.doesNotMatch(html, /\[missing:/);
});
