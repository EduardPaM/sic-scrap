> Actualización de alcance: TRS se retira del cliente y del cierre vigente. Aplicar la nueva migración antes de publicar. Ver [Retirada de TRS](docs/RETIRADA-TRS.md).

# SIC SCRAP

Aplicación Next.js + Supabase para captura de rechazos en piezas, producción por hora, cierre por registro y panel por máquina/turno.

## Desarrollo

Entorno verificado: Node 24.21.0, npm 11.19, Next.js 16.3.8. Instalar con `npm ci` conservando package-lock.json. Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` del proyecto autorizado. Nunca usar service_role en el cliente ni subir `.env.local`.

- `npm run dev`: http://localhost:3000
- `npm run lint`: análisis estático.
- `npm test`: 15 pruebas de formulario, 5 de gráficas, 3 de paginación y 92 comprobaciones en PostgreSQL aislado (PGlite), sin tocar Supabase.
- `npm run build`: compilación de producción.
- `npm audit --omit=dev`: dependencias de ejecución. Revisar también auditoría completa de herramientas; no aplicar `--force` sin evaluar incompatibilidades.

Si Windows reporta que falta un binario de Tailwind/oxide, detener el servidor e instalar con `npm ci` en el mismo sistema. No borrar el lockfile ni copiar node_modules desde otro sistema.

## Base de datos

Las migraciones incrementales en `supabase/migrations` parten del esquema existente de 13 tablas; NO crean una base vacía. Están aplicadas en el proyecto SIC SCRAP revisado. No ejecutar el SQL antiguo de panel_alertas.sql encima de estas migraciones.

En otro ambiente: respaldar y revisar esquema, aplicar 001, crear por un administrador de base de datos un perfil autorizado en usuario, confirmar la cuenta Auth correspondiente y vincularla, después aplicar 002. La segunda migración exige un administrador vinculado y sustituye las políticas de las 13 tablas enumeradas: revisar políticas propias antes de reutilizarla. Los fixtures de tests documentan el esquema mínimo compatible, pero no son semillas de producción.

Toda escritura de la aplicación utiliza RPC con rol y turno comprobados. Las tablas y vistas aplican RLS. Las vistas son security_invoker; una clave pública por sí sola no permite leer producción o perfiles. Las funciones privilegiadas usan search_path vacío y nombres de tabla completos.

## Acceso

Un administrador preasigna correo, rol y, para supervisor, turno desde `/usuarios`. Cada persona establece su propia contraseña en `/activar-cuenta` y confirma el correo. Vincular un usuario Auth sin perfil preasignado no concede acceso. Revisar Site URL y Redirect URLs de Supabase para cada ambiente antes de activar nuevas cuentas.

Desde `/login`, «Olvidé mi contraseña» abre `/recuperar-contrasena`. Supabase envía el enlace por SMTP a `/restablecer-contrasena`, donde una sesión verificada permite establecer y confirmar una contraseña de al menos 12 caracteres. La respuesta al solicitar correo no revela si existe la cuenta. Autorizar expresamente `https://sic-scrap.vercel.app/restablecer-contrasena` en Authentication > URL Configuration. Para probar en desarrollo, autorizar también `http://localhost:3000/restablecer-contrasena`.

La migración `202610100001_retirar_invitaciones.sql` permite al administrador retirar perfiles sin vincular. «Eliminar invitación» pide confirmación y archiva/desactiva el perfil; no borra cuentas Auth ni producción. Guardar de nuevo el mismo correo restaura el perfil. Las cuentas vinculadas no pueden retirarse por esta función: usar Estado Inactivo para revocar acceso. La base valida estas reglas aunque se invoque la función fuera de la interfaz.

- Operador: captura de scrap, panel y alertas.
- Supervisor: panel; abre, registra producción y cierra únicamente su turno asignado.
- Producción y calidad: consulta del panel, gráficas y exportación Excel. Todos los perfiles activos pueden consultar y exportar.
- Administrador: perfiles y producción/cierre. No suplanta la captura exclusiva del operador.

## Reglas

Scrap (%) = suma de rechazos / suma de piezas inyectadas × 100. No promediar porcentajes. Alerta estricta cuando el resultado sin redondear supera 3%. Sin producción suficiente se muestra pendiente, nunca un 0% artificial.

La fecha es la de inicio del turno y la hora usa reloj 0–23. Se conserva compatibilidad con los registros históricos. Las capturas se agrupan por fecha/máquina/turno/molde/lote; el UUID de solicitud hace idempotente el reintento. Capturar producción reemplaza el total horario, no lo incrementa. Un registro cerrado bloquea cambios desde las RPC.

Las alertas del panel reflejan el estado actual. `/alertas` conserva sus cambios de estado y porcentaje desde la instalación de la migración 202610140002; no reconstruye eventos anteriores. El panel consulta cada 15 s; al guardar scrap se consulta de inmediato el estado disponible. Si falta producción, no se puede calcular todavía el porcentaje.

## Límites y pendientes

El cierre es por registro de molde/lote, no un cierre global de máquina/turno. Panel, selector de cierre, gráficas, historial y exportación leen por páginas; las consultas que alcanzan 100,000 filas solicitan reducir el rango sin devolver resultados parciales. Las escrituras usan un bloqueo transaccional global para evitar encabezados duplicados; medir concurrencia antes de escalar a varias líneas. No se fusionaron ni borraron duplicados históricos.

Las pruebas con películas reales están diferidas por Eduardo; la matriz de permisos se prueba con cinco identidades aisladas. Los umbrales son las reglas aprobadas (3% scrap, 86% TRS), no valores editables. No hay una interfaz de reapertura ni de corrección de detalle scrap. Los números manuscritos de las fotos son evidencia por confirmar y no se cargan automáticamente.

## Demostración y entrega

Aplicar `202610140002_demo_alertas.sql`, publicar el cliente y después cargar `supabase/demo/20261014_demostracion.sql`. El script repetible añade 30 registros hipotéticos cerrados del 5 al 14 de octubre de 2026, 30,000 piezas y 1,365 rechazos. Usa máquinas y lote DEMO separados; una validación de base impide cruzarlos con producción real. Los filtros muestran Producción real por defecto. Para presentar, elegir Demostración en Panel, Gráficas, Historial y Exportar. El Excel identifica su origen por fila y en el nombre del archivo. Captura y apertura también separan catálogos y relaciones por origen.

Consultar `docs/CIERRE-TECNICO-Y-DEMO.md` para guion, matriz de aceptación, permisos, diccionario actualizado y material de Review/retrospectiva. Las reuniones, reflexiones personales, aceptación con planta y documento final requieren al equipo; no se acreditan mediante pruebas automáticas.

## Moldes y TRS (14-oct-2026)

Aplicar `202610140001_moldes_trs.sql` después de las migraciones anteriores y publicar esta versión del cliente. Las RPC antiguas piden actualizar la página para evitar capturas con dos identidades. `guardar_captura_molde` y `abrir_produccion_molde` usan fecha, máquina, turno, molde y lote, sin parámetro pieza. No enviar kg: todas las cantidades de producción y scrap son piezas enteras.

La decisión de Eduardo es conservar Guide 83 y Guide 84 como nombres de molde de los históricos. Se conserva el catálogo `pieza`, la referencia `id_pieza` y `uso_molde` antiguos solo como evidencia; no se consultan desde los formularios ni la exportación. Los códigos genéricos MO quedan fuera de nuevas capturas cuando no identifican ningún registro canónico. La relación privada `pieza_molde_legacy` mantiene la correspondencia. No se borran ni fusionan registros históricos. Los grupos duplicados no reciben nuevas capturas ambiguas; su revisión requiere decidir qué registros son correctos.

La fotografía incorpora 12 relaciones entre 8 máquinas y 12 referencias de molde. Las descripciones con comas se conservan completas, sin inventar submoldes. Haitan230TON se normaliza a HAITIAN 230 TON conservando el ID cuando no existe otra máquina con ese nombre. Los selectores filtran por `maquina_molde` y la RPC valida la misma relación; se preservan también relaciones históricas. Un equipo antiguo sin relaciones conserva la selección libre entre moldes disponibles.

TRS = piezas OK / (objetivo de piezas por hora × horas programadas) × 100. La meta mínima confirmada es 86%; 86 exacto cumple, menor a 86 alerta, evaluado sin redondear. El panel suma objetivos una vez por registro y calcula un cociente ponderado por máquina/turno, nunca promedio de porcentajes. Mientras haya registros abiertos, producción incompleta u objetivos faltantes, muestra TRS pendiente. La alerta de scrap >3% se conserva como regla independiente.

Excel incluye Detalle scrap, Por hora, TRS por registro e Info. La exportación de César integrada por Ana se conserva; la trazabilidad usa el molde canónico y la producción horaria derivada de los detalles. Se añadió el enlace de exportación a la navegación.

En captura y apertura se puede elegir primero máquina o molde. Una relación única completa automáticamente el otro campo; varias relaciones mantienen una elección compatible o solicitan elegir sin asumir la primera. Las cantidades y observaciones se conservan al cambiar la selección. Las relaciones de la imagen y las históricas se validan también en la base de datos.

Se conserva además la aportación de gráficas y Pareto de César integrada por Ana en el PR #3 durante esta actualización. Usa cantidades en piezas y las vistas compatibles con la migración de moldes.
