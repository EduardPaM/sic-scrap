# Reporte de cambios — SIC SCRAP (10-oct-2026)

Audiencia: equipo de software que mantiene la aplicación (Next.js 16 + Supabase).
Los cambios están **sin commit** en el árbol de trabajo (rama `main`). Ningún cambio borra ni migra datos.

## 1. Resumen

| # | Cambio | Tipo | Riesgo | Requiere acción en Supabase |
|---|--------|------|--------|-----------------------------|
| 1 | Un operador con turno asignado solo registra scrap de ese turno | Seguridad / regla de negocio | Bajo | **Sí**: ejecutar la migración 202610100002 |
| 2 | Panel: sin fecha elegida solo consulta los últimos 30 días | Rendimiento | Bajo | No |
| 3 | Mensaje de éxito con contraste accesible | Accesibilidad | Muy bajo | No |
| 4 | Enlaces, listas numeradas y botones secundarios reconocibles | UX | Muy bajo | No |
| 5 | Cierre de turno: nombres en vez de números y texto de estado vacío | UX | Bajo | No |
| 6 | CI con lint, pruebas y build | Calidad | Ninguno | No |
| 7 | Prueba de que la migración 002 se puede repetir | Pruebas | Ninguno | No |

## 2. Detalle: qué, por qué y dónde

### 2.1 Turno obligatorio para operadores con turno asignado
- **Dónde:**
  - Nuevo: `supabase/migrations/202610100002_turno_operador.sql`.
  - `app/registrar-scrap/page.tsx` (constantes `turnoFijo` y `datos`, selector de turno).
  - `app/usuarios/page.tsx` (texto de ayuda bajo "Turno asignado").
  - `tests/database.test.mjs` (3 pruebas nuevas).
- **Qué:** `guardar_captura` rechaza la captura si `privado.turno_actual()` no es nulo y difiere de `p_turno` (error "Solo puedes registrar scrap de tu turno asignado"). Si el operador no tiene turno asignado, todo funciona como antes. La pantalla preselecciona y bloquea el turno del operador.
- **Por qué:** antes, la función solo validaba el rol. Un operador podía registrar scrap en cualquier turno o máquina, y eso movía el % de scrap y la alerta del 3% de otro grupo.
- **Detalle técnico:** la migración reemplaza la función completa con `create or replace`; la única diferencia con la versión de la migración 001 es la línea de validación de turno. Es idempotente y mantiene `revoke/grant`. Si en el futuro se modifica `guardar_captura`, hay que partir de esta versión (la de la 001 quedó obsoleta).
- **No incluido a propósito:** limitar la fecha a "hoy o ayer". Bloquearía capturas tardías legítimas.

### 2.2 Panel: ventana de 30 días por defecto
- **Dónde:** `app/panel/page.tsx` (`hace30Dias()`, función `load`, texto de ayuda de filtros).
- **Qué:** sin fecha elegida se aplica `fecha >= hoy - 30 días` (zona America/Mexico_City). Con fecha elegida se comporta igual que antes. El texto "Sin fecha elegida: últimos 30 días" avisa del límite.
- **Por qué:** la vista `v_scrap_turno` agrega todo el historial y el panel la consulta cada 15 s por cada pantalla abierta. Con meses de datos se volvería lenta.
- **Efecto visible:** los grupos de más de 30 días solo aparecen eligiendo su fecha.

### 2.3 Contraste del mensaje de éxito
- **Dónde:** `app/registrar-scrap/page.tsx` (clase del mensaje).
- **Qué:** `text-green-600` → `text-green-700`.
- **Por qué:** el verde anterior tenía un contraste aproximado de 3.3:1 sobre blanco, menor al 4.5:1 de WCAG AA.

### 2.4 Enlaces, listas y botones secundarios
- **Dónde:** `app/globals.css` (reglas `.workspace a:not(.primary)`, `.workspace ol`, `.workspace button.secondary`); `app/usuarios/page.tsx` (clase `secondary` en "Copiar enlace de activación", "Eliminar invitación", "Confirmar eliminación" y "Cancelar").
- **Qué:** los enlaces dentro del contenido llevan color y subrayado; la lista "Cómo activar a un integrante" muestra su numeración (el reset de Tailwind la quitaba); los botones secundarios tienen borde.
- **Por qué:** los enlaces ("Olvidé mi contraseña", "Abrir página de activación") parecían texto plano y los pasos aparecían sin numerar.
- **Alcance:** no afecta la barra superior (`.site-header`) ni los avisos `.notice`.

### 2.5 Cierre de turno: nombres y estado vacío
- **Dónde:** `app/cierre-turno/page.tsx` (estado `nombres`, consulta a `maquina`, `turno` y `pieza`, opciones del selector, mensaje bajo la tabla).
- **Qué:** el selector muestra "#12 · 2026-10-10 · Tolva · Nocturno · Referencia 53" en lugar de "Máquina 2 · Turno 2 · Pieza 7". Si falla la consulta de nombres, vuelve a mostrar los números como antes. Bajo la tabla aparece "Selecciona un registro para ver sus horas." (o "Este registro todavía no tiene horas capturadas.").
- **Por qué:** los IDs no significan nada para quien cierra el turno.
- **Costo:** 3 consultas pequeñas de catálogos al abrir la pantalla.

### 2.6 CI
- **Dónde:** `.github/workflows/ci.yml` (nuevo).
- **Qué:** en cada push y pull request ejecuta `npm ci`, `npm run lint`, `npm test` y `npm run build` con Node 24.
- **Por qué:** no había CI; las pruebas dependían de que alguien las corriera.
- **Nota:** el build usa variables de relleno (`NEXT_PUBLIC_SUPABASE_URL=https://ci.invalid`) porque `lib/supabaseClient.ts` falla al importarse sin URL. No se conecta a Supabase. El flujo se probó localmente con esos mismos valores, pero **aún no se ha ejecutado en GitHub**.

### 2.7 Prueba de repetición de la migración 002
- **Dónde:** `tests/database.test.mjs`.
- **Qué:** la migración `202610080002_activar_rls.sql` se ejecuta dos veces; si dejara de ser repetible, la prueba falla.

## 3. Verificación realizada

| Comprobación | Resultado |
|---|---|
| `npm run lint` | Sin errores |
| `npm test` | 6 pruebas de formulario + 42 de base de datos (PGlite) pasan; antes eran 39 |
| `npm run build` (con variables de CI) | Compila, TypeScript sin errores |
| Revisión visual con sesión de administrador (panel, cierre, usuarios) | Numeración, enlaces, botones, texto de 30 días y estado vacío se ven correctos; sin errores en consola |
| Acceso anónimo a Supabase real | 13 tablas y 4 vistas devuelven 401 |

**No verificado:**
- La pantalla de captura como operador (el turno bloqueado), porque requiere una cuenta con ese rol.
- Los nombres en el selector de registros de cierre de turno, que no se abrió con registros cargados.
- El flujo en GitHub Actions.

## 4. Cómo desplegar

1. **Supabase → SQL Editor:** ejecutar `supabase/migrations/202610100002_turno_operador.sql`. Opcional: respaldar antes la definición actual de `guardar_captura`.
2. **Usuarios:** en `/usuarios`, asignar turno a cada operador de turno fijo. Hasta entonces la regla no los afecta.
3. Desplegar el código (los cambios de interfaz no dependen del SQL).

**Reversión:**
- Interfaz: `git checkout -- <archivo>` (todo está sin commit).
- SQL: volver a ejecutar la definición de `guardar_captura` de `202610080001_captura_panel.sql`.

## 5. Pendiente / fuera de alcance (decisiones para el equipo)

| Tema | Detalle | Prioridad |
|---|---|---|
| **Confirmación de correo** | Verificar en Supabase (Authentication → Providers → Email) que "Confirm email" esté activo. `vincular_mi_perfil` asigna el rol según el correo confirmado; si estuviera apagado, quien se registre con un correo autorizado obtendría ese rol. | Alta, comprobar |
| Corrección de scrap y reapertura | No hay forma de editar un scrap mal capturado ni de reabrir un registro cerrado. Requiere decisión de producto. | Media |
| Error junto al campo | En captura de scrap los errores salen abajo, no junto a cada campo. | Baja |
| Candado global | `pg_advisory_xact_lock(73001,1)` serializa todas las escrituras. | Baja |
| Estilos duplicados | Convive shadcn/Radix (solo captura de scrap) con CSS global (resto). | Baja |
| Dependencia `cn` | Los componentes de `components/ui` importan `cn` del paquete `cn`; `lib/utils.ts` define otra `cn` sin usar. | Baja |
| Pruebas de pantalla | No hay pruebas de punta a punta (captura → cierre → panel). | Media |
| Dato del panel | Hay scrap sin producción por hora capturada; hasta que se capture no se calcula el % ni la alerta. Es de proceso, no de código. | — |

## 6. Archivos tocados

- Nuevos: `supabase/migrations/202610100002_turno_operador.sql`, `.github/workflows/ci.yml`, este reporte.
- Modificados: `app/registrar-scrap/page.tsx`, `app/usuarios/page.tsx`, `app/panel/page.tsx`, `app/cierre-turno/page.tsx`, `app/globals.css`, `tests/database.test.mjs`.

Si el servidor de desarrollo muestra comportamientos raros tras un `npm run build` en paralelo, reinícialo (`npm run dev`).
