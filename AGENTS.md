<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Care24 CMS runtime rules

- Atlas/CMS is the source of truth for rendered content. Do not add bundled
  copy, guessed URLs, placeholder media, or other runtime fallbacks to hide
  missing content.
- A missing or malformed CMS field must not take down the whole project when
  the affected field can be isolated. Render a visible, field-specific
  diagnostic such as `content.micsHref` and keep unrelated sections usable.
- URL fields with a local presentation boundary (for example a pricing policy
  link) must use the same field-specific diagnostic path instead of throwing a
  route-level error or creating a broken `<a>` element.
- Route/page-level errors are reserved for unavailable page structure or a
  failed data request; they must retain a useful diagnostic instead of only a
  generic production "Application error" message.
- Before reporting a change as complete, run the relevant tests, `pnpm build`,
  and a production `pnpm start` smoke check.

## Care24 responsive typography rules

- Never ship a responsive layout that leaves a single character, particle,
  short word, or other visibly orphaned text on its own line at any supported
  viewport size. Check at minimum 320px, 375px, desktop, and any breakpoint
  touched by the change.
- Keep copy API-owned; solve orphaned wrapping with responsive layout or
  typography (for example balanced wrapping, appropriate width, or spacing),
  not by truncating or silently rewriting CMS text.
