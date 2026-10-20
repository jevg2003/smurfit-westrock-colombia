# Estado del arte y productos similares: monitor de entorno para Smurfit Westrock Colombia

Fecha de investigación: 2026-10-20. Convenciones: "[no verificado]" = no confirmado con fuente primaria en esta sesión; "(GH API)" = dato leído de la API de GitHub el 2026-10-20 (`https://api.github.com/repos/<org>/<repo>`). No se citan precios: ninguna página comercial consultada los publica.

## 1. Marcos de escaneo de entorno / prospectiva: qué sirve para un MVP de 1 día

| Marco | Qué es | Veredicto MVP |
|---|---|---|
| PESTEL | Clasificación de factores Político, Económico, Social, Tecnológico, Ambiental, Legal. Es una taxonomía, no un algoritmo. | **Usar** como campo `categoría` de cada señal y como filtro/pestañas. Costo casi nulo. |
| Cinco fuerzas de Porter | Análisis estructural de rivalidad, proveedores, compradores, sustitutos, nuevos entrantes. | **Usar solo como etiqueta opcional** (p. ej. "proveedor: pulpa/papel reciclado", "sustituto: plástico"). Un análisis completo es excesivo en 1 día. [sin fuente primaria consultada] |
| Señales débiles (Ansoff 1975; Hiltunen 2008) | Percepciones tempranas de cambio, "candidatas/hipótesis". Criterios: plausibilidad, novedad, relevancia, oportunidad. | **Usar el concepto, no la detección automática**: un campo `tipo: señal débil / tendencia / evento` y un estado de validación manual. La detección automática exige IA: diferir. Fuentes: [Canada Horizons, módulo 3](https://horizons.service.canada.ca/en/our-work/learning-materials/foresight-training-manual-module-3-scanning/3/index.shtml); [Fraunhofer ISI](https://www.isi.fraunhofer.de/content/dam/isi/dokumente/ccv/observe/Deliverable-1-3_Methodology-Report.pdf); origen en Ansoff 1975 según [Univ. Middlesex](https://mdx-repository.prod-uk.cayuse.com/download/a6a542b34c13848556245738e53b0d42fc6a0546d74c692b18b6a540ac9e70be/1322292/Enhancing%20horizon%20scanning.pdf). |
| Horizon scanning | Técnicas para identificar e interpretar implicaciones de señales débiles; sistema de alerta temprana ([USDA FS](https://research.fs.usda.gov/download/treesearch/44822.pdf)). El enfoque OECD parte de un escaneo amplio inicial ([IIEA](https://www.iiea.com/images/uploads/resources/Horizon_scanning_for_Enterprise_Growth.pdf)). | **Usar la primera fase** (escanear + registrar + clasificar). Las fases de priorización colectiva y escenarios son excesivas. |
| Escenarios, Delphi, backcasting | Prospectiva participativa. | **Excesivo** (requiere expertos/talleres). |

Recomendación: modelo de datos = `señal {fuente, url, fecha, categoría PESTEL, tipo, relevancia, estado, nota}`; alertas por reglas explícitas (umbral TRM, palabra clave en SECOP, etc.). Es la mínima estructura que deja a la IA un lugar claro donde enchufarse después (resumen, clasificación PESTEL, puntuación de relevancia).

## 2. Productos comerciales similares

Todos: precios no publicados en las páginas consultadas ("demo"/"trial").

| Producto | Problema / usuario | Destacado | Fortaleza | Limitación | Adaptar / no copiar |
|---|---|---|---|---|---|
| [Feedly Market Intelligence](https://feedly.com/market-intelligence) | Equipos de estrategia/innovación pierden señales; clientes citados: Lufthansa Innovation Hub, Pernod Ricard | Feeds por IA, dashboard de tendencias emergentes ("señales débiles") con enlaces de validación, tarjetas de insight, newsletters automáticos | Fuentes amplias; enlaza a la evidencia | Genérico, sin curaduría local (Colombia) [inferencia] | Adaptar: tendencias con enlace a evidencia, newsletter. No copiar: miles de fuentes genéricas. |
| [Crayon](https://www.crayon.co/) | Equipos go-to-market (CI, PMM, ventas) | Monitoreo de competidores, puntuación de importancia por IA, battlecards, integración Salesforce/Slack | Entrega la inteligencia donde trabaja el vendedor | Orientado a ventas SaaS; no a entorno macro/regulatorio | Adaptar: puntuación de importancia (luego con IA). No copiar: battlecards, métricas de ingresos influenciados. |
| [Klue](https://www.klue.com/) | CI + win-loss para ventas/PMM | Compete Agent, Ask Klue con respuestas citadas, win-loss | Curaduría humana + IA | Foco en ventas B2B | No copiar (win-loss no aplica). Idea: respuestas siempre con cita. |
| [AlphaSense](https://www.alpha-sense.com/) | Finanzas, corporativos, consultoras | Búsqueda sobre contenido premium (transcripciones, research de brokers); citas a nivel de oración | Profundidad de contenido licenciado | Contenido licenciado y de costo alto [precio no verificado]; fuera de alcance | Idea: citación fina. No copiar. |
| [Meltwater](https://www.meltwater.com/en/products/media-intelligence) | Monitoreo de medios/PR | [no verificado: la página devolvió 404] | — | — | — |
| [Signal AI](https://www.signal-ai.com/) | CCOs/CROs: reputación y riesgo | 226 mercados, 120+ idiomas, datos de pago vía alianzas licenciadas, horizon scanning de riesgos emergentes, conector MCP | Declara fuentes licenciadas, no scraping | Enfoque reputación/PR | Adaptar: bloque "riesgos emergentes". Nota: modelo licenciado es la vía para contenido completo. |
| [Contify](https://www.contify.com/) | Estrategia/producto/ventas en TI, farma, banca, manufactura | 1M+ fuentes, 117+ idiomas, seguimiento de cambios en sitios de competidores, servicios gestionados de analistas | Híbrido IA + analistas | Genérico global | Adaptar: línea de tiempo por competidor, "cambio en sitio web". |
| [Owler](https://owler.com/) | Perfiles de empresas | [no verificado: timeout al consultar] | — | — | — |
| [Valona Intelligence](https://www.valona.com/) | Horizon scanning/riesgo | [no verificado: certificado vencido en su sitio] | — | — | — |
| [EMIS / ISI Emerging Markets](https://isimarkets.com/emis/) | Datos de mercados emergentes (la web redirige a isimarkets.com) | [contenido no leído] ; ficha de empresas colombianas indexada ([ejemplo](https://www.emis.com/php/company-profile/CO/Valor_+_SAS_en_4916143.html)) | — | — | [no verificado] |
| [Valora Analitik](https://www.valoraanalitik.com/?p=164426) | Medio económico colombiano con plan premium | 1.100+ suscriptores premium (dato 2021); clientes: fondos, calificadoras, entidades públicas; autorizado por la Superfinanciera para publicar información relevante | Curaduría local | Datos de 2021; precios actuales [no verificado] | Fuente a enlazar (titular + link), no a copiar. |
| Bloomberg Línea | Medio LatAm | [no verificado: sin resultados] | — | — | — |
| [Datlas Colombia](https://www.bancoldex.com/en/node/4471) (Atlas de Complejidad Económica) | Diagnóstico productivo de departamentos y municipios; apoyo Harvard, Bancóldex; proyecto 2014-2018 ([Harvard GL](https://growthlab.hks.harvard.edu/project/colombia-atlas/)) | Exportaciones, importaciones, empleo, salarios por territorio; acceso libre | Gratuito, territorial | Vigencia/actualización [no verificado] | Fuente complementaria, no competidor. |
| GlobalNews | Monitoreo de medios LatAm, 18 países ([fuente](https://impactotic.co/noticias-tic/lanzan-herramienta-para-monitorear-competencia-en-comunicaciones-y-mas-noticiastic/)) | Clipping + inteligencia competitiva | Cobertura regional | Presencia en Colombia [no verificado] | Referencia de mercado. |

Brecha detectada: no se encontró (en esta búsqueda) un producto sectorial para empaques/papel en Colombia con alertas regulatorias y de compras públicas. Es hipótesis, no hecho verificado; ampliar la búsqueda antes de afirmarlo en público. Prisma/Zigla: no encontrados.

## 3. Open source / fuentes abiertas (GH API 2026-10-20 salvo indicación)

| Proyecto | Licencia verificada | Clasificación | Último release / commit | Uso en MVP sin infraestructura |
|---|---|---|---|---|
| [OpenBB](https://github.com/OpenBB-finance/OpenBB) | Apache-2.0 según [LICENSE](https://raw.githubusercontent.com/OpenBB-finance/OpenBB/develop/LICENSE) (GH marca NOASSERTION por el encabezado) | OSI abierta | release ODP 2026-09-30; push 2026-10-18 | Solo inspiración (Python, datos financieros globales; poca cobertura Colombia [no verificado]). |
| [Huginn](https://github.com/huginn/huginn) | MIT | OSI abierta | v2026.10.14 | Inspiración (agentes/reglas); requiere servidor Ruby+DB. |
| [n8n](https://github.com/n8n-io/n8n) | Sustainable Use License + archivos `.ee` bajo licencia propia ([LICENSE.md](https://raw.githubusercontent.com/n8n-io/n8n/master/LICENSE.md)): uso solo para "propósitos internos de negocio" o no comerciales; redistribución solo gratis y no comercial | Source-available / fair-code, NO OSI | n8n@2.44.4, 2026-10-19 | No para el MVP; puede servir como orquestador interno futuro, no embebido. |
| [Apache Superset](https://github.com/apache/superset) | Apache-2.0 | OSI abierta | 6.1.0, 2026-05-13 | No: requiere servidor/DB; inspiración de dashboards. |
| [Metabase](https://github.com/metabase/metabase) | Núcleo AGPL; edición Enterprise bajo licencia comercial MCSL, source-available; embebido exige AGPL, logo "Powered by" o licencia comercial ([metabase.com/license](https://www.metabase.com/license/)) | AGPL (OSI) + comercial | v0.64.1, 2026-10-07 | No (servidor, AGPL con embebido). |
| [Evidence](https://github.com/evidence-dev/evidence) | MIT | OSI abierta | @evidence-dev/evidence@40.1.8, 2026-02-06; push 2026-10-16 | Inspiración (BI as code con Markdown+SQL); no encaja en un SPA Next.js propio. |
| [Grafana](https://github.com/grafana/grafana) | AGPL-3.0 | OSI abierta (copyleft de red) | v13.2.4, 2026-10-13 | No (servidor). |
| [Miniflux](https://github.com/miniflux/v2) | Apache-2.0 | OSI abierta | 2.3.4, 2026-10-20 | Solo como agregador RSS self-hosted post-MVP. |
| [FreshRSS](https://github.com/FreshRSS/FreshRSS) | AGPL-3.0 | OSI abierta | 1.30.2, 2026-10-19 | Idem. |
| [Media Cloud (backend)](https://github.com/mediacloud/backend) | AGPL-3.0; repo archivado | OSI, abandonado | último push 2023-11-20 | No. Vigencia del proyecto actual [no verificado]. |
| [news-please](https://github.com/fhamborg/news-please) | Apache-2.0; archivado | OSI, archivado | push 2026-04-14 | No (Python crawler; requiere backend). |
| [changedetection.io](https://github.com/dgtlmoon/changedetection.io) | Apache-2.0 (GH API) | OSI abierta | 0.60.9, 2026-10-12 | Idea útil (vigilar cambios en páginas regulatorias); requiere servidor. |
| [Datasette](https://github.com/simonw/datasette) | Apache-2.0 | OSI abierta | 0.65.5, 2026-09-16 | Solo inspiración (publicar SQLite). |
| GDELT | Libre para uso comercial/académico/gubernamental con cita y enlace obligatorios ([about](https://www.gdeltproject.org/about.html)); no se halló nombre de licencia estándar | Datos gratuitos con atribución, no licencia OSI | n/a | Sí como fuente de datos (API pública), citando "GDELT Project" con enlace. Cobertura de medios colombianos del sector [no verificado]. |

Nota: licencias de GitHub cambian; reconfirmar antes de depender de alguna. La conclusión práctica: en un MVP sin infraestructura **ninguna** herramienta se usa tal cual; todas son servidores. Lo reutilizable es la idea.

## 4. Apps públicas colombianas

- **datos.gov.co (MinTIC, Socrata)**: portal nacional; datasets con API y licencias definidas por cada entidad ([contexto MinTIC](https://bogota.gov.co/en/node/246029)). Ejemplo SECOP II procesos, id `p6dx-8zbt` (ver [SECOP MCP](https://github.com/amgallego8/SECOP-MCP) y [manual CCE](https://colombiacompra.gov.co/wp-content/uploads/2024/09/manual_de_datos_abiertos_actualizado.pdf)); contratos y procesos son datasets separados y solo parcialmente solapados ([CC Medellín](https://www.camaramedellin.com.co/Portals/0/Documentos/Informe_1_hasta_2022.pdf)). Brecha: sin alertas ni curaduría sectorial. Una app token de Socrata sube el límite de peticiones (según el SECOP-MCP; confirmar en documentación Socrata).
- **Colombia Compra Eficiente**: [búsqueda pública sin login](https://consultaprocesos.colombiacompra.gov.co) para SECOP I, II y TVEC. Fuerte en consulta; no hay suscripción por criterio sectorial (a verificar).
- **TRM**: la calcula y certifica la Superfinanciera ([página](https://www.superfinanciera.gov.co/60819)), con histórico en datos abiertos; id del dataset `32sa-8pi3` [no verificado].
- **DANE geovisores**: capas geográficas para usuarios no especialistas ([DANE](https://www.dane.gov.co/files/control_participacion/rendicion_cuentas/2024/inf-presentacion-Cuentas-Sectorial-2023-2024.pdf)); inflación/PIB por DANE y Banco de la República: endpoints concretos [no verificado].
- **Así Vamos en Salud**: tanque de pensamiento civil desde 2002, índice sintético con 4 pilares ([ficha](https://www.fundacioncorona.org/en/documentos/%C3%ADndice-as%C3%AD-vamos-en-salud-2016)): modelo de "índice compuesto trazable a fuente oficial" imitable. Monitor Ciudadano: no hallado.
- Brechas comunes [inferencia]: cada fuente es un silo, sin vista integrada por industria, sin alertas por reglas, sin registro de decisión.

## 5. Valor diferencial del MVP

1. **Curaduría sectorial** (papel, cartón corrugado, empaques sostenibles, Yumbo/Valle): lista explícita de fuentes y palabras clave, versionada.
2. **Procedencia primero**: cada señal muestra fuente, fecha de captura, enlace y si es dato oficial o noticia.
3. **Alertas por reglas explícitas y legibles** (ej. "TRM > X", "SECOP: proceso con 'cartón' > Y COP"); la IA vendrá después como segunda capa, sin reemplazar la regla.
4. **Bitácora de decisión** local: qué se vio, quién/qué decidió (nota), útil para IA futura como contexto.
5. **Contrato de datos estable** (`Signal`) con campos `summary` y `category` hoy manuales, mañana generados por IA.
6. Sin login ni infraestructura: PWA/SPA con almacenamiento local y fetch directo a APIs con CORS (a verificar por fuente).

## 6. Consideraciones legales (Colombia)

Distinción: **O** = obligación legal verificada con fuente; **P** = precaución general; **NV** = no verificado.

| Tema | Estado | Detalle |
|---|---|---|
| Ley 1581 de 2012, datos personales | **O (condicional)** | Dato personal: información vinculada o asociable a personas naturales identificadas/identificables (art. 3 lit. c, citado en [Concepto SIC 13-230237](https://sedeelectronica.sic.gov.co/sites/default/files/normatividad/Concepto_13-230237.pdf)); no aplica a personas jurídicas ni a bases de uso exclusivamente personal/doméstico (art. 2). Si solo se usa localStorage del navegador y no hay analítica ni envío al servidor, no habría tratamiento por el operador [conclusión mía, no confirmada por la SIC]. Cuidado: logs de hosting, analítica, formularios o nombres de personas en noticias pueden activar el régimen. RNBD obligatorio solo para sociedades con activos > 100.000 UVT y entidades públicas ([Holland & Knight](https://www.hklaw.com/es/insights/publications/2025/01/obligaciones-del-registro-nacional-de-bases-de-datos-personales)). Texto oficial de la ley no consultado directamente; citas vía conceptos SIC. |
| Derechos de autor (Ley 23/1982; Decisión Andina 351) | **NV en artículos exactos** | No se pudo verificar el texto de los arts. de cita/reproducción de prensa. Hay jurisprudencia andina sobre el art. 22 de la Decisión 351 (excepciones, p. ej. [270-IP-2022](https://www.comunidadandina.org/DocOficialesFiles/Procesos/270_IP_2022.pdf)) y la Corte Constitucional trató la materia en la [C-339/06](https://www.corteconstitucional.gov.co/relatoria/2006/C-339-06.htm). **P recomendada**: mostrar solo titular, fuente, fecha y enlace; sin cuerpo completo ni imágenes de terceros; atribución clara. Validar con abogado. |
| datos.gov.co | **P / NV** | No se obtuvo la página de términos de uso de datos.gov.co (la URL probada dio 404). Principio MinTIC: datos con licencia/términos abiertos ([Bogotá](https://bogota.gov.co/en/node/246029)); cada entidad define su licencia (ej. [Superfinanciera, Res. 1519/2020](https://www.superfinanciera.gov.co/publicaciones/10116019/licencia-abierta-y-condiciones-de-uso-para-datos-abiertos/)). **P**: guardar licencia por dataset en el campo `source.license`. |
| GDELT | **Condición de uso verificada** | Uso libre incluso comercial; redistribución permitida; cita obligatoria a GDELT con enlace ([about](https://www.gdeltproject.org/about.html)). |
| Google News RSS | **NV / P** | No se halló el texto de los términos vigentes; fuentes secundarias dicen que el feed es para uso personal/no comercial en lector RSS y que reutilizarlo en un sitio exige atribución a Google News y al proveedor ([SEJ, vía búsqueda](https://www.searchenginejournal.com/youtube-seo-guide/2022/08/) ); estado vigente [no verificado]. **P**: preferir RSS directo de cada medio o GDELT. |
| Marca / suplantación (Smurfit Westrock) | **P** | No se consultó norma de marcas (Decisión Andina 486) [NV]. Precaución: no usar logos ni identidad visual; nombre solo descriptivo; disclaimer visible: "Proyecto independiente, sin afiliación ni aval de Smurfit Westrock; marcas pertenecen a sus titulares". Si es un ejercicio para la empresa, obtener autorización escrita antes de publicar con su nombre. |
| Condiciones de cada API | **P** | Revisar términos de cada fuente (Banco de la República, DANE, Socrata app token) antes de producción. |

Descargo: investigación documental, no asesoría legal.

## Recomendaciones para el día 1

- Usar PESTEL + tipo de señal + estado manual; sin Porter completo ni escenarios.
- No integrar herramientas OSS; consumir APIs públicas (datos.gov.co/Socrata, GDELT) y RSS directo desde el SPA o Route Handlers.
- Guardar siempre `source`, `license`, `retrievedAt`, `url`.
- Disclaimer y atribución desde el día 1.
