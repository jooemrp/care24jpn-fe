import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { resolve } from "node:path";

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

test("home action and hook use one strict full-page query", () => {
  const action = source("features/home/actions.ts");
  const hooks = source("features/home/hooks.ts");

  assert.match(action, /^"use server";/);
  assert.match(action, /getHomeStrict/);
  assert.match(hooks, /queryKeys\.home/);
  assert.match(hooks, /getHome/);
  assert.doesNotMatch(hooks, /homeHero|homeAbout|homeProblems|homeFlow/);
});

test("homepage route hydrates a server snapshot and keeps the route thin", () => {
  const page = source("app/[lang]/page.tsx");

  assert.match(page, /CmsQueryBoundary/);
  assert.match(page, /queryKeys\.home/);
  assert.match(page, /HomeView/);
  assert.match(page, /getHome/);
  assert.doesNotMatch(page, /<section/);
  assert.doesNotMatch(page, /priority/);
});

test("homepage sections remain focused components", () => {
  const view = source("features/home/components/HomeContent.tsx");

  for (const component of [
    "HomeHeroSection",
    "HomeProblemsSection",
    "HomePricingSection",
    "HomeCoursesSection",
    "HomeExamplesSection",
    "HomeFlowSection",
    "HomeApplySection",
    "HomeContactSection",
  ]) {
    assert.match(view, new RegExp(component));
  }
});
