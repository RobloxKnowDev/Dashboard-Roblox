@AGENTS.md

# Project rules

- Read docs/ARCHITECTURE.md before changing structure; docs/DESIGN_SYSTEM.md before UI work; docs/DATABASE.md before touching SQL.
- UI text in English; docs in French. Currency USD. App name is provisional ("Dashboard") — only `src/config/site.ts` and `src/components/layout/logo.tsx` hold it. Don't introduce any other brand name.
- Demo vs live data: every dataset carries a `DataResult<T>` source; demo data is never written to the database, never combined with live figures, and uses fictional names (never the studio's real game names). Domain sources live in `src/config/data-sources.ts`.
- Cache Components is on: session reads go under `<Suspense>`; no `new Date()` / `Math.random()` during prerender (use `DEMO_NOW`, `seededRandom`); URL-dependent client UI is isolated under `<Suspense>`; charts mount client-side via `useHydrated()`.
- No decorative buttons: unbuilt features use `ComingSoonButton` / `ComingSoonPanel`.
- Before finishing a change: `npm run check` and `npm run build` must pass.
- Node is not on PATH on this machine: prefix PowerShell commands with `$env:PATH = "$env:LOCALAPPDATA\Programs\nodejs;$env:PATH";`
