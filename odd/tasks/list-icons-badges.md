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

- [x] T1 — Foundation: shared icon maps (`Record<Union, LucideIcon>`) in `src/components/events/event-icons.ts` (not `src/core`: core stays UI-free), `badges.tsx` badges with icons, optional `media` slot on `EventItem`. Route: delegated (writer; 3 non-trivial files). Commit `90df220`. RDD: medium, `under_budget` (199 lines), slice pending.
- [x] T2 — Wire icons into Timeline (`kind`), Avisos/Radar (`dimension`, Radar reuses `AlertEvents`), Regulación (`Origin`). Route: delegated (parallel writer, disjoint files). Commit `0f89925`.
- [x] T3 — Noticias: source badge per row, Google News logo (Simple Icons `googlenews`, CC0, monochrome inline SVG) for `via: "google-news"`, newspaper icon for RSS outlets. `EventItem.source` widened to `ReactNode` so the badge sits in the meta line. Route: delegated + one inline mechanical edit. Commit `73b167d`.
- [x] T4 — Detail lists (provenance skipped: free-text fields, no closed union): PESTEL/competitor `SelectableRow` icons, `signal-detail` evidence icons. Route: delegated (parallel writer, disjoint files).
- [x] T5 — `feed-summary` filter option icons, wired from Timeline (kind), Radar (dimension), Regulación (origin). Noticias skipped (topic groups are configurable ids, no closed union). Route: delegated, sequential after T2–T4.

Delivery strategy: ask-on-risk. Forecast ≈ 300–450 authored changed lines.

## Acceptance criteria

- Every listed union maps to exactly one icon (type-checked `Record`, no fallback holes).
- Google News rows show the Google News logo; RSS rows show the outlet with a newspaper icon.
- `pnpm typecheck`, `pnpm lint` and `pnpm test` pass, apart from failures already on the base.

## Checks

`pnpm typecheck` · `pnpm lint` · `pnpm test` (vitest)

## Progress

- 2026-10-27: Document created. Exploration done (candidate map: `EventItem` is shared by all feeds; no image field on `NewsItem`).
- 2026-10-27: T1–T4 committed (`90df220`, `0f89925`, `73b167d`, `f24987a`; T4 = `f24987a`). Full checks: `pnpm typecheck` 0 errors; `pnpm lint` only pre-existing warnings; `pnpm test` 177 files / 1283 tests passed (base 1261).
- RDD: slice `458fbfd..HEAD` medium, `slice_budget_reached` (701 lines, includes interleaved user commits `5701c8f`, `e82448d`, `61b9619`). Consent envelope relayed; user declined for this candidate (`declined_this_candidate`).
- 2026-10-27: T5 done. Full checks: `pnpm typecheck` 0 errors; `pnpm test` 177 files / 1285 tests passed.

## Next step

Feature complete. Optional follow-ups: official multicolor Google News mark; real news covers need a pipeline + CSP + rights decision.
