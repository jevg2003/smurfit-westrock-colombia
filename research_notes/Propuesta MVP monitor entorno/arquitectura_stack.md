# Arquitectura y stack — MVP monitor de entorno (Smurfit Westrock Colombia)

Fecha de investigación: 2026-10-20. Solo lectura sobre el repo; única escritura: este archivo.
Convención: **[V]** verificado hoy en fuente primaria / comando; **[NV]** no verificado (inferencia o conocimiento previo).

## 0. Resumen ejecutivo (decisiones recomendadas)

| Tema | Decisión |
|---|---|
| Framework | **Quedarse en Next.js 16 (App Router)**, enfoque híbrido: shell y fetch cacheado en servidor (RSC + `use cache`), Route Handlers mínimos como proxy (GDELT), islas cliente para interactividad (Zustand, tablas, gráficos). No migrar a Vite/TanStack Start. |
| Hosting | Vercel preparado, **pero Hobby prohíbe uso comercial**: ver riesgo en 1.4. Decisión bloqueante para el usuario antes de desplegar. |
| Estado persistido | Zustand 5 + `persist` (localStorage), con hidratación diferida (`skipHydration`) por SSR. |
| Datos de fuentes | Servidor: `fetch` + `use cache`/`revalidate` + Zod 4. TanStack Query se queda solo para refresco/estado en cliente donde haga falta (ya está en el repo). |
| Validación | Zod 4 en el borde de cada adaptador. |
| IA futura | Puerto `SignalAnalyzer`/`Summarizer` + `NoopAnalyzer`; Vercel AI SDK (Apache-2.0) solo como adaptador futuro, nunca en dominio. |
| Tests | Vitest + Testing Library + MSW; reglas de señal puras primero; Playwright solo humo E2E. |
| Seguridad | Sin secretos en cliente; CSP sin nonce (`'unsafe-inline'` o SRI experimental) para no perder prerender; texto externo siempre como texto plano. |

## 1. SPA vs SSR: qué arquitectura de renderizado

### 1.1 Estado actual (evidencia en el repo)

- Next 16 + React 19, scripts `dev/build/start/lint/typecheck`, sin runner de tests: `package.json:5-10`; `next ^16.4.2`, `@tanstack/react-query ^5.104.5`, `@tanstack/react-table ^9.3.1`, `recharts ^3.8.0` (`package.json:13-27`). Node 24, pnpm 11.5.1 (`package.json:37-42`).
- Todo el dato se pide **en el navegador**: `src/features/trm/api.ts:3` (`TRM_URL = https://www.datos.gov.co/resource/mcec-87by.json`) y `api.ts:11` (`fetch` directo, sin Zod, `response.json()` sin validar), consumido con `useQuery` (`use-trm.ts:28-33`, `staleTime` 1 h en `use-trm.ts:31`).
- Las vistas son cliente (32 archivos con `"use client"`); `src/app/page.tsx` solo renderiza `<ResumenView />`, por lo que **no hay HTML con datos** en la primera respuesta (solo skeleton).
- Alertas: hook propio con `useSyncExternalStore` sobre localStorage (`src/lib/use-local-storage.ts:25-26`; clave `smurfit-trm:alertas`, `src/features/alertas/use-alertas.ts:6`). Guarda solo `string[]` de ids (no la señal completa).
- Regla de negocio hoy dentro de un hook de React: `UMBRAL_ATIPICO_PCT = 1` y `procesar()` en `src/features/trm/use-trm.ts:7-27` (candidato claro a extraer a función pura testeable).
- Headers de seguridad estáticos en `next.config.ts:4-10,16`; **no hay CSP**.
- `QueryClient` creado por montaje en `src/app/providers.tsx:8`; tema con next-themes (`providers.tsx:11`).
- CI: lint + typecheck + build, sin tests (`.github/workflows/ci.yml`). `vercel.json`: `framework: nextjs`, deploy en `main`.
- Inconsistencia documental: `odd/tasks/nextjs-migration.md:23,32` aún menciona `/login`; el README ya dice "sin login". Actualizar el feature doc o archivarlo.

### 1.2 Comparación

| Criterio | Next.js 16 híbrido (recomendado) | Vite SPA + TanStack Router | TanStack Start |
|---|---|---|---|
| Ajuste al código existente | Máximo: 0 reescritura de rutas/UI; ReUI/shadcn ya integrados | Reescribir rutas, layout, fuentes, metadata; quitar `next/font`, `next-themes` funciona igual | Reescritura de rutas + server functions; ReUI funciona (React puro) |
| Fetch en servidor con caché | `use cache` + `cacheLife` (Cache Components) o `fetch(..., {next:{revalidate}})` **[V]** nextjs.org/docs/app/getting-started/caching | No: todo en cliente; el proxy GDELT requeriría función aparte (Vercel Function suelta) | Sí: server functions (RPC tipadas) **[V]** tanstack.com/start/latest/docs/framework/react/overview |
| Proxy mínimo (GDELT) | Route Handler `app/api/.../route.ts` | Función serverless extra | Server function / server route |
| Madurez | Next 16.4.2 publicado 2026-10-20 **[V npm]** | Vite 8.3.4, router 1.170.x **[V npm]** | `@tanstack/react-start` 1.169.3, doc dice "TanStack Start is stable"; RSC marcados experimentales **[V]** |
| SEO/primer pintado | HTML con datos en shell | Pantalla vacía hasta JS (irrelevante para app interna pública, pero peor percibido) | SSR/streaming |
| Despliegue Vercel | Nativo (preset `framework: nextjs` ya en `vercel.json`) | Estático, trivial | Soportado vía Nitro/Vite **[NV]** adaptador específico; comprobar antes de adoptar |
| Riesgo/tiempo | Bajo | Medio (migración sin valor funcional) | Medio-alto (cambio de framework + ecosistema más joven) |

**Recomendación: Next.js 16 híbrido.** Motivos: (1) el repo ya está migrado a Next y estabilizado (`odd/tasks/nextjs-migration.md`), migrar de nuevo no produce valor de producto; (2) necesitamos servidor mínimo de todos modos (rate limit de GDELT, caché compartida) y Next lo da sin infra extra; (3) Vite SPA obligaría a un proxy aparte y deja a GDELT expuesto al límite por IP de cada visitante; (4) TanStack Start es viable y estable, pero el beneficio no compensa reescribir. Se reevalúa si en el futuro se abandona Vercel.

### 1.3 Patrón híbrido concreto

1. **Shell estático** (layout, sidebar, breadcrumb) prerenderizado. Activar `cacheComponents: true` y `partialPrefetching: true` en `next.config.ts` (nuevos proyectos lo traen por defecto) **[V]** nextjs.org/docs/app/getting-started/caching. Requiere envolver lo dinámico en `<Suspense>` y revisar `Date.now()`/`Math.random()` (usar `connection()`); habilitarlo es una tarea de migración propia, con su propio TDD/ODD. Alternativa de menor riesgo: modelo previo con `fetch(url, { next: { revalidate: 3600 } })` y `export const revalidate`. **[NV]** cuál de los dos es más estable en 16.4; decidir tras un spike de 1 h.
2. **Fuentes en servidor**: cada puerto `SourceAdapter` se llama desde un Server Component o `async function` marcada `'use cache'` + `cacheLife('hours')` (TRM, IPC) y `cacheTag('source:<id>')`. La caché por defecto es en memoria por instancia y efímera en serverless; para compartir entre instancias existe `'use cache: remote'` (cache handler) **[V]** (misma página). En Hobby y con tráfico bajo basta con el caché CDN/ISR del prerender más `Cache-Control` del Route Handler.
3. **Route Handler proxy solo para GDELT** (`app/api/sources/gdelt/route.ts`, GET): GDELT responde 429 con "limit requests to one every 5 seconds" **[V: lo reproduje hoy, primera llamada → 429; tras esperar 20 s → 200 con `Cache-Control: public, max-age=900` y `Access-Control-Allow-Origin: *`; una consulta sin resultados devuelve el JSON literal `{}`, no `{"articles":[]}`]**. El proxy debe: caché 15–60 min, 1 consulta por fuente por ventana (colapsa N visitantes en 1 petición), `stale-while-revalidate`, timeout y fallback "dato no disponible". Nota: las IP de salida de Vercel son compartidas; un 429 puede venir de terceros **[NV]**. datos.gov.co/Socrata sí sirve CORS y se puede seguir llamando desde servidor o cliente; sin app token comparten un pool por IP y el exceso devuelve 429 **[V]** dev.socrata.com/docs/app-tokens.html; un app token gratuito es una variable de entorno de servidor (nunca `NEXT_PUBLIC_`).
4. **Islas cliente**: tabla, filtros, gráficos, panel de alertas y preferencias (Zustand). El servidor entrega datos serializados como props iniciales (o `initialData` de TanStack Query) para evitar spinner inicial.
5. **Proxy/CSP**: en Next 16 el antiguo `middleware` se llama `proxy.ts` **[V]** nextjs.org/docs/app/guides/content-security-policy.

### 1.4 Vercel Hobby: límites y restricción comercial **[V]**

- **Uso comercial prohibido en Hobby**: "Hobby teams are restricted to non-commercial personal use only" y comercial = "any Deployment used for the purpose of financial gain of anyone involved in any part of the production of the project, including a paid employee or consultant writing the code" (vercel.com/docs/limits/fair-use-guidelines). Si este MVP lo paga o lo usa Smurfit Westrock (o se hace como consultoría remunerada), **requiere Pro** (Developer seat 20 USD/usuario/mes, vercel.com/docs/plans/hobby). Si es ejercicio personal sin ánimo de lucro, Hobby es válido. **Decisión pendiente del usuario**; ante duda, Vercel Support lo resuelve (la doc lo indica). Alternativas sin Hobby: Pro; o Cloudflare/Dokploy autoalojado **[NV: términos comerciales de cada uno no verificados hoy]**.
- Límites Hobby relevantes (vercel.com/docs/plans/hobby, /docs/limits): duración máxima de función 300 s (default y máx.); 1 000 000 invocaciones/mes; 100 GB Fast Data Transfer; 10 GB Fast Origin Transfer; 4 CPU-h Active CPU; 360 GB-h memoria; 100 deployments/día; build 45 min; logs de runtime **1 hora**; WAF: 3 reglas custom y 3 bloqueos IP; Web Analytics 50 000 eventos/mes. Al excederse en Hobby se espera 30 días.
- **Cron en Hobby**: máx. 1 ejecución/día con precisión ±59 min (vercel.com/docs/cron-jobs/usage-and-pricing). Sirve para "precalentar" caché 1 vez al día; no para polling frecuente. La actualización "casi en vivo" debe salir de revalidación bajo demanda/`stale-while-revalidate`.
- Para el MVP la carga es mínima (decenas de invocaciones/día); los límites no son el cuello de botella, la licencia sí.

## 2. Matriz de bibliotecas

Versiones y licencias: `npm view` ejecutado 2026-10-20 **[V]**.

| Biblioteca | Versión / licencia / último publish | Veredicto | Notas (fit, SSR, límites, esfuerzo) |
|---|---|---|---|
| **Zustand** | 5.0.15, MIT, 2026-08-13 | **Adoptar** | `persist` con `name`, `version`, `migrate`, `partialize`, `skipHydration`, `onRehydrateStorage`; `localStorage` por defecto, hidratación síncrona al crear el store. **Pitfall SSR**: el HTML del servidor no tiene el estado persistido y provoca *hydration mismatch*; la doc recomienda renderizar el valor persistido solo tras montar (hook `useStore` con `useState`+`useEffect`) **[V]** zustand.docs.pmnd.rs/reference/integrations/persisting-store-data. Recomendado: `skipHydration: true` + `useEffect(() => store.persist.rehydrate())` en un `<StoreHydrator/>` del layout, y componente `useHasHydrated()` para evitar parpadeo. En Next, un store global de módulo se comparte entre requests en el servidor: **nunca** leer/escribir el store en Server Components; usar solo en cliente (o factory por request si algún día se usa en SSR). Reemplaza `use-local-storage.ts` (se puede retirar tras migrar). Esfuerzo: 0.5 día. |
| TanStack Query v5 | 5.104.5, MIT | **Mantener, rol reducido** | Útil en cliente para refresco, reintentos, estados de error por fuente. Con RSC + `use cache` ya no es necesario para la carga inicial. Evitar duplicar caché: si el servidor entrega datos, pasar como `initialData`. Si se quiere simplificar, para fuentes solo-servidor basta RSC. |
| TanStack Table + Virtual | table 9.3.1, virtual 3.14.21, MIT | **Table ya está (vía ReUI data-grid); Virtual solo si >1 000 filas** | El `data-grid` de ReUI ya incluye virtualización de filas/columnas **[V reui list_components]**. Un feed de noticias de cientos de ítems no requiere virtual. |
| **ReUI** (shadcn registry) | 27 componentes gratuitos **[V MCP reui]** | **Usar** | Relevantes: `data-grid` (ya instalado, `src/components/reui/data-grid/`), `filters` (constructor de filtros por dimensión/fuente/severidad), `timeline` (feed cronológico de señales), `badge` (severidad; ya en `src/components/reui/badge.tsx`), `frame`, `date-selector` (rango de fechas), `event-calendar` (calendario de publicaciones DANE/Banrep, opcional), `stepper` (onboarding de preferencias, opcional), `autocomplete`/`cascader` (selección de fuentes/competidores), `tree` (taxonomía dimensión→tema, opcional), `icon-tile`/`icon-stack` (cabeceras y empty states). **No usar**: kanban, gantt, sortable, color-picker, emoji-picker, signature-pad, phone-input, rating, file-type, code-block (código solo si más adelante se muestra JSON de procedencia), scrollspy. Premium blocks requieren licencia (no necesaria). Instalar vía `npx shadcn@latest add @reui/<nombre>`. Ejecutar `validate_usage`/`get_audit_checklist` del MCP al integrar. |
| Recharts | 3.10.1, MIT (repo: ^3.8.0) | **Mantener** | Ya integrado con `components/ui/chart.tsx` (usa `dangerouslySetInnerHTML` para inyectar CSS de tema, `chart.tsx:94`; revisar que no reciba texto externo). Alternativas (visx, Nivo, ECharts, uPlot): no justifican el costo de cambio; ECharts solo si hace falta >10k puntos. Recharts es componente cliente. |
| **Zod 4** | 4.6.7, MIT | **Adoptar** | Esquemas por adaptador: `z.object({ valor: z.coerce.number(), vigenciadesde: z.iso.datetime()... })`, `safeParse`, tipos inferidos. Hoy `api.ts:11` confía ciegamente en la respuesta. Esquemas tolerantes (`.passthrough()` fuera, `.catch()` en campos opcionales) para que un campo nuevo no rompa. Bundle ~ kB significativos: usar en servidor/adaptadores, no importar esquemas pesados al bundle cliente salvo para validar `persist.migrate` (opcional, mini-esquema). |
| date-fns vs Temporal | date-fns 4.4.0 MIT (2026-05-29); `temporal-polyfill` 1.0.6 MIT; `@js-temporal/polyfill` 0.5.1 ISC (sin publicar desde 2025-03) | **date-fns** (y `date-fns-tz`/`@date-fns/tz` si hace falta zona America/Bogota) | Temporal nativo aún requiere polyfill **[NV: estado de soporte en navegadores/Node al 2026-10 no verificado]**; mantener `src/lib/date.ts` como fachada para poder cambiar. Regla: fechas del dominio en ISO `YYYY-MM-DD`/UTC, formateo solo en UI. |
| ky vs fetch | ky 2.2.0 MIT | **fetch nativo + wrapper propio** | ky aporta reintentos/timeout/hooks, pero en servidor `fetch` ya integra la caché de Next y el wrapper de 30 líneas (`timeout` con `AbortSignal.timeout`, reintento 1 vez en 5xx, no reintentar 429) cubre el caso. Menos dependencias. Reconsiderar ky si crece la lógica de reintentos. |
| **Vitest** | 5.0.5, MIT, 2026-10-19 | **Adoptar** | Guía oficial Next: `vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/dom vite-tsconfig-paths`; **no soporta Server Components `async`** → para esos, E2E **[V]** nextjs.org/docs/app/guides/testing/vitest. Dominio puro corre en entorno `node`; UI en `jsdom` (o `happy-dom` 21.0.4). |
| Testing Library | react 16.3.3, MIT | **Adoptar** | Solo componentes cliente y síncronos. |
| **MSW** | 3.0.3, MIT | **Adoptar para adaptadores/UI** | Interceptar `fetch` en Vitest (`setupServer`). Alternativa más simple para adaptadores: inyectar `fetch` como dependencia y usar fixtures JSON grabados (sin MSW). Recomendado: ambos, MSW para tests de UI/Route Handler, fixtures + `fetch` inyectado para adaptadores. **[NV]** compatibilidad MSW 3 con Vitest 5/Node 24: smoke test antes de fijar. |
| **Playwright** | 1.64.1, Apache-2.0 | **Adoptar mínimo** | 2–3 flujos de humo (home carga shell, crear alerta persiste tras recarga, error de fuente muestra estado degradado). Interceptar red con `page.route` para no tocar GDELT/datos.gov.co reales en CI. Corre en `ubuntu-latest` sin costo (repo público; privado consume minutos de Actions). |
| **Vercel AI SDK (`ai`)** | 7.0.147, **Apache-2.0**, publish 2026-10-20 | **Diferir; solo detrás del puerto** | Licencia permisiva **[V npm]**. Sin llamadas de IA en el MVP; cuando llegue, un `AiSdkSignalAnalyzer` en `infrastructure/ai/` implementa el puerto. Costo real: tokens del proveedor (AI Gateway no es gratis más allá de créditos **[NV]**). |
| DOMPurify | 3.4.17, MPL-2.0 OR Apache-2.0; `isomorphic-dompurify` 4.6.0 MIT | **No necesario si no se renderiza HTML** | Preferir tratar titulares como texto plano (React escapa). Solo si se decide renderizar HTML externo. |
| fast-xml-parser | 5.11.2, MIT | **Solo si se agregan RSS** | GDELT permite `format=json`; no se necesita XML en el MVP. |
| Sentry (`@sentry/nextjs`) | 11.8.0, MIT (SDK) | **Diferir** | Plan gratuito existe pero límites de cuota/retención **[NV: no verificados hoy]**. Para el MVP basta logging estructurado propio (ver 4.5). |

Criterios transversales ya considerados arriba: costo = 0 USD en todas las bibliotecas elegidas (todas MIT/Apache-2.0); la única partida de costo posible es Vercel Pro (1.4) y futuros tokens de IA.

## 3. Estructura hexagonal propuesta (encaja con `src/features`)

Principio: el dominio y las reglas no importan React, Next, Zustand ni `fetch`. Dependencias apuntan hacia adentro. Se conserva `src/features/<tema>` para UI vertical; se agrega un núcleo `src/core` (dominio + puertos + casos de uso) y `src/infrastructure` (adaptadores). Migración incremental: `features/trm` pasa a ser una "feature" que consume el núcleo.

```
src/
  core/                                  # puro TypeScript, sin React/Next
    domain/
      source.ts          # Source, SourceId, SourceStatus
      indicator.ts       # Indicator, Observation
      news.ts            # NewsItem
      signal.ts          # Signal, Severity, Dimension
      alert.ts           # Alert, AlertState
      provenance.ts      # Provenance
      index.ts
    ports/
      source-adapter.ts  # SourceAdapter<T>
      signal-analyzer.ts # SignalAnalyzer, Summarizer (IA futura)
      clock.ts           # Clock (para tests deterministas)
      logger.ts          # Logger
    rules/                                # reglas puras, TDD primero
      variation.ts       # variación % entre observaciones, umbral atípico
      zscore.ts          # opcional
      news-relevance.ts  # keyword scoring / dedupe
      dedupe.ts
      severity.ts
      *.test.ts          # colocalizados
    usecases/
      detect-signals.ts       # (observations, rules, clock) => Signal[]
      collect-source.ts       # (adapter) => Result<SourceSnapshot>
  infrastructure/
    sources/
      datos-gov-co/
        trm.adapter.ts + trm.schema.ts (Zod) + trm.fixture.json
        ipc.adapter.ts ...            # dataset por confirmar (ver 3.4)
      gdelt/
        gdelt.adapter.ts + gdelt.schema.ts + fixtures/
      dane/ , banrep/                 # solo README + stub documentado (fase posterior)
    http/fetcher.ts                   # fetch con timeout/reintento/User-Agent
    ai/
      noop-signal-analyzer.ts         # NoopAnalyzer (default)
      # ai-sdk-signal-analyzer.ts     # futuro
    logging/console-logger.ts
  features/                          # UI vertical, ya existe
    trm/ (existente)  noticias/  macro/  alertas/  fuentes/  resumen/
      components, containers (TanStack/Zustand), hooks
  stores/                            # Zustand + persist (solo cliente)
    signals.store.ts  alerts.store.ts  preferences.store.ts  storage.ts
  app/
    api/sources/gdelt/route.ts       # Route Handler proxy mínimo
    api/health/route.ts              # opcional: estado de fuentes
    (rutas existentes: /, /dias, /alertas) + /noticias, /macro, /fuentes
  lib/                               # utilidades genéricas existentes
```

Regla de dependencias (lint): `core` no importa de `infrastructure`, `features`, `stores` ni `app`. Hacer cumplir con restricción de imports de oxlint **[NV: confirmar soporte de la regla `no-restricted-imports` en oxlint]** o con `eslint-plugin-boundaries` en una paso aparte.

### 3.1 Tipos del dominio (boceto)

```ts
// core/domain/provenance.ts
export interface Provenance {
  sourceId: SourceId;            // "datos-gov-co:trm" | "gdelt:doc"
  url: string;                   // URL consultada (sin tokens)
  fetchedAt: string;             // ISO UTC
  license?: string;
  rawHash?: string;              // para auditar cambios de datos
}

// core/domain/source.ts
export type SourceId = string & { readonly __brand: "SourceId" };
export type Dimension = "procurement" | "regulation" | "competitors" | "market" | "macro";
export interface Source {
  id: SourceId; name: string; dimensions: Dimension[];
  kind: "indicator" | "news" | "dataset";
  refreshHint: "hourly" | "daily" | "monthly";
  status: "active" | "planned";   // DANE/Banrep = "planned"
}

// core/domain/indicator.ts
export type IndicatorId = "trm" | "ipc" | "pib"; // extensible
export interface Observation {
  indicatorId: IndicatorId;
  date: string;                   // ISO "YYYY-MM-DD"
  value: number;
  unit: string;                   // "COP/USD", "%", ...
  provenance: Provenance;
}

// core/domain/news.ts
export interface NewsItem {
  id: string;                     // hash estable de la URL canónica
  title: string;                  // TEXTO PLANO, no confiable
  url: string;                    // solo http(s), validado
  domain: string;
  publishedAt: string;
  language?: string;
  tone?: number;
  matchedTerms: string[];
  provenance: Provenance;
}

// core/domain/signal.ts
export type Severity = "info" | "watch" | "alert";
export interface Signal {
  id: string;                     // determinista: `${ruleId}:${subject}:${date}`
  ruleId: string;                 // "trm.daily-move.v1"
  dimension: Dimension;
  severity: Severity;
  title: string;                  // generado por regla, plantilla controlada
  detail: string;
  occurredAt: string;
  evidence: Array<{ kind: "observation" | "news"; ref: string }>;
  provenance: Provenance[];
  analysis?: SignalAnalysis;      // opcional, relleno por IA en el futuro
}

// core/domain/alert.ts  (acción del usuario sobre una señal)
export interface Alert {
  signalId: string;
  state: "saved" | "dismissed" | "resolved";
  note?: string;
  createdAt: string;
  signalSnapshot: Signal;         // copia: la señal puede desaparecer de la fuente
}
```

Migración de datos locales: hoy la clave `smurfit-trm:alertas` guarda `string[]` (`use-alertas.ts:6`); el nuevo store usa `version: 1` y `migrate` que convierte ids antiguos a `Alert`.

### 3.2 Puertos

```ts
// core/ports/source-adapter.ts
export type Result<T, E = SourceError> = { ok: true; value: T } | { ok: false; error: E };
export interface SourceError { sourceId: SourceId; kind: "network"|"rate_limited"|"schema"|"empty"|"unknown"; status?: number; message: string }
export interface SourceAdapter<TQuery, TData> {
  readonly source: Source;
  fetch(query: TQuery, opts: { signal?: AbortSignal; now: Date }): Promise<Result<{ data: TData; provenance: Provenance }>>;
}

// core/ports/signal-analyzer.ts  (IA futura)
export interface AnalysisInput {
  signal: Pick<Signal, "id"|"ruleId"|"dimension"|"severity"|"occurredAt">;
  facts: ReadonlyArray<{ label: string; value: string }>;  // estructurado y generado por nosotros
  untrustedText?: ReadonlyArray<{ origin: string; text: string }>; // titulares: marcado como NO confiable
}
export interface SignalAnalysis { summary: string; rationale: string; confidence: "low"|"medium"|"high"; model?: string; generatedAt: string }
export interface SignalAnalyzer { analyze(input: AnalysisInput, opts?: { signal?: AbortSignal }): Promise<Result<SignalAnalysis, AnalyzerError>> }
export interface Summarizer   { summarize(signals: Signal[], opts?: { signal?: AbortSignal }): Promise<Result<string, AnalyzerError>> }
```

```ts
// infrastructure/ai/noop-signal-analyzer.ts
export class NoopSignalAnalyzer implements SignalAnalyzer, Summarizer {
  async analyze() { return { ok: false as const, error: { kind: "disabled" as const, message: "IA desactivada" } } }
  async summarize() { return { ok: false as const, error: { kind: "disabled" as const, message: "IA desactivada" } } }
}
```

La UI consulta `analysis?` y, si no existe, no muestra nada (feature flag por composición, no por `if` dispersos). La composición se hace en un único `composition-root.ts` (`src/app/composition.ts`).

### 3.3 Reglas puras (ejemplo y tests primero)

```ts
// core/rules/variation.ts
export function dailyVariation(prev: Observation, curr: Observation): number | null  // % o null si prev=0
export function detectAtypicalMoves(obs: readonly Observation[], thresholdPct: number): Signal[]
```
Primera migración: extraer `procesar()` de `use-trm.ts:10-27` y el umbral `UMBRAL_ATIPICO_PCT` a `core/rules/variation.ts` con tests, sin cambiar comportamiento (refactor con red de seguridad).

### 3.4 Fuentes iniciales y futuras

- **TRM**: dataset `mcec-87by` de datos.gov.co (ya en uso, `api.ts:3`) **[V por el README, 2026-?; reconfirmar con curl al construir el adaptador]**.
- **IPC/inflación y PIB en datos.gov.co**: la búsqueda en el catálogo Socrata mostró resultados municipales (p. ej. IPC Cali 1999-2016, id `59pf-h8xn`, de DANE vía Planeación Municipal) **[V]**, no un dataset nacional mensual vigente. **[NV]** que exista uno nacional actualizado en datos.gov.co: investigar en una tarea de spike antes de prometerlo. DANE publica el IPC el quinto día hábil de cada mes (glosario Banrep, banrep.gov.co/es/glosario/indice-precios-al-consumidor-ipc) → `refreshHint: "monthly"`.
- **DANE y Banco de la República**: dejar documentados como `status: "planned"` con stub y README (URLs oficiales, formato, periodicidad). Su API (SUAMECA / servicios DANE) **[NV]** no fue verificada: no hubo hallazgo concluyente en la búsqueda.
- **GDELT DOC 2.0**: endpoint `https://api.gdeltproject.org/api/v2/doc/doc`, `mode=artlist`, `format=json`, `timespan` (mín. 15 min), `maxrecords` ≤ 250, operadores `sourcecountry:`, `sourcelang:`, `domain:`; CORS `*` (blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/) **[V]**. Límite real: 1 petición/5 s **[V, observado]**. Consultas sugeridas: `"Smurfit Westrock"`, `"Smurfit Kappa"`, `cartón corrugado Colombia`, competidores (**[NV]** lista de competidores a definir con el usuario). Un solo proxy con cola secuencial (≥5 s entre consultas) y caché.

## 4. Seguridad (app pública, contenido externo)

1. **Sin secretos en cliente**: ningún token con prefijo `NEXT_PUBLIC_`. App token de Socrata (opcional) y futuras claves de IA solo en variables de entorno de servidor, leídas en Route Handlers/RSC. Mientras no hay IA ni claves, la superficie es mínima. Añadir `.env.example` y regla de revisión.
2. **Route Handler proxy como superficie de abuso**: es público. Aceptar solo parámetros de una lista cerrada (`sourceId`, `window`), validar con Zod, **no** aceptar URL ni query libre (evita SSRF/open proxy), limitar `maxrecords`, responder con `Cache-Control`. Rate limiting por IP real requiere almacén compartido (KV/Upstash, **[NV]** planes gratuitos); en el MVP se mitiga con caché agresiva (la misma respuesta para todos) y reglas WAF de Vercel (Hobby: 3 reglas custom **[V]**).
3. **CSP**: hoy ausente (`next.config.ts:4-10`). Con nonce, **todas las páginas deben renderizarse dinámicamente, se deshabilitan ISR/CDN y PPR es incompatible** **[V]** nextjs.org/docs/app/guides/content-security-policy → choca con el objetivo de shell prerenderizado. Opciones: (a) CSP por `headers()` en `next.config.ts` con `script-src 'self' 'unsafe-inline'` (aceptable para app sin entrada de usuario renderizada como HTML; mantiene estático), (b) `experimental.sri` (hash, estático, experimental). Recomendado (a) ahora + `object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`, y `connect-src 'self' https://www.datos.gov.co` (+ GDELT solo si se llama desde cliente; con proxy basta `'self'`). `img-src 'self' data:` y **no** cargar imágenes de noticias externas (evita tracking y contenido arbitrario). Probar con `Content-Security-Policy-Report-Only` primero.
4. **Contenido externo no confiable**: (i) renderizar títulos/URLs como texto (React escapa); (ii) validar URLs con `new URL()` y permitir solo `http:`/`https:` (bloquear `javascript:`), `rel="noopener noreferrer nofollow"` y `target="_blank"`; (iii) limitar longitud, normalizar Unicode y quitar caracteres de control/bidi del título al ingerir; (iv) nunca `dangerouslySetInnerHTML` con datos externos (el único uso actual es CSS de tema en `chart.tsx:94`, fuente interna; añadir test/regla que prohíba nuevos usos); (v) Zod en cada borde; (vi) límite de tamaño de respuesta.
5. **Preparación para IA (prompt injection)**: el puerto separa `facts` (generados por nosotros, estructurados) de `untrustedText` (titulares). Mitigaciones de diseño para el adaptador futuro: delimitar y etiquetar texto no confiable como datos; instrucciones fijas de sistema que prohíben seguir instrucciones del contenido; salida con esquema (Zod/JSON) y validación; sin herramientas/acciones ni acceso a red en la llamada; la IA solo resume, **no** crea ni descarta señales ni cambia severidad; mostrar siempre la fuente y marcar "generado por IA"; límites de tokens y de frecuencia; guardar `model` y `generatedAt`. Los datos que influyen en alertas siguen reglas deterministas.
6. **Monitoreo de integraciones fallidas a costo cero**: `Logger` puerto → en servidor `console.error` JSON estructurado (`{event:"source_failed", sourceId, kind, status, durationMs}`) que Vercel muestra en Runtime Logs (solo 1 h de retención en Hobby **[V]**, 1 día en Pro); estado por fuente expuesto en UI (`Fuentes`: último éxito, último error, "dato desactualizado hace X") guardado en el store como `SourceHealth` y devuelto por el proxy (`X-Source-Status`). Para historial más largo: Vercel Drains solo en Pro **[V]**; alternativas gratuitas (Sentry free, Better Stack) **[NV]** límites no verificados. Tratar "dato obsoleto" como estado visible, nunca fallar silenciosamente (principio ya seguido en el README sobre GDELT).
7. **Otros**: mantener los headers existentes (`next.config.ts:4-10`); añadir `Cross-Origin-Opener-Policy: same-origin` **[NV impacto]**; `pnpm audit`/Dependabot en CI; fijar versiones (lockfile ya presente); `pnpm-workspace.yaml` revisar `onlyBuiltDependencies`. localStorage es legible por cualquier script del origen: no guardar datos sensibles (no los hay) y versionar/validar al hidratar (JSON corrupto no debe romper la app: `merge`/`migrate` con Zod `safeParse`, descartando datos inválidos).
8. **Aviso legal/marca**: el README ya declara "prototipo no oficial". Mantenerlo visible en la UI (footer) al ser público; no usar logos de la empresa **[NV: política de marca no revisada]**.

## 5. Estrategia de pruebas (TDD)

Orden sugerido (de más a menos valor/menos costo):

1. **Reglas puras** (`core/rules/*`): tabla de casos (variación exacta en el umbral, valor previo 0/NaN, serie de 1 elemento, huecos de fin de semana, orden desordenado, deduplicación, severidades). Rápidas, sin mocks. Primero RED.
2. **Adaptadores con fixtures grabados**: guardar respuestas reales anonimizadas (TRM, GDELT con resultados, GDELT `{}`, GDELT 429 con texto plano, campos faltantes, tipos cambiados) en `infrastructure/sources/**/fixtures/`. Verificar mapeo a `Observation`/`NewsItem`, `Provenance`, errores tipados (`rate_limited`, `schema`, `empty`) con `fetch` inyectado. Un contract test opcional "en vivo" marcado `@live`, **fuera** del CI por defecto (corre manual/cron semanal) para detectar cambios de formato.
3. **Stores Zustand**: crear el store con un storage en memoria inyectado (`createJSONStorage(() => memoryStorage)`); probar acciones, `partialize`, `migrate` v0→v1 (ids antiguos `string[]`), JSON corrupto, `hasHydrated`.
4. **Casos de uso**: `detect-signals` con `Clock` falso y adaptadores falsos; degradación (una fuente falla, las otras siguen).
5. **Route Handler**: invocar `GET(request)` directamente con `Request` en Vitest (entorno node) + MSW para GDELT; probar parámetros inválidos → 400, 429 upstream → respuesta degradada con caché.
6. **Componentes cliente**: Testing Library para filtros, tabla, estados de error/vacío/stale; no para Server Components `async` (E2E) **[V]**.
7. **E2E Playwright (humo)**: 2–3 escenarios con `page.route`.
8. **Convenciones**: archivos `*.test.ts` colocalizados; `vitest.config.mts` con proyectos separados `unit` (node) y `ui` (jsdom); cobertura informativa en núcleo (umbral sugerido ≥90 % en `core/rules`, sin umbral global al inicio). Tests de arquitectura: un test que falle si `core/` importa `react`/`next`/`zustand`.

### 5.1 Cambios en CI (`.github/workflows/ci.yml`, hoy lint → typecheck → build)

- Agregar scripts `test` (`vitest run`), `test:watch`, `test:e2e`.
- Pasos: `pnpm lint` → `pnpm typecheck` → `pnpm test` → `pnpm build` → (job aparte) `pnpm exec playwright install --with-deps chromium && pnpm test:e2e` con caché de navegadores.
- Job separado `live-contract` con `workflow_dispatch`/`schedule` semanal para tests `@live` (no bloquea PRs).
- Mantener `timeout-minutes` y `concurrency` actuales (`ci.yml`). `permissions: contents: read` ya es mínimo.
- Riesgo conocido del repo: oxlint ya emite 1 warning por react-table (`odd/tasks/nextjs-migration.md:107`).

## 6. Proceso ODD y plan de unidades de trabajo sugerido

Feature doc `odd/tasks/<feature>.md` + espejo Engram `odd/<feature>/tasks`, tarea por tarea, commit por unidad de trabajo (Conventional Commits en español como en el historial reciente). Propuesta de tareas (tamaño orientativo ≤400 líneas cada una):

1. T1 Infra de tests: Vitest + RTL + script + CI (sin lógica nueva).
2. T2 `core/domain` + `core/ports` (tipos) + test de arquitectura de imports.
3. T3 `core/rules/variation` extrayendo `procesar()` (TDD, comportamiento idéntico) y adaptador TRM con Zod + fixtures.
4. T4 Stores Zustand (`alerts`, `preferences`, `signals`) con persist, migración de `smurfit-trm:alertas`, `StoreHydrator`.
5. T5 Fetch servidor de TRM (RSC + caché) y `initialData` al cliente; decidir `cacheComponents` vs `revalidate`.
6. T6 Route Handler GDELT + adaptador + estados degradados + UI Noticias (ReUI `timeline`/`filters`).
7. T7 Segunda fuente macro (IPC; spike previo) y página Macro.
8. T8 Puerto IA + `NoopSignalAnalyzer` + composición.
9. T9 CSP + endurecimiento + salud de fuentes (pantalla Fuentes).
10. T10 E2E de humo + preparación Vercel (`vercel.json`, variables, checklist) sin desplegar.

## 7. Riesgos abiertos / pendientes de decisión

1. **Licencia Vercel Hobby vs uso comercial** (1.4). Bloquea el despliegue, no el desarrollo.
2. `cacheComponents` en un repo existente: requiere ajustar uso de tiempo/aleatoriedad y Suspense; hacer spike.
3. GDELT: 429 persistente desde IPs compartidas, resultado vacío como `{}`, calidad de coincidencias para empresas (ruido por homónimos) → reglas de relevancia y lista de exclusión.
4. IPC/PIB: dataset nacional en datos.gov.co **no confirmado**; DANE/Banrep sin API verificada.
5. Competidores y términos de vigilancia: lista no definida (pregunta de producto para el usuario).
6. Compatibilidad exacta de MSW 3 / Vitest 5 / Node 24 / oxlint reglas de límites: no verificada.
7. Tamaño de `persist` en localStorage (~5 MB por origen): definir retención (p. ej. últimas N señales / 90 días) en `partialize`.

## Fuentes consultadas (2026-10-20)

- https://vercel.com/docs/plans/hobby · https://vercel.com/docs/limits · https://vercel.com/docs/limits/fair-use-guidelines · https://vercel.com/docs/cron-jobs/usage-and-pricing
- https://nextjs.org/docs/app/getting-started/caching · https://nextjs.org/docs/app/guides/content-security-policy · https://nextjs.org/docs/app/guides/testing/vitest
- https://tanstack.com/start/latest/docs/framework/react/overview
- https://zustand.docs.pmnd.rs/reference/integrations/persisting-store-data
- https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ (más prueba directa del endpoint)
- https://dev.socrata.com/docs/app-tokens.html · catálogo Socrata `api.us.socrata.com/api/catalog/v1`
- https://www.banrep.gov.co/es/glosario/indice-precios-al-consumidor-ipc
- ReUI vía MCP `list_components` (27 componentes) · `npm view` (versiones/licencias)
