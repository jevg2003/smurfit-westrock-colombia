# Monitor de entorno — Smurfit Westrock Colombia (prototipo)

Panel que vigila el entorno de una empresa de empaques de papel y cartón en Colombia: tipo de cambio,
contratación pública, macroeconomía, competidores, noticias, regulación y energía. Junta datos públicos,
los convierte en señales con reglas visibles y deja un asistente de IA para preguntar sobre ellos.

**Prototipo no oficial.** No tiene relación con, ni está avalado por, Smurfit Westrock. Se construyó
sobre el perfil público de la empresa como ejercicio de diseño de producto.

## Qué hace hoy

- **Radar**: resumen del día con las señales más importantes.
- **Señales**: lo que detectan las reglas (TRM, contratos, competidores, noticias, regulación, energía), con enlace al registro original.
- **Alertas**: señales guardadas por el usuario. **Línea de tiempo**: lo ocurrido, ordenado por fecha.
- **PESTEL**: las señales agrupadas por factor político, económico, social, tecnológico, ecológico y legal.
- **Briefing**: resumen semanal para imprimir o copiar.
- **Seguimiento**: empresas y temas marcados para vigilar.
- **Macro** (PIB, inflación, exportaciones, TRM con histórico y días atípicos), **Contratación** (SECOP II), **Competidores** (SECOP II y Supersociedades).
- **Noticias** (medios colombianos y Google News) y **Regulación** (Minambiente, decretos de Presidencia y normas curadas).
- **Asistente**: chat de IA que lee los datos de la app y, si se activa, busca en internet. Puede equivocarse y cita sus fuentes.
- **Fuentes**: estado de cada fuente (último dato, último error, licencia, interruptor del servidor) con reintento por fuente.
- **Preferencias** (umbrales y términos editables) y **Acerca de** (alcance, licencias y privacidad).

Todo lo que guarda el usuario (alertas, seguimiento, preferencias, chats) vive en su navegador. No hay cuenta ni analítica.

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

Vercel hoy y un contenedor (`Dockerfile`, Node 24, usuario sin privilegios) para producción de la empresa.
Pasos, variables y lista de revisión: [docs/deploy.md](docs/deploy.md).

## Por qué TRM y no otra cosa (la historia real de las decisiones)

El plan original era monitorear licitaciones públicas (SECOP II) para una empresa proveedora de TI
al Estado — una hipótesis de trabajo. Cuando se confirmó que la empresa real es **Smurfit Westrock
Colombia** (papel, cartón corrugado y empaques, antes Smurfit Kappa Cartón de Colombia), se verificó
en vivo contra la API de `datos.gov.co` cuánto volumen real de contratación pública existe en
categorías de papel/cartón/empaques: resultó ser casi todo papelería de oficina (resmas, útiles
escolares) y cajas industriales con conteos de un dígito — **buscar por categoría de producto no es
una señal útil para esta empresa**. Se descartó esa vía en lugar de forzarla.

> **Corrección (2026-10-20):** una verificación posterior mostró que SECOP II **sí** sirve si se filtra
> por el NIT del proveedor (`documento_proveedor`) y no por categoría. Cartón de Colombia
> (890300406) y competidores como Cartones América (860026759), Carvajal Empaques (890319047) y
> Papeles y Cartones (890925108) aparecen con contratos reales. Evitar filtros `LIKE` sobre texto
> (tardan 12–48 s). Ver `docs/propuesta-mvp/propuesta-mvp.md`, sección 2.6.

Como alternativa se probó **GDELT** (noticias globales, sin clave) para monitorear menciones de la
empresa y el sector. La API respondió con límite de tasa (`"Please limit requests to one every 5
seconds…"`) de forma persistente, incluso con esperas de 15 segundos y desde el navegador — no se
pudo verificar como confiable para una demo, así que se descartó también, siguiendo la regla de no
prometer integraciones que no se pueden demostrar funcionando.

Se verificó entonces el dataset de **TRM histórica de datos.gov.co** (`mcec-87by`, publicado por la
Superintendencia Financiera de Colombia como dato abierto, CC BY-SA 4.0): responde con datos diarios
reales, hasta el día de hoy, sin clave. Es además la señal de entorno más directamente relevante para una empresa que importa insumos
y exporta en dólares. Se construyó el MVP sobre esa base.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. UI con shadcn/ReUI. TanStack Query para datos,
TanStack Table y Form, Zustand para el estado local, Recharts para los gráficos y Vercel AI SDK para el asistente.
Las reglas viven en `src/core` (sin dependencias de framework), los adaptadores de fuentes en `src/infrastructure`
y las pantallas en `src/features`.
