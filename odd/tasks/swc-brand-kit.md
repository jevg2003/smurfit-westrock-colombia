# SWC brand kit

## Objective

Produce a real vector brand kit for Smart Work Core (SWC): wordmark, favicon mark, lockups for navbar, sidebar, landing and presentation, raster/ICO exports, and an SVG/CSS animated logo intro. Wire the needed assets into this app.

## Problem / why

The current proposal exists only as AI-generated JPGs and an MP4 the owner finds unappealing. Mecateo's own "SVG" files embed PNGs, so nothing can be extracted as vectors. The app still shows a placeholder icon (blue `icon.svg`, `LineChartIcon` button).

## Decisions (user, 2026-10-27)

- SWC wordmark: geometric hand-drawn SVG paths that imitate the proposal (not traced, not Fredoka).
- Secondary type ("Smart Work Core", "by mecateo.co"): Glacial Indifference (Mecateo font), outlined to paths.
- Motion: SVG/CSS animated intro (React component + standalone animated `.svg`). No mention of sub-product or MVP.
- Destination: full kit in `C:\Users\arbel\Downloads\Trabajo\mecate-co\branding\swc\`, required files in this repo's `public/`, replacing the current favicon.

## Constraints

- Palette from proposal: ink `#1A1F24`, white `#FFFFFF`, lime `#A3E40A`.
- No ffmpeg/ImageMagick; rasterize with `sharp` (already installed), build ICO by hand.
- Generated artifacts in English.

## Tasks

- [x] T1 — Master SWC wordmark + favicon mark (C with dot inside ring) as SVG. Route: inline (iterative visual design, one generator script).
- [x] T2 — Outline Glacial Indifference text; compose lockups (mark-only, sidebar stacked, navbar horizontal, landing, presentation) in positive / negative / on-lime. Route: inline (same generator).
- [x] T3 — Raster exports: favicon.ico (16/32/48), apple-touch-icon 180, icon-192/512, maskable, mobile app icon PNG. Route: inline.
- [x] T4 — Animated intro: standalone animated SVG + React `BrandIntro` component. Route: inline.
- [x] T5 — Integrate: `public/` assets, `layout.tsx` icons/manifest, `app-shell.tsx` logo. Route: inline (2 mechanical edits).

## Acceptance criteria

- All logo files are pure vector paths (no `<image>`, no `<text>`), valid SVG, render correctly at 16px and large.
- Favicon legible at 16x16.
- Intro respects `prefers-reduced-motion`.
- `pnpm typecheck` / lint / tests pass after integration.

## Progress

- 2026-10-27: exploration done; decisions captured.
- 2026-10-27: T1-T5 done. Kit (20 SVG + 8 PNG/ICO + generator source) in `mecate-co/branding/swc/`. Repo: `public/` icons + manifest, `public/brand/` intro and wordmarks, `BrandIntro` overlay (once per session, skippable, off under reduced motion), sidebar logo uses `/icon.svg`.

## Verification evidence

- Visual review: contact sheet, 16/32 px favicon, and intro frames at 200/700/1200/1700/3000 ms (Playwright Chromium).
- `rg "<image|<text"` over kit SVGs: no matches (pure paths).
- RED: `vitest run src/components/brand` failed (module missing); GREEN: 3/3.
- `pnpm typecheck`: pass. `pnpm test`: 137 files / 973 tests pass. `pnpm lint`: 1 warning kept (`set-state-in-effect` in `BrandIntro`; post-mount decision avoids hydration mismatch).

- Work-unit commit: feat(marca) kit vectorial SWC (see git log).

## Next step

Owner review of the kit; optionally use `swc-navbar-*` / `swc-horizontal-*` on the landing page.
