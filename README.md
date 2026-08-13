# Care 24 Japan — Frontend

The marketing/informational site for Care 24 Japan, built with Next.js (App Router), React 19, TypeScript, and Tailwind CSS 4.

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser. Requests to `/` are redirected to the default locale (`/ja`) by [proxy.ts](proxy.ts).

## Scripts

```bash
npm run dev      # start the dev server (webpack)
npm run build    # production build (webpack)
npm run start    # start the production server
npm run lint     # run ESLint
```

## Internationalization

Routes are prefixed with a language segment: `app/[lang]/...`, where `lang` is `ja` (default) or `en`. There is no client-side language store — `lang` is resolved from the route segment and passed down from there. See [features/lang/i18n.ts](features/lang/i18n.ts) for the language helpers (`t`, `isLang`, `localizeHref`) and [proxy.ts](proxy.ts) for the locale redirect.

## Project Structure

- [app/[lang]/](app/%5Blang%5D) — localized routes (pricing, fees, company, terms, privacy, etc.)
- [components/](components) — shared UI (`Navbar`, `Footer`, `AppShell`, `LangToggle`, `LegalDocPage`, `JsonLd`, and `components/ui`)
- [features/lang/](features/lang) — i18n utilities
- [constants/](constants) — site copy, pricing, and legal content
- [styles/](styles) — global styles

See [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for the visual design language (colors, logo usage, aesthetic direction).

## Important Note for AI Agents

This project pins a Next.js version with breaking changes relative to older conventions. Before writing Next.js code, read [AGENTS.md](AGENTS.md) and the relevant guide under `node_modules/next/dist/docs/`.

## Deployment

Deployed on [Vercel](https://vercel.com). See the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for details.
