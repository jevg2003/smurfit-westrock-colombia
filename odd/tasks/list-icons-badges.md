# List icons and badges

## Objective

Make list items distinguishable at a glance: an icon per closed-union value (dimension, severity, timeline kind, regulation origin, evidence kind, PESTEL factor) and a source badge on news rows, with the Google News logo for `via: "google-news"`.

## Problem / why

Dimension, severity, timeline `kind`, regulation `Origin`, `SignalEvidence.kind` and PESTEL factors render as text only. Rows in Radar, Avisos, Timeline, Noticias and Regulación look identical, so users must read every label to scan a feed.

## Decisions (user, 2026-10-27)

- Badges use the ReUI Badge (`@/components/reui/badge`, already installed) with a leading icon or image, following the `c-badge-25` pattern (`variant="outline"`, 18px media, `rounded-xs`).
- News coming via Google News shows the Google News logo in its badge.
- Real news cover images are out of scope: the RSS pipeline drops images by design (`rss/parse.ts:4`), CSP `img-src` is `'self'` only, and outlet rights are an open legal question.

## Constraints

- Icons from `lucide-react` only; logos as local assets or inline SVG (no hotlinking, CSP `img-src 'self'`).
- ReUI rules: semantic tokens, Badge `-light`/`-outline` variants for state, no `transition-all`, nothing below `text-xs`.
- Icons are decorative (`aria-hidden`); the text label stays the accessible name.
- Do not touch files with unrelated uncommitted work: `globals.css`, `fuentes/*`, `onboarding/*`, `e2e/*`.
- Generated artifacts in English; existing Spanish UI copy stays as-is.

## Tasks

- [ ] T1 — Foundation: shared icon maps (`Record<Union, LucideIcon>`) in `src/core/labels.ts`, `badges.tsx` badges with icons, optional `media` slot on `EventItem`. Route: delegated (writer; 3 non-trivial files).
- [ ] T2 — Wire icons into Timeline (`kind`), Avisos/Radar (`dimension`), Regulación (`Origin`). Route: delegated (parallel writer, disjoint files).
- [ ] T3 — Noticias: source badge per row, Google News logo for `via: "google-news"`, newspaper icon for RSS outlets. Route: delegated (parallel writer, disjoint files).
- [ ] T4 — Filters and detail lists: `feed-summary` option icons, PESTEL/competitor `SelectableRow` icons, `signal-detail` evidence icons. Route: delegated (parallel writer, disjoint files).

Delivery strategy: ask-on-risk. Forecast ≈ 300–450 authored changed lines.

## Acceptance criteria

- Every listed union maps to exactly one icon (type-checked `Record`, no fallback holes).
- Google News rows show the Google News logo; RSS rows show the outlet with a newspaper icon.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass, apart from failures already on the base.

## Checks

`pnpm typecheck` · `pnpm lint` · `pnpm test` (vitest)

## Progress

- 2026-10-27: Document created. Exploration done (candidate map: `EventItem` is shared by all feeds; no image field on `NewsItem`).
