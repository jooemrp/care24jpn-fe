# Persistent Navigation and Sticky CTA Design

## Goal

Complete client item 2 by keeping the desktop Contact navigation item immediately after FAQ and replacing the conditional floating action with a full-width persistent footer CTA bar.

## Verified Current State

- The navigation content already includes `/contact` immediately after `/faq`, and the current desktop render shows both items in that order.
- The sticky CTA already has phone and information-request actions, but its visibility depends on viewport observation and scroll events.
- In browser reproduction, the first view had moved above the viewport while the CTA container still retained `translate-y-full opacity-0`.
- The current outer margin and rounded container make the component read as a floating card rather than a footer bar.

## Chosen Behavior

Client item 4 supersedes the earlier always-visible interpretation. Following the verified Ichirou behavior, the fixed bar starts below the viewport while the first view is visible, slides into view only after the bottom edge of `[data-first-view]` passes the top of the viewport, and slides out again when the user scrolls back into the first view.

An `IntersectionObserver` tracks the responsive first-view boundary without running work on every scroll frame. An initial bounding-box check prevents a flash of the wrong state after hydration, and a passive scroll/resize fallback preserves the behavior when `IntersectionObserver` is unavailable. Non-home routes retain the existing short shell sentinel as their threshold.

## Desktop

- A full-width blue rail is fixed to the bottom edge.
- Following the client-provided Ichirou reference, its centered inner content is divided into three visually balanced zones: a short consultation message, the phone action and number, and a high-contrast Contact/Request Information action.
- The consultation message uses the existing CMS-managed phone note. The phone number remains the dominant element, while the request action keeps its magenta emphasis.
- The three-zone structure applies only at the desktop breakpoint. It replaces the current oversized two-zone phone column that makes the bar appear empty.
- The outer rail has a top border and upward shadow, but no inset margin or rounded outer corners.
- The desktop Contact navigation item remains immediately after FAQ and links to the localized contact route.
- The full three-zone rail appears only after the desktop first view has been passed.

## Mobile

- The bar is split into two equal-width actions: Call and Request Information.
- Both controls are at least 56px tall, use consistent Tabler outline icons, and include visible keyboard focus states.
- Safe-area padding is applied below the two actions without changing their equal-width layout.
- The bar stays hidden while the mobile first view is visible and appears only after that responsive first-view area has been passed.
- After it appears, the bar remains visible above the hamburger menu; opening the menu inside the first view does not override the scroll trigger.

## Layering and Document Flow

- The CTA rail uses a z-index above the sticky header and mobile-menu panel.
- The hidden rail is translated fully below the viewport, transparent, and pointer-inactive. The visible rail is translated into place and pointer-active.
- The transition uses transform and opacity only, and is disabled for reduced-motion users.
- A permanent spacer before the footer reserves the rail's height so the final footer content can scroll fully above it.

## Content and Data

- Consultation message, phone display, telephone href, CTA labels, and contact href continue to come from the existing site CTA provider and CMS mapping.
- No user-facing copy is invented.
- Existing fallback labels remain in place for published workspaces that have not yet received the optional sticky-label fields.

## Verification

- Add regression coverage for the first-view threshold rule and the hidden/visible transition classes.
- Add a navigation-source test proving `/contact` follows `/faq`.
- Run focused tests, the full suite, ESLint, and a production build.
- Browser-check the three-zone desktop composition at 1440×900 and confirm that it does not create wrapping or overflow at the desktop breakpoint.
- Recheck mobile at 390×844 and 375×667 to prove the approved two-way split is unchanged.
- At each breakpoint, confirm the CTA is outside the viewport at the top, visible after the first view, and hidden again after returning to the top.
- On mobile after passing the first view, open the hamburger menu and confirm the CTA remains visible and clickable above it.
