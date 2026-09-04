import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { cta, home } from "@/constants/copy";
import type { HomeContent } from "../types";
import type * as HomeContentModule from "./HomeContent.tsx";

const homeContentPath = "./HomeContent" + ".tsx";
const darkVariant = ["dark", ":"].join("");

const content = {
  ...home,
  hero: {
    ...home.hero,
    image: "/images/hero.webp",
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
      }),
    );

    assert.match(html, /Reliable Support,/);
    assert.match(html, /Caregiving course/);
    assert.match(html, /About fees \(tax included\)/);
    assert.match(html, /JPY 3,740 \/ hour~/);
    assert.match(html, /Extensions are available in 1-hour increments\./);
    assert.match(html, /For full pricing details, please click here\./);
    assert.match(html, /href="\/en\/pricing"/);
    assert.match(html, /Examples of use/);
    assert.match(html, /id="contact"/);
    assert.match(html, /hero\.webp/);
    assert.match(html, /target="_blank"/);
    assert.match(html, /rel="noopener noreferrer"/);
    assert.match(html, /md:grid-cols-2/);
    assert.doesNotMatch(html, /CMS content contract is incomplete/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
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
      }),
    );

    assert.match(html, /For full pricing details, please click here\./);
    assert.match(html, /href="\/en\/pricing"/);
  });
}

void main();
