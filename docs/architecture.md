# Arquitectura de Smart Work Core

[English](./architecture.en.md) | Español

## Contexto

Una aplicación Next.js sin base de datos. El navegador guarda los perfiles de empresa; el servidor consulta fuentes públicas, ejecuta las reglas y responde. El asistente de IA es opcional.

```mermaid
flowchart LR
  user["Usuario"]
  cf["Cloudflare Access (JWT)"]

  subgraph app["Next.js (Vercel o contenedor)"]
    ui["features: radar, timeline, PESTEL, briefing, asistente"]
    store["Zustand: perfiles y preferencias (navegador)"]
    routes["app/api: news, energia, regulacion, fuentes, chat, onboarding"]
    core["core: reglas, casos de uso, puertos"]
    infra["infrastructure: adaptadores de fuentes e IA"]
  end

  subgraph sources["Fuentes publicas"]
    dg["datos.gov.co: TRM, SECOP II, Supersociedades"]
    wb["Banco Mundial"]
    xm["XM: energia"]
    rss["RSS, Minambiente, decretos"]
  end

  llm["OpenAI u OpenRouter"]

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
  infra -.->|"opcional"| llm
```

## Flujo principal: del dato a la señal

```mermaid
sequenceDiagram
  autonumber
  actor U as "Usuario"
  participant UI as "Interfaz"
  participant API as "Route handlers"
  participant S as "Adaptadores de fuentes"
  participant R as "Motor de reglas (core)"

  U->>UI: "Abre el radar con la empresa activa"
  UI->>API: "Consulta con perfil, umbrales y palabras clave"
  API->>S: "Pedir TRM, contratos, noticias, regulacion, energia"
  S-->>API: "Registros normalizados"
  API->>R: "detect-signals con el perfil de la empresa"
  R-->>API: "Senales con severidad, regla y enlace al original"
  API-->>UI: "Senales"
  UI->>U: "Radar, timeline, PESTEL y briefing"
```

## Flujo del asistente

```mermaid
sequenceDiagram
  autonumber
  actor U as "Usuario"
  participant C as "/api/chat (streaming)"
  participant M as "Modelo (OpenAI u OpenRouter)"
  participant T as "Herramientas de solo lectura"

  U->>C: "Pregunta"
  C->>M: "Prompt de sistema con datos no confiables y contexto de la empresa"
  loop "Hasta responder"
    M->>T: "get_trm, get_secop_contracts, get_news, detect_signals, ..."
    T-->>M: "Datos en vivo de las fuentes"
  end
  M-->>C: "Respuesta en streaming"
  C-->>U: "Respuesta"
```

## Estructura de carpetas

| Ruta | Propósito |
| ---- | --------- |
| `src/core/domain`, `rules` | Modelo de empresa, señales y reglas puras: TRM, vencimiento de contratos, contratos de competidores, energía, noticias, regulación, severidad y deduplicación |
| `src/core/usecases` | `detect-signals`, `build-timeline`, `build-pestel`, `build-briefing` y exportación a Markdown y CSV |
| `src/core/ports` | Contratos: fuente, reloj, logger, analizador de señales |
| `src/infrastructure/sources` | Adaptadores de datos.gov.co, Banco Mundial, XM, RSS, regulación y normas curadas |
| `src/infrastructure/ai` | Modelo, prompt de sistema, herramientas del asistente y onboarding guiado |
| `src/app` | Rutas de Next.js y route handlers (`api/chat`, `api/news`, `api/energia`, `api/regulacion`, `api/fuentes`, `api/onboarding`) |
| `src/features` | Interfaz por funcionalidad |
| `src/proxy.ts` | Validación del JWT de Cloudflare Access y lista de rutas públicas |

## Decisiones clave

- **Núcleo sin framework**: las reglas viven en `core` y dependen de puertos, no de Next.js; hay pruebas de arquitectura (`architecture.test.ts`) que protegen los límites.
- **Sin base de datos**: los perfiles viven en el navegador y el servidor es un proxy cerrado hacia las fuentes.
- **Asistente con herramientas de solo lectura**: llama herramientas sobre datos en vivo en lugar de RAG. El prompt trata los datos como no confiables para mitigar inyección de instrucciones.
- **Proveedor de IA intercambiable**: OpenAI u OpenRouter por `AI_PROVIDER`; sin clave el resto de la app funciona.
- **Interruptores por fuente**: variables `FEATURE_*` apagan cada fuente.
- **Acceso protegido**: solo el landing es público; el resto exige Cloudflare Access y la app valida el JWT (RS256) en `src/proxy.ts` y falla cerrada. Ver [`cloudflare-access.md`](./cloudflare-access.md).
- **Despliegue doble**: Vercel y un contenedor con salida `standalone`. Ver [`deploy.md`](./deploy.md).
