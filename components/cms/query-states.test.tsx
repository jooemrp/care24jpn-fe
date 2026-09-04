import assert from "node:assert/strict";
import { test } from "node:test";
import React, { type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as QueryStatesModule from "./QueryLoadingState.tsx";
import type * as QueryErrorStateModule from "./QueryErrorState.tsx";
import type * as QueryEmptyStateModule from "./QueryEmptyState.tsx";

const loadingPath = "./QueryLoadingState" + ".tsx";
const errorPath = "./QueryErrorState" + ".tsx";
const emptyPath = "./QueryEmptyState" + ".tsx";
const darkVariant = ["dark", ":"].join("");

function findButton(node: unknown): ReactElement<{ onClick?: () => void }> | null {
  if (!React.isValidElement(node)) return null;
  if (node.type === "button") {
    return node as ReactElement<{ onClick?: () => void }>;
  }

  const props = node.props as { children?: React.ReactNode };
  for (const child of React.Children.toArray(props.children)) {
    const button = findButton(child);
    if (button) return button;
  }
  return null;
}

async function main(): Promise<void> {
  const { QueryLoadingState, Skeleton } = (await import(loadingPath)) as typeof QueryStatesModule;
  const { QueryErrorState } = (await import(errorPath)) as typeof QueryErrorStateModule;
  const { QueryEmptyState } = (await import(emptyPath)) as typeof QueryEmptyStateModule;

  test("loading state is semantic, responsive, and skeleton-shaped", () => {
    const html = renderToStaticMarkup(
      React.createElement(
        QueryLoadingState,
        { label: "Loading use cases" },
        React.createElement(Skeleton, { className: "h-4 w-32" }),
      ),
    );

    assert.match(html, /role="status"/);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /Loading use cases/);
    assert.match(html, /w-full/);
    assert.match(html, /bg-primary-light/);
    assert.match(html, /motion-safe:animate-pulse/);
    assert.doesNotMatch(html, /animate-spin/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });

  test("error state exposes a retry action and an alert role", () => {
    let retries = 0;
    const props = {
      message: "The CMS is unavailable.",
      retryLabel: "Retry loading",
      onRetry: () => {
        retries += 1;
      },
    };
    const element = QueryErrorState(props);
    const html = renderToStaticMarkup(element);

    assert.match(html, /role="alert"/);
    assert.match(html, /aria-live="assertive"/);
    assert.match(html, /The CMS is unavailable\./);
    assert.match(html, /Retry loading/);
    assert.match(html, /min-h-11/);
    assert.match(html, /border-danger-border/);
    assert.match(html, /bg-danger-bg/);
    assert.doesNotMatch(html, new RegExp(darkVariant));

    const button = findButton(element);
    assert.ok(button);
    button.props.onClick?.();
    assert.equal(retries, 1);
  });

  test("empty state communicates an empty result on mobile and desktop", () => {
    const html = renderToStaticMarkup(
      React.createElement(QueryEmptyState, {
        title: "No use cases yet",
        message: "Please check again later.",
      }),
    );

    assert.match(html, /role="status"/);
    assert.match(html, /No use cases yet/);
    assert.match(html, /Please check again later\./);
    assert.match(html, /md:p-10/);
    assert.match(html, /bg-surface/);
    assert.doesNotMatch(html, new RegExp(darkVariant));
  });
}

void main();
