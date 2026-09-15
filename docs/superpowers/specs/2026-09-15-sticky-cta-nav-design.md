# Persistent Navigation and Sticky CTA Design

## Goal

Complete client item 2 by keeping the desktop Contact navigation item immediately after FAQ and replacing the conditional floating action with a full-width persistent footer CTA bar.

## Verified Current State

- The navigation content already includes `/contact` immediately after `/faq`, and the current desktop render shows both items in that order.
- The sticky CTA already has phone and information-request actions, but its visibility depends on viewport observation and scroll events.
- In browser reproduction, the first view had moved above the viewport while the CTA container still retained `translate-y-full opacity-0`.
- The current outer margin and rounded container make the component read as a floating card rather than a footer bar.

## Chosen Behavior

The written client requirement for an always-visible fixed bar takes precedence over copying the reference site's delayed appearance. The bar is rendered visibly from initial page load on every route and does not depend on scroll, IntersectionObserver, or navbar state.

## Desktop

- A full-width blue rail is fixed to the bottom edge.
- Its centered inner content contains the phone action and phone number on the left and a high-contrast Contact/Request Information action on the right.
- The outer rail has a top border and upward shadow, but no inset margin or rounded outer corners.
- The desktop Contact navigation item remains immediately after FAQ and links to the localized contact route.

## Mobile

- The bar is split into two equal-width actions: Call and Request Information.
- Both controls are at least 56px tall, use consistent Tabler outline icons, and include visible keyboard focus states.
- Safe-area padding is applied below the two actions without changing their equal-width layout.
- The bar remains visible at the top of the page, after scrolling, and while the hamburger menu is open.

## Layering and Document Flow

- The CTA rail uses a z-index above the sticky header and mobile-menu panel.
- The fixed rail is pointer-active; no invisible overlay remains when the page loads.
- A permanent spacer before the footer reserves the rail's height so the final footer content can scroll fully above it.

## Content and Data

- Phone display, telephone href, CTA labels, and contact href continue to come from the existing site CTA provider and CMS mapping.
- No user-facing copy is invented.
- Existing fallback labels remain in place for published workspaces that have not yet received the optional sticky-label fields.

## Verification

- Add a regression test proving the bar is full-width and rendered without hidden/translated state.
- Add a navigation-source test proving `/contact` follows `/faq`.
- Run focused tests, the full suite, ESLint, and a production build.
- Browser-check desktop at 1440×900 and mobile at 390×844 and 375×667.
- On mobile, open the hamburger menu and confirm the CTA remains visible and clickable above it.
