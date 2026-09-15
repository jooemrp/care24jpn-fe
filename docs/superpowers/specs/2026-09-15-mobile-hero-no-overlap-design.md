# Mobile Hero Without Image Overlap

## Goal

Make the homepage first view follow the client's mobile requirements exactly: the main catchphrase must not overlap the hero photograph, and visitors must reach the Care24Japan service summary within one short scroll.

## Scope

- Change only the homepage hero composition below the `md` breakpoint.
- Preserve the current desktop hero composition and CMS content contract.
- Keep the existing photograph, copy, service-area text, CTA destination, and About section content.

## Mobile Composition

The mobile page order is:

1. Navbar
2. Standalone full-width hero photograph
3. Catchphrase
4. Supported-area badge and expansion note
5. Primary application CTA
6. `Care24Japanとは` heading, catchphrase, and description

The photograph is a separate, approximately 2:1 media block. It uses `object-fit: cover` with a mobile focal position chosen to keep both people recognizable. The textual hero content sits on the normal page background below the photograph; no catchphrase, badge, or CTA is positioned over the image.

Mobile spacing remains compact so the hero does not become taller than the current implementation. The About section continues immediately after it without a decorative gap.

## Desktop Behavior

At `md` and above, the photograph remains the full hero background and the text remains over the low-detail side of the image. Existing desktop minimum heights, overlays, typography, and content order remain unchanged.

## Implementation Boundaries

- Reuse a single Next.js `Image` component in a wrapper that participates in mobile document flow and becomes absolutely positioned on desktop.
- Hide hero scrims on mobile because text no longer overlays the photograph; retain them on desktop.
- Use responsive layout/order utilities rather than duplicating the CMS content or interactive CTA.
- Do not modify unrelated pending client-revision changes.

## Verification

- Add a component regression test that requires a standalone mobile image wrapper, mobile-hidden scrims, and mobile ordering of area before CTA.
- Confirm the new test fails against the current implementation, then passes after the smallest component change.
- Run the focused homepage component tests, lint/type validation available in the project, and a production build.
- Visually verify at 375×667, 390×844, and a desktop viewport.
- At mobile widths, confirm the H1, supported area, and CTA bounding boxes do not intersect the photograph bounding box.
- Confirm the `Care24Japanとは` heading and introductory copy remain reachable within one short scroll.
- Physical-device verification remains a final client/device QA step because this environment can emulate mobile viewports but cannot operate the client's phone.
