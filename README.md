# Smart Work Core (SWC)

Smart Work Core lee el contexto de Colombia para que una empresa decida con datos: tipo de cambio, contratación
pública, macroeconomía, competidores, noticias, regulación y energía. Junta datos públicos, los convierte en señales
con reglas visibles y deja un asistente de IA para preguntar sobre ellos.

Funciona para cualquier empresa. Cada empresa tiene su propio perfil (nombre, NIT opcional, competidores, palabras
clave, umbrales y objetivos) y todos sus datos se guardan en el navegador, separados por empresa
(`swc:<idEmpresa>:<nombre>:v1`). **Herramienta independiente:** no tiene relación con las entidades que publican los datos.

## Qué hace hoy

- **Radar**: resumen del día con las señales más importantes.
- **Señales**: lo que detectan las reglas (TRM, contratos, competidores, noticias, regulación, energía), con enlace al registro original.
- **Alertas**: señales guardadas por el usuario. **Línea de tiempo**: lo ocurrido, ordenado por fecha.
- **PESTEL**: las señales agrupadas por factor político, económico, social, tecnológico, ecológico y legal.
- **Briefing**: resumen semanal para imprimir o copiar.
- **Seguimiento**: competidores e indicadores marcados para vigilar.
- **Macro** (PIB, inflación, exportaciones, TRM con histórico y días atípicos), **Contratación** (SECOP II), **Competidores** (SECOP II y Supersociedades).
- **Noticias** (medios colombianos y Google News) y **Regulación** (Minambiente, decretos de Presidencia y normas curadas).
- **Asistente**: chat de IA que lee los datos de la app y, si se activa, busca en internet. Puede equivocarse y cita sus fuentes.
- **Fuentes**: estado de cada fuente (último dato, último error, licencia, interruptor del servidor) con reintento por fuente.
- **Preferencias** (umbrales y términos editables) y **Acerca de** (alcance, licencias y privacidad).

Todo lo que guarda el usuario (empresas, alertas, seguimiento, preferencias, chats) vive en su navegador. El servidor no
guarda perfiles: el navegador envía el contexto mínimo de la empresa activa (nombre, NIT, competidores y palabras
clave) con cada consulta de noticias, regulación y chat, y el servidor lo valida como dato no confiable.

Hoy la app muestra un aviso mientras no haya una empresa activa; el selector de empresas y el onboarding con IA
están en desarrollo (ver `odd/tasks/swc-multiempresa.md`).

## Cómo correrlo

Requiere Node 24 y pnpm.

```bash
pnpm install
cp .env.example .env.local   # completa las claves del asistente; la app funciona sin ellas
pnpm dev                     # http://localhost:3000
```

```bash
pnpm test        # pruebas unitarias y de componentes (Vitest)
pnpm test:e2e    # pruebas de extremo a extremo (Playwright); usa el servidor en :3000 o lo levanta
pnpm lint        # oxlint
pnpm typecheck   # tsc --noEmit
pnpm build       # build de producción
```

Las variables de entorno se leen solo en el servidor. La tabla completa está en [docs/deploy.md](docs/deploy.md).
La integración continua (`.github/workflows/ci.yml`) corre lint, typecheck, test y build; las pruebas e2e quedan fuera
porque necesitan un navegador y un servidor en marcha.

## Despliegue

Vercel hoy y un contenedor (`Dockerfile`, Node 24, usuario sin privilegios) para producción.
Pasos, variables y lista de revisión: [docs/deploy.md](docs/deploy.md).

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. UI con shadcn/ReUI. TanStack Query para datos,
TanStack Table y Form, Zustand para el estado local, Recharts para los gráficos y Vercel AI SDK para el asistente.
Las reglas y el modelo de empresa (`CompanyProfile`) viven en `src/core` (sin dependencias de framework), los
adaptadores de fuentes en `src/infrastructure` y las pantallas en `src/features`.
