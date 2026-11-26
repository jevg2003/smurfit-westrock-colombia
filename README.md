# Smart Work Core

[English](./README.en.md) | Español

Smart Work Core (SWC) es un radar de inteligencia empresarial para Colombia. Combina datos públicos de economía, contratación, noticias, regulación y energía para generar señales y explorar cómo afectan a una empresa. Nació como un encargo universitario. Jorge Velásquez ([@jevg2003](https://github.com/jevg2003)) creó el repositorio inicial y Nicolas Arbelaez diseñó y desarrolló la aplicación.

## Qué permite hacer

- Consultar el radar, la línea de tiempo y las señales con enlaces a los registros originales.
- Guardar alertas, seguir competidores e indicadores y agrupar señales por factor PESTEL.
- Preparar un briefing semanal (exportable a Markdown y CSV) y consultar los datos con el asistente de IA si está configurado.
- Crear perfiles de empresa, cambiar de empresa activa y ajustar competidores, palabras clave y umbrales.

## Cómo funciona

Las reglas son TypeScript puro en `src/core` (TRM, vencimiento de contratos, contratos nuevos de competidores, precio de energía, menciones en noticias y regulación). Los adaptadores de fuentes viven en `src/infrastructure`. Cada regla produce una señal con severidad (informativa, vigilar, alerta) y el enlace al registro original.

Los perfiles y preferencias se guardan en el navegador. Las consultas al servidor incluyen el contexto necesario de la empresa activa, y el servidor funciona como proxy cerrado hacia las fuentes. El asistente de IA llama herramientas de solo lectura sobre datos en vivo; no usa RAG ni búsqueda vectorial. El radar es una herramienta independiente y enlaza a las entidades que publican los datos.

Fuentes: datos.gov.co (TRM de la Superfinanciera, contratos SECOP II, informes financieros de Supersociedades), Banco Mundial (crecimiento del PIB e inflación), XM (precio de energía en bolsa), RSS de medios colombianos, Minambiente y decretos de Presidencia, además de normas curadas a mano.

## Stack

| Capa           | Tecnología                                                                                          |
| -------------- | --------------------------------------------------------------------------------------------------- |
| Framework      | Next.js ^16.4.2 (App Router), React ^19.3.1, TypeScript ~6.0.3                                       |
| Estilos        | Tailwind CSS ^4.3.3, `@base-ui/react` ^1.9.0, `tw-animate-css`                                       |
| Estado y datos | Zustand ^5.0.15, TanStack Query ^5.104.5, TanStack Form ^1.33.5, Zod ^4.6.7                          |
| IA             | Vercel AI SDK (`ai` ^7.0.145, `@ai-sdk/openai` ^4.0.97, `@ai-sdk/react` ^4.0.149), OpenAI u OpenRouter |
| Gráficos       | Recharts ^3.8.0                                                                                      |
| Seguridad      | Cloudflare Access con validación de JWT (jose ^6.2.12), cabeceras HSTS y CSP                         |
| Pruebas        | Vitest ^5.0.5, Testing Library, Playwright ^1.64.1                                                   |
| Lint           | oxlint ^1.88.0                                                                                       |
| Herramientas   | pnpm 11.5.1, Node.js 24.x                                                                            |
| Despliegue     | Vercel y contenedor Docker (salida `standalone`)                                                     |

## Requisitos

Node.js 24 y la versión de pnpm de [package.json](package.json). No necesita base de datos.

## Desarrollo local

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre `http://localhost:3000`. Consulta [docs/deploy.md](docs/deploy.md) para las variables del asistente, el despliegue y el contenedor. Las claves (`OPENAI_API_KEY` u `OPENROUTER_API_KEY`) van solo en `.env.local` o en el entorno del servidor, nunca en el repositorio. Sin clave de IA la aplicación funciona completa y el asistente avisa que no está configurado.

## Scripts

| Comando          | Qué hace                    |
| ---------------- | --------------------------- |
| `pnpm dev`       | Servidor de desarrollo      |
| `pnpm build`     | Compilación de producción   |
| `pnpm start`     | Sirve la compilación        |
| `pnpm test`      | Pruebas con Vitest          |
| `pnpm test:e2e`  | Pruebas de Playwright       |
| `pnpm typecheck` | Verificación de tipos       |
| `pnpm lint`      | oxlint                      |

## Estructura

```
src/
├── app/             # rutas de Next.js: (app) resumen, economía, noticias, análisis, asistente, configuración; (account); api
├── core/            # dominio, reglas, casos de uso, puertos (sin dependencias de framework)
├── infrastructure/  # fuentes de datos, IA, HTTP, reloj, logging, flags
├── features/        # interfaz por funcionalidad (radar, timeline, pestel, briefing, asistente, ...)
├── components/      # componentes compartidos
├── stores/          # estado del cliente (Zustand)
└── lib/             # utilidades
docs/                # despliegue, Cloudflare Access, arquitectura
e2e/                 # pruebas de Playwright
```

## Documentación

- [`docs/architecture.md`](./docs/architecture.md): contexto, flujo principal, fuentes y decisiones.
- [`docs/deploy.md`](./docs/deploy.md): variables, Vercel y contenedor.
- [`docs/cloudflare-access.md`](./docs/cloudflare-access.md): acceso protegido con Cloudflare.
