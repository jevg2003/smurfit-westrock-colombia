# Monitor de entorno — Smurfit Westrock Colombia (prototipo)

MVP de un día: panel que monitorea la **TRM (tasa representativa del mercado, COP/USD)** con histórico,
detección de variaciones atípicas y alertas guardadas. Pensado para una empresa real expuesta al tipo
de cambio por importar insumos (pulpa, maquinaria) y exportar empaques de papel/cartón.

**Prototipo no oficial.** No tiene relación con, ni está avalado por, Smurfit Westrock. Se construyó
sobre el perfil público de la empresa como ejercicio de diseño de producto.

## Cómo correrlo

```bash
npm install
npm run dev
```

Login demo: usuario `analista`, contraseña `smurfit2026` (no es autenticación real, la sesión vive
solo en `localStorage` del navegador).

## Por qué TRM y no otra cosa (la historia real de las decisiones)

El plan original era monitorear licitaciones públicas (SECOP II) para una empresa proveedora de TI
al Estado — una hipótesis de trabajo. Cuando se confirmó que la empresa real es **Smurfit Westrock
Colombia** (papel, cartón corrugado y empaques, antes Smurfit Kappa Cartón de Colombia), se verificó
en vivo contra la API de `datos.gov.co` cuánto volumen real de contratación pública existe en
categorías de papel/cartón/empaques: resultó ser casi todo papelería de oficina (resmas, útiles
escolares) y cajas industriales con conteos de un dígito — **no es una señal útil para esta empresa**.
Se descartó en lugar de forzarla.

Como alternativa se probó **GDELT** (noticias globales, sin clave) para monitorear menciones de la
empresa y el sector. La API respondió con límite de tasa (`"Please limit requests to one every 5
seconds…"`) de forma persistente, incluso con esperas de 15 segundos y desde el navegador — no se
pudo verificar como confiable para una demo, así que se descartó también, siguiendo la regla de no
prometer integraciones que no se pueden demostrar funcionando.

Se verificó entonces el dataset de **TRM histórica de datos.gov.co** (`mcec-87by`, Banco de la
República publicado como dato abierto): responde con datos diarios reales, hasta el día de hoy, sin
clave. Es además la señal de entorno más directamente relevante para una empresa que importa insumos
y exporta en dólares. Se construyó el MVP sobre esa base.

## Qué hace

- **KPIs**: TRM de hoy, variación vs. día anterior, máximo del período, días con variación atípica,
  alertas guardadas.
- **Histórico**: nivel de la TRM y variación diaria (%), en paneles separados (nunca un eje dual) con
  colores que siguen el signo de la variación.
- **Tabla de días**: ordenable, filtrable a "solo variaciones atípicas" (≥1% vs. día anterior — regla
  explícita y visible, no un puntaje de IA), con botón para guardar un día como alerta (persiste en
  `localStorage`) y exportar a CSV.
- **Trazabilidad**: cada dato viene de `https://www.datos.gov.co/resource/mcec-87by.json`, consultado
  en vivo desde el navegador.

## Qué NO incluye (explícitamente fuera de alcance del día 1)

- IA / resúmenes automáticos — decisión tuya en la entrevista de alcance, se dejó el hueco libre para
  sumar Vercel AI Gateway después sin rearquitecturar.
- Multi-empresa, roles múltiples, autenticación real.
- Noticias/señales cualitativas (GDELT no fue viable hoy — ver sección anterior).
- Persistencia en servidor: todo vive en el navegador (sesión y alertas en `localStorage`).

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4. UI con shadcn/ReUI (estilo base-nova).
TanStack Query para datos, TanStack Table para la tabla, Recharts para los gráficos. Un solo archivo de
estilos: `src/app/globals.css`. La sesión demo y las alertas viven en `localStorage` (cliente), por eso las
vistas son componentes de cliente.
Paleta y especificaciones de marcas/ejes siguen la skill `dataviz` (un solo eje, color por el signo de
la variación, leyenda nunca solo por color).

## Próximos pasos sugeridos

1. Sumar una segunda fuente verificada (ej. IPC de datos.gov.co, validando antes el formato real
   como se hizo con la TRM) para no depender de una sola variable.
2. Resumen ejecutivo con IA (Vercel AI Gateway) sobre los días atípicos, citando siempre la fuente.
3. Autenticación real si esto deja de ser un prototipo de demostración.
