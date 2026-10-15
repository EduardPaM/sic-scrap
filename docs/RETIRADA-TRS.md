# Retirada de TRS del alcance vigente

Autorización comunicada por Anaid tras indicación del SM. El alcance vigente sigue SIC_SCRAP (2).pdf: captura, trazabilidad, porcentaje y alertas de scrap.

## Cambios

- Panel consulta v_scrap_turno y cuenta solo alertas de scrap.
- Historial visible filtra tipo scrap. Se conservan todos los eventos antiguos.
- Excel vuelve a tres hojas: Detalle scrap, Por hora e Info.
- Cierre solicita únicamente piezas OK y usa cerrar_registro_scrap. Mantiene validación contra producción horaria, permisos de supervisor/administrador y bloqueo posterior.
- La migración incremental no borra registros, columnas históricas ni migraciones. Neutraliza las columnas de compatibilidad TRS del panel y retira la ejecución del cierre antiguo para clientes autenticados.
- v_trs_registro y columnas históricas permanecen para compatibilidad de datos, sin uso en el cliente vigente.

## Orden de aplicación

1. Revisar y aplicar supabase/migrations/202610150001_retirar_trs.sql en el proyecto correcto, después de 202610140002_demo_alertas.sql.
2. Publicar el cliente de esta revisión. La pantalla antigua de cierre dejará de guardar y requerirá recarga.
3. Comprobar panel, historial y Excel. El caso demo BORCHE del 14/10 mantiene 1000 inyectadas, 50 scrap y 5%, con una alerta exclusivamente de scrap.
4. Verificar un cierre nuevo con una cuenta autorizada y datos de prueba identificados. No modificar registros reales para demostrar el cambio.

Los anexos CIERRE-TECNICO-Y-DEMO y EVIDENCIA-DEMO-20261014 describen la versión anterior con TRS; sus cifras y pruebas se conservan como evidencia histórica. No deben usarse como guion vigente de TRS.

## Verificación técnica

npm test: 23 pruebas de JavaScript/TypeScript y 104 de PostgreSQL aislado, incluidos 12 controles nuevos posteriores a la migración de retirada. Las pruebas antiguas de TRS verifican la secuencia histórica antes de aplicar la retirada. Ninguna prueba conecta con Supabase de producción.

La aceptación de usuarios y la comprobación en el portal siguen pendientes hasta aplicar la migración y publicar.
