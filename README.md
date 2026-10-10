# SIC SCRAP

Aplicación Next.js + Supabase para captura de rechazos en piezas, producción por hora, cierre por registro y panel por máquina/turno.

## Desarrollo

Entorno verificado: Node 24.21.0, npm 11.19, Next.js 16.3.8. Instalar con `npm ci` conservando package-lock.json. Crear `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` del proyecto autorizado. Nunca usar service_role en el cliente ni subir `.env.local`.

- `npm run dev`: http://localhost:3000
- `npm run lint`: análisis estático.
- `npm test`: 30 comprobaciones en PostgreSQL aislado (PGlite), sin tocar Supabase.
- `npm run build`: compilación de producción.
- `npm audit --omit=dev`: dependencias de ejecución. Revisar también auditoría completa de herramientas; no aplicar `--force` sin evaluar incompatibilidades.

Si Windows reporta que falta un binario de Tailwind/oxide, detener el servidor e instalar con `npm ci` en el mismo sistema. No borrar el lockfile ni copiar node_modules desde otro sistema.

## Base de datos

Las migraciones incrementales en `supabase/migrations` parten del esquema existente de 13 tablas; NO crean una base vacía. Están aplicadas en el proyecto SIC SCRAP revisado. No ejecutar el SQL antiguo de panel_alertas.sql encima de estas migraciones.

En otro ambiente: respaldar y revisar esquema, aplicar 001, crear por un administrador de base de datos un perfil autorizado en usuario, confirmar la cuenta Auth correspondiente y vincularla, después aplicar 002. La segunda migración exige un administrador vinculado y sustituye las políticas de las 13 tablas enumeradas: revisar políticas propias antes de reutilizarla. Los fixtures de tests documentan el esquema mínimo compatible, pero no son semillas de producción.

Toda escritura de la aplicación utiliza RPC con rol y turno comprobados. Las tablas y vistas aplican RLS. Las vistas son security_invoker; una clave pública por sí sola no permite leer producción o perfiles. Las funciones privilegiadas usan search_path vacío y nombres de tabla completos.

## Acceso

Un administrador preasigna correo, rol y, para supervisor, turno desde `/usuarios`. Cada persona establece su propia contraseña en `/activar-cuenta` y confirma el correo. Vincular un usuario Auth sin perfil preasignado no concede acceso. Revisar Site URL y Redirect URLs de Supabase para cada ambiente antes de activar nuevas cuentas.

- Operador: captura de scrap, panel y alertas.
- Supervisor: panel; abre, registra producción y cierra únicamente su turno asignado.
- Producción y calidad: consulta del panel. Exportaciones y gráficas adicionales pendientes.
- Administrador: perfiles y producción/cierre. No suplanta la captura exclusiva del operador.

## Reglas

Scrap (%) = suma de rechazos / suma de piezas inyectadas × 100. No promediar porcentajes. Alerta estricta cuando el resultado sin redondear supera 3%. Sin producción suficiente se muestra pendiente, nunca un 0% artificial.

La fecha es la de inicio del turno y la hora usa reloj 0–23. Se conserva compatibilidad con los registros históricos. Las capturas se agrupan por fecha/máquina/turno/pieza/lote; el UUID de solicitud hace idempotente el reintento. Capturar producción reemplaza el total horario, no lo incrementa. Un registro cerrado bloquea cambios desde las RPC.

Alertas derivadas reflejan el estado actual y no constituyen un historial de notificaciones. El panel consulta cada 15 s; al guardar scrap se consulta de inmediato el estado disponible. Si falta producción, no se puede calcular todavía el porcentaje.

## Límites y pendientes

El cierre es por registro de pieza/lote, no un cierre global de máquina/turno. El panel limita la consulta a 1,000 grupos y advierte cuando alcanza el límite; el selector de cierre a 500 registros. Las escrituras usan un bloqueo transaccional global para evitar encabezados duplicados; medir concurrencia antes de escalar a varias líneas. No se migraron ni borraron duplicados históricos.

Faltan validaciones operativas con cuentas reales de todos los roles, Pareto/tendencias, exportación, configuración de umbrales e historial de alertas. No hay una interfaz de reapertura ni de corrección de detalle scrap. Los números manuscritos de las fotos son evidencia por confirmar y no se cargan automáticamente.
