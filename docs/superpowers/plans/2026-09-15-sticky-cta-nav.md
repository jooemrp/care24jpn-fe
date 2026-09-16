# Persistent Navigation and Sticky CTA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep Contact immediately after FAQ in desktop navigation and render a full-width, always-visible phone/request CTA rail on desktop and mobile, including while the mobile menu is open.

**Architecture:** Keep navigation content in the existing CMS-backed `site.nav` contract. Simplify `StickyCta` into deterministic markup with no viewport observer or visibility state; the fixed rail owns its safe-area padding and a permanent flow spacer protects the footer.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Node test runner, React server rendering

---

### Task 1: Lock the navigation order

**Files:**
- Create: `constants/navigation.test.ts`
- Verify: `constants/copy.ts`

- [x] **Step 1: Add the navigation-order regression test**

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { nav } from "./copy";

test("desktop navigation places Contact immediately after FAQ", () => {
  const faqIndex = nav.findIndex((item) => item.href === "/faq");

  assert.notEqual(faqIndex, -1);
  assert.equal(nav[faqIndex + 1]?.href, "/contact");
  assert.deepEqual(nav[faqIndex + 1]?.label, {
    ja: "お問い合わせ",
    en: "Contact Us",
  });
});
```

- [x] **Step 2: Run the navigation test**

Run `node --test constants/navigation.test.ts`.

Expected: PASS because the current source and CMS seed input already contain the client-requested item in the correct order.

### Task 2: Reproduce the conditional/floating CTA defect with a failing test

**Files:**
- Modify: `components/sticky-cta.test.tsx`
- Test: `components/sticky-cta.test.tsx`

- [x] **Step 1: Extend the first sticky CTA test**

Add assertions for `data-sticky-cta`, a full-width fixed rail with `z-[70]`, an equal two-column mobile grid, and minimum 64px mobile controls. Reject `translate-y-full`, `opacity-0`, and the current inset rounded outer card.

```tsx
assert.match(html, /data-sticky-cta="true"/);
assert.match(html, /fixed inset-x-0 bottom-0 z-\[70\] border-t/);
assert.match(html, /grid.*grid-cols-2.*md:grid-cols-/);
assert.match(html, /min-h-16/);
assert.doesNotMatch(html, /translate-y-full|opacity-0/);
assert.doesNotMatch(html, /mx-auto max-w-6xl rounded-2xl bg-primary p-2/);
```

- [x] **Step 2: Run the sticky CTA test and verify RED**

Run `npx tsx --test components/sticky-cta.test.tsx`.

Expected: FAIL at the missing `data-sticky-cta`/full-width rail assertion.

### Task 3: Implement the deterministic full-width CTA rail

**Files:**
- Modify: `components/StickyCta.tsx`
- Test: `components/sticky-cta.test.tsx`

- [x] **Step 1: Remove conditional visibility**

Delete the `useEffect`/`useState` imports, state, observer, scroll listeners, translated hidden classes, and conditional pointer-event classes.

- [x] **Step 2: Replace the outer shell**

Use a permanent spacer and full-width fixed rail:

```tsx
<div
  aria-hidden="true"
  className="h-[calc(4rem+env(safe-area-inset-bottom))] shrink-0 md:h-20"
/>
<aside
  data-sticky-cta
  className="fixed inset-x-0 bottom-0 z-[70] border-t border-white/20 bg-primary-deep pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_-14px_rgba(27,31,94,0.55)]"
>
```

- [x] **Step 3: Build the responsive inner rail**

Use `grid-cols-2` on mobile and `md:grid-cols-[minmax(0,1fr)_minmax(20rem,0.42fr)]` on desktop. Give both links `min-h-16 md:min-h-20`, keep the existing phone/CTA content sources, and retain visible white focus outlines.

- [x] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test constants/navigation.test.ts
npx tsx --test components/sticky-cta.test.tsx
```

Expected: both files PASS with zero failures.

### Task 4: Verify browser behavior and production integrity

**Files:**
- Verify: `components/Navbar.tsx`
- Verify: `components/StickyCta.tsx`
- Verify: `constants/navigation.test.ts`
- Verify: `components/sticky-cta.test.tsx`

- [x] **Step 1: Run project verification**

Run `./node_modules/.bin/eslint .`, `pnpm test`, and `pnpm build`. Each command must exit 0.

- [x] **Step 2: Check desktop at 1440×900**

Confirm Contact is immediately right of FAQ, the bar spans the viewport width, phone and request actions are visible, and underlying content can scroll above the bar.

- [x] **Step 3: Check mobile at 390×844 and 375×667**

Confirm two equal actions, no horizontal overflow, each action is at least 56px tall, safe-area padding is present, and both links are clickable.

- [x] **Step 4: Check the open mobile menu**

Open the hamburger at the top of the page and after scrolling. Confirm the CTA bar remains visible above the menu layer and its bounding box stays aligned to the viewport bottom.

- [x] **Step 5: Capture screenshots and review the diff**

Save desktop and mobile/menu screenshots under `/tmp`, run `git diff --check`, and inspect only the focused implementation/test files for accidental edits.

### Task 5: Refine desktop CTA into the client-reference three-zone composition

**Files:**
- Modify: `components/site-cta-provider.tsx`
- Modify: `components/StickyCta.tsx`
- Modify: `components/sticky-cta.test.tsx`

- [x] **Step 1: Write the failing desktop-composition assertions**

Add the existing CMS phone note to both provider fixtures, then require the rendered desktop-only consultation panel and three-column breakpoint while preserving the mobile two-column grid:

```tsx
contactPhone: {
  display: "0120-001-224",
  tel: "0120001224",
  note: {
    ja: "24時間365日、お気軽にお問い合わせください。",
    en: "Contact us 24 hours a day, 365 days a year.",
  },
},

assert.match(html, /24時間365日、お気軽にお問い合わせください。/);
assert.match(html, /grid-cols-2.*md:grid-cols-\[0\.85fr_1fr_0\.85fr\]/);
assert.match(html, /hidden min-h-20.*md:flex/);
```

- [x] **Step 2: Run the focused test and verify RED**

Run `npx tsx --test components/sticky-cta.test.tsx`.

Expected: FAIL because the provider currently drops `contactPhone.note` and the CTA has only two desktop zones.

- [x] **Step 3: Preserve the CMS phone note in the shared CTA context**

Change both `SiteCtaContextValue.contactPhone` and the `SiteCtaProvider` prop to:

```ts
contactPhone: { display: string; tel: string; note: Bilingual };
```

Change `useSiteContactPhone` to return the same shape. `AppShell` already passes the complete `site.contactPhone` object, so no caller rewrite is required.

- [x] **Step 4: Add the desktop-only consultation zone**

Import `IconHeadset` from `@tabler/icons-react`. Change the inner rail to `grid-cols-2 md:grid-cols-[0.85fr_1fr_0.85fr]`, then place this first child before the phone link:

```tsx
<div className="hidden min-h-20 items-center gap-3 border-r border-white/20 bg-primary-deep px-6 text-white md:flex">
  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10">
    <IconHeadset className="h-5 w-5" stroke={1.9} aria-hidden="true" />
  </span>
  <span className="text-sm font-semibold leading-relaxed">
    {t(contactPhone.note, lang)}
  </span>
</div>
```

Keep the phone and request links unchanged on mobile. At `md` and above, the hidden consultation panel becomes the first of three balanced desktop columns.

- [x] **Step 5: Run focused verification**

Run:

```bash
npx tsx --test components/sticky-cta.test.tsx constants/navigation.test.ts
./node_modules/.bin/eslint components/StickyCta.tsx components/site-cta-provider.tsx components/sticky-cta.test.tsx
```

Expected: all focused tests and lint checks exit 0.

- [x] **Step 6: Verify production and responsive behavior**

Run `pnpm test` and `pnpm build`, then inspect a production build at 1440×900, 1024×768, 390×844, and 375×667.

Expected: desktop shows the consultation message, phone number, and request action without wrapping or overflow; mobile remains the approved equal two-way split; the open mobile menu still leaves the CTA visible.

### Task 6: Trigger the CTA only after the first view

**Files:**
- Modify: `components/StickyCta.tsx`
- Modify: `components/sticky-cta.test.tsx`

- [x] **Step 1: Replace the always-visible assertions with the required initial hidden state**

In the main sticky CTA render test, replace the assertion that rejects hidden classes with:

```tsx
assert.match(html, /aria-hidden="true"/);
assert.match(html, /pointer-events-none translate-y-full opacity-0/);
assert.match(html, /motion-reduce:transition-none/);
```

Keep the assertions for `data-sticky-cta`, `z-[70]`, the desktop three-zone grid, and the mobile two-action structure.

- [x] **Step 2: Run the focused test and verify RED**

Run `npx tsx --test components/sticky-cta.test.tsx`.

Expected: FAIL because the current CTA is rendered visible and has no `aria-hidden` state.

- [x] **Step 3: Add first-view boundary state**

Import `useEffect` and `useState` from React. Initialize `visible` to `false`, then add this effect:

```tsx
useEffect(() => {
  const target =
    document.querySelector("[data-first-view]") ??
    document.querySelector("[data-sticky-cta-sentinel]");
  if (!target) return;

  const updateVisibility = () => {
    setVisible(target.getBoundingClientRect().bottom <= 0);
  };

  updateVisibility();

  if (typeof IntersectionObserver === "undefined") {
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);
    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }

  const observer = new IntersectionObserver(updateVisibility, { threshold: 0 });
  observer.observe(target);
  window.addEventListener("resize", updateVisibility);
  return () => {
    observer.disconnect();
    window.removeEventListener("resize", updateVisibility);
  };
}, []);
```

This observes the real responsive FV height rather than a fixed scroll offset. The shell sentinel remains the fallback target on routes without a home first view.

- [x] **Step 4: Make the rail accessible in both states**

Set `aria-hidden={!visible}` and `inert={!visible}` on the `<aside>`. Add state-dependent transform, opacity, and pointer-event classes:

```tsx
className={`fixed inset-x-0 bottom-0 z-[70] border-t border-white/20 bg-primary-deep pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_28px_-14px_rgba(27,31,94,0.55)] transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${
  visible
    ? "pointer-events-auto translate-y-0 opacity-100"
    : "pointer-events-none translate-y-full opacity-0"
}`}
```

The hidden rail remains outside the viewport and cannot receive mouse, touch, keyboard, or assistive-technology interaction.

- [x] **Step 5: Run focused verification**

Run:

```bash
npx tsx --test components/sticky-cta.test.tsx constants/navigation.test.ts
./node_modules/.bin/eslint components/StickyCta.tsx components/sticky-cta.test.tsx
```

Expected: all focused tests and lint checks exit 0.

- [x] **Step 6: Verify the scroll trigger in production**

Run `pnpm test` and `pnpm build`, then inspect the production build at 1440×900, 390×844, and 375×667.

At each breakpoint, measure the CTA rectangle and state in three positions:

1. Page top: `aria-hidden="true"`, rail top equals viewport height.
2. Past the first-view bottom: `aria-hidden="false"`, rail bottom equals viewport height.
3. Returned to page top: hidden again.

After passing the FV on mobile, open the hamburger menu and confirm the CTA remains visible at the viewport bottom above the menu layer.
