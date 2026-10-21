# El proyecto explicado en cinco preguntas

**Estado revisado: 20 de octubre de 2026.** Esta explicación distingue lo que ya está construido de lo que sigue en preparación. Es un prototipo independiente, sin relación oficial ni aval de Smurfit Westrock.

## 1. ¿Qué diseñaron y por qué lo hicieron de esa manera?

Diseñaron una página para **ver cuánto vale un dólar en pesos colombianos, observar sus cambios y guardar los días que merecen atención**. El valor oficial que consulta se llama TRM.

La idea más amplia es convertirla en un **radar del entorno** para el caso de Smurfit Westrock Colombia, una empresa de papel, cartón y empaques. Ese radar reuniría noticias, contratos públicos, información de competidores, cambios en las normas y datos de la economía. Esa ampliación todavía está en construcción.

Piensa en una tienda: su dueño revisa cuánto cuestan los productos, qué hace la tienda vecina y qué reglas nuevas debe cumplir. El proyecto busca poner esas pistas en un mismo tablero, para que una persona pueda revisarlas y decidir qué investigar.

Se empezó por el dólar porque la empresa compra y vende productos en otros países: un cambio en su precio puede afectar cuánto paga o recibe. Además, la fuente pública del dólar sí funcionó en las pruebas documentadas. Otra fuente de noticias fallaba y la primera búsqueda de contratos encontraba principalmente papelería de oficina, poco útil para este caso.

**La decisión práctica fue construir primero una parte pequeña con datos comprobados y ampliarla por etapas.** Después se descubrió que buscar contratos por el número que identifica a cada empresa sí daba resultados útiles.

## 2. ¿Cuáles son los fundamentos técnicos utilizados?

La herramienta se apoya en ideas sencillas, aunque por dentro use programas especializados:

| Idea | Explicación cotidiana | Para qué sirve aquí |
|---|---|---|
| Una página que se abre en el navegador | Como consultar un tablero desde una ventana de internet. | Mostrar números, tablas y gráficos. Se construye con herramientas llamadas Next.js y React. |
| Consultar una fuente pública | Como leer el precio en la cartelera de una entidad y anotar de dónde salió. | Obtener el dólar publicado por la Superintendencia Financiera a través de datos.gov.co. |
| Aplicar reglas claras | Como una alarma que suena cuando se cumple una condición conocida. | Marcar movimientos grandes: por defecto, cuando el dólar sube o baja un 1 % o más frente al valor anterior. |
| Separar las piezas | Como tener la calculadora, los documentos y el tablero en lugares distintos. | Cambiar una fuente o una pantalla sin mezclar todo. Ya se separaron las reglas de cálculo de las pantallas. |
| Guardar en el navegador | Como dejar una nota en un cuaderno que permanece en ese computador. | Recordar las alertas guardadas al volver a abrir la página en el mismo navegador. |
| Comprobar antes de ampliar | Como probar una bicicleta después de ajustar los frenos. | Revisar los cálculos y las piezas nuevas mediante comprobaciones automáticas. El registro del proyecto documenta estas revisiones. |

Por ejemplo, si el dólar pasa de **$4.000 a $4.040**, subió un 1 %: la regla lo marca para revisarlo. Eso explica un cambio; **no predice cuánto valdrá mañana**.

## 3. ¿Cuáles son las principales funcionalidades?

**Lo que ya puede usar una persona en el prototipo:**

- Consultar el valor del dólar y cuánto cambió frente al valor anterior.
- Ver gráficos para entender cómo se ha movido durante el período elegido.
- Revisar una tabla de fechas, ordenarla y mostrar solo los cambios grandes.
- Guardar días como alertas para volver a consultarlos.
- Descargar la tabla en un archivo que se puede abrir en una hoja de cálculo, como Excel.

**Lo que ya tiene preparación interna, pero todavía no una pantalla completa para usarlo:** consultar contratos públicos por empresa y guardar información para futuras listas de seguimiento y preferencias. Tener estas piezas listas no significa que el radar completo ya funcione.

**Lo que sigue pendiente en el plan:** reunir las señales en un radar, avisar sobre contratos próximos a vencer, mostrar competidores y datos de la economía, incorporar noticias y normas, y preparar un informe semanal descargable.

Ejemplo del objetivo futuro: abrir el tablero y ver qué cambió esta semana, entrar al documento original y decidir si merece atención.

## 4. ¿Cuáles son las principales restricciones?

- **Todavía es un prototipo.** El dólar es la parte visible actual; varias funciones del radar siguen pendientes. El plan registra la preparación para publicarlo, pero no confirma su publicación.
- **Depende de información externa y de internet.** Si una fuente falla, la consulta puede fallar. Que un dato esté disponible no significa que se actualice a cada segundo.
- **Lo guardado pertenece a ese navegador.** No se comparte automáticamente entre personas o computadores y puede perderse si se borran los datos del navegador. No hay una cuenta de usuario ni una base central que respalde esas notas.
- **Solo ve una parte del panorama.** Por ejemplo, los contratos públicos no muestran todas las ventas privadas de una empresa. Los datos económicos anuales previstos tampoco cuentan lo ocurrido esta mañana.
- **Las fuentes necesitan revisión.** Algunas cifras investigadas no explican bien sus unidades. También hay condiciones de uso pendientes de resolver o revisar antes de un uso empresarial; el plan registra un riesgo aceptado al proponer Google News.
- **Ayuda a mirar, pero no decide.** No usa inteligencia artificial ni funciona como chat. Una alerta indica “revisa esto”; no ordena comprar, vender o cambiar un negocio.

Además, se diseñó para el caso de una sola empresa y con datos públicos. Compartir trabajo entre equipos, manejar información confidencial o atender varias empresas requeriría cambios importantes.

## 5. ¿Qué lecciones vale la pena compartir?

Estas son lecciones del trabajo documentado, no resultados de ahorro o éxito medidos con usuarios:

1. **Primero entiende a quién ayudas.** Se cambió el enfoque al confirmar que la empresa trabaja con papel y empaques. Una herramienta útil para vender tecnología al Estado no responde necesariamente a sus necesidades.
2. **Prueba la información antes de prometer una función.** Una fuente puede sonar perfecta y fallar al consultarla. Eso ocurrió con el servicio de noticias GDELT.
3. **Una búsqueda que falla no siempre descarta toda la fuente.** Buscar contratos por tipo de producto dio resultados poco útiles; buscar por el identificador de la empresa encontró contratos relevantes.
4. **Explica por qué se enciende una alerta.** “Cambió un 1 %” es una razón que una persona puede revisar con una calculadora. Así entiende de dónde sale el aviso.
5. **Distingue hechos, planes y dudas.** Una noticia sobre una inversión futura no prueba que ya esté funcionando. Del mismo modo, una función escrita en un plan no significa que ya exista en la página.
6. **Crece por partes y conserva las fuentes.** Terminar y comprobar una pieza facilita detectar errores. Guardar el enlace original permite que otra persona revise la información antes de actuar.

### Fuentes del proyecto

Se dio prioridad al registro de tareas para conocer el avance, porque la propuesta y las notas conservan decisiones anteriores.

- [Estado y tareas del radar](../odd/tasks/centro-inteligencia-entorno.md): decisiones confirmadas, piezas terminadas y funciones pendientes.
- [Descripción del prototipo actual](../README.md): funciones del monitor del dólar e historia de sus decisiones.
- [Propuesta del radar](propuesta-mvp/propuesta-mvp.md): propósito, diseño y alcance propuesto.
- [Guía para conocer las necesidades](requerimientos/guia-levantamiento.md): preguntas que deben validarse con los usuarios.
- [Investigación de fuentes](../research_notes/Propuesta%20MVP%20monitor%20entorno/fuentes_datos.md), [diseño de las piezas](../research_notes/Propuesta%20MVP%20monitor%20entorno/arquitectura_stack.md) y [herramientas similares](../research_notes/Propuesta%20MVP%20monitor%20entorno/estado_arte_similares.md): pruebas, limitaciones y alternativas estudiadas.
- [Contexto público de la empresa](../reports/Smurfit%20Westrock%20Colombia%20Yumbo.md): actividad de la empresa, riesgos e información todavía sin confirmar.
