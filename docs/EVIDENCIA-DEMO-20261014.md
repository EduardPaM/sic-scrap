# Evidencia de validación del 14 de octubre de 2026

## Pruebas

115 comprobaciones aprobadas: 15 formulario/relaciones, 5 gráficas, 3 paginación y 92 PostgreSQL aislado. Lint, compilación de producción y revisión de diferencias sin errores. Los permisos de cinco roles, anónimo e inactivo se comprobaron en PostgreSQL aislado. El navegador publicado se probó con la cuenta administradora existente; no se suplantó a operadores ni se cambiaron credenciales.

La migración y la carga se ensayaron con rollback en Supabase: 30 grupos, 30,000 inyectadas y 1,365 scrap. Posteriormente se aplicó la migración, se publicó el cliente y se cargó la demostración. Publicación c7d5b9b: Vercel Ready, despliegue 3Dw2xPZQ7yX8fc73ZMcBkR22h3fR.

## Conservación de datos reales

La carga no modificó los 10 encabezados ni los 9 detalles reales existentes. Comparación de contenido antes y después mediante huellas MD5 de filas ordenadas:

- Encabezados: `a45aff181814858a8cb5975f8771f868`.
- Detalles: `46c1e7cf7ec7d7fec362032c3d518a72`.

Estas huellas son un control de igualdad, no un respaldo ni una firma criptográfica. Los históricos duplicados no se alteraron.

## Navegador y Excel

- Panel real conserva 765 inyectadas y 2,516 scrap, con grupos pendientes de completar; no se les inventó producción.
- Panel DEMO inicial: 30,000 inyectadas, 1,365 scrap, 22 grupos con alguna alerta y cero grupos sin producción.
- Gráficas: tendencia de diez días y Pareto de seis causas. Piezas por causa: C-02 356, C-06 342, C-03 263, C-05 160, C-01 150, C-04 94. Total 1,365; acumulado final 100%.
- Historial: se verificaron eventos DEMO activos y resueltos, y el evento real inicial de Tolva con TRS 13.43%. Los eventos generados durante la carga reflejan también sus pasos intermedios; no representan incidencias reales de planta.
- Excel descargado `SIC_SCRAP_DEMO_2026-10-05_a_2026-10-14.xlsx`: 54 detalles, 60 horas, 30 filas TRS, 10 filas Info. Se leyó el archivo descargado y se comprobaron 1,365 rechazadas, 30,000 inyectadas y origen DEMOSTRACIÓN HIPOTÉTICA en todas las filas de detalle.

## Ensayo adicional desde la interfaz

Después de descargar ese Excel se abrió un registro DEMO adicional del 14 de octubre, turno Nocturno, molde GUIDE y equipo DEMO KRAUSS MAFFEI 360 TON. Elegir GUIDE completó automáticamente la máquina. Se capturaron 860 piezas inyectadas a las 21:00, cero scrap, 860 OK, objetivo 1,000 por hora y una hora programada. La interfaz confirmó «Cierre guardado correctamente» y deshabilitó guardar producción y cierre.

La demostración pasa así a 31 registros, 61 horas, 30,860 inyectadas y 1,365 scrap. El Excel y la captura de gráficas iniciales son evidencia del conjunto anterior de 30 registros, no una descarga posterior al ensayo. La carga inicial sigue siendo repetible y no sobrescribe este registro adicional.

## Pendientes fuera del cierre técnico

Películas reales diferidas por Eduardo. Cambio real de contraseña y nuevo login pendientes por decisión previa del propietario. Review, retrospectiva, reflexiones y ensayo del equipo tienen guion preparado, pero no se afirman realizados. El documento final de ocho fases sigue pendiente. La matriz técnica no sustituye la aprobación del DoD original ni la aceptación de planta.
