# Propuesta de sistema de diseño: monitor de entorno multiempresa

Estado: propuesta para revisión. No modifica código. Fecha: 2026-10-27.

Objetivo: que una persona no técnica abra la app, vea qué cambió en el entorno colombiano que afecta a su empresa, entienda por qué le importa y decida si actúa. Sin tarjetas anidadas ni tablas dentro de tablas.

## 1. Principios

1. **Evento antes que objeto.** Todo lo que cambia (noticia, norma, señal, variación de TRM, contrato) se muestra como un evento con hora, fuente y motivo. Las cifras sueltas siempre acompañan a un evento o a una serie.
2. **Una región desplaza, el resto se queda.** La página no hace scroll. Cada columna tiene su propio scroll vertical; los filtros, el encabezado de tabla y el detalle seleccionado quedan fijos. Así la persona nunca pierde el contexto.
3. **Un contenedor por pantalla.** Una superficie base (`Frame` o fondo de página) con separadores finos. Nunca `Card` dentro de `Frame` ni `Frame` dentro de `Card` (regla de ReUI). Las secciones se separan con espacio y líneas, no con cajas.
4. **Divulgación progresiva.** La lista muestra lo mínimo para decidir si abrir; el detalle (panel o `Sheet`) muestra el resto. Los términos técnicos (PESTEL, SECOP, TRM) aparecen con una glosa corta la primera vez.
5. **Calma por defecto.** Un solo color de estado por fila, una animación de entrada por vista, sin parpadeos ni contadores animados. El color nunca es la única señal: siempre va con texto o icono.

Dirección visual: registro "calmo/operativo" de ReUI (densidad media-baja, `design-taste-frontend` fija el rango en variación 5-6, movimiento 3-4, densidad 2-4 para "calm/Linear-style"). Se conserva la paleta actual de `globals.css` (fondo `#f7f7f5`, primario `#2563c4`, `--success`, `--warning`, `--destructive`).

## 2. Layouts canónicos

Cuatro layouts cubren toda la app. Cada página elige uno; no se inventan variantes.

Base común: el contenido de la página es un contenedor `flex flex-col min-h-0 h-full` dentro de `SidebarInset`. Las regiones con scroll usan `min-h-0 overflow-y-auto` (o `ScrollArea`). `position: sticky` solo funciona dentro de un ancestro con scroll y con un `top` definido ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)), por eso el scroll vive en la columna y no en `body`.

### L1. Feed de eventos con filtros fijos

Para: Radar, Alertas, Noticias, Regulación, Línea de tiempo. Basado en el patrón "feed" de Material 3 ([Android: canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts)) y en las bandejas de entrada de Linear ([docs](https://linear.app/docs/inbox)).

```
+--------------------------------------------------------------+
| [Tabs c-tabs-6: icono + etiqueta]                    (fijo)  |
+--------------------------------------------------------------+
| Filtros: [Todos|Sin revisar] [Tema v] [Gravedad v]  (fijo)   |
+------------------------------------------+-------------------+
| HOY                         (sticky grp) | Resumen    (fijo) |
| o Alta  Reforma de aranceles  hace 2 h   |  12 sin revisar   |
|   Por qué importa: sube costo de import. |  3 de gravedad alta|
|   [Revisar] [Descartar]                  |                   |
| o Media TRM sube 1,8 %        hace 5 h   | Por tema          |
|   ...                                    |  Político   4     |
| AYER                        (sticky grp) |  Económico  6     |
| ...   (scroll vertical propio)           |  (scroll propio)  |
+------------------------------------------+-------------------+
```

| Región | Comportamiento |
|---|---|
| Tabs y barra de filtros | Fijas (fuera del área con scroll). |
| Lista de eventos | Scroll vertical propio. Encabezados de día (`Hoy`, `Ayer`, `Esta semana`) con `sticky top-0`. |
| Panel lateral derecho (30 %) | Fijo, con su propio scroll si desborda. Solo contexto: conteos por estado y por tema, que además filtran al hacer clic. |
| Móvil (< 768 px) | Una columna. El panel lateral pasa a una fila de chips encima de la lista. Filtros en un `DropdownMenu` de una sola fila. |

Proporción 70/30 para el panel de apoyo, igual que la recomendación de Material 3 para "supporting pane" en pantallas expandidas.

Componentes: `Tabs`, `Item` (evento), `Badge` `-light`, `Timeline` de ReUI solo para Línea de tiempo (variante vertical), `Filters` de ReUI, `ScrollArea`, `Empty`, `Skeleton`.

### L2. Lista-detalle con panel fijo

Para: Señales, Competidores, Contratación (SECOP), PESTEL. Basado en "list-detail" de Material 3: en pantallas compactas y medianas solo se ve un panel a la vez ([Android](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts), [Microsoft: master/details](https://learn.microsoft.com/en-us/previous-versions/windows/hh465465(v=win.10))).

```
+--------------------------------------------------------------+
| [Tabs]                                               (fijo)  |
| Filtros                                              (fijo)  |
+---------------------------+----------------------------------+
| Lista (40 %)              | Detalle (60 %)            (sticky) |
| Encabezado de col. (sticky)| Título · gravedad · fuente      |
| > Señal A         Alta    | Qué pasó                         |
|   Señal B         Media   | Por qué importa a su empresa     |
|   Señal C         Baja    | Datos de respaldo (serie/tabla)  |
|   (scroll propio)         | Qué puede hacer     [acciones]   |
|                           | (scroll propio)                  |
+---------------------------+----------------------------------+
```

| Región | Comportamiento |
|---|---|
| Lista | Scroll vertical propio; la fila activa lleva `aria-current` y fondo `bg-muted`. Si es tabla (SECOP), `DataGrid` con encabezado fijo y altura contenida. |
| Detalle | Columna fija a la altura del viewport; su contenido tiene scroll propio. Sin selección muestra `Empty` con "Elija un elemento de la lista". |
| >= 1024 px | Dos columnas. |
| 768-1023 px | Detalle en `Sheet` lateral (la lista conserva todo el ancho). |
| < 768 px | Una columna; el detalle abre a pantalla completa con botón "Volver a la lista". No hay acciones esenciales solo en la lista. |

Hoy Señales usa un `Sheet` siempre. En escritorio se pasa a panel fijo para comparar señales sin abrir y cerrar; el `Sheet` queda para tablet y móvil.

Componentes: `Item`, `Badge`, `DataGrid` (+ `DataGridScrollArea`, `DataGridTable`), `Sheet`, `ScrollArea`, `Empty`, `Separator`.

### L3. Panel de indicadores con serie

Para: Macro, TRM. Se apoya en la guía de NN/g: un tablero comunica lo crítico de un vistazo, con barras y líneas en lugar de círculos o medidores, y sin usar color para magnitud ([NN/g](https://www.nngroup.com/articles/dashboards-preattentive/)).

```
+--------------------------------------------------------------+
| [Tabs]                                               (fijo)  |
| Selector de período [7d 30d 12m]                     (fijo)  |
+--------------------------------------------------------------+
| PIB  +2,1 %   Inflación 5,4 %   Exportaciones ...   (fijo)   |
|  (tira de indicadores: texto + variación, sin cajas)         |
+-----------------------------------+--------------------------+
| Serie (recharts, línea)  (fijo)   | Eventos del período      |
| eje X compartido                  | - 12 oct: salto de TRM   |
|                                   | - 03 oct: dato de IPC    |
|                                   |  (scroll propio)         |
+-----------------------------------+--------------------------+
```

| Región | Comportamiento |
|---|---|
| Tira de indicadores | Fija. Cada indicador: valor `text-2xl font-semibold tabular-nums`, nombre y variación con flecha y texto. Separados por `Separator` vertical, no por tarjetas. |
| Gráfico | Fijo, una sola serie principal. Un máximo de dos series. Sin torta ni medidor. |
| Eventos del período | Scroll propio; cada punto relevante de la serie es un evento (L1 compacto). Pasar el cursor sobre el evento resalta el punto. |
| Móvil | Tira con scroll horizontal controlado (`snap-x`), gráfico a ancho completo, eventos debajo. |

En TRM la tabla "días y variaciones" deja de ser una tabla aparte: son los eventos del período, con la variación como `Badge` `-light`.

Componentes: `ChartContainer` (recharts), `Badge`, `Item`, `Separator`, `ToggleGroup` para período, `Skeleton`.

### L4. Documento

Para: Briefing, Asistente, Configuración. Una columna de lectura de ancho máximo 72ch, con un índice fijo opcional.

```
+--------------------------------------------------------------+
| [Tabs]                                               (fijo)  |
+----------------+---------------------------------------------+
| Índice (fijo)  | Semana del 20 al 26 de octubre              |
| 1 Resumen      | Lo principal (3 viñetas)                    |
| 2 Cambios      | Eventos destacados (L1 compacto, sin scroll)|
| 3 Decisiones   | Qué decidir esta semana                     |
|                | [Copiar enlace] [Descargar PDF]             |
|                | (scroll de la columna)                      |
+----------------+---------------------------------------------+
```

El Asistente usa la misma columna: historial con scroll, campo de entrada fijo abajo y sugerencias de pregunta cuando está vacío. En móvil el índice desaparece. El briefing debe imprimirse bien (`print:` ya se usa en el shell).

Componentes: `Tabs`, `Item`, `Separator`, `Button`, `Message`/`Bubble` (existentes), `Field` para Configuración.

## 3. Mapa página/tab a layout

| Página | Tab | Layout | Nota |
|---|---|---|---|
| Resumen | Radar | L1 | Bandeja de cambios sin revisar; panel lateral con conteos. |
| Resumen | Señales | L2 | Lista de señales + detalle fijo. |
| Resumen | Alertas | L1 | Filtro por estado: nuevas, revisadas, descartadas. |
| Resumen | Línea de tiempo | L1 | Con `Timeline` vertical de ReUI. |
| Resumen | Filtro "Seguimiento" | transversal | `Toggle` en la barra de filtros de las cuatro tabs; no es una página. |
| Economía | Macro | L3 | PIB, inflación, exportaciones, electricidad; un indicador activo a la vez. |
| Economía | TRM | L3 | Serie + eventos del período. |
| Economía | Contratación | L2 | Lista SECOP con `DataGrid` + detalle del contrato. |
| Economía | Competidores | L2 | Oculta sin NIT. Lista de competidores + eventos de cada uno. |
| Noticias | Noticias | L1 | |
| Noticias | Regulación | L1 | Cada evento muestra vigencia y a quién aplica. |
| Análisis | PESTEL | L2 | Lista de dimensiones a la izquierda; a la derecha, eventos de esa dimensión y bitácora de decisiones. |
| Análisis | Briefing | L4 | |
| Asistente | (sin tabs) | L4 | Chat. |
| Selector de empresa | Pie de sidebar | Menú | `DropdownMenu` con `Item` (avatar + nombre + `Badge`). |
| Configuración | Pie de sidebar | L4 | Secciones con `Field`; fuentes y estado de Access como lista de eventos de sincronización. |
| Onboarding | Pasos | Dividido | Formulario a la izquierda (fijo el stepper arriba), vista previa en vivo a la derecha (sticky). En móvil la vista previa pasa a un botón "Ver vista previa" que abre `Sheet`. |

Cada página tiene una sola barra de tabs `c-tabs-6` (icono + etiqueta) fija arriba. En móvil las tabs hacen scroll horizontal; no se apilan.

## 4. Anatomía del evento

Un único componente `EventItem` reemplaza las filas ad hoc de Radar, Alertas, Noticias, Regulación y los tipos de `StatCard` y `DataTableCard` usados como listas.

```
[estado]  Título del evento en una o dos líneas              hace 2 h
          Fuente · Tema                         [Alta]
          Por qué le importa: una frase concreta para su empresa.
          [Revisar]  [Descartar]  [Ver detalle]            (visibles al pasar el cursor o al enfocar)
```

| Parte | Regla |
|---|---|
| Marca de estado | Punto de 8 px a la izquierda solo en "nuevo" (`bg-primary`). Además el título va en `font-medium` si es nuevo. |
| Título | Hasta 2 líneas, `text-sm`. Verbo en presente, sin siglas sin explicar. |
| Meta | `text-xs text-muted-foreground`: fuente y tema separados con el separador de punto de ReUI (`span` redondo), no con `·` tipeado. Hora relativa a la derecha; el valor exacto en `title`/tooltip. |
| Gravedad | Un `Badge` por fila: `destructive-light` Alta, `warning-light` Media, `info-light` Baja, `outline` sin gravedad. Texto siempre visible. |
| Por qué importa | Una línea (`text-sm`), generada por regla o IA, personalizada a la empresa activa. Si no hay, se omite la línea; no se rellena con texto genérico. |
| Acciones | Máximo 2 visibles + menú. Primaria "Revisar" (`outline`, `size="sm"`); secundarias `ghost`. En móvil siempre visibles; en escritorio al hover/foco. |
| Detalle | Clic en el cuerpo abre L2 (panel) o `Sheet`. |

Estados:

| Estado | Apariencia | Transición |
|---|---|---|
| Nuevo | Punto primario, título `font-medium`. | Se marca revisado al pulsar "Revisar" o al abrir el detalle. |
| Revisado | Sin punto, texto normal, `text-muted-foreground` en el meta. | Se puede volver a "nuevo" (`Marcar como pendiente`). |
| Descartado | Texto atenuado (sin tachado, solo `opacity` reducida) y badge `outline` "Descartado". Se oculta del Radar y vive en el filtro "Descartadas". | Acción "Deshacer" en un aviso de 6 s (`sonner`/alerta ligera). |

Descartar y revisar nunca borran. El aviso confirma con una frase corta: "Descartada. Deshacer".

## 5. Tokens y reglas

**Espaciado** (escalera ReUI, sin márgenes propios en hijos): `gap-1`/`gap-2` dentro de una fila, `gap-3`/`gap-4` entre grupos, `gap-6`/`gap-8` entre secciones. Fila de evento: `py-3`, sin altura fija. Gutter de página `px-4` móvil, `px-6` escritorio.

**Tipografía** (Geist ya instalada): título de página `text-xl font-semibold`; título de región `text-sm font-semibold`; cuerpo `text-sm`; meta `text-xs`; valor de indicador `text-2xl font-semibold tracking-tight tabular-nums`. Nada por debajo de `text-xs`. Cifras siempre `tabular-nums`.

**Color de gravedad** (tokens semánticos, nunca hex en componentes):

| Nivel | Badge | Token base |
|---|---|---|
| Alta | `destructive-light` | `--destructive` |
| Media | `warning-light` | `--warning` |
| Baja / informativo | `info-light` | `--primary` o `--info` |
| Positivo (ej. dato favorable) | `success-light` | `--success` |
| Neutro, etiquetas, conteos | `outline` | `--border` |

Un `Badge` de estado por fila. Nunca `secondary` ni sólido para estado. Sin `size` `sm`/`xs`. Se verifica contraste en claro y oscuro (los tokens ya tienen ambos).

**Superficies:** un contenedor por pantalla. Las listas viven sobre el fondo de página con `Separator` entre filas. `Frame` solo para el `DataGrid` (con `FramePanel className="p-0"`). Se elimina el uso de `Card` para envolver listas y KPIs.

**Movimiento** (ReUI `motion`):
- Hover y color: `transition-colors`, sin `duration` ni `ease`.
- Revelar/expandir: `duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]`.
- Una animación de entrada por vista (fundido de la lista al cargar los datos). Sin escalonado en filas ni en listas de 20 o más.
- Un evento nuevo no entra con animación; aparece con el punto de estado.
- Nunca `transition-all`. Las piezas instaladas (`Sheet`, `Sidebar`, overlays) no se reajustan.
- `MotionConfig reducedMotion="user"` en la raíz y `motion-reduce:` en animaciones CSS.

**Estados vacíos, de carga y error:**

| Estado | Regla |
|---|---|
| Vacío | `Empty` con una frase y una acción. "No hay cambios sin revisar. Revise las alertas descartadas o cambie el período." |
| Carga | `Skeleton` con la forma real de la fila (punto, dos líneas, badge). Sin spinner centrado. |
| Error | Mensaje en línea dentro de la región con "Reintentar". Indica qué fuente falló y que el resto sigue disponible. |
| Datos desactualizados | Línea `text-xs` en la cabecera de región: "Actualizado hace 3 h" con la fuente. Reutiliza `ProvenanceNote`. |
| Sin empresa configurada | Empty con "Configure su empresa" que lleva al onboarding. |

**Accesibilidad:** foco visible, lista de eventos navegable con teclado (flechas, `Enter` abre, `R` revisa, `D` descarta, a modo de Linear con `J`/`K`; se muestran en un tooltip y nunca son la única vía). Regiones con `aria-label` ("Lista de eventos", "Detalle").

## 6. Microcopy en español no técnico

Reglas aplicables a toda cadena de la interfaz:

1. Tuteo no; usted neutro y breve. "Revise", "Elija", no "Por favor, proceda a seleccionar".
2. Frases de máximo 15 palabras. Títulos de 1 a 3 palabras; descripción de una cláusula (alrededor de 8 palabras); botones de 1 a 2 palabras; avisos de 4 palabras o menos en el título.
3. Verbo concreto en los botones: "Revisar", "Descartar", "Copiar enlace". Nada de "Aceptar" o "Enviar" sin objeto.
4. Decir qué significa para la empresa, no qué es el dato. Mal: "La TRM subió 1,8 %". Bien: "El dólar subió 1,8 %: sus importaciones cuestan más".
5. Primera mención de un término técnico con glosa: "TRM (precio oficial del dólar)", "SECOP (contratación pública)". Después, solo el término.
6. Sin jerga de producto: no "señal", "ingesta", "pipeline", "payload", "scoring". Usar "aviso", "cambio", "novedad". Decisión pendiente: unificar "señal/alerta" (ver sección 9).
7. Números con formato colombiano (1.234,5; $ 4.120 COP) y fechas relativas ("hace 2 h", "ayer") con fecha exacta al pasar el cursor.
8. Errores: qué pasó, qué sigue funcionando, qué hacer. "No pudimos leer SECOP. Los demás datos están al día. Reintentar".
9. Sin relleno de IA: se evitan fórmulas como "es importante destacar", "en el panorama actual", "de manera integral", triples de adjetivos y cierres que repiten el título. Las razones generadas por IA llevan hecho + consecuencia + fuente, en una frase. (Criterio de `anti-prose-slop`: no se encontró el archivo de esa skill en `~/.claude/skills`, se aplica su principio general.)
10. Sin signos de exclamación ni emojis. Tono sereno incluso en gravedad alta: "Requiere su atención hoy".
11. Mensajes de IA siempre rotulados ("Resumen generado por IA") con enlace a las fuentes.

## 7. Componentes a instalar

Ya instalados y que se conservan: `badge`, `timeline`, `data-grid`, `filters`, `cascader`, `date-selector`, `sidebar`, `tabs`, `item`, `empty`, `chart`, `sheet`, `scroll-area`, `skeleton`, `separator`, `toggle-group`.

Faltan (no existen hoy en `src/components`):

```bash
# Tabs de página (icono + etiqueta)
pnpm dlx shadcn@latest add @reui/c-tabs-6

# Selector de empresa y filas de lista con avatar
pnpm dlx shadcn@latest add @reui/c-item-9
pnpm dlx shadcn@latest add avatar

# Actividad como referencia de EventItem (se adapta, no se usa tal cual)
pnpm dlx shadcn@latest add @reui/c-item-12
pnpm dlx shadcn@latest add @reui/c-timeline-11

# Onboarding por pasos
pnpm dlx shadcn@latest add @reui/c-stepper-29

# DataGrid con encabezado fijo + scroll interno (Contratación, Competidores)
pnpm dlx shadcn@latest add @reui/c-data-grid-17
```

Opcional, solo si se quiere ancho ajustable en lista-detalle (no recomendado para la primera versión; el 40/60 fijo es más calmado):

```bash
pnpm dlx shadcn@latest add @reui/c-resizable-1
```

Antes de instalar, leer la API real con `get_component` de ReUI y validar con `validate_usage`. Los `c-*` son ejemplos: se copian, se cablean a datos y no se reestilizan.

**A eliminar o reemplazar:**

| Hoy | Acción |
|---|---|
| `components/shell/stat-card.tsx` | Reemplazar por tira de indicadores (L3) sin tarjeta. |
| `components/shell/data-table-card.tsx` | Reemplazar por `DataGrid` en `Frame` (L2) o por `EventItem` (L1). |
| `NAV_GROUPS` con 3 grupos y 17 ítems en `nav.ts` | Reemplazar por 5 ítems; tabs dentro de cada página. |
| Rutas `/senales`, `/pestel`, `/alertas`, `/linea-de-tiempo`, `/briefing`, `/seguimiento`, `/macro`, `/dias`, `/contratacion`, `/competidores`, `/regulacion`, `/preferencias`, `/fuentes`, `/acerca` | Pasan a tabs o a Configuración; mantener redirecciones. |
| `Sheet` como único detalle de Señales | Panel fijo en escritorio, `Sheet` en tablet/móvil. |
| `page-intro.tsx` con descripciones largas | Título de 1-3 palabras y una cláusula. |
| Grupos de sidebar "Operación / Dimensiones / Confianza" | Eliminar. |

## 8. Orden sugerido de implementación

1. `EventItem` + estados + `ScrollArea` de columna (base de L1).
2. Navegación de 5 ítems, `c-tabs-6` y pie de sidebar con selector de empresa.
3. L1 aplicado a Radar, Alertas, Noticias, Regulación, Línea de tiempo.
4. L2 en Señales y Contratación; L3 en Macro y TRM; L4 en Briefing.
5. Onboarding dividido con `c-stepper-29`.

Cada paso es una unidad de commit con sus pruebas; el layout se valida a 390, 768 y 1280 px de ancho.

## 9. Decisiones abiertas

1. **Vocabulario:** unificar "señal" y "alerta" en un solo término para la persona usuaria (propuesta: "aviso" para el evento y "regla" para lo que lo genera), o conservar ambos como hoy.
2. **Teclado:** si los atajos (`J`/`K`, `R`, `D`) se incluyen en la primera versión o se dejan para después de probar con usuarios.
3. **Descartados:** si "Descartado" se oculta del Radar y se recupera solo desde Alertas (propuesto), o se mantiene visible atenuado en el feed.

## 10. Fuentes

- Material 3 / Android, layouts canónicos (list-detail, supporting pane, feed): https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts
- Linear, Inbox (leído/no leído, posponer, atajos): https://linear.app/docs/inbox
- NN/g, dashboards y atributos preatentivos: https://www.nngroup.com/articles/dashboards-preattentive/
- MDN, `position: sticky` y ancestro con scroll: https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky
- Microsoft, patrón maestro/detalle: https://learn.microsoft.com/en-us/previous-versions/windows/hh465465(v=win.10)
- Stripe, eventos del Dashboard (lista de eventos tipados y filtrables): https://docs.stripe.com/development/dashboard/events
- Vercel, Activity Log (lista cronológica con filtros): https://vercel.com/docs/activity-log
- ReUI, guías de layout y movimiento: https://mcp.reui.io/skill/reui/rules/layout.md y https://mcp.reui.io/skill/reui/rules/motion.md
- ReUI, ejemplos: https://reui.io/components/timeline/c-timeline-11, https://reui.io/components/item/c-item-12, https://reui.io/components/data-grid/c-data-grid-17
- Divulgación progresiva (fuentes secundarias, evidencia sobre todo de práctica, no de estudios controlados): https://app.uxcel.com/glossary/progressive-disclosure

Nota de verificación: no se pudo abrir la página de Material 3 (`m3.material.io`, 404) ni artículos de NN/g sobre lenguaje claro; las afirmaciones de Material 3 se apoyan en la documentación de Android. Linear, Stripe y Vercel se citan por su documentación pública; el patrón común (lista cronológica de eventos tipados, con filtros) es una inferencia propia, no una guía publicada por ellos.
