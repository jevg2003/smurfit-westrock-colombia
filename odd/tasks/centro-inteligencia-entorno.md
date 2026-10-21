# Feature: centro-inteligencia-entorno

Engram mirror: `odd/centro-inteligencia-entorno/tasks` · Branch: `feat/centro-inteligencia-entorno`
Source plan: `docs/propuesta-mvp/propuesta-mvp.md` (§4–§9) + approved plan (grill decisions below).

## Objective
Turn the TRM-only prototype into an operational environment-intelligence tool for Smurfit Westrock
Colombia. It includes:

- a signal radar and a timeline;
- watchlists;
- rule-based alerts with states (nueva / revisada / descartada);
- provenance on every datum;
- an exportable weekly briefing.

It is not a chat or Q&A app. There are no AI calls; AI stays behind a Noop port.

## Problem / why
The company's environment signals are scattered across macro data (TRM, PIB, IPC), public procurement
(SECOP II), competitors (Supersociedades), news and regulation. This tool gathers them in one place,
with verifiable sources and explicit rules.

## Scope (authorized)
- Releases R0–R5 as listed below.
- Public app: no login, no database. Browser persistence uses Zustand persist over localStorage.
- Server code is limited to Next.js Route Handlers for sources without CORS (RSS / Google News /
  Minambiente), plus cached server fetch.

## Constraints
- **Code structure:**
  - `src/core` is pure TypeScript and imports nothing from react, next or zustand; an architecture test
    enforces this.
  - Every external response is validated with Zod.
  - Every source sits behind a server-side flag.
- **Data rules:**
  - Never present simulated data as real.
  - Curated content is labeled "curado manualmente".
  - News shows only title, outlet, date and link.
- **UI:** use ReUI components as shipped (run validate_usage / audit checklist).
- **Language:**
  - Code, identifiers and comments are in English.
  - UI copy is in neutral, simple Spanish with short help texts.
- **Tooling:** pnpm. Verification commands: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

## Confirmed decisions
| Topic | Decision |
|---|---|
| Use cases | All of them: weekly radar, contracts and renewals, macro, competitors, plus extras (R5). |
| Competitors | Cartones América 860026759, Carvajal Empaques 890319047, Papeles y Cartones 890925108. Company: Cartón de Colombia 890300406. |
| News | Colombian media RSS **plus Google News RSS, switched on** (titles only). **Accepted risk:** Google News terms say "personal non-commercial use"; the user accepted this on 2026-10-20. A server flag allows turning it off without a deploy. |
| Regulation | 4 curated norms (Res. 1407/2018, Res. 803/2024, Ley 2232/2022, Ley 1581/2012), the Minambiente feed via proxy, and Presidencia decrees `88h2-dykw` filtered by keywords. |
| History | 12 months of contracts and news, 1 year of TRM, and the full annual World Bank series. |
| Thresholds | Editable in Preferencias. Defaults in `src/content/config/empresa.ts`. The rule text shows the active value. |
| Severity | Set by each rule from written criteria (≤30 days = alerta, ≤90 = vigilar). No opaque scores. |
| Alert notes | Required on dismiss, optional on review. |
| Briefing | Previous calendar week, Monday to Sunday in America/Bogota, plus a free range. Exports to printable HTML→PDF, Markdown and CSV. |
| News terms | Company + competitors; sector; regulation and sustainability; operational risks. |
| Mobile | Desktop first. Radar, alerts and briefing must be usable on mobile with no horizontal page scroll. |
| Deploy | Prepare for Vercel and keep it portable to company production. No deploy yet. |

## Delivery strategy
- Strategy: `feature-branch-chain`. One PR per release into `feat/centro-inteligencia-entorno`, then a
  final PR to `main`. Push and PRs are the user's decision.
- Forecast: about 4,000–5,000 authored changed lines across R0–R5, so slicing per release is
  required.

## Tasks

### R0 — Foundations
- [x] T1 Test runner: Vitest + Testing Library + MSW, a `test` script and a CI step.
- [x] T2 Extract the TRM rules (`procesar`, `UMBRAL_ATIPICO_PCT`) into `src/core/rules/trm-daily-move.ts`
      with characterization tests. UI behavior must stay the same.
- [x] T3 Domain types, ports, and an architecture import test.
- [x] T4 Zustand stores:
  - alerts with states, and a note required on dismiss;
  - watchlist;
  - preferences (thresholds, news terms, briefing period);
  - legacy import of `smurfit-trm:alertas`;
  - hydrator.

### R1 — Radar + contracts
- [x] T4b R0 follow-ups from the review advisory and the verifier:
  - add a catch and logging to the hydrator, plus a `hasHydrated` gate;
  - make eviction at the 500 cap visible or prune by state;
  - clarify the toggle;
  - use a single threshold source;
  - widen the forbidden imports in the architecture test.
- [x] T5 SECOP II contracts adapter: filter by NIT, Zod, a real fixture; confirm the end-date field.
- [x] T6 Rules `secop.expiring-contract` and `secop.competitor-new-contract`, plus dedupe and severity,
      with an injected Clock and thresholds from preferences.
- [x] T7 Usecases `detect-signals`, `build-timeline`, `build-briefing` (Bogota calendar week).
- [ ] T8 Screens: Radar, Señales (detail sheet), Alertas, Línea de tiempo, Contratación, Briefing
      export, Preferencias. Include the disclaimer and loading/error/empty states.

### R2 — Macro + competitors
- [ ] T9 World Bank adapter: annual GDP and CPI.
- [ ] T9b Exports adapter `vwqt-xc3z`.
- [ ] T10 Supersociedades `6cat-2gcs` adapter, with unit labels.
- [ ] T11 Screens: Macro, Competidores, Seguimiento.

### R3 — News + regulation
- [ ] T12 `/api/news` route: a closed list of media RSS feeds, dedupe, rejection of unsafe links.
- [ ] T13 Google News RSS (flag on), shared dedupe, "vía Google News" label.
- [ ] T14 Regulation: `normas.json` (curated), the Minambiente feed, decrees `88h2-dykw`, the
      `/regulacion` screen.

### R4 — Hardening + deploy prep
- [ ] T15 `/fuentes` health screen, Report-Only CSP, Noop AI port.
- [ ] T16 Playwright smoke test, verified build/Vercel config, deploy docs (no deploy).

### R5 — Extra dimensions (verify first; drop if unverifiable)
- [ ] T17 Spike: gas/energy (BMC/UPME).
- [ ] T18 Spike: recycling and fiber (SUI/Superservicios).
- [ ] T19 Spike: IDEAM climate and fires.

## Acceptance criteria (release level)
- Every screen shows source, date and license, and every signal links to its original record.
- Rules are pure, tested at their boundaries, and their thresholds are visible.
- `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build` pass at each release.
- No secrets in the client bundle. The disclaimer "prototipo no oficial, sin aval de Smurfit Westrock"
  appears on every screen.

## Progress / evidence
| Task | Route | Trigger evidence | Commit | Checks | Review tier |
|---|---|---|---|---|---|
| T0 docs | inline | single doc pass | 9b336f7 | structural readback | passive |
| T1 | delegated | writer for R0 (2+ non-trivial files) | a29d6ed | pnpm test 1/1, lint, typecheck, build ok; no RED (smoke test only) | passive/medium: tooling |
| T2 | delegated | same | 1d030e1 | characterization tests green before and after extraction (19 tests); lint, typecheck, build ok | medium |
| T3 | delegated | same | 0a18d3e | architecture test + self-check (22 tests); lint, typecheck, build ok | medium |
| T4 | delegated | same | b222572 | RED: stores/rules suites failed with missing modules (`alerts.store`, `preferences.store`, `trmDaySignalId`), then GREEN 49 tests; lint, typecheck, build ok | medium |
| T4b | delegated | R1 logic writer (2+ non-trivial files) | 535c0cc | RED: hydrate-stores, toggle-saved-day suites failed with missing modules and 3 cap tests failed; GREEN 59 tests; lint, typecheck, build ok. (d) is a refactor with no new behavior, so no RED. | medium |
| T5 | delegated | same | f1ab4c8 | RED: bogota, fetcher and secop adapter suites failed with missing modules; GREEN 84 tests; lint, typecheck, build ok. Live curl HTTP 200 (3.3 s). | medium |
| T6 | delegated | same | 734d262 | RED: severity, dedupe, expiring, competitor and TRM signal suites failed with missing modules (plus a thresholds-merge test); GREEN 107 tests; lint, typecheck, build ok. Boundaries at 90/91, 30/31, 0/-1 days and Bogota midnight covered. | medium |
| T7 | delegated | same | 5fa3fb1 | RED: 7 suites failed with missing modules (detect-signals, build-timeline, build-briefing, serializers, csv, noop analyzer, composition); GREEN 141 tests; lint, typecheck, build ok. Week boundaries covered (Mon 00:00, Sun 23:59:59.999 Bogota). | medium |

### R0 review
- First review attempt (base 0aeb1f7, which included docs): declined, then `lens_context_budget_exceeded`.
- Reduced candidate (base 9b336f7, R0 code only, 44 files / 2,943 lines, high risk because of ci.yml):
  consent granted. All 4 lenses ran and the review was **approved**. Lineage `review-c42b5f222e2643c9`
  is acknowledged and its authority burned. Independent verifier: PASS.
- Reviewed boundary is now `40e7c45`.
- Non-blocking advisory findings, folded into T4b:
  - store-hydrator has no rejection handler; legacy migration is skipped silently.
  - alerts store evicts silently at the cap of 500.
  - `use-alertas` toggle flow is unclear.
  - duplicated threshold constant in `use-trm.ts`.
  - architecture test misses `react-dom`, `next-themes`, `@tanstack/react-*`.
  - hydration flash on `/alertas` (no `hasHydrated` gate).

### T5 confirmed SECOP facts
- Live query (HTTP 200, 4 rows): `https://www.datos.gov.co/resource/jbjy-vk9h.json?$where=documento_proveedor in('890300406','860026759','890319047','890925108') AND fecha_de_firma>'2025-10-01'&$order=fecha_de_firma DESC&$limit=10`.
- End-date field is `fecha_de_fin_del_contrato` (not `fecha_de_fin`). Dates are floating local timestamps, anchored to Bogota by the adapter. `valor_del_contrato` is a string; `urlproceso` is `{url}`.
- Dataset metadata: `licenseId` CC_40_BY_SA; attribution "Agencia Nacional de Contratación Pública - Colombia Compra Eficiente".
- Fixture `secop-contratos.sample.json` is the real response; personal fields (legal representative, spending officer, supervisor, bank account) were removed, all other fields are verbatim.
- Added dependency `zod` (was missing).

### R1 logic review
- Assessment: base 40e7c45, 63 files / 2,631 lines, medium risk (`slice_budget_reached`;
  `package.json` changed because zod was added).
- Consent: **declined** by the user for candidate `sha256:322caa9b…` (lineage `review-34fad7cd54ec0bd2`).
- Off path, medium tier: writer self-verification plus a parent spot check. Observed: `pnpm test`
  25 files, 141 tests passed. Next assessment base for slicing: 0f5b95e (declined range closed by the user).

## Next step
R1: T8 (screens). Logic part (T4b–T7) is done. Note: `src/lib/csv.ts` now uses the pure `toCsv` from `src/core/format/csv.ts`; the TRM saved-day signal dimension changed from market to macro to match proposal §4.6.
