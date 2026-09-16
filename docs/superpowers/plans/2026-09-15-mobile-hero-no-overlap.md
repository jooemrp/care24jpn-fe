# Mobile Hero Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the literal stacked mobile hero with an editorial photo frame, clearer information hierarchy, a stronger primary CTA, and a polished transition into the Care24Japan introduction while keeping all copy off the photograph.

**Architecture:** Keep one responsive `HomeHeroSection` and one optimized image. Mobile-only utilities create the inset 16:9 media card and editorial content hierarchy; `md:` utilities restore the established desktop background hero. `HomeAboutSection` owns its custom introductory heading treatment so the hero does not need to know about the next section.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS 4, Node test runner, React server rendering

---

### Task 1: Lock the editorial mobile structure with a failing regression test

**Files:**
- Modify: `features/home/components/home-content.test.tsx`
- Test: `features/home/components/home-content.test.tsx`

- [x] **Step 1: Replace the earlier mobile-hero assertions with the new contract**

Require `data-hero-copy`, `data-hero-accent`, `data-hero-area`, `data-hero-cta`, and `data-about-intro` in addition to the existing media marker. Require the media frame to use mobile inset margins, a 16:9 ratio, asymmetric rounding, and desktop reset utilities. Require the CTA to be full-width and at least 56px tall on mobile, and retain the area-before-CTA DOM assertion.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx tsx --test features/home/components/home-content.test.tsx
```

Expected: FAIL because the current markup does not have the editorial structure markers or styling contract.

### Task 2: Implement the mobile editorial hero

**Files:**
- Modify: `features/home/components/HomeHeroSection.tsx`
- Test: `features/home/components/home-content.test.tsx`

- [x] **Step 1: Convert the media wrapper into the editorial card**

Use this responsive shell while preserving the existing `Image` and focal position:

```tsx
<div
  className="relative mx-4 mt-3 aspect-video overflow-hidden rounded-[1.5rem_1.5rem_4.5rem_1.5rem] shadow-[0_18px_50px_-32px_rgba(27,31,94,0.5)] md:absolute md:inset-0 md:m-0 md:-z-20 md:aspect-auto md:rounded-none md:shadow-none"
  data-hero-media
>
```

- [x] **Step 2: Establish a dedicated copy region and display hierarchy**

Add `data-hero-copy` to the mobile content region, add a short `data-hero-accent` blue rule before the H1, and use a compact mobile display size with the existing `md:text-5xl` desktop size.

- [x] **Step 3: Restyle the supported area as metadata**

Add `data-hero-area` and replace the large bordered pill with a simple left-accented row. Retain the pin icon, main label, expansion note, and `order-1 md:order-2` behavior.

- [x] **Step 4: Make the CTA the single clear mobile action**

Add `data-hero-cta`, `w-full`, `min-h-14`, `justify-between`, `rounded-2xl`, accessible `focus-visible` styles, and the AA-safe `bg-accent-deep` mobile fill. Restore the existing desktop pill and accent fill through `md:` utilities.

- [x] **Step 5: Run the focused test and verify GREEN**

Run:

```bash
npx tsx --test features/home/components/home-content.test.tsx
```

Expected: all tests in the file PASS.

### Task 3: Refine the transition into the About introduction

**Files:**
- Modify: `features/home/components/HomeAboutSection.tsx`
- Test: `features/home/components/home-content.test.tsx`

- [x] **Step 1: Render the About heading inside the component**

Remove the generic `heading` prop from `Section`, add a `data-about-intro` header containing a mobile-only short blue rule and the existing localized heading in an `h2`, and preserve the desktop 3xl heading size and spacing.

- [x] **Step 2: Keep the first service explanation compact**

Use a 1.75rem mobile About heading, retain 16px minimum body text, and avoid adding containers, new copy, or decorative imagery above the existing cards.

- [x] **Step 3: Re-run the focused test**

Run:

```bash
npx tsx --test features/home/components/home-content.test.tsx
```

Expected: all tests PASS.

### Task 4: Verify quality and responsive behavior

**Files:**
- Verify: `features/home/components/HomeHeroSection.tsx`
- Verify: `features/home/components/HomeAboutSection.tsx`
- Verify: `features/home/components/home-content.test.tsx`

- [x] **Step 1: Run static checks and the complete suite**

Run `./node_modules/.bin/eslint .`, `pnpm test`, and `pnpm build`. Each command must exit 0.

- [x] **Step 2: Inspect mobile geometry at 375×667 and 390×844**

Confirm `media.bottom <= h1.top`, the photo shows both people, the CTA is at least 44px tall, there is no horizontal overflow, and `Care24Japanとは` is reachable within one short scroll.

- [x] **Step 3: Inspect desktop at 1440×900**

Confirm the media returns to an edge-to-edge absolute background, the headline remains on the low-detail side, and the existing desktop CTA/area ordering is preserved.

- [x] **Step 4: Capture the requested mobile screenshot**

Save a final 390×844 production-build screenshot to `/tmp/care24-mobile-hero-editorial-390x844.png`.

- [x] **Step 5: Review the focused diff**

Run `git diff --check` and inspect only the three changed implementation/test files to ensure no unrelated pending work was altered.
