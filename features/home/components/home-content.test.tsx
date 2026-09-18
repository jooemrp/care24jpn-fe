import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cta, home } from "@/constants/copy";
import type { HomeContent } from "../types";
import type * as HomeContentModule from "./HomeContent.tsx";
import { splitBilingual } from "./home-copy";

const homeContentPath = "./HomeContent" + ".tsx";
const darkVariant = ["dark", ":"].join("");

const content = {
  ...home,
  hero: {
    ...home.hero,
    image: "/images/revision/_hero-preview.png",
  },
  about: {
    ...home.about,
    illustration: "/images/about-family.png",
    cards: home.about.cards.map((card, index) => ({
      ...card,
      image: `/images/about-${index}.png`,
    })),
  },
  problems: {
    ...home.problems,
    items: home.problems.items.map((item, index) => ({
      ...item,
      image: `/images/problem-${index}.png`,
    })),
  },
  careCourse: {
    ...home.careCourse,
    cards: home.careCourse.cards.map((card, index) => ({
      ...card,
      image: `/images/care-${index}.webp`,
    })),
  },
  flow: {
    ...home.flow,
    steps: home.flow.steps.map((step, index) => ({
      number: step.number,
      title: step.title,
      body: step.body,
      image: `/images/flow-${index}.webp`,
    })),
  },
  apply: {
    ...home.apply,
    consult: {
      ...home.apply.consult,
      illustration: "/images/consult-family.png",
    },
  },
  contact: {
    ...home.contact,
    micsLogo: "/images/mics-logo.png",
    isoLogo: "/images/iso27001-bsi.png",
  },
  pricingDetailsHref: "/pricing",
} as unknown as HomeContent;

async function main(): Promise<void> {
  const { HomeContentView } = (await import(homeContentPath)) as typeof HomeContentModule;

  test("populated homepage keeps bilingual content, safe CTA handling, and responsive sections", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(html, /Reliable Support,/);
    assert.match(html, /Caregiving course/);
    assert.match(html, /About fees \(tax included\)/);
    assert.match(html, /JPY 3,740 \/ hour~/);
    assert.match(html, /Extensions are available in 1-hour increments\./);
    assert.match(html, /For full pricing details, please click here\./);
    assert.match(html, /href="\/en\/pricing"/);
    assert.match(html, /Payment is made by bank transfer \(in advance\)\./);
    assert.match(html, /Bank transfer/);
    assert.match(html, /inline-flex w-fit/);
    assert.doesNotMatch(html, /min-h-28|min-h-32/);
    assert.doesNotMatch(html, /payment-visa|payment-mastercard|payment-jcb|payment-amex/);
    assert.match(html, /A written order from your attending physician is required to use this service\./);
    assert.match(
      html,
      /As needed, we coordinate with care managers, social workers, and long-term care insurance providers to deliver safe, appropriate care\./,
    );
    assert.ok(
      html.indexOf("A written order from your attending physician is required to use this service.") >
        html.indexOf("Coordination with medical institutions"),
      "the nursing medical directive should follow the feature list",
    );
    assert.match(html, /nursing-directive/);
    assert.match(
      html,
      /mt-10 flex items-start gap-3 rounded-2xl border border-accent\/25 bg-accent-light/,
    );
    assert.doesNotMatch(html, /written instructions are strictly required/);
    assert.doesNotMatch(html, /border-2 border-accent/);
    assert.doesNotMatch(html, /bg-note/);
    assert.match(html, /Please feel free to contact us first/);
    assert.match(
      html,
      /<h2 class="text-2xl font-bold text-heading \[text-wrap:balance\] md:text-3xl">/,
    );
    assert.match(html, /Examples of use/);
    assert.match(html, /id="contact"/);
    assert.match(html, /_hero-preview\.png/);
    assert.match(html, /object-\[58%_42%\] md:object-\[58%_center\]/);
    assert.match(html, /w-full max-w-none whitespace-pre-line text-left text-\[11px\].*max-\[350px\]:text-\[9px\]/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /md:grid-cols-2/);
    assert.match(
      html,
      /max-w-6xl grid-cols-1 gap-y-8 md:grid-cols-\[minmax\(0,1fr\)_auto_minmax\(0,1fr\)_auto_minmax\(0,1fr\)_auto_minmax\(0,1fr\)\]/,
    );
    assert.match(html, /text-sm leading-relaxed text-body \[text-wrap:balance\] lg:max-w-\[18rem\] lg:text-\[13px\]/);
    assert.match(html, /data-first-view/);
    assert.match(html, /xl:aspect-2\/1/);
    assert.match(html, /xl:min-h-\[48rem\]/);
    assert.match(html, /2xl:min-h-\[56rem\]/);
    assert.match(
      html,
      /md:min-h-\[36rem\].*lg:min-h-\[42rem\].*xl:min-h-\[48rem\].*2xl:min-h-\[min\(70vh,56rem\)\]/,
    );
    assert.doesNotMatch(html, /min-h-\[calc\(100dvh/);
    assert.doesNotMatch(html, /min-h-\[100dvh\]/);
    assert.doesNotMatch(html, /Credit card/);
    assert.doesNotMatch(html, /クレジットカード/);
    assert.doesNotMatch(html, /定期の方は指名無料/);
    assert.doesNotMatch(html, /こちらから/);
    assert.match(html, /lg:grid-cols-\[minmax\(0,7fr\)_minmax\(0,3fr\)\]/);
    assert.doesNotMatch(html, /CMS content contract is incomplete/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });

  test("mobile hero uses an editorial media frame and clear conversion hierarchy", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(html, /data-hero-media="true"/);
    assert.match(
      html,
      /mx-4 mt-3 aspect-video.*rounded-\[1\.5rem_1\.5rem_4\.5rem_1\.5rem\].*md:absolute.*md:m-0.*md:rounded-none/,
    );
    assert.match(html, /object-\[58%_42%\] md:object-\[58%_center\]/);
    assert.match(html, /hidden.*bg-linear-to-r.*md:block/);
    assert.match(html, /data-hero-copy="true"/);
    assert.match(html, /data-hero-accent="true"/);
    assert.match(html, /data-hero-area="true"/);
    assert.match(html, /border-l-2 border-primary/);
    assert.match(html, /data-hero-cta="true"/);
    assert.match(html, /w-full min-h-14 justify-between rounded-2xl/);
    assert.match(html, /focus-visible:outline-2/);
    assert.match(html, /data-about-intro="true"/);
    assert.doesNotMatch(html, /min-h-\[30rem\]/);
    assert.match(
      html,
      /order-2 flex w-full max-w-sm.*md:order-2.*data-hero-area/,
      "mobile should visually place the supported area after the CTA",
    );
    assert.match(
      html,
      /order-1 inline-flex w-full min-h-14.*md:order-1.*data-hero-cta/,
      "mobile should visually place the CTA before the supported area",
    );
  });

  test("homepage sections show explicit empty states without hiding the rest of the page", () => {
    const emptyContent = {
      ...content,
      problems: { ...content.problems, items: [] },
      examples: { ...content.examples, cases: [] },
      flow: { ...content.flow, steps: [] },
    } as HomeContent;

    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content: emptyContent,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(html, /Reliable Support,/);
    assert.match(html, /There is no content to display yet\./);
    assert.match(html, /id="contact"/);
  });

  test("homepage tolerates intentionally empty hero copy from CMS", () => {
    const contentWithoutOptionalHeroCopy = {
      ...content,
      hero: {
        ...content.hero,
        body: undefined,
        ctaSecondary: undefined,
      },
    } as HomeContent;

    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content: contentWithoutOptionalHeroCopy,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(html, /Reliable Support,/);
    assert.doesNotMatch(html, /undefined/);
  });

  test("course and pricing sections keep the CMS pricing details link", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(html, /For full pricing details, please click here\./);
    assert.match(html, /href="\/en\/pricing"/);
  });

  test("bottom apply banners drop から, keep titles on one line, and read the job-seeker eyebrow clearly", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "ja",
        contactCta: cta.contact,
        emptyLabel: "表示できるコンテンツがありません。",
      }),
    );

    assert.match(html, /お申込みはこちら/);
    assert.match(html, /登録はこちら/);
    assert.match(html, /お仕事を希望される方/);
    assert.doesNotMatch(html, /こちらから/);
    assert.match(
      html,
      /col-start-1 row-start-1 self-end text-base font-semibold leading-relaxed text-white/,
    );
    assert.doesNotMatch(
      html,
      /col-start-1 row-start-1 self-end text-sm font-medium leading-relaxed text-white\/90/,
    );
    assert.match(
      html,
      /col-start-1 row-start-2 self-end whitespace-nowrap text-2xl font-bold leading-tight tracking-tight md:text-\[1\.875rem\]/,
    );
  });

  test("Japanese revision copy keeps API-owned mobile wording and line breaks", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "ja",
        contactCta: cta.contact,
        emptyLabel: "表示できるコンテンツがありません。",
      }),
    );

    assert.match(
      html,
      /md:hidden whitespace-pre-line[^>]*>ご相談・お見積りは無料です。あなたやご家族の\n「困った」を私たちがサポートします。<\/span>/,
    );
    assert.match(html, /mx-auto mt-3 max-w-2xl text-\[13px\] leading-relaxed text-body md:text-lg/);
    assert.match(
      html,
      /md:hidden whitespace-pre-line[^>]*>お支払いは\n銀行振込（前払い）となります。<\/span>/,
    );
    assert.match(
      html,
      /mt-3 break-keep whitespace-pre-line text-base leading-relaxed text-body md:text-sm/,
    );
    assert.match(
      html,
      /md:hidden whitespace-pre-line[^>]*>詳しくはこちら（料金ページ）を\nご確認ください。<\/span>/,
    );
    assert.match(
      html,
      /md:hidden whitespace-pre-line[^>]*>ご利用には主治医からの\n指示書が必要です。<\/span>/,
    );
    assert.match(
      html,
      /md:hidden whitespace-pre-line[^>]*>必要に応じて、ケアマネージャーや\nソーシャルワーカー、介護保険\nサービス事業所と連携し、\n安全で適切なケアを行います。<\/span>/,
    );
    assert.match(html, /class="h-14 w-14 shrink-0 sm:h-24 sm:w-24 md:h-28 md:w-28"/);
    assert.match(html, /サービスをご利用の方/);
    assert.match(
      html,
      /whitespace-pre-line \[text-wrap:balance\] text-center text-2xl font-bold leading-snug text-heading md:text-3xl/,
      "mobile nursing heading should balance wrapped Japanese lines",
    );
    assert.match(
      html,
      /col-start-1 row-start-1 self-end text-base font-semibold leading-relaxed text-white \[text-wrap:balance\]/,
      "mobile apply eyebrow should balance instead of leaving a single character",
    );
    assert.doesNotMatch(html, />処</);
    assert.doesNotMatch(html, />方</);
    assert.doesNotMatch(html, />箋</);
  });

  test("English medical note keeps the explanatory paragraph out of the mobile heading", () => {
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );

    assert.match(
      html,
      /md:hidden whitespace-pre-line">A written order from your attending physician is required to use this service\.<\/span>/,
    );
    assert.match(
      html,
      /<p class="mt-2 text-\[13px\] leading-relaxed text-body md:text-base"><span class="md:hidden whitespace-pre-line">As needed, we coordinate with care managers, social workers, and long-term care insurance providers to deliver safe, appropriate care\.<\/span>/,
    );
  });

  test("CMS medical wording stays untouched and locale heading counts stay independent", () => {
    const custom = { ja: "カスタム見出し\nカスタム本文", en: "Custom heading\nCustom body" };

    assert.deepEqual(
      splitBilingual(
        { ja: "日本語見出し1\n日本語見出し2\n日本語本文", en: "English heading\nEnglish body" },
        { ja: 2, en: 1 },
      ),
      {
        heading: { ja: "日本語見出し1\n日本語見出し2", en: "English heading" },
        body: { ja: "日本語本文", en: "English body" },
      },
    );

    const customContent = {
      ...content,
      nursingCourse: { ...content.nursingCourse, medicalNote: custom, medicalNoteMobile: custom },
    } as HomeContent;
    const html = renderToStaticMarkup(
      React.createElement(HomeContentView, {
        content: customContent,
        lang: "en",
        contactCta: cta.contact,
        emptyLabel: "There is no content to display yet.",
      }),
    );
    assert.match(html, /md:hidden whitespace-pre-line">Custom heading<\/span>/);
    assert.match(
      html,
      /<p class="mt-2 text-\[13px\] leading-relaxed text-body md:text-base"><span class="md:hidden whitespace-pre-line">Custom body<\/span>/,
    );
  });
}

void main();
