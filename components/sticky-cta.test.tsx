import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StickyCta from "./StickyCta";
import { SiteCtaProvider } from "./site-cta-provider";

test("sticky CTA renders full-width desktop phone and contact actions", () => {
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
        stickyRequestLabel: { ja: "お問合せ", en: "Contact us" },
        contactCta: { ja: "お問合せ", en: "Contact us" },
        queryStates: {
          loading: { ja: "読み込み中です", en: "Loading" },
          error: { ja: "コンテンツを読み込めませんでした。", en: "We couldn't load this content." },
          retry: { ja: "再試行", en: "Try again" },
          empty: { ja: "表示できるコンテンツがありません。", en: "There is no content to display yet." },
        },
      } as React.ComponentProps<typeof SiteCtaProvider>,
      React.createElement(StickyCta, { lang: "ja" }),
    ),
  );

  assert.match(html, /href="tel:0120001224"/);
  assert.match(html, /0120-001-224/);
  assert.match(html, /電話をかける/);
  assert.match(html, /href="\/contact"/);
  assert.match(html, /お問合せ/);
  assert.doesNotMatch(html, /資料請求/);
  assert.match(html, /24時間365日、お気軽にお問い合わせください。/);
  assert.match(html, /data-sticky-cta="true"/);
  assert.match(html, /fixed inset-x-0 bottom-0 z-\[70\] overflow-x-clip border-t/);
  assert.match(
    html,
    /mx-auto grid w-full max-w-6xl grid-cols-2.*md:grid-cols-\[0\.85fr_1fr_0\.85fr\]/,
  );
  assert.match(html, /hidden min-h-20.*md:flex/);
  assert.match(html, /min-h-16/);
  assert.match(html, /md:border-l md:border-white\/25.*md:shadow-\[inset_0_1px_0_rgba\(255,255,255,0\.16\)\]/);
  assert.match(html, /after:left-full.*after:w-screen.*after:bg-accent-deep/);
  assert.match(html, /data-sticky-cta="true" aria-hidden="true"/);
  assert.match(html, /pointer-events-none translate-y-full opacity-0/);
  assert.match(html, /motion-reduce:transition-none/);
  assert.doesNotMatch(html, /mx-auto max-w-6xl rounded-2xl bg-primary p-2/);
});

test("sticky CTA fails closed when the API omits a required label", () => {
  assert.throws(() =>
    renderToStaticMarkup(
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
          queryStates: {
            loading: { ja: "読み込み中です", en: "Loading" },
            error: { ja: "コンテンツを読み込めませんでした。", en: "We couldn't load this content." },
            retry: { ja: "再試行", en: "Try again" },
            empty: { ja: "表示できるコンテンツがありません。", en: "There is no content to display yet." },
          },
        } as React.ComponentProps<typeof SiteCtaProvider>,
        React.createElement(StickyCta, { lang: "ja" }),
      ),
    ),
  );
});
