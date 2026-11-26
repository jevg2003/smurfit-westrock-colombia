# Smart Work Core architecture

English | [Español](./architecture.md)

## Context

A Next.js application with no database. The browser stores company profiles; the server queries public sources, runs the rules, and responds. The AI assistant is optional.

```mermaid
flowchart LR
  user["User"]
  cf["Cloudflare Access (JWT)"]

  subgraph app["Next.js (Vercel or container)"]
    ui["features: radar, timeline, PESTEL, briefing, assistant"]
    store["Zustand: profiles and preferences (browser)"]
    routes["app/api: news, energy, regulation, sources, chat, onboarding"]
    core["core: rules, use cases, ports"]
    infra["infrastructure: source and AI adapters"]
  end

  subgraph sources["Public sources"]
    dg["datos.gov.co: TRM, SECOP II, Supersociedades"]
    wb["World Bank"]
    xm["XM: energy"]
    rss["RSS, Minambiente, decrees"]
  end

  llm["OpenAI or OpenRouter"]

  user --> cf
  cf --> ui
  ui --> store
  ui --> routes
  routes --> core
  core --> infra
  infra --> dg
  infra --> wb
  infra --> xm
  infra --> rss
  infra -.->|"optional"| llm
```

## Main flow: from data to signal

```mermaid
sequenceDiagram
  autonumber
  actor U as "User"
  participant UI as "Interface"
  participant API as "Route handlers"
  participant S as "Source adapters"
  participant R as "Rule engine (core)"

  U->>UI: "Opens the radar with the active company"
  UI->>API: "Request with profile, thresholds, keywords"
  API->>S: "Fetch TRM, contracts, news, regulation, energy"
  S-->>API: "Normalized records"
  API->>R: "detect-signals with the company profile"
  R-->>API: "Signals with severity, rule, and link to the original"
  API-->>UI: "Signals"
  UI->>U: "Radar, timeline, PESTEL, and briefing"
```

## Assistant flow

```mermaid
sequenceDiagram
  autonumber
  actor U as "User"
  participant C as "/api/chat (streaming)"
  participant M as "Model (OpenAI or OpenRouter)"
  participant T as "Read-only tools"

  U->>C: "Question"
  C->>M: "System prompt with untrusted-data rules and company context"
  loop "Until it answers"
    M->>T: "get_trm, get_secop_contracts, get_news, detect_signals, ..."
    T-->>M: "Live data from the sources"
  end
  M-->>C: "Streamed answer"
  C-->>U: "Answer"
```

## Folder structure

| Path | Purpose |
| ---- | ------- |
| `src/core/domain`, `rules` | Company model, signals, and pure rules: TRM, contract expiry, competitor contracts, energy, news, regulation, severity, and deduplication |
| `src/core/usecases` | `detect-signals`, `build-timeline`, `build-pestel`, `build-briefing`, and Markdown and CSV export |
| `src/core/ports` | Contracts: source, clock, logger, signal analyzer |
| `src/infrastructure/sources` | Adapters for datos.gov.co, World Bank, XM, RSS, regulation, and curated norms |
| `src/infrastructure/ai` | Model, system prompt, assistant tools, and guided onboarding |
| `src/app` | Next.js routes and route handlers (`api/chat`, `api/news`, `api/energia`, `api/regulacion`, `api/fuentes`, `api/onboarding`) |
| `src/features` | UI per feature |
| `src/proxy.ts` | Cloudflare Access JWT validation and the public path list |

## Key decisions

- **Framework-free core**: rules live in `core` and depend on ports, not on Next.js; architecture tests (`architecture.test.ts`) guard the boundaries.
- **No database**: profiles live in the browser and the server is a closed proxy to the sources.
- **Assistant with read-only tools**: it calls tools over live data instead of RAG. The prompt treats data as untrusted to mitigate instruction injection.
- **Swappable AI provider**: OpenAI or OpenRouter through `AI_PROVIDER`; without a key the rest of the app works.
- **Per-source switches**: `FEATURE_*` variables turn each source off.
- **Protected access**: only the landing page is public; everything else requires Cloudflare Access and the app validates the JWT (RS256) in `src/proxy.ts`, failing closed. See [`cloudflare-access.md`](./cloudflare-access.md) (Spanish).
- **Dual deployment**: Vercel and a container with `standalone` output. See [`deploy.md`](./deploy.md) (Spanish).
