# SIC SCRAP: demostración y cierre técnico

Fecha de corte: 14 de octubre de 2026. Alcance: prototipo funcional con datos hipotéticos, por instrucción de Eduardo. Las películas reales se validarán después. Este archivo es un anexo técnico y material de preparación; no sustituye el documento final de ocho fases ni acredita reuniones o aprobaciones que no se hayan realizado.

## Datos de demostración

En Panel, Gráficas, Historial de alertas y Exportar seleccionar **Origen de datos: Demostración (datos hipotéticos)**. El valor inicial es Producción real. Para la serie completa elegir del 5 al 14 de octubre de 2026. Si las fechas predeterminadas avanzan, recuperar ese rango manualmente.

La carga inicial contiene 30 registros cerrados, 60 horas y 54 detalles de rechazo distribuidos en 10 días y 3 equipos DEMO. Inyectadas: 30,000. Scrap: 1,365. OK: 28,635. Scrap global: 4.55%. Los registros posteriores de ensayo pueden modificar estos totales; distinguirlos de la carga inicial.

Los equipos DEMO representan BORCHE 90 TON, HAITIAN 230 TON y KRAUSS MAFFEI 360 TON, con los moldes CLIPS Y DIVISOR QUESERA, DEFROSTING y GUIDE. Comparten el catálogo de moldes, pero sus relaciones se filtran por origen para conservar el enlace automático. El lote DEMO es exclusivo. No se asignan estos datos a un operador real ni a una película de planta.

Escenarios de la serie: cero rechazo válido, scrap de 1%, 2%, 2.5%, 3%, 4%, 5%, 6%, 8% y 14%; objetivos de 1,000 o 1,200 piezas. Hay resultados sobre y bajo la meta TRS. Exactamente 3% no activa alerta de scrap; exactamente 86% cumple TRS. Las pruebas aisladas cubren además datos incompletos y valores inmediatamente al otro lado de los límites.

## Guion de demostración (8 minutos)

1. **Problema y alcance (1 min, Josafat):** mostrar una película de producción y explicar pérdida de trazabilidad. Aclarar que la demostración usa cantidades hipotéticas.
2. **Captura (1.5 min, Eduardo):** con cuenta operador elegir Demostración, máquina o molde, turno autorizado, lote, hora, causa y cantidad. Mostrar mensaje específico si falta un campo. Usar una fecha/grupo abierto para evitar modificar la serie cerrada.
3. **Producción y cierre (1.5 min, Eduardo):** con supervisor del turno o administrador completar piezas inyectadas, objetivo por hora, horas programadas y OK. Verificar OK = inyectadas − scrap. El cierre bloquea nuevas modificaciones.
4. **Indicadores y alertas (1 min, Fernando):** abrir Panel en Demostración. Explicar scrap >3% y TRS <86%. Mostrar que un registro incompleto dice pendiente y no cero. Abrir Historial para ver observaciones persistentes.
5. **Tendencia y Pareto (1 min, César/Anaid):** rango 5–14 de octubre, origen Demostración. Mostrar concentración de causas y línea acumulada al 100%. No atribuir esas causas hipotéticas a la planta.
6. **Excel (1 min, César):** exportar el mismo rango y origen. Revisar las hojas Detalle scrap, Por hora, TRS por registro e Info. El nombre incluye DEMO y las filas indican origen hipotético.
7. **Cierre y preguntas (1 min, Jesús):** exponer resultados de pruebas y límites; registrar preguntas del docente para ajustes posteriores.

## Matriz técnica de aceptación

Las etiquetas siguientes identifican funcionalidades, no renumeran las HU originales. La numeración completa y las ocho condiciones exactas del DoD deben cotejarse con el documento oficial del equipo antes de firmar la aceptación.

| Funcionalidad | Evidencia técnica | Estado técnico |
|---|---|---|
| Captura por molde | Validación de campos, relación máquina/molde, lote/resina, cantidades positivas, idempotencia | Probada automáticamente |
| Producción por hora | Reemplaza total, evita duplicar, rechaza total inferior al rechazo | Probada automáticamente |
| Cierre | OK consistente, objetivo y horas válidos, bloqueo posterior | Probada automáticamente |
| Panel de KPIs | Sumas y cocientes ponderados; datos incompletos no aparentan cumplimiento | Probada automáticamente |
| Alertas activas | Scrap estrictamente mayor a 3%; TRS estrictamente menor a 86% | Probada automáticamente |
| Historial de alertas | Activación, resolución, pendientes y cambios de porcentaje; sin duplicar reintentos iguales | Probada automáticamente |
| Login y roles | RLS y RPC para cinco roles, cuenta inactiva y anónimo | Permisos probados en PostgreSQL aislado; navegador con sesión administrador |
| Gráficas/Pareto | Datos por día, causas ordenadas y acumulado; filtrado real/DEMO | Probada automáticamente; validación visual de publicación registrada aparte |
| Exportación | Cuatro hojas, molde/lote, origen y paginación | Verificación de descarga registrada aparte |
| Usuarios e invitaciones | Alta autorizada, retiro reversible y restauración; no borra Auth ni producción | Probada automáticamente |
| Recuperación de contraseña | Correo entregado previamente | Cambio y nuevo login pendientes por decisión del propietario |

## Roles vigentes

| Rol | Capturar scrap | Producción/cierre | Panel/gráficas/alertas/Excel | Perfiles |
|---|---|---|---|---|
| Operador | Sí, turno asignado si existe | No | Sí | No |
| Supervisor | No | Solo su turno | Sí | No |
| Producción | No | No | Sí | No |
| Calidad | No | No | Sí | No |
| Administrador | No | Sí | Sí | Sí |

Todos requieren cuenta confirmada, perfil autorizado y activo. El origen DEMO no amplía permisos ni concede roles. No se crean cuentas reales de prueba ni se cambian contraseñas del equipo.

## Actualizaciones documentales necesarias

- Modelo: `registro_produccion.id_molde` es la referencia canónica; `pieza`, `id_pieza` y el mapa histórico se conservan como evidencia. No usarlos en nuevas capturas.
- Relación máquina/molde: tabla `maquina_molde`. Enlace automático cuando la contraparte es única; elección explícita si hay varias.
- Origen: `maquina.es_demo` y `lote_materia_prima.es_demo`, ambos booleanos. Un registro debe usar máquina y lote del mismo origen.
- Historial: `alerta_historial` conserva fecha de turno, máquina, turno, indicador, estado, porcentaje, momento de observación y autor cuando hay sesión. RLS permite lectura al equipo activo; el navegador no puede insertar ni modificar eventos.
- Unidades: piezas enteras. Scrap = rechazadas/inyectadas × 100. TRS = OK/(objetivo por hora × horas programadas) × 100. Los porcentajes agregados se calculan sumando componentes, nunca promediando porcentajes.
- El historial comienza con la instalación. Sus eventos iniciales son observaciones del estado existente, no reconstrucciones de cuándo sucedió una alerta anterior.

## Sprint Review y retrospectiva: hoja para completar en la reunión

Convoca Jesús y presenta Josafat con el equipo. Registrar fecha efectiva, asistentes, enlace/evidencia y comentarios del docente. No dar la reunión por realizada con este guion.

| Comentario recibido | Impacto | Acción acordada | Responsable | Evidencia de cierre |
|---|---|---|---|---|
| Por registrar en la sesión | | | | |

Retrospectiva: cada integrante aporta qué funcionó, qué dificultó el trabajo y una mejora concreta con responsable y fecha. Hechos técnicos que pueden discutirse: unificar moldes evitó dos identificadores; el catálogo y las reglas debieron confirmarse antes; las pruebas detectan errores antes de publicar. No atribuir opiniones o acuerdos a personas sin su participación.

Reflexión individual: cada integrante completa qué entregó, enlace/archivo/commit, dificultad resuelta, aprendizaje y próxima mejora. César tiene aportaciones de Excel y gráficas integradas; no atribuir a Maila commits de identidad no confirmada. Adjuntar la evidencia que entregue cada persona.

## Estado para el cronograma

- Panel, gráficas, Excel, roles, alertas e historial: cerrar implementación con la evidencia de la publicación.
- Prueba con datos hipotéticos: concluible con evidencia técnica y de navegador de esta entrega.
- Pruebas con tres películas reales: diferidas expresamente por Eduardo; no marcarlas como ejecutadas.
- Guion de demo y materiales de Review/retrospectiva: preparados. Presentación, reunión, feedback y reflexiones individuales requieren al equipo.
- Ajustes del Review: se determinan después de recibir comentarios; no hay feedback nuevo que inventar.
- Documento final de ocho fases: pendiente de integrar por Jesús y Aracely. Anexar este archivo y la evidencia de pruebas.
- El cronograma original terminaba el 10 de octubre. Registrar fechas reales de cierre y no retrofechar las mejoras del 14 de octubre.

## Operación y recuperación

Aplicar migraciones en orden; `202610140002_demo_alertas.sql` después de moldes/TRS. Publicar el cliente con filtros antes de cargar `supabase/demo/20261014_demostracion.sql`. Ambos scripts son repetibles. La carga omite grupos ya existentes y no reemplaza la producción real. El conjunto DEMO permanece disponible para consulta; para dejar de mostrarlo usar Producción real. No borrar máquinas, lotes ni registros como forma de ocultar la demostración.

Las migraciones parten del esquema original; no son un respaldo completo ni crean una base vacía. Antes de mantenimiento destructivo realizar un respaldo completo administrado de Supabase y ensayar restauración en otro ambiente. El respaldo local anterior cubre solo tablas afectadas.

## Límites expresos

Los duplicados históricos #1 y #2 requieren contrastar la fuente real antes de corregirlos. Su bloqueo evita agregar datos ambiguos. No se borran, fusionan ni completan por inferencia. No existe todavía una pantalla de reapertura/corrección de detalle; no es necesaria para demostrar captura/cierre, y requiere acordar permisos y trazabilidad antes de implementarla.

Las lecturas paginadas fallan explícitamente al alcanzar 100,000 filas para no entregar un reporte truncado. Un informe leído durante capturas concurrentes no es una instantánea transaccional; para la entrega usar registros cerrados. La carga de demostración no sustituye una prueba de carga multiusuario ni aceptación de planta.
