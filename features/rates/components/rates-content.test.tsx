import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { RatesContent } from "../types";
import type * as RatesContentModule from "./RatesContent.tsx";

const ratesContentPath = "./RatesContent" + ".tsx";
const darkVariant = ["dark", ":"].join("");

const rates: RatesContent = {
  pricing: {
    hero: {
      heading: { ja: "ご利用者様向け料金", en: "Pricing for users" },
      body: { ja: "税込価格です。", en: "All prices include tax." },
    },
    highlights: [{ ja: "登録料無料", en: "Registration is free" }],
    note: { ja: "内容により変動します。", en: "Rates may vary." },
    cancellationLinkLabel: {
      ja: "キャンセルポリシーをご確認ください。",
      en: "See the cancellation policy.",
    },
  },
  fees: {
    hero: {
      heading: { ja: "報酬体系", en: "Supporter rates" },
      body: { ja: "時給表記です。", en: "Hourly rates." },
    },
    columns: {
      service: { ja: "サービス", en: "Service" },
      customer: { ja: "お客様", en: "Customer" },
      supporter: { ja: "サポーター", en: "Supporter" },
    },
    note: { ja: "登録料無料。", en: "Registration is free." },
    ctaHref: "/#contact",
  },
  courseRates: [
    {
      key: "care",
      name: { ja: "介護コース", en: "Caregiving course" },
      rows: [
        {
          key: "day",
          label: { ja: "基本料金", en: "Basic rate" },
          detail: { ja: "日中", en: "Daytime" },
          price: 3740,
        },
      ],
    },
  ],
  supporterRates: [
    {
      key: "care",
      name: { ja: "介護コース", en: "Caregiving course" },
      rows: [
        {
          key: "day",
          label: { ja: "基本料金", en: "Basic rate" },
          detail: { ja: "日中", en: "Daytime" },
          customer: 3740,
          supporter: 2000,
        },
      ],
    },
  ],
};

async function main(): Promise<void> {
  const { PricingRatesContent, FeesRatesContent } = (await import(
    ratesContentPath
  )) as typeof RatesContentModule;

  test("pricing content uses the shared course data and renders bilingual responsive UI", () => {
    const html = renderToStaticMarkup(
      React.createElement(PricingRatesContent, {
        rates,
        lang: "en",
      }),
    );

    assert.match(html, /Pricing for users/);
    assert.match(html, /Caregiving course/);
    assert.match(html, /JPY 3,740/);
    assert.match(html, /lg:grid-cols-2/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });

  test("fees content uses the same customer amount as pricing", () => {
    const html = renderToStaticMarkup(
      React.createElement(FeesRatesContent, {
        rates,
        lang: "en",
        contactCta: { ja: "お問い合わせ", en: "Contact us" },
      }),
    );

    assert.match(html, /Supporter rates/);
    assert.match(html, /Customer/);
    assert.match(html, /JPY 3,740/);
    assert.match(html, /JPY 2,000/);
    assert.match(html, /overflow-x-auto/);
  });

  test("missing rate rows render an explicit empty state and never fabricate zero prices", () => {
    const missingRates: RatesContent = {
      ...rates,
      courseRates: rates.courseRates.map((course) => ({ ...course, rows: [] })),
      supporterRates: rates.supporterRates.map((course) => ({ ...course, rows: [] })),
    };

    const pricingHtml = renderToStaticMarkup(
      React.createElement(PricingRatesContent, {
        rates: missingRates,
        lang: "en",
      }),
    );
    const feesHtml = renderToStaticMarkup(
      React.createElement(FeesRatesContent, {
        rates: missingRates,
        lang: "en",
        contactCta: { ja: "お問い合わせ", en: "Contact us" },
      }),
    );

    assert.match(pricingHtml, /There is no content to display yet\./);
    assert.match(feesHtml, /There is no content to display yet\./);
    assert.doesNotMatch(`${pricingHtml}${feesHtml}`, /JPY 0|¥0/);
  });
}

void main();
