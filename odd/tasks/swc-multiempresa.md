# SWC multiempresa

## Objetivo
Convertir la app de una sola empresa (Smurfit Westrock / Cartón de Colombia) en **Smart Work Core (SWC)**: una SPA que lee el contexto colombiano (noticias, regulación, economía, TRM, SECOP, competidores) para cualquier empresa, configurada por un onboarding con IA y guardada en localStorage por empresa.

## Decisiones (grill 2026-10-27)
- IA: se reutiliza la key del servidor (`OPENAI_API_KEY`, fallback OpenRouter). El usuario no configura nada.
- Acceso: Cloudflare Access protege todo salvo la landing `/`. Panel, onboarding, selector y logout son privados.
- "Cerrar sesión" = sin empresa activa → selector de empresas (lista estilo `@reui/c-item-9` + "Crear nueva").
- Onboarding híbrido: stepper `@reui/c-stepper-29` con 3 bloques fijos (Empresa · Objetivos · Confirmar) + layout split (formulario / vista previa en vivo). Dentro de cada bloque la IA genera la siguiente pregunta (~8 máx): selección única, múltiple (checkbox) y abierta. Toda textarea usa `@reui/c-textarea-6`. Se puede volver, cada respuesta se guarda al instante, sobrevive recarga/caída de red. Solo un onboarding en curso a la vez.
- Objetivos estratégicos (dónde está, a dónde va, qué quiere lograr) alimentan palabras clave, riesgos y oportunidades.
- NIT opcional. Sin NIT, Contratación y Competidores se ocultan.
- Formularios con TanStack Form. Sin duplicar código; refactor cuando aplique.
- Nav 5 ítems con tabs `@reui/c-tabs-6`: Resumen (Radar · Avisos · Línea de tiempo), Economía (Macro · TRM · Contratación · Competidores), Noticias (Noticias · Regulación), Análisis (PESTEL · Briefing), Asistente. Pie del sidebar: selector de empresa, Configuración (Preferencias, Fuentes, Acerca, editar onboarding), Cerrar sesión.
- Vocabulario: **aviso** (evento) y **regla** (lo que lo genera). Estado de revisión = filtro, no tab.
- Filtros: pocos, siempre visibles, con nombre claro y "Limpiar". Descartados ocultos salvo filtro "Descartados".
- Sin atajos de teclado en v1.
- Diseño basado en eventos según `docs/propuesta-diseno/sistema-de-diseno.md`.
- Se puede borrar todo lo del dominio anterior sin migración: `reports/`, `research_notes/`, `docs/propuesta-mvp`, `docs/requerimientos`, normas de empaques, fixtures de Cartón, `legacy-migration`.
- Entrega: chained PRs `stacked-to-main`.

## Tareas
- [x] T1 Base multiempresa: modelo `CompanyProfile`, store de empresas + empresa activa, stores namespaced por empresa (`swc:<id>:*`), reemplazar `src/content/config/empresa.ts` por el perfil activo, quitar referencias a Smurfit/Cartón y contenido muerto, rebrand SWC. — ruta: delegada (20+ archivos)
- [ ] T2 Selector de empresa + cerrar sesión + guard (sin empresa activa → selector; sin empresas → onboarding). — ruta: delegada
- [ ] T3 Onboarding con IA (endpoint con structured output, borrador persistido, stepper, vista previa). — ruta: delegada
- [ ] T4 Nav de 5 ítems con tabs, Configuración unificada, vocabulario aviso/regla. — ruta: delegada
- [ ] T5 Rediseño por eventos (`EventItem`, layouts canónicos). — ruta: delegada

## Pendientes de generalización (anotar durante la implementación)
- Normas curadas (`src/content/regulacion/normas.json`): hoy es una lista vacía y la sección se oculta. Cada empresa necesita sus propias normas (curadas a mano o generadas en el onboarding); la fuente es un archivo único del despliegue, no del perfil.
- Plantillas de decisión (`pestel/decision-templates.ts`): son cuatro textos fijos (cobertura cambiaria, contratos públicos, norma nueva, costo de energía). Suponen exposición al dólar y contratación pública; deberían salir de los objetivos de la empresa (T3/T5).
- Macro, energía (XM) y exportaciones no minero-energéticas son indicadores nacionales fijos; no cambian con el perfil. Falta decidir si el perfil elige cuáles ver.
- Sin NIT, Contratación y Competidores muestran estados vacíos (no hay consulta); ocultarlos es parte de T4.
- Las heurísticas de `pestelForNewsTerm` (palabras de sostenibilidad y de riesgo social) son expresiones regulares fijas en español; no se adaptan al sector.
- La búsqueda de Google News usa solo los primeros 4 grupos y ~400 caracteres por consulta: una empresa con muchos términos pierde los últimos. Los términos del sector, regulación y operaciones de un perfil nuevo empiezan vacíos hasta que T3 los genere.
- Regulación: solo los decretos se filtran con las palabras clave de la empresa; las publicaciones de Minambiente se muestran todas.
- `docs/deploy.md` y `docs/explicacion-del-proyecto-en-cinco-preguntas.md` siguen nombrando a Smurfit Westrock y enlazan documentos borrados; quedaron fuera de la superficie de edición de T1.

## Progreso / evidencia
- Rama `feat/swc-base` creada desde `main` (c1e42f3).
- T1 hecho (ruta: delegada, un escritor; disparador: 100+ archivos). Línea base antes de cambiar: typecheck, lint y test en verde (874 pruebas).
  - `786decc` chore: eliminar investigación y propuestas del dominio anterior.
  - `1480ca7` feat(empresa): perfil de empresa activo en lugar de la configuración fija (modelo `CompanyProfile`, stores `swc:<id>:*`, contexto de empresa al servidor, `CompanyGate`, fixtures neutrales).
  - `1c63efb` feat(marca): rebautizar la app como Smart Work Core.
  - RED observado: `src/core/company/profile.test.ts` falló por módulo inexistente antes de implementarlo; después GREEN.
  - Verificación final: `pnpm typecheck` sin errores; `pnpm lint` sin hallazgos; `pnpm test` 127 archivos, 912 pruebas en verde; `pnpm build` compila. e2e no se ejecutó (necesita navegador); sus textos y el sembrado de empresa se actualizaron estáticamente.
  - `rg -i "smurfit|westrock|cart[oó]n|corrugad|yumbo|890300406"` sobre `src`, `e2e`, `README.md` y `package.json`: sin resultados.
  - Decisión: el servidor recibe el contexto de empresa por POST (`/api/news`, `/api/regulacion`) o en el cuerpo del chat; los esquemas zod son estrictos y acotados.
