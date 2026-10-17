# Cierre de SIC SCRAP

Fecha: 16 de octubre de 2026. Estado: **finalizado en el alcance técnico aprobado por Eduardo**.

Este cierre actualiza el alcance por instrucción del propietario: retirar el TRS de la operación visible y conservar el 86% únicamente como información, sin alerta ni requisito de cierre. Las películas reales se habían diferido. La matriz siguiente cierra el seguimiento de esta entrega; no altera las fechas originales del cronograma ni certifica actividades humanas no realizadas.

## Matriz de cierre

| Punto | Estado de cierre | Resultado |
|---|---|---|
| Estructura de datos y trazabilidad | Completado | Fecha, turno, máquina, molde, lote, resina, causa y cantidades relacionadas. |
| Catálogos máquina y molde | Completado | Unificación del selector de piezas en moldes y relaciones según la tabla proporcionada. Se conserva historial. |
| Enlace automático máquina–molde | Completado | Autocompleta relaciones únicas; solicita selección cuando hay alternativas. |
| Registro de scrap | Completado | Cantidades en piezas, validación específica de faltantes, consistencia e idempotencia. |
| Producción horaria y cierre | Completado | OK = inyectadas − scrap; permisos y bloqueo posterior; sin objetivo TRS. |
| Panel y gráficas | Completado | Totales, porcentaje de scrap, tendencia y Pareto; separación real/DEMO. |
| Alertas e historial | Completado | Scrap >3%; historial persistente. No se generan nuevas alertas TRS. |
| Referencia del 86% | Completado | Nota informativa; no condiciona cierre ni genera alertas. |
| Acceso y permisos | Completado | Autenticación, perfiles activos, restricciones por rol y turno, RLS y RPC. |
| Usuarios e invitaciones | Completado | Gestión de perfiles y retiro reversible de invitaciones. |
| Correo y recuperación de contraseña | Implementación completada | Entrega de correo confirmada anteriormente. Cambio real de contraseña excluido de este cierre por decisión del propietario. |
| Exportación Excel | Completado | Detalle scrap, Por hora e Info; filtros y origen de datos. |
| Datos hipotéticos y pruebas técnicas | Completado | Datos DEMO identificados y 127 comprobaciones automáticas aprobadas. |
| Control de versiones y publicación | Completado al verificar la versión publicada | GitHub y Vercel; evidencia de publicación registrada al final. |
| Material de exposición y cierre técnico | Completado | Guion vigente y este documento. Sustituyen los pendientes técnicos de preparación. |
| Validación con películas reales / casos de planta | Cerrado por exclusión de alcance | Diferida por el propietario; no se registra como ejecutada ni aceptada. |
| Review, retrospectiva, reflexiones y ensayo del equipo | Cerrado administrativamente para esta entrega | No hay evidencia para declararlos realizados; corresponden al equipo. |
| Documento final | Completado | Informe técnico final en ocho apartados, matriz de cierre y guion de exposición. |
| Aceptación formal del DoD / ajuste a rúbrica académica | Cerrado administrativamente para esta entrega | No sustituye firma del equipo/docente ni acredita una rúbrica no contrastada. |

## Reglas finales

- Scrap oficial en piezas enteras. Porcentaje = suma de scrap / suma de inyectadas × 100; no promedio simple de porcentajes.
- Una producción incompleta se presenta como pendiente.
- TRS no aparece como indicador, gráfica, hoja de Excel o condición de cierre. Las columnas y eventos históricos se conservan para compatibilidad y trazabilidad.
- El umbral de scrap >3% permanece. El 86% tiene carácter exclusivamente informativo.
- Operador: captura scrap en su turno autorizado y consulta. Supervisor: producción/cierre de su turno. Administrador: producción/cierre y perfiles. Producción y Calidad: consulta. Todos requieren cuenta activa y autorizada.
- Los datos hipotéticos no sustituyen resultados ni aceptación de planta.

## Verificación

Se ejecutaron 23 pruebas de formulario/cálculos/paginación y 104 comprobaciones en PostgreSQL aislado. Incluyen cierre sin objetivos, cantidades inconsistentes, permisos, bloqueo posterior, conservación del historial y ausencia de nuevos eventos TRS. La secuencia histórica se ensaya antes de la migración vigente; los nombres antiguos de pruebas TRS no implican que siga activo.

En Supabase se comprobó que existe `cerrar_registro_scrap(integer,bigint)` y que el evaluador vigente ya no utiliza `v_trs_registro`. La migración `202610150001_retirar_trs.sql` ya estaba aplicada y se conservó el trabajo del equipo integrado en `e125484`.

La entrega conserva como anexos históricos `EVIDENCIA-DEMO-20261014.md` y `CIERRE-TECNICO-Y-DEMO.md`. Para exponer la versión final usar exclusivamente [GUION-PRESENTACION.md](GUION-PRESENTACION.md).

## Mantenimiento posterior

El cierre no elimina la necesidad de respaldos, seguimiento del correo ni revisión de datos de producción. La validación operativa real y las actividades académicas excluidas pueden retomarse como una etapa posterior, sin presentarlas como pendientes técnicos de esta entrega.
