/**
 * Feature barrel for the public contact form flow:
 * - `lib.ts` (client-safe): submission payload type, the POST to /api/contact,
 *   and localized status copy lookup.
 *
 * Kept dependency-free like the rest of the app's client utilities — no
 * `server-only`, no React — so it can be imported from ContactForm.tsx ("use
 * client") without pulling server code into the browser bundle.
 */
export {};
