# Guía de levantamiento de requerimientos — Monitor de entorno Smurfit Westrock Colombia

Guía para entrevistar a Smurfit Westrock Colombia (antes Smurfit Kappa Cartón de Colombia, Yumbo, Valle
del Cauca) y convertir sus respuestas en requerimientos de la SPA actual: un **monitor del entorno
colombiano para apoyar decisiones**. Hoy el prototipo monitorea la TRM (`mcec-87by` de datos.gov.co)
con variaciones atípicas, alertas y exportación a CSV.

> **Prototipo no oficial.** La SPA no tiene relación con Smurfit Westrock ni cuenta con su aval. Toda
> "hipótesis" de esta guía sale de fuentes públicas
> ([informe de contexto](../../reports/Smurfit%20Westrock%20Colombia%20Yumbo.md)) y **debe validarse
> en la entrevista**. No es información confirmada por la empresa.

## Cómo usar esta guía

Cada bloque trae:

- **Objetivo**: qué se busca entender.
- **Hipótesis de contexto**: lo que ya se sabe por fuentes públicas, para preguntar con criterio.
- **Preguntas**: las preguntas originales, ajustadas a la empresa y a la SPA.
- **Entregable**: el artefacto que debe salir del bloque.
- **Cómo se vuelve testeable**: cómo pasa a criterios de aceptación y pruebas (TDD) y a tareas (ODD).

Regla transversal: **ninguna fuente de datos entra al alcance si no se verificó en vivo** (formato,
frecuencia, límites de tasa, licencia). La misma regla descartó la búsqueda de SECOP II por categoría
de producto y GDELT en el día 1 (ver `README.md`). Una verificación posterior (2026-10-20) mostró que
SECOP II sí sirve filtrando por NIT del proveedor, y que GDELT sigue siendo poco fiable.

---

## 1. Organización y toma de decisiones

**Objetivo.** Entender qué decisiones dependen del entorno colombiano, quién las toma y con qué
frecuencia.

**Hipótesis de contexto.**

- Empresa integrada: bosque → pulpa y papel → corrugado y sacos. Opera 24/7 en Yumbo y tiene plantas
  en Bogotá, Barranquilla, Medellín/Guarne y Palmira.
- Ventas 2025 de COP 1,74 billones y exportaciones de ~US$111 millones, por lo que está expuesta a la
  TRM tanto por las importaciones como por las exportaciones.
- Hace parte de un grupo global (fusión de julio de 2024). Algunas decisiones probablemente se toman o
  se validan a nivel regional (Andrés Muñoz, CEO para Colombia, Ecuador y Perú desde julio de 2026).
- Riesgos públicos más fuertes: gas natural, seguridad territorial en el Cauca y regulación REP de
  envases.

**Preguntas.**

- ¿Cuál es el propósito de la organización en Colombia y cómo se relaciona con los valores globales
  (seguridad, integridad, lealtad, respeto)? ¿Existe una misión y visión local vigente?
- ¿Qué decisiones dependen hoy de variables externas? Ejemplos: coberturas cambiarias, compra de gas o
  de biomasa, precios a clientes, compras de fibra reciclada, programación de exportaciones.
- ¿Cuáles de esas decisiones son las más críticas o las más difíciles? ¿Qué pasó la última vez que
  se tomaron tarde o con información incompleta?
- ¿Qué decisiones se toman hoy y cuáles se quieren tomar mejor, más rápido o con más evidencia?
- ¿Qué se decide en Colombia y qué en la región o en el grupo global?
- ¿Existe un plan estratégico de TI local o todo se rige por el plan corporativo?
- ¿Qué áreas participan? Por ejemplo: Finanzas/Tesorería, Compras, Energía, Comercial/Exportaciones,
  Sostenibilidad, Forestal, Seguridad, Planeación (S&OP).
- ¿Quién tiene autoridad para actuar sobre una alerta del entorno? ¿Quién la recibe, quién decide y
  quién ejecuta?
- ¿Quiénes son los grupos de interés? Clientes (más de 3.000, ~60% de consumo masivo), proveedores de
  fibra y recicladores, comunidades del Cauca, sindicato, autoridades ambientales (CVC, ANLA) y el
  grupo.
- ¿Qué restricciones existen? Por ejemplo: políticas corporativas de TI y seguridad, confidencialidad
  de precios, SOX, calendario de cierre.

**Entregable.** Mapa de decisiones con estas columnas: decisión, área, responsable, frecuencia,
variable externa de la que depende y costo de equivocarse.

**Cómo se vuelve testeable.** Cada decisión priorizada da origen a una **épica**. Si una decisión no
depende de ninguna señal medible, queda fuera del alcance del monitor.

---

## 2. Usuarios, roles y permisos

**Objetivo.** Definir quién usa la SPA, para qué y con qué permisos.

**Hipótesis de contexto.** El prototipo no tiene autenticación, roles ni multiusuario, y las alertas
viven en `localStorage`. Los perfiles probables son analista (Finanzas, Compras, Energía), jefe de
área (decide) y administrador (configura fuentes y umbrales).

**Preguntas.**

- ¿Quiénes son los usuarios finales, quiénes los que deciden y quiénes diseñan o validan el sistema?
- ¿Qué roles se necesitan? Propuesta para validar: `viewer`, `analyst`, `approver`, `admin`.
- ¿Qué puede hacer cada rol? Por ejemplo: ver indicadores, crear y descartar alertas, cambiar umbrales,
  agregar fuentes, exportar.
- ¿Qué información no debe ver cada rol? Por ejemplo, la exposición cambiaria en valores absolutos o
  los incidentes de seguridad territorial.
- ¿Qué espera cada grupo de interés? ¿Un resumen diario, una alerta inmediata o un informe mensual?
- ¿Qué tipo de acceso se necesita: solo interno, acceso para la región o usuarios externos?
- ¿Cuántos usuarios hay por rol y sede? ¿Desde dónde acceden (Yumbo, Bogotá, campo)?

**Entregable.** Matriz de roles y permisos (rol × acción) y perfiles de usuario con sus necesidades.

**Cómo se vuelve testeable.** Cada celda de la matriz se convierte en un caso de prueba de
autorización, por ejemplo: *"Dado un usuario `viewer`, cuando intenta cambiar un umbral, entonces el
sistema lo rechaza"*. Esas pruebas se escriben **antes** de implementar la autorización.

---

## 3. Información y fuentes de datos

**Objetivo.** Saber qué señales del entorno importan, de dónde salen y qué tan confiables son.

**Hipótesis de contexto.**

| Señal | Por qué importa a la empresa | Fuente candidata | Estado |
|---|---|---|---|
| TRM COP/USD | Importa insumos y maquinaria, exporta empaques | datos.gov.co `mcec-87by` | **Verificada** (en uso) |
| Precio y oferta de gas natural | Riesgo operativo más fuerte; gas industrial +69% en 2025 | Gestor del Mercado de Gas (BMC), UPME | Por verificar |
| Inflación (IPC) | Costos, salarios, precios a clientes | DANE / datos.gov.co | Por verificar |
| Tasa de política monetaria | Costo financiero | Banco de la República | Por verificar |
| Regulación REP y envases (Res. 1407/2018, 803/2024; Ley 2232/2022) | Obligaciones de reporte y oportunidad frente al plástico | Minambiente, ANLA, Diario Oficial | Por verificar |
| Seguridad territorial (Cauca, Valle) | Incendios de plantaciones, extorsión, ataques a camiones | Fuentes oficiales o internas | Sensible; por definir |
| Clima e incendios forestales | 67.705 ha de bosque | IDEAM | Por verificar |
| Exportaciones del sector | Desempeño comercial | DANE / DIAN | Por verificar |
| Precio de la fibra reciclada | 47% de la materia prima | Interna o gremial | Por verificar |

**Preguntas.**

- ¿Con qué información cuentan hoy y en qué formato está (SAP, Power BI, Excel, correos)?
- ¿Qué tan confiable y completa es? ¿Quién es el dueño de cada dato?
- ¿Qué fuentes externas consultan hoy a mano? ¿Cuáles faltan?
- ¿Con qué sistema corporativo debe conectarse la SPA? (Se sabe que usan SAP y Power BI.)
- ¿Qué criterios usan para filtrar y clasificar? Por ejemplo, por sede, por línea de negocio o por
  moneda.
- ¿Cada cuánto cambia cada señal (diaria, semanal, mensual o por evento)?
- ¿Qué tan rápido debe llegar para servir? ¿Basta con el mismo día o se necesita aviso por la mañana?
- ¿Qué variables tienen más impacto en los resultados? ¿Cuál es el umbral a partir del cual algo es
  "relevante"? (Hoy la regla es una variación de la TRM ≥ 1% frente al día anterior.)
- ¿Qué señales permiten detectar un cambio antes de que golpee la operación?

**Entregable.** Catálogo de señales con nombre, fuente, URL o endpoint, frecuencia, latencia aceptable,
dueño, umbral y estado de verificación.

**Cómo se vuelve testeable.**

- Cada señal nueva arranca con un **spike de verificación** (una tarea ODD) que guarda una respuesta
  real como fixture.
- Las pruebas de parseo y normalización se escriben contra ese fixture **antes** del adaptador.
- Si la fuente no se puede verificar, no entra.

---

## 4. Funcionalidad y procesos

**Objetivo.** Definir qué hace la SPA y qué procesos soporta.

**Hipótesis de contexto.** Hoy la SPA ofrece KPIs, histórico, una tabla filtrable, alertas guardadas y
exportación a CSV, con reglas explícitas en lugar de puntajes de IA. Los próximos pasos sugeridos son
una segunda fuente y un resumen con IA que cite siempre la fuente.

**Preguntas.**

- ¿Qué funciones se necesitan?
  - **Registrar**: alertas, notas de decisión, umbrales.
  - **Actualizar**: estado de una alerta (nueva → revisada → accionada → descartada).
  - **Calcular**: variaciones, atípicos, promedios móviles, exposición estimada.
  - **Consultar**: histórico por señal, comparación entre señales.
- ¿Qué funciones adicionales se requieren? Por ejemplo: notificaciones por correo o Teams, comentarios,
  bitácora de decisiones, resumen ejecutivo.
- ¿Qué proceso actual se quiere automatizar? Por ejemplo, el informe semanal de mercado que alguien
  arma a mano.
- ¿Qué se hace con una alerta? ¿Quién la atiende y en cuánto tiempo?
- ¿Qué reglas de negocio aplican? Por ejemplo: umbrales por señal, días hábiles y festivos de Colombia,
  qué cuenta como "atípico" y qué hacer con datos faltantes.
- ¿Qué decisiones apoya directamente cada vista?
- ¿Qué salidas se esperan: tablas, alertas, reportes (PDF o CSV), indicadores y visualizaciones?
- ¿Se necesitan tendencias o escenarios? Por ejemplo, *"si la TRM sube 5% y el gas 20%, ¿qué pasa con
  el costo?"*. ¿Con qué modelo, y quién lo valida?

**Entregable.** Historias de usuario priorizadas (MoSCoW), cada una con criterios de aceptación en
formato Dado/Cuando/Entonces.

**Cómo se vuelve testeable.**

- Las **reglas de negocio** (umbrales, atípicos, festivos, cálculos) viven como funciones puras en el
  dominio, sin React. Son el primer objetivo de TDD: RED → GREEN → refactor.
- Cada criterio de aceptación se traduce en al menos una prueba.

---

## 5. Plataforma y arquitectura

**Objetivo.** Definir dónde corre la SPA y qué capacidades técnicas necesita.

**Hipótesis de contexto.**

- Stack actual: Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ReUI, TanStack
  Query y Table, y Recharts.
- Despliegue en Vercel.
- Los datos se consultan en vivo desde el navegador, sin servidor propio.

**Preguntas.**

- ¿Cuál es el alcance? ¿Solo Colombia o también Ecuador y Perú?
- ¿Web, móvil o ambas? ¿La consultan desde el celular en planta o en campo?
- ¿Qué dispositivos, sistemas operativos y navegadores usa la empresa? ¿Hay navegadores corporativos
  restringidos?
- ¿Cuál es la infraestructura actual? ¿Usan nube corporativa (Azure, AWS) o tienen restricciones para
  usar Vercel?
- ¿Qué sistemas y servicios deben integrarse? Por ejemplo: SAP, Power BI, el directorio corporativo
  (SSO) y la mensajería interna.
- ¿Se necesita un backend propio (BFF) para guardar alertas en el servidor, cachear fuentes y ocultar
  credenciales?
- ¿Infraestructura propia, nube o modelo híbrido?
- ¿Qué conectividad, disponibilidad y escalabilidad se esperan?

**Entregable.** Decisión de arquitectura (ADR) que incluya:

- El modelo de despliegue.
- Si habrá BFF.
- La persistencia elegida.
- Las integraciones y su orden.

**Cómo se vuelve testeable.**

- La arquitectura se organiza por *features* con la lógica de dominio separada de la UI y de los
  adaptadores (*ports and adapters*).
- Cada adaptador de fuente se prueba contra su contrato con fixtures. La UI se prueba sobre ese
  contrato, no sobre la API real.

---

## 6. Seguridad, mantenimiento y continuidad

**Objetivo.** Proteger la información y asegurar que la SPA siga funcionando.

**Hipótesis de contexto.**

- La empresa reporta controles SOX y es parte de un grupo con políticas globales.
- Algunos datos son sensibles por naturaleza: la exposición cambiaria, los precios y la seguridad
  territorial.

**Preguntas.**

- ¿Qué nivel de seguridad exige la política corporativa?
- ¿Cómo se autentican los usuarios? ¿Hay SSO corporativo (por ejemplo Entra ID) y es obligatorio usar
  MFA?
- ¿Qué datos se consideran sensibles y cómo deben protegerse (cifrado, enmascaramiento)?
- ¿Qué políticas de acceso aplican: mínimo privilegio, revisión periódica de accesos?
- ¿Se necesita auditoría? Por ejemplo: quién creó o descartó una alerta, quién cambió un umbral.
- ¿Qué se exige en copias de seguridad y recuperación? ¿Qué RPO y RTO son aceptables?
- ¿Quién mantiene la SPA: TI local, TI regional o un proveedor?
- ¿Con qué frecuencia se actualizan dependencias y se revisan accesos?
- ¿Qué disponibilidad se espera? ¿Es una herramienta de apoyo (sin SLA estricto) o una herramienta
  crítica?
- ¿Qué auditorías de seguridad o pentest exige el grupo antes de salir a producción?

**Entregable.** Requisitos de seguridad, matriz de datos sensibles y política de continuidad (RPO,
RTO y responsables).

**Cómo se vuelve testeable.**

- Pruebas de autorización por rol (bloque 2).
- Pruebas de que la bitácora de auditoría registra cada acción sensible.
- Revisión de dependencias en CI.
- Ninguna credencial en el cliente: si una fuente necesita clave, la consulta pasa por el BFF.

---

## 7. Recursos y viabilidad

**Objetivo.** Saber con qué se cuenta para construir, desplegar y mantener la SPA.

**Preguntas.**

- ¿Qué recursos humanos, tecnológicos y financieros hay disponibles?
- ¿Qué perfiles se necesitan? Por ejemplo: frontend, backend o integración SAP, datos, UX, y un
  experto de negocio de Tesorería, Compras o Energía.
- ¿Cuál es el presupuesto y cómo se financia (TI local, un área de negocio o el grupo)?
- ¿Qué costos se esperan en licencias, nube, integración y mantenimiento?
- ¿Cuáles son los plazos? ¿Hay hitos ligados al negocio, como la puesta en marcha de la caldera de
  biomasa o el cierre anual?
- ¿Qué capacidades técnicas tiene hoy el equipo interno?
- ¿Qué limitaciones pueden afectar el proyecto? Por ejemplo: aprobaciones corporativas o la
  disponibilidad de expertos.
- ¿Cómo se medirá la viabilidad? Por ejemplo, horas ahorradas en informes o decisiones tomadas con
  anticipación.

**Entregable.** Estimación por épica, roadmap por incrementos y criterio de viabilidad.

**Cómo se vuelve testeable.** Cada incremento del roadmap es un **feature document de ODD**
(`odd/tasks/<feature>.md`) con tareas de ~400 líneas, cada una con sus pruebas, y commits por unidad
de trabajo.

---

## 8. Mercado y entorno

**Objetivo.** Conocer alternativas existentes y factores externos.

**Hipótesis de contexto.**

- Competidores locales posibles: Cartones América, Propal/Carvajal y otros. Hay **poca información
  verificada**, y la cuota de mercado conocida (~40%) es de 2019.
- Alternativas de software: terminales financieras (Bloomberg, Refinitiv), servicios de análisis de
  mercado del sector de pulpa y papel (Fastmarkets RISI) y tableros internos en Power BI.

**Preguntas.**

- ¿Qué herramientas usan hoy para leer el entorno (suscripciones, informes de bancos, gremios como
  ANDI)?
- ¿Qué les gusta y qué les falta de esas herramientas?
- ¿Quiénes son los principales competidores y qué señales de ellos les interesan?
- ¿Qué tendencias pueden cambiar el negocio? Por ejemplo: sustitución del plástico, comercio
  electrónico, transición energética, aranceles.
- ¿Qué factores externos han generado cambios fuertes en los últimos años? Por ejemplo: la escasez de
  gas, la devaluación o los bloqueos viales.
- ¿Qué fuentes consideran confiables para analizar el mercado?

**Entregable.** Benchmark de alternativas, con brechas y propuesta de valor diferencial de la SPA.

**Cómo se vuelve testeable.** Las brechas identificadas se vuelven historias candidatas (bloque 4).
Las señales del entorno se suman al catálogo del bloque 3 y pasan por su spike de verificación.

---

## 9. Marco legal y normativo

**Objetivo.** Identificar obligaciones legales y los apoyos que se necesitan.

**Hipótesis de contexto.**

- Datos personales: Ley 1581 de 2012 y Decreto 1377 de 2013.
- Términos de uso de datos abiertos de datos.gov.co.
- Posibles obligaciones SOX del grupo.
- Información de seguridad territorial que podría ser reservada.

**Preguntas.**

- ¿Qué leyes y normas debe cumplir la SPA? Por ejemplo: protección de datos, políticas del grupo, SOX
  si toca información financiera.
- ¿Se almacenarán datos personales? (Probablemente solo los de los usuarios y la bitácora de
  auditoría.)
- ¿Hay restricciones para guardar datos fuera de Colombia, por ejemplo en la nube en EE. UU.?
- ¿Qué licencias tienen las fuentes externas? ¿Se permite el uso comercial y la redistribución?
- ¿De quién es la propiedad intelectual del desarrollo? ¿Hay contratos con proveedores?
- ¿Se necesitan autorizaciones del grupo para usar la marca o publicar la herramienta?
- ¿Quién verifica el cumplimiento normativo: Legal, Cumplimiento o el oficial de datos personales?

**Entregable.** Matriz de cumplimiento con norma, obligación, responsable y evidencia.

**Cómo se vuelve testeable.** Las obligaciones verificables pasan a pruebas, por ejemplo: *"cada dato
mostrado indica su fuente y fecha"* o *"no se guardan datos personales en `localStorage`"*.

---

## 10. Capacidad operativa y criterios de éxito

**Objetivo.** Saber si la organización puede operar la SPA y cómo medir su éxito.

**Preguntas.**

- ¿Cuál es la capacidad actual de la infraestructura?
- ¿Cuántos usuarios, consultas y operaciones debe soportar al día?
- ¿Qué volumen de datos se procesará, por ejemplo cuántos años de historia por señal?
- ¿Qué tiempos de respuesta son aceptables? Propuesta: carga inicial < 2 s, filtro de tabla < 200 ms.
- ¿Cómo se medirá el rendimiento? Por ejemplo con Web Vitals y monitoreo.
- ¿Qué brechas hay entre la capacidad actual y la que se necesita?
- ¿Qué pruebas y auditorías se requieren antes de producción? Por ejemplo: UAT con usuarios reales,
  pentest, accesibilidad.
- ¿Qué indicadores medirán el éxito? Por ejemplo:
  - Alertas accionadas frente a alertas generadas.
  - Tiempo desde el evento hasta la decisión.
  - Usuarios activos semanales.
  - Informes manuales eliminados.

**Entregable.** Requisitos no funcionales medibles y tablero de KPIs de éxito.

**Cómo se vuelve testeable.** Los requisitos no funcionales se convierten en presupuestos de
rendimiento en CI y pruebas E2E (Playwright) para los flujos críticos. Los KPIs de éxito se
instrumentan desde la primera versión.

---

## De la entrevista al código: TDD + ODD

### Flujo

1. **Entrevista**: cada respuesta se registra con su bloque y su fuente (quién la dijo y cuándo).
2. **Requerimiento**: se redacta con la plantilla de abajo, con ID estable (`REQ-<bloque>-<n>`).
3. **Feature document de ODD**: cada épica priorizada abre `odd/tasks/<feature>.md` con objetivo,
   alcance, criterios de aceptación y tareas con ID.
4. **TDD por tarea**: primero la prueba que falla (RED), después la implementación mínima (GREEN),
   luego el refactor con las pruebas en verde.
5. **Commit por unidad de trabajo**: incluye prueba, código y documentación, con Conventional Commits.
6. **Trazabilidad**: `REQ-x` → criterio de aceptación → prueba → tarea ODD → commit.

### Plantilla de requerimiento

```markdown
### REQ-04-01 — Detectar variación atípica de una señal

- Bloque: 4 (Funcionalidad)
- Origen: entrevista con <rol>, <fecha>
- Prioridad: Must
- Historia: Como analista de Tesorería quiero ver los días con variación ≥ umbral
  para revisar la exposición cambiaria el mismo día.
- Reglas: umbral configurable por señal (por defecto 1%); solo días hábiles con dato.
- Criterios de aceptación:
  - Dado un histórico con un día de +1,2%, cuando el umbral es 1%, entonces el día se marca atípico.
  - Dado un día sin dato (festivo), cuando se calcula la variación, entonces se compara con el último día con dato.
- Pruebas: unitarias del dominio (regla de atípicos); componente (badge visible y con texto).
- Feature ODD: odd/tasks/<feature>.md, tarea T-02
```

### Preparación técnica para TDD

Hoy el proyecto **no tiene runner de pruebas** (`package.json` solo trae `build`, `lint` y
`typecheck`). Antes del primer requerimiento nuevo hay que:

- Agregar **Vitest** y Testing Library para pruebas de dominio y componentes, más el script `test` en
  CI.
- Agregar **Playwright** para los flujos E2E críticos.
- Sacar las reglas actuales (variación diaria, umbral de atípicos, cálculos de KPIs) de
  `src/features/trm` a funciones puras y cubrirlas con pruebas. Eso protege lo que ya existe antes de
  sumar señales nuevas.

### Definición de listo (por tarea)

- Criterios de aceptación cubiertos por pruebas en verde.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` en verde.
- Fuente de datos verificada en vivo y guardada como fixture (si aplica).
- Feature document y su copia en memoria actualizados, con la evidencia del commit.
