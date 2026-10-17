# Informe final — SIC SCRAP

Entrega técnica del 16 de octubre de 2026. Estado: finalizado en el alcance aprobado. Aplicación: https://sic-scrap.vercel.app

## 1. Problema

La información de rechazo se registra en películas de producción y requiere relacionar máquina, turno, referencia, lote y causa. La captura dispersa dificulta consultar resultados y rastrear diferencias. El sistema concentra esos datos en una aplicación web.

## 2. Objetivo y alcance

Registrar scrap en piezas, capturar producción horaria, consultar porcentajes y gráficas, conservar eventos de alerta y exportar reportes. Incluye acceso por roles y gestión de perfiles. Las películas reales y la aceptación operativa se difirieron; la demostración usa datos hipotéticos identificados. El TRS se retiró por decisión del propietario. El 86% se conserva como referencia informativa sin imponer condiciones.

## 3. Análisis y reglas

El número de parte identifica el molde; el selector independiente de piezas se eliminó. Máquina y molde se vinculan mediante catálogo. Una relación única se completa automáticamente; una relación múltiple requiere elegir. El lote debe ser compatible con la resina y con el origen real o DEMO. Las cantidades se expresan en piezas enteras. OK = inyectadas − scrap. El porcentaje agregado se calcula sobre sumas, no mediante promedio de porcentajes. Si falta producción, el resultado queda pendiente. La alerta vigente se activa únicamente por scrap >3%.

## 4. Diseño

La interfaz utiliza Next.js y React. PostgreSQL en Supabase almacena catálogos, producción, detalle de rechazo y eventos. Supabase Auth gestiona las cuentas. Las políticas RLS y funciones RPC verifican acceso, rol y turno en la base de datos. Brevo proporciona el envío de correo configurado. GitHub conserva versiones y Vercel publica la aplicación. Las claves privadas no forman parte del cliente ni del repositorio.

## 5. Implementación

Se implementaron captura validada, enlace máquina–molde, producción horaria, cierre con cantidades consistentes, bloqueo posterior, panel, tendencia, Pareto, historial de alertas y Excel. El operador captura scrap y consulta resultados; el supervisor gestiona producción de su turno; el administrador gestiona producción y perfiles. Producción y Calidad disponen de consulta. Se incorporaron recuperación de contraseña y retiro reversible de invitaciones. El historial y las columnas antiguas se conservan; no se generan nuevos eventos TRS ni se solicitan metas para cerrar.

## 6. Verificación

La versión final aprobó 127 comprobaciones automáticas: 23 de formulario, cálculos y paginación y 104 en PostgreSQL aislado. Se probaron consistencia de cantidades, relaciones, idempotencia, límites, permisos, datos incompletos, cierre sin objetivos y conservación del historial. Lint y compilación de producción finalizaron sin errores. Node emitió un aviso de detección del tipo de módulo en las pruebas, sin fallos. La migración de retirada está presente en Supabase y la interfaz publicada se comprueba en el navegador. La evidencia final de publicación se conserva en la matriz de cierre.

La entrega de correo se había confirmado con el propietario. El cambio real de contraseña y nuevo inicio de sesión no se ejecutaron por decisión suya. Las pruebas aisladas no equivalen a aceptación de planta.

## 7. Entrega y operación

Se entrega código versionado, migraciones incrementales, datos DEMO separados, documentación técnica, matriz de cierre y guion de exposición. Para la presentación seleccionar Demostración y el rango 5–14 de octubre de 2026. Los reportes Excel contienen Detalle scrap, Por hora e Info. La operación real requiere mantener catálogos y cuentas, completar la producción faltante, conservar respaldos y vigilar el servicio de correo. No ejecutar el antiguo panel_alertas.sql sobre las migraciones vigentes.

## 8. Resultado y cierre

El resultado es una aplicación funcional para capturar, consultar y rastrear scrap con permisos y reportes. El proyecto queda finalizado en el alcance técnico aprobado por Eduardo. Los puntos técnicos se cierran como completados; la validación real diferida, las reuniones, reflexiones y aceptación del equipo se cierran administrativamente fuera de esta entrega, sin declararlos realizados. Este informe contiene ocho apartados técnicos; su correspondencia con una rúbrica académica y la aceptación formal pertenecen al equipo y al docente.

Anexos vigentes: [matriz de cierre](CIERRE-PROYECTO-20261016.md), [guion](GUION-PRESENTACION.md) y [retirada del TRS](RETIRADA-TRS.md). Las evidencias del 14 de octubre describen una versión histórica y no deben usarse como reglas actuales.
