# Smart Work Core

English | [Español](./README.md)

Smart Work Core (SWC) is a business intelligence radar for Colombia. It turns public data on the economy, procurement, news, regulation, and energy into signals that teams can explore in the context of a company. It began as a university commission. Jorge Velásquez ([@jevg2003](https://github.com/jevg2003)) wrote the initial FX-rate (TRM) monitor prototype, and Nicolas Arbelaez built the current application.

## What it does

- Browse the radar, the timeline, and signals with links to the original records.
- Save alerts, follow competitors and indicators, and group signals by PESTEL factor.
- Prepare a weekly briefing (exportable to Markdown and CSV) and query the data with the AI assistant when it is configured.
- Create company profiles, switch the active company, and adjust competitors, keywords, and thresholds.

## How it works

Rules are plain TypeScript in `src/core` (TRM move, contract expiry, new competitor contracts, energy price, news and regulation mentions). Source adapters live in `src/infrastructure`. Each rule produces a signal with a severity (informative, watch, alert) and a link to the original record.

Profiles and preferences are stored in the browser. Server requests carry the active company's context, and the server acts as a closed proxy to the sources. The AI assistant calls read-only tools over live data; it does not use RAG or vector search. The radar is an independent tool and links to the entities that publish the data.

Sources: datos.gov.co (TRM from Superfinanciera, SECOP II contracts, Supersociedades financial reports), World Bank (GDP growth and inflation), XM (spot electricity price), RSS from Colombian media, Minambiente and Presidency decrees, plus hand-curated norms.

## Stack

| Layer          | Technology                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Framework      | Next.js ^16.4.2 (App Router), React ^19.3.1, TypeScript ~6.0.3                                        |
| Styling        | Tailwind CSS ^4.3.3, `@base-ui/react` ^1.9.0, `tw-animate-css`                                        |
| State and data | Zustand ^5.0.15, TanStack Query ^5.104.5, TanStack Form ^1.33.5, Zod ^4.6.7                           |
| AI             | Vercel AI SDK (`ai` ^7.0.145, `@ai-sdk/openai` ^4.0.97, `@ai-sdk/react` ^4.0.149), OpenAI or OpenRouter |
| Charts         | Recharts ^3.8.0                                                                                       |
| Security       | Cloudflare Access with JWT validation (jose ^6.2.12), HSTS and CSP headers                            |
| Testing        | Vitest ^5.0.5, Testing Library, Playwright ^1.64.1                                                    |
| Lint           | oxlint ^1.88.0                                                                                        |
| Tooling        | pnpm 11.5.1, Node.js 24.x                                                                             |
| Deployment     | Vercel and a Docker container (`standalone` output)                                                   |

## Requirements

Node.js 24 and the pnpm version in [package.json](package.json). No database needed.

## Local development

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. See [docs/deploy.md](docs/deploy.md) (Spanish) for the assistant variables, deployment, and the container. Keys (`OPENAI_API_KEY` or `OPENROUTER_API_KEY`) go only in `.env.local` or the server environment, never in the repository. Without an AI key the app works in full and the assistant says it is not configured.

## Scripts

| Command          | What it does              |
| ---------------- | ------------------------- |
| `pnpm dev`       | Development server        |
| `pnpm build`     | Production build          |
| `pnpm start`     | Serve the build           |
| `pnpm test`      | Vitest tests              |
| `pnpm test:e2e`  | Playwright tests          |
| `pnpm typecheck` | Type check                |
| `pnpm lint`      | oxlint                    |

## Structure

```
src/
├── app/             # Next.js routes: (app) overview, economy, news, analysis, assistant, settings; (account); api
├── core/            # domain, rules, use cases, ports (no framework dependencies)
├── infrastructure/  # data sources, AI, HTTP, clock, logging, flags
├── features/        # UI per feature (radar, timeline, pestel, briefing, assistant, ...)
├── components/      # shared components
├── stores/          # client state (Zustand)
└── lib/             # utilities
docs/                # deployment, Cloudflare Access, architecture
e2e/                 # Playwright tests
```

## Documentation

- [`docs/architecture.en.md`](./docs/architecture.en.md): context, main flow, sources, and decisions.
- [`docs/deploy.md`](./docs/deploy.md): variables, Vercel, and container (Spanish).
- [`docs/cloudflare-access.md`](./docs/cloudflare-access.md): access protected with Cloudflare (Spanish).
