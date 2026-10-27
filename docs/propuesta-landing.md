# Propuesta de landing: Smart Work Core

Estado: implementada en `src/features/landing/`. Fecha: 2026-10-27.

Objetivo: que quien llega entienda en un vistazo qué hace Smart Work Core (SWC) y por qué puede fiarse de él, y entre a la app. La marca nace del "core": todo converge en un punto y de ahí sale una decisión.

## 1. Referencias

Lectura hecha con las páginas públicas (texto, estructura y descripciones; no se copió ningún diseño ni texto).

| Referencia | Qué hace bien | Qué se toma |
|---|---|---|
| [Linear](https://linear.app) | Frases cortas y secas; el producto se muestra con datos creíbles, no con ilustraciones. | Mantener la vista de ejemplo del radar con la UI real de la app, rotulada "Datos de ejemplo". |
| [Plausible](https://plausible.io) | La confianza (sin cookies, código abierto, quién lo hace) es el argumento principal, no un adorno. | La regla escrita y la fuente enlazada son el argumento de confianza; la sección de independencia es explícita. |
| [Honeycomb](https://www.honeycomb.io) | Afirmaciones concretas y paralelas; cada captura responde a una pregunta del usuario. | Copy con verbos y cosas reales (TRM, SECOP II, decretos), sin adjetivos. |
| [Stripe](https://stripe.com) | Mini vistas de producto dentro de la composición y rejillas con ritmo variado. | Las fuentes aparecen como piezas reales dentro de la animación, no como iconos genéricos. |
| [Our World in Data](https://ourworldindata.org) | Cada gráfico acredita su fuente, su licencia y la fecha; avisa de lo que el dato no dice. | Sección "Fuentes y licencias" con enlaces y aviso de que los datos pueden tardar o fallar. |
| [Vercel](https://vercel.com) | Titular corto, una sola acción principal, prueba concreta debajo. | Un solo CTA con una sola etiqueta en toda la página. |
| [XPLN, desglose de Apexure](https://www.apexure.com/landing-page-examples/xpln-landing-page) | En un producto de datos, la propia vista del producto es la prueba. | El radar de ejemplo va justo después de la explicación, antes de la lista de funciones. |

Limitación: las páginas se leyeron como texto, así que el movimiento de las referencias no se pudo observar. El plan de movimiento es propio.

## 2. Dirección de diseño

Lectura: landing B2B para equipos de estrategia y compras en Colombia, con lenguaje sobrio y algo de juego, apoyada en la paleta de la marca.

- Dials: variación 6, movimiento 5, densidad 3.
- Paleta: tinta `#1A1F24`, blanco y lima `#A3E40A` como único acento. En fondo claro el texto lima usa `#4D7300` (contraste 5:1); en oscuro se usa el lima de marca. Los colores semánticos de la app (avisos) se conservan solo dentro de las vistas de ejemplo.
- Tipografía: Geist (la de la app). Glacial Indifference queda fuera: añadiría una descarga de fuente y el logotipo ya la lleva convertida a trazos.
- Forma: radios de 8 a 16 px y bordes finos; sin sombras de color ni degradados animados.
- Botón principal: tinta sobre claro, lima sobre oscuro. Mismo texto en cabecera, hero y cierre: "Entrar a Smart Work Core".

## 3. Estructura

1. **Cabecera.** Wordmark SWC y tres anclas. Propósito: orientarse y entrar.
2. **Hero.** Titular, una frase y un CTA a la izquierda; el wordmark a la derecha se dibuja desde el punto central y emite tres anillos tenues. Propósito: marca y promesa.
3. **Del ruido a un aviso con regla.** Siete fuentes dispersas convergen en el core y salen como tres avisos, cada uno con su regla y su fuente. Propósito: explicar el problema y la solución sin vídeo.
4. **Radar de ejemplo.** La UI real con datos fijos. Propósito: prueba.
5. **Qué hace.** Dos columnas separadas por línea: "Qué mira" y "Qué te entrega". Propósito: alcance real hoy (macro, SECOP II, competidores, noticias y regulación; radar, PESTEL, briefing, asistente).
6. **Se configura para tu empresa.** Perfiles por empresa, guía corta, NIT opcional. Propósito: explicar el multiempresa.
7. **Cómo funciona.** Fuentes, reglas, aviso con enlace.
8. **Fuentes y licencias.**
9. **Independiente de las fuentes y CTA final.**
10. **Pie.** Wordmark, "by mecateo.co" (enlace externo con `rel="noopener"`), aviso de independencia y selector de tema.

Cinco familias de composición distintas (split, flujo SVG, panel de producto, columnas con filas, pasos numerados), sin tarjetas iguales en rejilla.

## 4. Plan de movimiento

Cada animación comunica algo; todas ocurren una vez.

| Dónde | Qué comunica | Cómo |
|---|---|---|
| Hero | La marca crece desde el core | Trazos con `pathLength` y `stroke-dashoffset`: punto, C, W, S; luego anillos. CSS puro. |
| Flujo | Muchas fuentes se vuelven pocos avisos | Al entrar en pantalla (una vez): las etiquetas salen de posiciones fijas desordenadas, las líneas se trazan hacia el core, pulso y salida de los avisos en secuencia. Pasar el ratón sobre una fuente resalta su línea. |
| Secciones | Orden de lectura | Aparición suave de 14 px, una vez por bloque. |
| Botones y filas | Respuesta | Cambios de color y desplazamiento de 2 px de la flecha. |

Reducción de movimiento: bajo `prefers-reduced-motion: reduce` no se arma ningún estado oculto y las animaciones CSS no se declaran; se ve el estado final. El servidor siempre renderiza el estado final y el estado "armado" se aplica tras montar, así que no hay diferencias de hidratación ni salto de diseño (las cajas mantienen su tamaño). Sin JavaScript también se ve completo.

## 5. Principios de copy

- Español neutro y profesional; frases cortas; cosas concretas (TRM, SECOP II, decretos) en lugar de adjetivos.
- Se usa "aviso" y "regla", el vocabulario de la app.
- Ninguna mención de piloto, MVP, beta, prototipo ni subproducto. Una prueba automática lo vigila.
- Sin cifras inventadas. Lo ilustrativo se rotula "Ejemplo" o "Datos de ejemplo".
- El asistente se describe tal como es: responde solo sobre los datos ya cargados.
- Un solo texto para la acción principal.

## 6. Qué se quitó y por qué

- Franja superior y bloque "PilotNotice" en tono de advertencia: leían como producto de prueba. El aviso de independencia se mantiene, en el pie y en un bloque neutro al final.
- Rejilla de ocho tarjetas con icono: era la plantilla genérica; se sustituye por dos columnas legibles.
- `BorderBeam` (luz animada en el borde del radar) y su carga diferida: decoración sin significado.
- Logo genérico con icono de radar: ahora se usa el wordmark SWC.
- Texto "El acceso es solo para correos autorizados" bajo el hero: se mantiene solo en el cierre.

## 7. Accesibilidad y rendimiento

- Enlace para saltar al contenido, `main`, secciones con `aria-labelledby`, un único `h1`.
- SVG decorativos con `aria-hidden`; el wordmark expone un nombre accesible. El flujo conserva el contenido en texto (etiquetas y lista de avisos).
- Foco visible con contorno lima/oliva en todos los enlaces y botones.
- Contraste AA: texto lima sobre claro usa `#4D7300`; botón lima sobre oscuro lleva texto tinta.
- Enlaces externos con aviso "se abre en otra pestaña" para lectores de pantalla.
- La página sigue siendo estática (`force-static`). Solo son componentes de cliente los pequeños: `Reveal`, `SignalFlow`, el selector de tema y el gráfico, que sigue cargándose en su propio fragmento tras la hidratación. No se añadió ninguna dependencia ni fuente.
- Animación solo de `opacity`, `transform` y `stroke-dashoffset`.
- Móvil a 390 px: el flujo cambia a disposición vertical; sin desbordamiento horizontal.

## 8. Piezas de React Bits

Se añaden cuatro piezas de [React Bits](https://reactbits.dev), en su variante TypeScript con CSS (`-TS-CSS`), copiadas a `src/components/react-bits/<Nombre>/` y con el registro `@react-bits` declarado en `components.json`. Única dependencia nueva: `matter-js` (física de `FolderFloat`) y sus tipos.

| Pieza | Dónde | Qué comunica |
|---|---|---|
| `FolderFloat` | "Se configura para tu empresa" | Cada empresa tiene una carpeta con lo que Smart Work Core vigila para ella (palabras clave, riesgos, oportunidades, competidores, contratos). Sustituye los tres símbolos decorativos. Tres perfiles de ejemplo, rotulados "Datos de ejemplo"; la primera carpeta nace abierta y las demás se abren con clic, Enter o espacio. |
| `LatticeLoader` | Flujo "Del ruido a un aviso con regla" | Narra el orden real mientras se reproduce la animación: "Leyendo fuentes", "Aplicando reglas" y "Reglas aplicadas". Son las reglas escritas las que crean los avisos; el asistente solo lee los datos ya cargados, y por eso el texto nunca habla de IA. |
| `SpecularButton` | CTA del hero y del cierre | Una luz recorre el borde y sigue al puntero. Sigue siendo un enlace `<a>` a la app (el componente se extendió con `href`). La cabecera conserva el botón sobrio. |

`Radar` no se usó: detrás de la vista de ejemplo del radar sería decoración, y el hero ya tiene los anillos. `Folder` (versión WebGL de 2.200 líneas) tampoco: `FolderFloat` cubre la metáfora con un tercio del coste.

Rendimiento y movimiento:

- `FolderFloat` y `matter-js` se cargan en un fragmento aparte solo cuando la fila de carpetas está a 300 px de la pantalla; antes se muestra una carpeta cerrada con las mismas medidas, así que no hay saltos. La física solo corre mientras la fila está visible.
- `SpecularButton` pinta con WebGL2 solo mientras es visible y solo mientras hay movimiento que mostrar; sin WebGL queda el botón plano.
- Con `prefers-reduced-motion: reduce`: la física no arranca, el cargador queda en su estado final ("Reglas aplicadas") y la luz del botón no gira sola.
- Accesibilidad: cada carpeta es un botón con `aria-expanded` y foco visible (contorno lima/oliva, añadido porque el componente original lo quitaba); el contenido de las carpetas también está en texto para lectores de pantalla.

Cambios al código copiado: `SpecularButton` acepta `href` y deja de forzar `loseContext()` al desmontar (con React StrictMode en desarrollo el segundo montaje pintaba un recuadro blanco). Los estilos propios están en `landing.css`.

Además, el wordmark del hero reutiliza `SwcWordmark`; la animación de trazado se hace por CSS sobre sus tres trazos (`stroke-dasharray` fijo, sin `pathLength`), y los anillos van en un SVG decorativo aparte. Se eliminó la copia de las rutas.
