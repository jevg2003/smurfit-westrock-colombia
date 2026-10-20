# Fuentes de datos públicas verificadas — Monitor del entorno (MVP de un día)

Verificación: **2026-10-20**, curl desde Cali/Colombia (IP 181.62.52.208), cabecera `Origin: https://example.com` para evaluar CORS. Latencias = `time_total` de curl, una sola medición (indicativas). "CORS" = valor de `Access-Control-Allow-Origin` observado. Todo lo marcado como no probado se indica expresamente.

## 1. Resumen y clasificación

| # | Fuente | Clasificación | CORS | Latencia | Uso día 1 |
|---|--------|---------------|------|----------|-----------|
| 1 | datos.gov.co TRM `mcec-87by` | **VERIFIED-WORKS-IN-BROWSER** | `*` | 1,2 s | Indicador TRM + histórico |
| 2 | datos.gov.co SECOP II contratos `jbjy-vk9h` (filtros UNSPSC / proveedor NIT) | **VERIFIED-WORKS-IN-BROWSER** (evitar `LIKE` sobre texto: 14–48 s) | `*` | 0,4–5 s con filtros exactos | Señal de demanda pública + competidores |
| 3 | datos.gov.co SECOP II procesos `p6dx-8zbt` | **VERIFIED-WORKS-IN-BROWSER** | `*` | 0,5–4,6 s | Oportunidades abiertas |
| 4 | datos.gov.co Supersociedades "10.000 empresas más grandes" `6cat-2gcs` | **VERIFIED-WORKS-IN-BROWSER** | `*` | 0,7–6,3 s | Ficha financiera de Cartón de Colombia y competidores |
| 5 | datos.gov.co Exportaciones NME `vwqt-xc3z` | **VERIFIED-WORKS-IN-BROWSER** | `*` | 0,5 s | Contexto macro trimestral (agregado, no sectorial) |
| 6 | datos.gov.co Normativa Presidencia `88h2-dykw` | **VERIFIED-WORKS-IN-BROWSER** (utilidad baja) | `*` | 0,5 s | Decretos generales; sin filtro temático útil hoy |
| 7 | datos.gov.co Catálogo Socrata Discovery API | **VERIFIED-WORKS-IN-BROWSER** | `*` | 0,5–6,5 s | Descubrimiento de datasets |
| 8 | World Bank API (PIB, IPC anual) | **VERIFIED-WORKS-IN-BROWSER** | `*` | 0,9–1,0 s | PIB e inflación anual (solo anual) |
| 9 | Banco de la República — SUAMECA back (`estadisticas-economicas-back`) | **VERIFIED-WORKS-IN-BROWSER pero NO documentado/oficial** (riesgo de cambio) | `*` | 0,4–0,8 s | TRM, tasa de política monetaria (id 59) |
| 10 | BanRep `totoro…/consultaMercadoCambiario` (TRM intradía) | **VERIFIED-WORKS-IN-BROWSER pero NO documentado** | `*` | 1,2 s | Gráfico intradía COP/USD |
| 11 | GDELT DOC 2.0 API | **UNRELIABLE** (429 persistente, reproducido) | sin cabecera | 10–12 s hasta el 429 | No usar en browser |
| 12 | GDELT archivos GKG/Events (`data.gdeltproject.org`) | **WORKS-NEEDS-SERVER-PROXY** (zips de ~6 MB cada 15 min) | `*` | 1,2 s (lastupdate) | Iteración 2, ETL server |
| 13 | Google News RSS | **WORKS-NEEDS-SERVER-PROXY** (sin CORS + términos "uso personal no comercial") | ninguna | 0,5–1,2 s | Mejor opción de noticias por palabra clave, vía ruta server |
| 14 | RSS Portafolio / La República / El Tiempo / Valora / SIC | **WORKS-NEEDS-SERVER-PROXY** | ninguna | 0,1–3,0 s | Noticias generales económicas, filtrar por keyword |
| 15 | RSS El Colombiano (negocios) | **VERIFIED-WORKS-IN-BROWSER** (CORS `*`; feed de 512 KB) | `*` | 0,9 s | Noticias |
| 16 | RSS Minambiente | **WORKS-NEEDS-SERVER-PROXY** (CORS restringido a su dominio) | `https://www.minambiente.gov.co` | 1,8 s | Regulación ambiental |
| 17 | DANE IPC (xlsx de anexos) | **WORKS-NEEDS-SERVER-PROXY** (sin API; CORS restringido a dane.gov.co) | `https://dane.gov.co` | 0,15 s | IPC oficial mensual |
| 18 | DANE microdatos (catálogo NADA) | **NOT-USEFUL** día 1 (catálogo, no series) | `*` | 0,25 s | — |
| 19 | SUIN-Juriscol / Gestor normativo Función Pública / Diario Oficial | **NOT-USEFUL** día 1 (sin API/feed verificado; Diario Oficial: conexión fallida HTTP 000) | n/a | n/a | Enlazar manualmente |
| 20 | datos.gov.co residuos / ECA (`d7pt-p5fi`, `weq5-ryjx`) | **VERIFIED-WORKS-IN-BROWSER** técnicamente, utilidad baja | `*` | 0,5 s | Contexto reciclaje (iteración 2) |
| 21 | datos.gov.co IPC / producción industrial / EMMET | **NOT-USEFUL** (no hay datasets en el catálogo; búsquedas devolvieron cero resultados relevantes) | — | — | Ir a DANE/BanRep |

## 2. Hallazgos que corrigen la evidencia previa del README

1. **TRM `mcec-87by`: confirmado.** Funciona sin llave y con CORS `*`. Particularidad: el dataset ya contiene la TRM del día siguiente (`vigenciadesde` 2026-10-21 = 3163,76 COP; 2026-10-20 = 3156,32). La vigencia es de "desde-hasta", no la fecha de cálculo.
2. **SECOP II "no es señal útil": parcialmente refutado.** Las categorías de papel de escritorio (UNSPSC `14111500`: 1.949 contratos históricos) sí son papelería. Pero hay señal real en tres frentes que el README no exploraba:
   - **Comprador = licoreras departamentales** (cajas de cartón para aguardiente): Industria Licorera del Cauca, Fábrica de Licores de Antioquia, Licorera de Boyacá, Fábrica de Licores del Tolima.
   - **Competidores como proveedores adjudicados** por NIT: Cartones América (860026759), Carvajal Empaques (890319047), Papeles y Cartones (890925108).
   - **Cartón de Colombia S.A. (NIT 890300406) como proveedor**: 4 contratos / COP 3.459.188.610 acumulados.
   El filtro por código UNSPSC solo no sirve para cartón corrugado: `24112700` es estibas/pallets (p. ej. ESENTTIA S.A. "COMPRA ESTIBAS", base COP 38.508.400, 2026-09-07) y `24141500` es dotación/seguridad. La familia `2412xxxx` es empaque (`24121500` mezcla emergencias, `24122003` vidrio, `24122004` tapas). **El filtro útil es por NIT del proveedor, no por UNSPSC.**
3. **GDELT DOC API: confirmado, empeora.** 4 de 4 solicitudes con espera ≥ 8 s devolvieron 429, incluida la primera tras 20 s de silencio y a través de `r.jina.ai` (IP distinta) → el límite es global del servicio, no de nuestra IP. Se descarta como fuente de día 1.

## 3. Detalle por fuente

### 3.1 datos.gov.co (Socrata SODA) — reglas generales

- Organización: MinTIC / Gobierno de Colombia. Portal https://www.datos.gov.co, API https://dev.socrata.com/docs/endpoints.html (SODA 2.x `/resource/<id>.json`).
- **Licencia:** verificada por dataset vía `https://www.datos.gov.co/api/views/<id>.json` → `licenseId`: `CC_40_BY_SA` (CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/legalcode) en `mcec-87by` (atribución Superfinanciera), `jbjy-vk9h` y `p6dx-8zbt` (Agencia Nacional de Contratación Pública – Colombia Compra Eficiente), `6cat-2gcs` (Supersociedades). Obliga a atribución y a compartir bajo igual licencia las obras derivadas de los datos; **mostrar la fuente y licencia en el pie de cada tarjeta**. Se verificó solo en estos 4 datasets; revisar cada uno que se añada.
- **Token / throttling:** documentación Socrata https://dev.socrata.com/docs/app-tokens.html (no reprobada hoy): sin `X-App-Token` las solicitudes comparten un pool con límite por IP; con token es mayor. Prueba empírica: 40 GET secuenciales anónimos a `mcec-87by` → 40 × HTTP 200 (115,6 s totales), sin 429. Para un MVP browser-side anónimo sirve; si se pasa a ruta server, registrar un app token gratuito (no necesario hoy).
- **CORS `*`** en todos los endpoints `/resource/*.json` y en `api.us.socrata.com/api/catalog/v1` (verificado).
- **Rendimiento:** filtros de igualdad / `IN` / rangos de fecha sobre columnas indexadas: 0,4–5 s. `LIKE '%texto%'` sobre `descripcion_del_proceso` (contratos): **48,4 s** (17 resultados); `LIKE` sobre `proveedor_adjudicado`: 12–14 s; sobre `entidad` en procesos: 13 s. **Regla: nunca usar `LIKE` en la ruta crítica; usar `documento_proveedor`, `nit_entidad`, `codigo_de_categoria_principal` y `fecha_de_firma`.**
- Los códigos UNSPSC en SECOP II llevan prefijo `V1.` (ej. `V1.24121500`).
- Cobertura SECOP II: nacional, histórico desde 2015-ish (no verificado el inicio); actualización: `rowsUpdatedAt` de los tres datasets SECOP/TRM = 2026-10-20 (diaria).

#### a) TRM — `mcec-87by`
- URL: `https://www.datos.gov.co/resource/mcec-87by.json?$limit=2&$order=vigenciadesde%20DESC` → HTTP 200, 1,17 s, CORS `*`.
- Muestra: `{"valor":"3163.76","unidad":"COP","vigenciadesde":"2026-10-21T00:00:00.000","vigenciahasta":"2026-10-21T00:00:00.000"}`; anterior `3156.32` (2026-10-20).
- Histórico completo desde 1991 (no contado hoy). Frecuencia diaria. Alternativa BanRep (3.9) trae la misma serie.

#### b) SECOP II contratos — `jbjy-vk9h`
- Campos clave: `nombre_entidad`, `departamento`, `codigo_de_categoria_principal`, `valor_del_contrato`, `fecha_de_firma`, `proveedor_adjudicado`, `documento_proveedor`, `estado_contrato`, `modalidad_de_contratacion`, `descripcion_del_proceso`, `urlproceso{url}`.
- Conteos históricos por UNSPSC (URL: `…/jbjy-vk9h.json?$select=codigo_de_categoria_principal,count(*)&$where=codigo_de_categoria_principal in('V1.14111500',…)&$group=…`, 0,47 s): `14111500`=1.949; `14111600`=41; `14111800`=347; `24112700`=48; `24141500`=168.
- Empaque 12 últimos meses (firma > 2025-10-01), `…$where=codigo_de_categoria_principal like 'V1.2412%' AND fecha_de_firma>'2025-10-01'&$group=…` (0,87 s): 15 subcódigos; mayores `24122003` (vidrio, COP 49,5 mil millones, 5 contratos) y `24122004` (tapas, COP 45,2 mil millones, 9). Es ruido para cartón → ver nota arriba.
- Consulta efectiva por competidor: `…$select=nombre_entidad,proveedor_adjudicado,valor_del_contrato,fecha_de_firma&$where=documento_proveedor in('860026759','890319047','890925108') AND fecha_de_firma>'2025-10-01'&$order=fecha_de_firma DESC&$limit=4` → 3 filas: Papeles y Cartones S.A. → Nueva Licorera de Boyacá COP 371.874.893 (2026-06-26); Papeles y Cartones → FLA Antioquia COP 1.487.202.000 (2026-01-30); Cartones América → Fábrica de Licores del Tolima COP 353.845.310 (2026-01-26). Latencia total < 1 s.
- Limitación: SECOP II solo cubre compra pública; el grueso del mercado de Smurfit es privado. Es **señal de nicho**, no de mercado total. Solo aparecen contratos de licoreras estatales y similares.

#### c) SECOP II procesos — `p6dx-8zbt`
- Filtro funcional: `…$where=codigo_principal_de_categoria in('V1.24112700','V1.24141500') AND fecha_de_publicacion_del>'2026-09-01'&$order=fecha_de_publicacion_del DESC` → 3 filas, 0,53 s (el primer `$limit=1` sin filtro tardó 4,6 s).
- Campos: `entidad`, `nombre_del_procedimiento`, `precio_base`, `fase`, `fecha_de_publicacion_del`, `codigo_principal_de_categoria`, `urlproceso`.
- Agregados 12 meses `V1.2412%`: `24121500`: 95 procesos / COP 89,9 mil millones base (2,4 s) — mezcla heterogénea.

#### d) Supersociedades "10.000 empresas más grandes" — `6cat-2gcs`
- URL: `https://www.datos.gov.co/resource/6cat-2gcs.json?$where=upper(raz_n_social) like '%CARTON%' OR … &$limit=15` → 200, 5,9 s, CORS `*`. **Ojo: la columna es `raz_n_social`** (mi primer intento con `razon_social` dio HTTP 400 `query.soql.no-such-column`).
- Campos: `nit`, `raz_n_social`, `ciudad_domicilio`, `ciiu`, `macrosector`, `ingresos_operacionales`, `ganancia_p_rdida`, `total_activos`, `total_pasivos`, `total_patrimonio`, `a_o_de_corte`. Valores como texto con prefijo `"$ "` (ej. `"$ 1.91"`); unidad aparente = billones de COP (no declarada en el dataset; deducir con cautela: 1,91 para Cartón de Colombia ⇒ ≈ COP 1,9 billones).
- Corte 2025 (publicado 2026-09-25). Una foto anual por empresa.
- Muestra verificada: Cartón de Colombia S.A. (NIT 890300406, Yumbo, CIIU 1701): ingresos 1,91 / utilidad 0,18; Cartones América (Cali, 1702): 0,62 / 0,08; Carvajal Empaques (Cali, 2229): 0,55 / 0,04; Papeles y Cartones (Barbosa, 1702): 0,53 / 0,02; Cartonera Nacional (Villa Rica, Cauca): 0,38 / 0,05. Margen neto Cartón de Colombia ≈ 9,4 % vs Cartones América ≈ 12,9 %.
- Por NIT se puede cruzar con SECOP. Limitación: Cartón de Colombia es la razón social; "Smurfit Westrock" no aparece como nombre.

#### e) Exportaciones NME — `vwqt-xc3z`
- `…/vwqt-xc3z.json?$order=fecha DESC&$limit=1` → 200, 0,53 s. Último: `fecha` 2026-06-30 (trimestre), `valor_exportaciones_totales` 13974, `valor_exportaciones_nme` 6234 (millones USD, unidad no declarada), `fecha_de_corte` 2026-09-04. Serie trimestral desde 2000-03-31. Agregado nacional, sin detalle de papel/cartón.

#### f) Normativa Presidencia — `88h2-dykw`
- 200, 0,5 s. Último registro por `:id`: "DECRETO No. 1339 DEL 28 DE AGOSTO DE 2026 – Por el cual se hace un encargo interinstitucional" (URL a dapre.presidencia.gov.co). Consulta con palabras RESIDUOS/ARANCEL/ENVASES/AMBIENTAL/IMPUESTO desde 2026-09-01 → `[]` (0 filas). Sirve solo como lista de decretos; la regulación sectorial real (Res. de Minambiente/CRA/DIAN) no está aquí.

#### g) Otros datasets hallados (no probados en profundidad)
- Residuos/aprovechamiento: Superservicios `d7pt-p5fi` (toneladas por empresa de aseo, 2016+; 200, 0,55 s); Caracterización ECA `weq5-ryjx` (200, estaciones de clasificación; ruido). Utilidad día 1: baja; iteración 2 para indicador de reciclaje.
- Gas natural: `he3q-86dn` (precios GNCV, Min. Minas, actualizado 2026-10-20, 200, 0,6 s) — es gas vehicular, **no** gas industrial; no sirve como costo energético de planta. UPME/BMC no se probó.
- Puertos/comercio: Supertransporte `5r3g-zv5z`, `7tvr-cx9w`, `m2h2-5ry7` (tráfico portuario, contenedores). Solo listados; no probados.
- Estados financieros NIIF Supersociedades `pfdp-zks5`, `prwj-nzxa`, `6hqw-m3dm` (listados; sirven para margen/EBITDA competidor en iteración 2).
- Catálogo `api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=…` — sin catálogo de IPC, producción industrial ni EMMET (búsquedas "inflacion", "produccion industrial", "papel carton" → sin resultados relevantes o vacío).

### 3.2 DANE
- Organización: Departamento Administrativo Nacional de Estadística. Sitio https://www.dane.gov.co.
- **No hay API JSON verificada para IPC/PIB/EMMET.** Lo que sí funciona: anexos de Excel por boletín, ej. `https://www.dane.gov.co/files/operaciones/IPC/sep2026/anex-IPC-Indices-sep2026.xlsx` → 200, 0,15 s, 40.533 bytes, `Last-Modified` 2026-10-07, CORS `Access-Control-Allow-Origin: https://dane.gov.co` (**bloquea al navegador de otro origen**). La URL sigue patrón `…/IPC/<mmm><aaaa>/anex-IPC-Indices-<mmm><aaaa>.xlsx` (inferido de los enlaces de https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-al-consumidor-ipc); también `…Variacion-…xls` y `…Paag-…xlsx`.
- Contenido leído del xlsx: índice IPC base dic-2018=100, serie 2003–2026. Septiembre 2026 = 161,00; septiembre 2025 = 151,48; agosto 2026 = 160,42 ⇒ variación anual calculada por mí **6,28 %**, mensual **0,36 %** (cálculo propio, contrastar con el boletín).
- `https://www.dane.gov.co/files/operaciones/IPC/` → HTTP 403. Cualquier acceso automatizado exige User-Agent de navegador (usé `Mozilla/5.0`); no probado sin él.
- Microdatos: `https://microdatos.dane.gov.co/index.php/api/catalog/search?sk=IPC&ps=3` → 200, 0,25 s, CORS `*`, pero devuelve un catálogo de encuestas (Educación Formal…), no series: NOT-USEFUL para indicadores.
- Frecuencia IPC: mensual, ~día 8–10 del mes siguiente. Licencia/términos: no verificados (consultar https://www.dane.gov.co/index.php/servicios-al-ciudadano/politicas-y-terminos).
- Recomendación: ruta server (`/api/ipc`) que baje el xlsx una vez al día, lo cachee y lo exponga como JSON; o usar el IPC anual del World Bank (anual) + BanRep como respaldo.

### 3.3 Banco de la República (SUAMECA)
- Organización: Banco de la República. Portal https://suameca.banrep.gov.co/estadisticas-economicas/.
- **API oficial no documentada**: https://suameca.banrep.gov.co/api-suameca/api/ → HTTP 401. En cambio, la SPA de SUAMECA consume un backend abierto (descubierto leyendo su `main-HLEGFI6O.js`): base `https://suameca.banrep.gov.co/estadisticas-economicas-back/rest/estadisticaEconomicaRestService`.
  - Metadatos: `…/consultaInformacionBasicaSerie?idSerie=1` → 200, 0,44 s, CORS `*`.
  - Datos: `…/consultaInformacionSerieXTipoDatoXFechaDesde?idSerie=1&tipoDato=0&cantDatos=2&frecuenciaDatos=day` → 200, 0,49 s, CORS `*`; devuelve `valor` 3163.76, `fuente` Superintendencia Financiera, `fechaUltimoCargue` 2026-10-20, y `data: [[epoch_ms, valor], …]`.
  - Tasa de política monetaria, idSerie **59**: con `tipoDato=0` devolvió `valor 0.0` y `data []` (inútil); con `tipoDato=1&cantDatos=3&frecuenciaDatos=month` devolvió `valor 12.25` y serie diaria (12,0 → 12,25 en la ventana). **Los parámetros `tipoDato` y `frecuenciaDatos` cambian el resultado; probar cada serie.**
  - Otras series confirmadas por nombre: 60 y 61 (tasas OMA), 241 (IBR overnight), 25 (COP/CAD).
  - **No encontré el idSerie del IPC**: probé 100002, 100001, 270–272, 7138–7139, 80–85 (sin resultado), `consultaInformacionSeriesAutocomplete` devolvió una página HTML de error y `consultaSeriesTematicasDisponibles` devolvió 0 bytes. Pendiente.
- Intradía: `https://totoro.banrep.gov.co/estadisticas-economicas/rest/consultaDatosService/consultaMercadoCambiario` → 200, 1,2 s, 52.864 bytes, CORS `*`, lista de `[epoch_ms, precio]` (p. ej. `["1792501230000","3140"]`). Útil para un sparkline del día.
- **Riesgo:** son endpoints internos de un front-end Angular; pueden cambiar sin aviso y no tienen términos de API publicados. Usar con degradación elegante y con TRM de datos.gov.co como respaldo. Términos generales: https://www.banrep.gov.co (no verificados).
- Frecuencia: diaria (TRM, tasa política), mensual (IPC); histórico completo de cada serie.

### 3.4 World Bank API
- https://api.worldbank.org/v2/country/COL/indicator/NY.GDP.MKTP.KD.ZG?format=json&per_page=5 → 200, 1,0 s, CORS `*`. PIB real Colombia: 2025 = 2,64 %, 2024 = 1,49 %, 2023 = 0,84 %. `lastupdated` 2026-10-08. Serie 66 años.
- https://api.worldbank.org/v2/country/COL/indicator/FP.CPI.TOTL.ZG?format=json&per_page=3&mrv=3 → 200, 0,9 s: IPC anual 2025 = 5,14 %, 2024 = 6,61 %.
- Solo datos anuales con rezago de ~1 año; sin llave. Licencia CC BY 4.0 (https://datacatalog.worldbank.org/public-licenses, no reverificada hoy). Útil como contexto, no como alerta.

### 3.5 GDELT
- **DOC 2.0 API** `https://api.gdeltproject.org/api/v2/doc/doc?query=%22Smurfit%20Westrock%22%20sourcecountry:CO&mode=artlist&format=json&maxrecords=5&timespan=3months` → **HTTP 429** en 12,2 s, cuerpo: *"Please limit requests to one every 5 seconds or contact kalev.leetaru5@gmail.com for larger queries. All high-traffic users should switch to our ngrams dataset…"*. Mismo resultado con 8 s de espera (`"cartón corrugado" sourcecountry:CO`, `mode=artlist`; 10,8 s), `mode=timelinevol` (9,9 s) y, tras 20 s de silencio, `query=Colombia&maxrecords=2` (11,2 s). Sin cabecera `Access-Control-Allow-Origin` en la respuesta 429. Vía `https://r.jina.ai/<url>` (otra IP) también 429; vía `api.allorigins.win` → 408 timeout. Conclusión: el servicio está saturado globalmente. `…/api/v2/geo/geo` → 404.
- **Archivos de datos** (no-API): `https://data.gdeltproject.org/gdeltv2/lastupdate.txt` → 200, 1,2 s, CORS `*`, actualizado 2026-10-20 21:34 GMT; lista `…20261020214500.gkg.csv.zip` (5,9 MB), `.export.CSV.zip` (61 KB), `.mentions.CSV.zip` (113 KB), cada 15 min. `http://` redirige 301 a https. Procesar GKG para filtrar por organización/tema exige ETL server (descarga 5,9 MB × 96 al día): inviable en browser, posible en iteración 2 (cron + filtro por `V2Organizations` "Smurfit"). BigQuery `gdelt-bq.gdeltv2.gkg` no se probó (requiere cuenta GCP).
- Términos: https://www.gdeltproject.org/about.html (uso libre con atribución; no reverificado hoy).
- **Decisión:** reemplazar por Google News RSS en el MVP.

### 3.6 Google News RSS (noticias por palabra clave)
- `https://news.google.com/rss/search?q=%22Smurfit+Westrock%22+Colombia&hl=es-419&gl=CO&ceid=CO:es-419` → 200, 1,17 s, 118 KB, **63 ítems**, sin `Access-Control-Allow-Origin`. Ejemplos: "Smurfit Westrock nombra a Andrés Muñoz como CEO para Colombia, Ecuador y Perú tras 35 años en la organización – El Tiempo" (2026-08-02); "…retos – Portafolio.co" (2026-07-31); "Smurfit Westrock … recuperó 229 mil toneladas de papel reciclado 2025 – Caracol Radio" (2026-06-04); "Smurfit Westrock ahora con empaques … tienda virtual – El Colombiano" (2026-08-25).
- `…q=cartón+corrugado+Colombia+when:30d&hl=es-419&gl=CO&ceid=CO:es-419` → 200, 0,54 s, 16 KB. Operador `when:30d` funciona.
- Términos en el propio feed: *"made available solely for the purpose of rendering Google News results within a personal feed reader for personal, non-commercial use. Any other use … is expressly prohibited."* Riesgo legal en un producto corporativo; mitigación para el MVP: mostrar solo título, fuente y enlace (no republicar contenido), consumir desde una ruta server con caché de 30–60 min, y documentar el riesgo. Los enlaces son redirecciones `news.google.com/rss/articles/…`.
- Clasificación: WORKS-NEEDS-SERVER-PROXY (CORS) con riesgo de términos.

### 3.7 RSS de medios y entidades
Pruebas con `User-Agent: Mozilla/5.0`:
- Portafolio economía `https://www.portafolio.co/rss/economia.xml` → 200, 0,86 s, 10 ítems (último 2026-10-20: "Dólar en Colombia podría bajar hasta $3.120 esta semana"), sin CORS.
- La República `https://www.larepublica.co/rss` → 200, 0,10 s, 60 ítems, sin CORS; `…/rss/empresas.xml` → 404.
- El Tiempo economía `https://www.eltiempo.com/rss/economia.xml` → 200, 0,32 s, sin CORS.
- Valora Analitik `https://www.valoraanalitik.com/feed/` → 200, 3,0 s, 440 KB, sin CORS.
- El Colombiano negocios `https://www.elcolombiano.com/rss/negocios.xml` → 200, 0,93 s, 512 KB, **CORS `*`**.
- SIC `https://www.sic.gov.co/rss.xml` → 200, 1,4 s, 10 ítems (banners/campañas, poco regulatorio).
- Minambiente `https://www.minambiente.gov.co/feed/` → 200, 1,8 s, 12 ítems (biodiversidad/COP17), CORS limitado a `https://www.minambiente.gov.co`.
- DIAN `https://www.dian.gov.co/Paginas/rss.aspx` → 404.
- Los ítems son generales; filtrar por keywords (cartón, papel, empaque, reciclaje, Smurfit, REP, arancel, TRM) en el cliente o servidor.

### 3.8 Regulación
- SUIN-Juriscol `https://www.suin-juriscol.gov.co/` → 200 pero devuelve una SPA Angular vacía ("GovcoFrontendBase"), sin feed ni API verificados.
- Gestor normativo Función Pública `https://www.funcionpublica.gov.co/eva/gestornormativo/` → 200, 2,9 s, HTML de 183 KB; sin API/feed verificados.
- Diario Oficial `https://www.diariooficial.gov.co/` → **HTTP 000** (conexión fallida, 0,09 s) desde mi red.
- Día 1: usar (a) feed de Minambiente vía proxy, (b) `88h2-dykw` como lista de decretos, (c) enlaces a SUIN/Gestor como "ir a la fuente". Alertas regulatorias propias del sector (REP envases, Res. de Minambiente) se dejan para iteración 2 con scraping/búsqueda manual.

## 4. Ejemplo trabajado de punta a punta (dato real verificado el 2026-10-20)

**Registro fuente** (SECOP II contratos, `jbjy-vk9h`; `…$where=documento_proveedor='890300406'&$order=fecha_de_firma DESC&$limit=1`, HTTP 200, 0,56 s; CORS `*`; licencia CC BY-SA 4.0):

```
id_contrato: CO1.PCCNTR.9151243        proceso_de_compra: CO1.BDOS.9764472
nombre_entidad: INDUSTRIA LICORERA DEL CAUCA      departamento: Cauca
proveedor_adjudicado: CARTON DE COLOMBIA S.A. (NIT 890300406)
valor_del_contrato: 807.534.110 COP    fecha_de_firma: 2026-01-27   fecha_de_fin: 2026-12-31
estado_contrato: Modificado            modalidad: Contratación régimen especial
objeto: "Suministrar cajas de cartón como material de empaque y embalaje … Aguardiente Tradicional…"
```
Historial del mismo par (misma consulta, filas 2 y 3): COP 714.175.000 (2025-03-27) y COP 1.007.157.500 (2024-02-09).

**Indicador** (cálculo reproducible): "Contratación pública de cartón de la compañía en licoreras": suma de `valor_del_contrato` por año con `documento_proveedor=890300406` → 2026: 807,5 M COP (ILC) / acumulado histórico 4 contratos y COP 3.459,2 M. Comparación con competidores sobre ventana 12 meses (consulta §3.1b): Papeles y Cartones 1.859 M (2 contratos), Cartones América 354 M (1). Cuota de la compañía en la muestra de licoreras = 807,5 / (807,5 + 1.859 + 354) ≈ 27 % (solo contratos > 2025-10-01 de 4 NIT; muestra parcial, no cuota de mercado).

**Noticia**: tarjeta "Contrato" con título "Cartón de Colombia firma COP 807,5 M con Industria Licorera del Cauca", fuente SECOP II, fecha 2026-01-27, enlace a `urlproceso`. Cruce con Google News: "Smurfit Westrock nombra a Andrés Muñoz como CEO para Colombia, Ecuador y Perú" (El Tiempo, 2026-08-02).

**Señal** (regla simple): contrato con `fecha_de_fin_del_contrato` ≤ 90 días y `estado_contrato` ≠ "terminado" ⇒ "renovación inminente con licorera". Aquí fin = 2026-12-31 → quedan 72 días hoy ⇒ señal activa. Segunda señal: un competidor (NIT 860026759, 890319047 o 890925108) firma con una licorera departamental ⇒ "competidor gana cliente institucional" (ejemplo real: Cartones América – Fábrica de Licores del Tolima, COP 353,8 M, 2026-01-26).

**Alerta**: "Contrato con Industria Licorera del Cauca vence el 2026-12-31 (72 días). Última renovación firmada en enero; competidores activos en licoreras: Papeles y Cartones (2 contratos, COP 1.859 M)". Severidad media; acción sugerida: revisar plan de renovación comercial. Una regla de apoyo macro puede subir la severidad si TRM sube > 3 % en 30 días (insumos importados).

## 5. Recomendación mínima para el MVP del día 1

1. **Browser directo (CORS `*`, sin llave):** datos.gov.co TRM, SECOP II contratos/procesos por NIT, Supersociedades `6cat-2gcs`, World Bank PIB/IPC anual, BanRep SUAMECA-back (TRM y tasa de política, con TRM de datos.gov.co como respaldo), El Colombiano RSS.
2. **Ruta Next.js server (`/api/news`, `/api/ipc`)** con caché 30–60 min / 1 día: Google News RSS por consultas (`"Smurfit Westrock"`, `cartón corrugado`, `Cartones América`, `Carvajal Empaques`, `Papeles y Cartones`), RSS de Portafolio/La República/El Tiempo/Valora/Minambiente, IPC de DANE (xlsx a JSON).
3. **Diferir:** GDELT (DOC API inutilizable; GKG como ETL), DANE EMMET/exportaciones por producto, UPME gas, REP.
4. **No usar:** `LIKE` sobre campos de texto de SECOP en el cliente (12–48 s); UNSPSC `24112700` y `24141500` como proxy de cartón (son estibas y dotación).

## 6. Límites de esta verificación

- Una sola medición por URL, desde una IP colombiana de residencia; CORS evaluado con cabecera `Origin` simulada, no desde un navegador real.
- Términos de uso no leídos completos para DANE, BanRep, World Bank, GDELT; solo se leyó la licencia de datos.gov.co (vía API de vistas) y el aviso de copyright de Google News.
- El IPC anual 6,28 % es un cálculo propio sobre el xlsx del DANE, no un valor publicado verificado.
- idSerie del IPC en SUAMECA no localizado; los endpoints de SUAMECA son internos y no garantizados.
