# Guion de presentación — SIC SCRAP

Versión final del alcance aprobado: 16 de octubre de 2026. Duración sugerida: 4–5 minutos.

## 1. Problema y objetivo

“SIC SCRAP es un sistema web para registrar y consultar el desperdicio de producción. Partimos de las películas de producción usadas en planta y organizamos la información por fecha, turno, máquina, molde, lote y causa de rechazo. El objetivo es facilitar la captura, conservar la trazabilidad y visualizar los resultados.”

## 2. Captura y trazabilidad

“Unificamos las referencias en el catálogo de moldes: el número de parte identifica el molde. Relacionamos cada máquina con sus moldes. Cuando la relación es única, seleccionar uno completa automáticamente el otro; si hay varias opciones, el usuario elige la correcta. El scrap se mide en piezas enteras. El formulario identifica los campos faltantes y valida la compatibilidad del lote y la resina.”

## 3. Producción y cierre

“Registramos las piezas inyectadas por hora y calculamos las piezas buenas restando el scrap. Un supervisor de su turno o el administrador puede cerrar el registro cuando las cantidades coinciden. Después del cierre, la captura queda bloqueada para conservar lo registrado.”

## 4. Panel, gráficas y alertas

“El panel muestra las piezas inyectadas, el scrap y su porcentaje. La fórmula es piezas rechazadas entre piezas inyectadas, multiplicado por cien. Las gráficas muestran la tendencia y un Pareto para identificar las causas con más rechazos. Las alertas se activan cuando el scrap supera el 3%, y su historial conserva los cambios. El TRS se retiró del alcance visible; el 86% permanece únicamente como referencia informativa y no genera alertas ni condiciona el cierre.”

## 5. Acceso y reportes

“El sistema tiene acceso por cuentas y roles. El operador captura scrap; el supervisor y el administrador gestionan producción y cierre según sus permisos. Los usuarios autorizados, incluido el operador, pueden consultar panel, gráficas, alertas y reportes. El administrador gestiona perfiles e invitaciones. También incorporamos recuperación de contraseña por correo y exportación a Excel con detalle de scrap, producción por hora e información del reporte.”

## 6. Pruebas, demostración y cierre

“Para demostrar el funcionamiento generamos registros hipotéticos, separados y etiquetados como demostración. No representan resultados reales de la planta. Validamos cálculos, relaciones, permisos y cierre con 127 comprobaciones automáticas. El proyecto queda finalizado en su alcance técnico aprobado. Las pruebas con películas reales y la aceptación operativa de planta quedan fuera de esta entrega.”

## Recorrido para mostrar la aplicación

1. Abrir Panel y seleccionar **Demostración (datos hipotéticos)**.
2. Mostrar cantidades y porcentaje; explicar la nota informativa del 86%.
3. Abrir Gráficas, seleccionar Demostración y el rango **5–14 de octubre de 2026**. Mostrar tendencia y Pareto.
4. Mostrar Historial de alertas y un evento de scrap.
5. Mostrar el enlace máquina–molde con una cuenta autorizada; no guardar datos arbitrarios en Producción real.
6. Abrir Exportar, elegir el mismo origen y rango y descargar Excel.
7. Cerrar con el resultado: captura trazable, consulta visual, permisos y reportes.

## Puntos que debes recordar

- Unidad oficial: **piezas**, no kilogramos.
- Fórmula: **scrap / inyectadas × 100**. Ejemplo: 50 / 1,000 × 100 = **5%**.
- Piezas OK: **inyectadas − scrap**.
- Alerta vigente: scrap **mayor a 3%**; exactamente 3% no la activa.
- **86% informativo**: no es condición de aprobación ni de cierre.
- Sin producción completa, el indicador aparece pendiente; no se inventa un 0%.
- Moldes sustituyen al selector de piezas; las cantidades siguen expresándose en piezas.
- Tecnologías: Next.js y React para la aplicación; PostgreSQL y Supabase para datos y autenticación; Brevo para correo; GitHub para versiones y Vercel para publicación.
- No atribuir los datos DEMO a planta ni afirmar que se realizaron reuniones o aceptación operativa sin evidencia.
