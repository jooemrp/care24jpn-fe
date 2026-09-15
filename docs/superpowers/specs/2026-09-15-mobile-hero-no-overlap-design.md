# Mobile Hero Editorial Redesign

## Goal

Make the homepage first view feel like a professionally art-directed Japanese care service while following the client's mobile requirements exactly: the main catchphrase must not overlap the hero photograph, the photograph must remain prominent, and visitors must reach the Care24Japan service summary within one short scroll.

## Scope

- Change the homepage hero and the introductory typography of the About section below the `md` breakpoint.
- Preserve the current desktop hero composition and CMS content contract.
- Keep the existing photograph, copy, service-area text, CTA destination, and About section content.

## Mobile Composition

The mobile page order is:

1. Navbar
2. Standalone inset hero photograph in an editorial image frame
3. Catchphrase
4. Supported-area badge and expansion note
5. Primary application CTA
6. `Care24Japanとは` heading, catchphrase, and description

The photograph is a separate, approximately 16:9 media card inset from the viewport edges. An asymmetric lower-right radius gives it a restrained editorial silhouette inspired by Japanese welfare sites without adding decorative clutter. It uses `object-fit: cover` with a mobile focal position chosen to keep both people recognizable. The textual hero content sits on the normal page background below the photograph; no catchphrase, badge, or CTA is positioned over the image.

The catchphrase uses a slightly smaller, tighter mobile display scale so it reads confidently without dominating the whole viewport. A short blue rule establishes hierarchy without adding new content. The service area is presented as compact supporting metadata rather than a large pill. The application action is the only primary CTA and spans the available mobile width with a rounded-rectangle silhouette and a separately framed arrow.

Mobile spacing remains compact so the About heading appears near the bottom of a 390×844 viewport and is reachable on a 375×667 viewport with one short scroll. The About intro continues immediately after the hero. Its mobile heading gains the same short-rule treatment so the transition feels intentional instead of like a second unrelated block.

## Desktop Behavior

At `md` and above, the photograph remains the full hero background and the text remains over the low-detail side of the image. Existing desktop minimum heights, overlays, typography, and content order remain unchanged.

## Implementation Boundaries

- Reuse a single Next.js `Image` component in an inset, rounded wrapper that participates in mobile document flow and becomes the existing edge-to-edge absolute background on desktop.
- Hide hero scrims on mobile because text no longer overlays the photograph; retain them on desktop.
- Use responsive layout/order utilities rather than duplicating the CMS content or interactive CTA.
- Keep decorative treatment restrained: no invented labels, floating badges, gradients over the mobile image, or ornamental illustrations.
- Preserve at least 44px touch height, readable body sizing, and visible keyboard focus on the CTA.
- Do not modify unrelated pending client-revision changes.

## Verification

- Add a component regression test that requires the inset editorial media frame, separate copy region, compact service-area metadata, full-width mobile CTA, and mobile ordering of area before CTA.
- Confirm the new test fails against the current implementation, then passes after the smallest component change.
- Run the focused homepage component tests, lint/type validation available in the project, and a production build.
- Visually verify at 375×667, 390×844, and a desktop viewport.
- At mobile widths, confirm the H1, supported area, and CTA bounding boxes do not intersect the photograph bounding box.
- Confirm the `Care24Japanとは` heading and introductory copy remain reachable within one short scroll.
- Physical-device verification remains a final client/device QA step because this environment can emulate mobile viewports but cannot operate the client's phone.
