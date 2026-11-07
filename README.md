# Smart Work Core

## Resumen

Radar de inteligencia empresarial para Colombia. Combina datos públicos de economía, contratación, noticias, regulación y energía para generar señales y explorar cómo afectan a una empresa.

## Qué permite hacer

- Consultar el radar, la línea de tiempo y las señales con enlaces a los registros originales.
- Guardar alertas, seguir competidores e indicadores y agrupar señales por factor PESTEL.
- Preparar un briefing y consultar los datos con el asistente de IA si está configurado.
- Crear perfiles de empresa, cambiar de empresa activa y ajustar competidores, palabras clave y umbrales.

## Cómo funciona

La aplicación usa Next.js, React, TypeScript, Tailwind CSS y el SDK de IA de Vercel. El modelo de empresa y las reglas están en [src/core](src/core). Los adaptadores de fuentes viven en [src/infrastructure](src/infrastructure).

Los perfiles y preferencias se guardan en el navegador. Las consultas al servidor incluyen el contexto necesario de la empresa activa. El radar es una herramienta independiente y enlaza a las entidades que publican los datos.

## Desarrollo local

Usa Node.js 24 y la versión de pnpm de [package.json](package.json).

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Abre `http://localhost:3000`. Consulta [docs/deploy.md](docs/deploy.md) para las variables del asistente, el despliegue y el contenedor.

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Usa `pnpm test:e2e` para las pruebas de Playwright.

## English summary

A business intelligence dashboard for Colombia. It turns public data on the economy, procurement, news, regulation, and energy into signals that teams can explore in the context of a company.
