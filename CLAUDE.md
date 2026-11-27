@AGENTS.md

# Project rules

- Read docs/ARCHITECTURE.md before changing structure; docs/DESIGN_SYSTEM.md before UI work; docs/DATABASE.md before touching SQL.
- UI text in English AND French: every interface string lives in `src/i18n/messages/{en,fr}` (English is the reference type) — never hard-code UI text (see docs/ARCHITECTURE.md §9). Docs in French. Currency USD. App name is provisional ("Dashboard") — only `src/config/site.ts` and `src/components/layout/logo.tsx` hold it. Don't introduce any other brand name.
- Demo vs live data: every dataset carries a `DataResult<T>` source; demo data is never written to the database, never combined with live figures, and uses fictional names (never the studio's real game names). Domain sources live in `src/config/data-sources.ts`.
- Cache Components is on: session reads go under `<Suspense>`; no `new Date()` / `Math.random()` during prerender (use `DEMO_NOW`, `seededRandom`); URL-dependent client UI is isolated under `<Suspense>`; charts mount client-side via `useHydrated()`.
- No decorative buttons: unbuilt features use `ComingSoonButton` / `ComingSoonPanel`.
- Before finishing a change: `npm run check` (typecheck + lint + Vitest) and `npm run build` must pass.
- Forms with Server Actions: React 19 resets uncontrolled fields after each action — make fields that must survive an error controlled. Radix `asChild` needs exactly one child.
- Never print secrets: read `.env.local` values inside scripts; DB work goes through `npm run db:push` / `npm run db:types`.
- The C: drive on this machine is nearly full: point TEMP/TMP to the git-ignored `.tmp/` folder when running browsers or heavy tools.
- Node is not on PATH on this machine: prefix PowerShell commands with `$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH";`
