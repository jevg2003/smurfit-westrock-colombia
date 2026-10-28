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
- [x] T2 Selector de empresa + cerrar sesión + guard (sin empresa activa → selector; sin empresas → onboarding). — ruta: delegada
- [x] T3 Onboarding con IA (endpoint con structured output, borrador persistido, stepper, vista previa). — ruta: delegada
- [x] T4 Nav de 5 ítems con tabs, Configuración unificada, vocabulario aviso/regla. — ruta: delegada
- [x] T5 Rediseño por eventos (`EventItem`, layouts canónicos). — ruta: delegada
- [x] T6 Formularios y onboarding (rama `feat/swc-formularios`) — ruta: delegada (explorador + un escritor)
  - El schema zod es la única fuente de verdad: requerido, límites y mensajes salen del schema; los campos no repiten `required`, `maxLength` ni validaciones a mano.
  - NIT con librería de máscara de entrada (solo dígitos, formato `900.123.456-7`) y dígito de verificación validado en el schema.
  - "Saltar" solo aparece la primera vez que se muestra una pregunta sin responder; al volver a una pregunta ya respondida desaparece el botón y la acción.
  - Botones de acción anclados abajo (no se mueven con poco espacio); el card ocupa el alto disponible en escritorio descontando encabezado y márgenes.
  - Panel derecho del onboarding con el diseño de la maqueta ReUI (riel de navegación, encabezado con nombre y badge, búsqueda, filtros, filas), que se va construyendo con los datos reales del perfil.

- [x] T7 Ajustes visuales del onboarding (rama `feat/swc-formularios`) — ruta: delegada, 3 escritores en paralelo con superficies disjuntas (pedido explícito del usuario)
  - A: pills del panel derecho recortadas + `ScrollArea` en `onboarding-flow.tsx` con alto dinámico.
  - B: formulario de confirmación con estructura por secciones (estilo factura ReUI), competidores con `@reui/c-item-9` y alta en diálogo `@reui/c-dialog-5`; anchos actuales.
  - C: `ChipListField` reemplazado por `@reui/c-combobox-20` (chips con entrada libre).
  - Evidencia: A `0ce9905` (ScrollArea en `step-form.tsx`, raíz `flex-1 min-h-0`; estilos, sin RED); B `7b39f26` + `281e268` (RED 7/8 → GREEN 8/8 en `confirm-form.test.tsx`; `competitorSchema` único en `core/onboarding/confirm.ts`); C `e620c5d` (RED 5/7 → GREEN 7/7; límites desde el schema con `safeParse`). Integrado: `pnpm typecheck` sin errores, `pnpm lint` sin errores (solo advertencias conocidas de landing/react-bits), `pnpm test` 169 archivos / 1249 pruebas, `pnpm build` compila. Sin prueba en navegador.

## Cierre de generalización (2026-10-27)

Resuelto:
- Plantillas de decisión: salen del perfil (`decisionTemplatesFor`); contratos públicos solo con NIT.
- «Por qué le importa»: línea determinista (`whyItMatters`) con competidor, prioridad o término vigilado; sin IA.
- Heurísticas PESTEL: vocabulario general sin términos de la empresa anterior; el grupo del perfil decide cuando el término no dice otra cosa.
- Google News: todos los términos se empaquetan en hasta 6 consultas de 400 caracteres con dedup por enlace.
- Regulación: decretos y Minambiente se filtran por palabras clave y términos de sector; sin palabras se muestra todo con aviso «Sin filtrar».
- Re-onboarding: la IA recibe el perfil anterior (sin NIT); el límite del cuerpo pasa a 128 KB.
- Contratación: páginas de 30 con «Ver más».
- Configuración: umbrales y términos comparten una sola barra de guardado.
- Copy: tratamiento de usted y vocabulario aviso/regla; género por sustantivo (avisos en masculino, decisiones en femenino).
- Código sin uso: copias de ReUI (filters, data-grid, cascader, date-selector, timeline), border-beam, button-group, spinner y 5 dependencias.
- Cloudflare Access: destinos de la aplicación «SWC Monitor (privado)» actualizados y verificados en vivo; `/empresas` y `/onboarding` incluidos en `PRIVATE_ACCESS_DESTINATIONS`.

Decidido no hacer (añadiría configuración o es decisión de producto):
- Umbrales propuestos por la IA: un umbral incorrecto cambia en silencio qué avisos aparecen y el formulario no los muestra.
- Normas curadas por empresa e indicadores macro a elección: son configuración extra para un público no técnico. La lista de normas sigue vacía y su sección se oculta.
- Seguimiento como borrador: sus botones aplican al instante por diseño.
- Paginar Competidores: el máximo es 20.

Pendiente:
- Contratación y Competidores sin NIT muestran estado vacío en vez de ocultarse del todo en algunos caminos.
- Sin orden por columna ni paginación en Contratación (se usó `EventItem` en lista-detalle); si una empresa tiene cientos de contratos, valorar volver a una tabla.
- Descartar un aviso exige una nota (regla del store).
- Regulación sin vigencia ni «a quién aplica» (los feeds no traen esos datos).
- Unos 50 exports sin uso en `core` y `features` y `src/core/domain/source-health.ts`: revisar con `knip --production`.
- El CTA y el copy de la landing son del usuario (sigue en tú en algunas partes).

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
- T2 hecho (ruta: delegada, un escritor; disparador: 15+ archivos entre rutas, componentes y pruebas). Línea base: typecheck, lint y test en verde (912 pruebas).
  - Instalado: `@reui/c-item-9` (base de las filas; el ejemplo no se conserva), `avatar` y `alert-dialog` (corregido el import `cn` a `@/lib/utils`).
  - Rutas privadas `/empresas` y `/onboarding` (placeholder) en el grupo `(account)`, fuera del sidebar; Access las protege por defecto (solo `/` y estáticos son públicos).
  - `CompanyGate` redirige: sin empresas a `/onboarding`, con empresas sin activa a `/empresas`; espera la hidratación sin parpadeo. `StoreHydrator` vuelve a marcar "hidratando" al montar.
  - Pie del sidebar: `CompanySwitcher` (cambiar, Nueva empresa, Ver todas, Cerrar sesión que solo limpia la empresa activa). Un solo helper de iniciales: `companyInitials` + `CompanyAvatar`.
  - Borrar una empresa (`deleteCompany`) quita el perfil y todas las claves `swc:<id>:*` (incluye el borrador de onboarding de T3 si usa ese prefijo).
  - RED observado: las 5 suites nuevas/actualizadas fallaron por módulos inexistentes y redirecciones ausentes; luego GREEN.
  - Verificación final: typecheck sin errores; lint sin hallazgos; test 131 archivos, 925 pruebas en verde; build compila con `/empresas` y `/onboarding`. e2e no se ejecutó; `seedCompany` sigue válido.
- T3 hecho (ruta: delegada, un escritor; disparador: 40+ archivos entre servidor, store, UI y pruebas). Línea base: typecheck, lint y test en verde (925 pruebas). TDD estricto por unidad (RED = fallo observado antes de implementar):
  - Esquemas y `sector` (`src/core/onboarding/schemas.test.ts`): RED `Cannot find module './schemas'`; GREEN 18 pruebas junto con las de empresa.
  - Preguntas de respaldo (`fallback.test.ts`): RED `Cannot find module './fallback'`; GREEN.
  - Caso de uso y ruta (`src/infrastructure/ai/onboarding.test.ts`, `MockLanguageModelV4`): RED `Cannot find module './onboarding'`; GREEN 13 pruebas (tope de preguntas, respaldo por fallo/timeout/salida inválida/sin clave, NIT solo si lo escribió el usuario, datos no confiables, 400 y 413).
  - Borrador (`onboarding-draft.store.test.ts`): RED módulo inexistente; GREEN 13 pruebas (persistir, retomar, reemplazar, volver, JSON corrupto). Una expectativa de la prueba estaba mal (cursor al repetir una pregunta) y se corrigió antes de aceptar GREEN.
  - Hidratación del borrador (`store-hydrator.test.tsx`): RED `expected undefined to be 'Acme'`; GREEN.
  - Confirmación (`confirm.test.ts`): RED módulo inexistente; GREEN tras hacer que `uniqueTerms` recorte los términos (RED intermedio: `' agua '` vs `'agua'`).
  - Reglas del flujo y cliente (`flow.test.ts`, `api.test.ts`): RED módulos inexistentes; GREEN 14 pruebas.
  - Progreso (`draft.test.ts`): RED `progressOf is not a function`; GREEN.
  - Componente (`onboarding-flow.test.tsx`, 21 pruebas: responder, volver, retomar, sin conexión, respaldo, confirmar): RED módulo `./onboarding-flow` inexistente; GREEN. Un fallo real corregido: al crear la empresa el borrador vacío se reiniciaba antes de navegar (`finished`).
  - Selector (`company-picker.test.tsx`): RED 2 fallos (`/onboarding?nueva=1`, línea sector y ciudad); GREEN.
  - Commits: `71bd014` endpoint y respaldo; `67c03e5` borrador; `7fa1a9d` confirmación; `aa2785c` flujo y cliente; `466eae5` componentes ReUI y campos; `6b30cd3` pantalla.
  - Instalado: `@reui/stepper` (vía `@reui/c-stepper-29`), `progress`, `radio-group` (import `cn` corregido a `@/lib/utils`); `field`, `textarea` ya existían. `AutoTextarea` adapta `@reui/c-textarea-6`.
  - Contrato: `POST /api/onboarding` entrada `{seed, block: empresa|objetivos, answers[]}` (estricta, 64 KB), salida `{nextQuestion|null, profilePatch, source: ai|fallback, notice?}`; errores `{error:{code: invalid_request|too_large, message}}`. Tope 4 preguntas por bloque.
  - Verificación final: `pnpm typecheck` sin errores; `pnpm test` 142 archivos, 1018 pruebas en verde; `pnpm build` compila (`/onboarding` dinámica); `pnpm lint` 1 advertencia ajena en `src/components/brand/brand-intro.tsx:27` (edición en curso del usuario). e2e no se ejecutó; ninguna spec nombra `/onboarding` ni `/empresas`.
- T4 hecho (ruta: delegada, un escritor; disparador: 100+ archivos entre rutas, vistas, pruebas y e2e). Línea base: typecheck, lint (1 advertencia ajena, `brand-intro.tsx`) y test en verde (1018 pruebas). Instalado `@reui/c-tabs-6`: `card` y `tabs` ya existían y no se sobrescribieron; el patrón (TabsList de ancho completo con icono y texto) vive en `PageTabs`.
  - Nav (`nav.test.ts`): RED 4 fallos (17 ítems, sin `CONFIG_ITEM`, brand `/home`); GREEN con 5 ítems y Configuración en el pie.
  - Redirecciones (`legacy-redirects.test.ts`): RED módulo inexistente y `next.config.redirects` indefinido; GREEN 15 permanentes (mapa abajo).
  - `PageTabs` (`page-tabs.test.tsx`): RED módulo inexistente; GREEN: primera pestaña por defecto, `?tab=`, pestaña desconocida, `router.push` al cambiar, solo se monta el contenido activo, pestañas ocultas no listadas ni abribles por URL. La prueba del h1 se escribió junto con la implementación del título (sin RED separado).
  - Páginas (`pages.test.tsx`): RED `Failed to resolve import ./analisis/page`; GREEN: pestañas por página y Economía sin NIT muestra solo Macro y TRM aunque la URL pida `contratacion`.
  - Avisos (`avisos-view.test.tsx`): RED módulo `./avisos-view` inexistente; GREEN: vacío, regla TRM, energía, factor PESTEL, «Solo lo que sigo», CSV. El filtro de estado se prueba sobre el hook (`use-row-filters.test.tsx`, escrito después de implementar: por defecto Nuevo+Revisado, Descartado solo con el filtro Estado, Limpiar), porque el popover de ReUI no es manejable en jsdom.
  - Radar sin NIT (`radar-view.test.tsx`): oculta las tarjetas de contratos; GREEN tras condicionar por `hasNit`.
  - Re-onboarding: `confirm.test.ts` RED `profileToSeed is not a function`; `onboarding-draft.store.test.ts` RED `startFor is not a function`; `onboarding-flow.test.tsx` RED (sigue creando en lugar de actualizar, destino `/home`); `empresa-tab.test.tsx` (5 pruebas: formulario con la empresa, guardar, NIT inválido, reiniciar con onboarding prellenado, confirmar antes de reemplazar un borrador ajeno). GREEN en todas.
  - `sector` en contexto: `context.test.ts` RED `expected undefined to be 'Metalmecánica'`, `system-prompt.test.ts` RED; GREEN.
  - Selector: `company-switcher.test.tsx` RED (`href` sin `?nueva=1`); GREEN. `company-picker.test.tsx` cambió a `/resumen` junto con su implementación (sin RED separado).
  - Commits: `3ef8e17` re-onboarding; `deab8dc` sector; `149d6b5` PageTabs; `6952b04` navegación, Avisos y Configuración; `520d0c0` vocabulario. Solo se verificó el estado final (HEAD), no cada commit por separado.
  - Verificación final: `pnpm typecheck` sin errores; `pnpm lint` 3 advertencias `set-state-in-effect` ajenas (`brand-intro.tsx`, `landing/signal-flow.tsx`, `landing/reveal.tsx`, edición en curso del usuario); `pnpm test` 145 archivos, 1073 pruebas en verde; `pnpm build` compila (rutas `/resumen`, `/economia`, `/noticias`, `/analisis`, `/configuracion`, `/asistente`). e2e no se ejecutó; `smoke.spec.ts` y `asistente.spec.ts` se actualizaron estáticamente (rutas, pestañas, redirecciones).
  - Ruta por tarea: inline para el mapa de redirecciones y ajustes de copy; escritor único para el resto.
  - Mapa de redirecciones (permanentes, `src/lib/legacy-redirects.ts`): `/home` a `/resumen?tab=radar`; `/senales` y `/alertas` a `/resumen?tab=avisos`; `/linea-de-tiempo` a `/resumen?tab=linea-de-tiempo`; `/macro` a `/economia?tab=macro`; `/dias` a `/economia?tab=trm`; `/contratacion` y `/competidores` a `/economia?tab=contratacion|competidores`; `/regulacion` a `/noticias?tab=regulacion`; `/pestel` y `/briefing` a `/analisis?tab=pestel|briefing`; `/seguimiento` y `/preferencias` a `/configuracion?tab=reglas`; `/fuentes` y `/acerca` a `/configuracion?tab=fuentes|acerca`.
  - Código muerto eliminado: 15 páginas, `resumen-view` y `atipicos-card` de TRM (sin ruta), `senales-view`, `alertas-view`, `seguimiento-view` (ahora `seguimiento-settings`) y sus pruebas; `features/senales` y `features/alertas` se fundieron en `features/avisos`.
- La landing no se tocó en T5; su CTA ya apunta a `/resumen` (commit `ad853bc`, hecho por la coordinación).
- T5 hecho (ruta: delegada, un escritor; disparador: 100+ archivos entre componentes, vistas, pruebas, e2e y docs). Línea base: `pnpm typecheck` con 1 error ajeno (`src/components/react-bits/SpecularButton/SpecularButton.tsx(481)`, archivo del usuario); `pnpm lint` con advertencias ajenas (`brand-intro`, `landing/signal-flow`, `landing/reveal`, `react-bits`); `pnpm test` con 3 fallos en `landing-page.test.tsx` (en edición por el usuario; después pasaron). TDD por unidad (RED = fallo observado antes de implementar):
  - `EventItem` (`event-item.test.tsx`): RED módulo `./event-item` inexistente; GREEN 8 pruebas (campos, línea «por qué» omitida, «Nuevo» con texto, Revisar/Descartar, Marcar como pendiente, descartado con badge propio y sin acciones, abrir y `aria-current`, enlace solo con url segura). Después, RED `detail` y RED «sin fecha y con hijos»; GREEN. `groupByDay` (RED módulo inexistente; el cuarto caso falló por mi expectativa de formato de fecha, corregida a «1 de sept de 2026»), `UndoNoticeHost` (6 s, solo el último aviso), `EventList` (títulos pegajosos y `flat`: RED «keeps the given order»), `FeedSummary` (RED módulo inexistente).
  - Layouts y estados (`list-detail-layout`, `filter-bar`, `layouts`, `states`): RED módulos inexistentes; GREEN. Lista-detalle: panel fijo a 1280 px, Sheet a 900 px, «Volver a la lista» a 390 px, `desktopDetail` sin abrir Sheet en tableta. La prueba de `DocumentLayout` falló una vez porque el número del índice entraba en el nombre accesible; se marcó `aria-hidden`.
  - Acciones de avisos (`alert-actions.test.ts`): RED `reviewWithUndo is not a function` (4 fallos); GREEN. Filtros de avisos (`use-alert-filters.test.tsx`): RED `useAlertFilters` inexistente; GREEN. `FilterSelect`/`useFilterValues`: la implementación se escribió antes de correr su prueba, sin RED separado.
  - `IndicatorStrip` (RED módulo inexistente), `SelectableRow` (RED no observado por separado), `observationEvents` (RED módulo inexistente), `TrmView` (RED módulo `./trm-view` inexistente).
  - Integración de vistas (sin RED separado porque la unidad ya estaba cubierta): Radar (revisar desde la fila, filtrar por tema y Limpiar), Avisos (panel de detalle en 1280 px, Descartar desde la fila exige nota, Limpiar), Noticias, Regulación (filtro de fuente), Contratación (detalle y filtro), Competidores, PESTEL (cambio de factor), Fuentes, Macro.
  - Exentos de RED por ser marcado y estilo: `PageTabs`/`AppShell` (cadena `min-h-0`, scroll por columna solo desde `lg`), `ChartPanel`, `SettingsSection` (sustituye `Card` en Configuración), `BriefingDocument` (sin caja, ids para el índice).
  - Commits: `2633eaf` EventItem y aviso para deshacer; `0ae7f21` layouts y estados; `2a1d8a1` Resumen; `5b60a0e` Noticias y Regulación; `1c7f464` Economía; `1490db8` Análisis; `18fef2e` Configuración, Fuentes y Asistente; `dc6b628` limpieza; `715aa16` docs y e2e. Los commits se hicieron con un índice temporal para no mezclar los cambios en curso del usuario (landing, marca, `package.json`, `pnpm-lock.yaml`, `components.json`).
  - Componentes nuevos: `components/events` (`EventItem`, `EventList`, `groupByDay`, `FeedSummary`, `UndoNoticeHost`), `components/layouts` (`FeedLayout`, `ListDetailLayout`, `IndicatorsLayout`, `DocumentLayout`, `FilterBar`, `FilterSelect`, `useFilterValues`, `IndicatorStrip`, `ChartPanel`, `SelectableRow`, `SettingsSection`, `useMediaQuery`), `components/states` (`EventListSkeleton`, `RegionEmpty`, `SourceNotices`). Feature: `SignalDetail`, `AlertEvents`, `TrmView`, `ContractDetail`, `CompetitorDetail`, `FactorDetail`, `FuenteEvent`, `observationEvents`.
  - Eliminado: `stat-card`, `data-table-card`, `page-intro`, `alerts-grid`, `alert-toolbar`, `inbox-link`, `trm-grid`, `dias-view`, `company-card`, `pestel-matrix`, `fuente-card`, `features/filtros/{select-filters,apply-filters,labels-es}`. `relative-time` pasó de `features/asistente` a `src/lib`.
  - Mapa página/tab a lienzo: Resumen: Radar L1, Avisos L2 (lista, panel fijo, Sheet en tableta y móvil), Línea de tiempo L1. Economía: Macro L3, TRM L3, Contratación L2, Competidores L2. Noticias: Noticias L1, Regulación L1. Análisis: PESTEL L2, Briefing L4. Asistente L4. Configuración: las cuatro pestañas en `DocumentLayout` (L4).
  - Verificación final: `pnpm typecheck` sin errores; `pnpm lint` solo 3 advertencias ajenas (`landing/signal-flow.tsx`, `landing/reveal.tsx`, `react-bits/SpecularButton`); `pnpm test` 159 archivos, 1155 pruebas en verde; `pnpm build` compila (`/resumen`, `/economia`, `/noticias`, `/analisis`, `/asistente`, `/configuracion`, `/empresas`, `/onboarding`). `validate_usage` de ReUI sin props inventadas y revisada la lista de auditoría. e2e no se ejecutó; se añadieron especificaciones estáticas (sin scroll de página a 1280 px y sin scroll horizontal a 360 px) y el resto se revisó contra el texto actual.
- T6 hecho (ruta: delegada, un escritor tras exploración; disparador: 40+ archivos entre esquemas, campos, formularios y pruebas). Línea base: `pnpm typecheck` y `pnpm test` (1156 pruebas) en verde; `pnpm lint` con 3 advertencias ajenas (`landing/signal-flow.tsx`, `landing/reveal.tsx`, `react-bits/SpecularButton`). TDD por unidad (RED = fallo observado antes de implementar):
  - NIT (`core/company/nit.test.ts`): RED módulo `./nit` inexistente; GREEN: `computeNitDv` (DV de la DIAN calculado y comprobado a mano con NITs reales; casos de residuo 0 y 1), `formatNit`, `parseNit` (puntos, espacios, letras, «-DV»), `nitDigitsSchema` (5 a 10 dígitos), `nitInputSchema` (DV pegado que no coincide es error de esquema).
  - Meta de campo (`lib/schema-meta.test.ts`): RED módulo inexistente; GREEN. Usa `z.toJSONSchema(schema, { io: "input", unrepresentable: "any" })`; `fieldMeta(schema, path)` devuelve requerido, min/max de texto, de elementos de lista, de cada elemento, rango numérico y entero. Rutas con puntos y `[n]`.
  - Campos (`reui/form-fields.test.tsx`, 15 pruebas): RED `NitField` no exportado (12 fallos); GREEN: marca de obligatorio o «(opcional)» según el esquema, `maxLength` y contador del esquema, tope de elementos de las listas, NIT (letras ignoradas, agrupado con puntos, sufijo «-DV» de solo lectura, pegado «900.123.456-8» normalizado, DV pegado que no coincide bloquea el envío, tope de 10 dígitos) y número con coma decimal sin decimales cuando el esquema pide entero.
  - Formularios: `answer-form.test.ts` RED (límite de la pregunta abierta y de «Otra» no salían del esquema); `skip.test.ts` RED módulo inexistente; `onboarding-flow.test.tsx` (5 pruebas nuevas: Saltar la primera vez, oculto al volver con respuesta, oculto en pregunta saltada, `submitAnswer` rechaza un salto sobre una respuesta guardada —RED: reemplazaba la respuesta—, DV pegado inválido/válido en el paso inicial); `decision-schemas.test.ts` RED (límites 120/500/80/300/1000, motivo obligatorio solo al decidir o descartar); `note-schema.test.ts` RED `NOTE_MAX`; `message-schema.test.ts` y `composer.test.tsx` RED módulo inexistente (Enter envía, Shift+Enter agrega línea, vacío no envía); `validate.test.ts` reescrito (umbrales numéricos con rango del esquema; términos y palabras con los límites del perfil).
  - Resumen en vivo: `core/onboarding/preview.test.ts` RED módulo inexistente (8 pruebas: cuadros vacíos como esqueleto, mapeo de actividad, competidores, noticias, regulación y objetivos); `profile-preview.test.tsx` (barras pendientes que se cambian por valores sin tocar las demás filas, clase `motion-reduce:animate-none`, versión en lista).
  - Exentos de RED por ser marcado y estilo: `StepForm` (contenido que se desplaza y barra de acciones pegada abajo), `OnboardingShell` (alto de la tarjeta), la ventana de la maqueta (riel de iconos, búsqueda, pastillas, desvanecidos). Alto de escritorio: la página mide exactamente `lg:h-dvh` y la tarjeta ocupa lo que queda con `flex-1 min-h-0` (sin números mágicos: el encabezado, el stepper y el margen salen del flujo real); en móvil la página se desplaza y la barra de acciones es `sticky bottom-0`. No se pudo verificar en navegador (e2e no se ejecutó).
  - Commits: `8b7e63e` campos con esquema y NIT; `f6f0591` formularios del onboarding, Saltar y acciones; `b1e6ed3` resumen en vivo y tarjeta; `978a83b` PESTEL; `dc52fe5` nota de avisos y asistente; `e33a7a4` preferencias.
  - Librería: `react-number-format` 5.4.5 (`NumericFormat` + `customInput`): mantenida, sin dependencias, trabaja sobre el `Input` de ReUI, da separador de miles con punto y coma decimal, y permite cortar la entrada con `isAllowed`. Alternativas descartadas: `use-mask-input`/`maska` (máscaras por patrón, no por magnitud) y una máscara a mano (más código propio para el pegado y el cursor).
  - Duplicaciones eliminadas: regex del NIT (`profile.ts`, `schemas.ts`, `seed-form`, `confirm-form`), `NIT_ERROR`, `nitOf` duplicado, `maxChars` a mano (600/1000/400/300/2000), «(opcional)» escrito en etiquetas, límites 80/30 de Preferencias contra 120/40 del perfil, `MAX_LENGTH` del asistente. Un solo `core/company/fields.ts` con los límites del perfil que usan el perfil guardado, el esquema del onboarding, el formulario de confirmación, el inicial y las preferencias.
  - Verificación final: `pnpm typecheck` sin errores; `pnpm lint` 3 advertencias ajenas; `pnpm test` 168 archivos, 1235 pruebas en verde; `pnpm build` compila. `validate_usage` de ReUI sin props inventadas.
