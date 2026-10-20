# Feature: nextjs-migration

## Objective
Replace the Vite + React SPA with Next.js (App Router) + TanStack Query + shadcn/ReUI + Tailwind v4.
Remove dead code, temp files and misplaced folders. Leave a single stylesheet: `src/app/globals.css`.

## Authorized scope
Whole repo (user request: "limpia el proyecto entero", "migrá completamente", "un solo CSS").

## Route
Inline (single writer, parent holds full context; cold subagent would re-read everything). Trigger evidence: ~25 files rewritten/moved, all already read by parent.

## Findings (exploration)
- `App.tsx` calls `AppShell` with stale props, imports missing `components/ui/estados.css` -> build already broken.
- `src/components/examples/c-sidebar-2.tsx` unused registry example.
- 3 extra CSS files (`App.css`, `login.css`, `index.css`) + missing `estados.css`.
- `cn` npm pkg used instead of clsx + tailwind-merge; `shadcn` CLI in dependencies; `public/icons.svg` unused; `PaginacionGoogle`/`construirPaginas` misplaced in layout.
- Auth + alerts both hand-roll localStorage state.

## Tasks
- [x] T1 Next.js scaffold: package.json, next.config, postcss, tsconfig, remove Vite files
- [x] T2 Single globals.css, folder layout, ui components "use client" + cn fix, delete dead files
- [x] T3 App Router routes (login, resumen, dias, alertas) + providers + features ported
- [x] T4 README/components.json/.gitignore cleanup, build + lint verification

## Progress / evidence
(see below)

## Verification (observed)
- `npx tsc --noEmit`: clean
- `npx oxlint`: 0 errors, 1 warning (react-table incompatible-library, upstream)
- `npx next build`: OK, routes `/`, `/dias`, `/alertas`, `/login` static
- `next start`: `/login` 200 with form HTML, `/` 200
- CSS files in repo: only `src/app/globals.css`
- NOT verified: interactive browser flow (login -> redirect, Select, sidebar links, charts render)
