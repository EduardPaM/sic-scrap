import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
const root = new URL("../", import.meta.url).pathname.replace(
  /^\/(?:([A-Za-z]):)/,
  "$1:",
);
const db = new PGlite();
await db.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;
create table maquina(id_maquina serial primary key,nombre varchar not null);
create table turno(id_turno serial primary key,nombre varchar not null,hora_inicio time,hora_fin time);
create table pieza(id_pieza serial primary key,nombre varchar not null);
create table resina(id_resina serial primary key,nombre varchar not null);
create table lote_materia_prima(id_lote serial primary key,codigo_lote varchar not null,id_resina int references resina);
create table molde(id_molde serial primary key,codigo_molde varchar not null);
create table personal(id_personal serial primary key,nombre varchar not null,cargo varchar);
create table causa_scrap(id_causa serial primary key,codigo varchar not null,nombre varchar not null,categoria varchar not null,descripcion varchar);
create table usuario(id_usuario serial primary key,nombre varchar not null,correo varchar unique,rol varchar not null,activo boolean default true,creado_en timestamp default now());
create table registro_produccion(id_registro serial primary key,fecha date not null,id_maquina int references maquina,id_turno int references turno,id_pieza int references pieza,id_lote int references lote_materia_prima,id_operador int references personal,id_supervisor int references personal,id_gap_lider int references personal,id_calidad int references personal);
create table uso_molde(id_uso_molde serial primary key,id_registro int references registro_produccion,id_molde int references molde,hora_inicio time,hora_fin time);
create table produccion_hora(id_produccion_hora serial primary key,id_registro int references registro_produccion,numero_hora int not null,piezas_inyectadas int not null default 0,piezas_scrap int not null default 0);
create table detalle_scrap(id_detalle_scrap serial primary key,id_produccion_hora int references produccion_hora,id_causa int references causa_scrap,cantidad int not null default 0,observaciones varchar);
insert into maquina(nombre) values('Huitan 230 TON');insert into turno(nombre) values('Matutino'),('Nocturno');insert into pieza(nombre) values('Referencia 53'),('Referencia 54');insert into resina(nombre) values('Prueba');insert into lote_materia_prima(codigo_lote,id_resina) values('PRUEBA',1);insert into molde(codigo_molde)values('PRUEBA');insert into causa_scrap(codigo,nombre,categoria)values('TEST','Prueba','Prueba');
`);
await db.exec(
  await fs.readFile(
    root + "/supabase/migrations/202610080001_captura_panel.sql",
    "utf8",
  ),
);
await db.exec(
  await fs.readFile(
    root + "/supabase/migrations/202610080001_captura_panel.sql",
    "utf8",
  ),
);
const roles = [
  "operador",
  "supervisor",
  "produccion",
  "calidad",
  "administrador",
];
for (let i = 0; i < 5; i++)
  await db.query(`insert into auth.users values($1,$2,now());`, [
    `00000000-0000-4000-8000-00000000000${i + 1}`,
    roles[i] + "@example.invalid",
  ]);
for (let i = 0; i < 5; i++)
  await db.query(
    `insert into usuario(nombre,correo,rol,auth_user_id,id_turno)values($1,$2,$1,$3,1)`,
    [
      roles[i],
      roles[i] + "@example.invalid",
      `00000000-0000-4000-8000-00000000000${i + 1}`,
    ],
  );
const activarRlsSql = await fs.readFile(
  root + "/supabase/migrations/202610080002_activar_rls.sql",
  "utf8",
);
await db.exec(activarRlsSql);
await db.exec(activarRlsSql); // la migración debe poder repetirse sin error
const tests = [];
const invitacionesSql = await fs.readFile(root + "/supabase/migrations/202610100001_retirar_invitaciones.sql", "utf8");
await db.exec(invitacionesSql);
await db.exec(invitacionesSql);
const turnoOperadorSql = await fs.readFile(root + "/supabase/migrations/202610100002_turno_operador.sql", "utf8");
await db.exec(turnoOperadorSql);
await db.exec(turnoOperadorSql);
async function asRole(i) {
  await db.exec("reset role");
  await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
    `00000000-0000-4000-8000-00000000000${i}`,
  ]);
  await db.exec("set role authenticated");
}
function check(name, condition) {
  if (!condition) throw Error(name);
  tests.push(name);
}
async function fail(name, sql) {
  let failed = false;
  try {
    await db.exec(sql);
  } catch {
    failed = true;
  }
  check(name, failed);
}
await asRole(1);
const capture = (piece, qty, uuid) =>
  `select guardar_captura('2026-10-07',1,1,${piece},1,1,1,7,1,${qty},'Prueba','${uuid}')`;
const first = capture(1, 94, "11111111-1111-4111-8111-111111111111");
await db.exec(first);
await db.exec(first);
check(
  "Reintento idempotente",
  Number((await db.query("select count(*) n from detalle_scrap")).rows[0].n) ===
    1,
);
check(
  "Produccion faltante no informa 0%",
  (await db.query("select pct_scrap from v_scrap_turno")).rows[0].pct_scrap ===
    null,
);
await fail(
  "Operador no registra produccion",
  "select guardar_produccion(1,7,493)",
);
await asRole(2);
await db.exec("select guardar_produccion(1,7,493)");
check(
  "Referencia 53 = 19.07%",
  Number(
    (await db.query("select pct_scrap from v_scrap_turno")).rows[0].pct_scrap,
  ) === 19.07,
);
await asRole(1);
await db.exec(capture(2, 51, "22222222-2222-4222-8222-222222222222"));
await asRole(2);
await db.exec("select guardar_produccion(2,7,493)");
check(
  "Dos referencias suman 986/145 = 14.71%",
  Number(
    (await db.query("select pct_scrap from v_scrap_turno")).rows[0].pct_scrap,
  ) === 14.71,
);
check(
  "Referencia 54 = 10.34%",
  Number(
    (
      await db.query(
        "select pct_scrap from v_scrap_turno_pieza where id_pieza=2",
      )
    ).rows[0].pct_scrap,
  ) === 10.34,
);
await fail(
  "Scrap no puede superar produccion al corregir",
  "select guardar_produccion(1,7,90)",
);
await fail("No admite hora 24", "select guardar_produccion(1,24,100)");
await fail(
  "No admite produccion negativa",
  "select guardar_produccion(1,7,-1)",
);
await fail(
  "Cierre inconsistente rechazado",
  "select cerrar_registro(1,55.33,12,500)",
);
await db.exec("select cerrar_registro(1,55.33,12,399)");
await fail(
  "Produccion cerrada no se modifica",
  "select guardar_produccion(1,7,500)",
);
await asRole(1);
await fail(
  "Captura en registro cerrado rechazada",
  capture(1, 1, "33333333-3333-4333-8333-333333333333"),
);
for (const i of [3, 4]) {
  await asRole(i);
  await fail(
    "Rol " + roles[i - 1] + " sin escritura",
    "select guardar_produccion(2,7,500)",
  );
  check(
    "Rol " + roles[i - 1] + " consulta panel",
    (await db.query("select * from v_scrap_turno")).rows.length === 1,
  );
}
await asRole(1);
await fail(
  "Operador no puede cambiar su rol",
  "update usuario set rol='administrador'",
);
await db.exec("reset role");
await db.exec(
  "update registro_produccion set cerrado_en=null where id_registro=1;update produccion_hora set piezas_inyectadas=10000 where id_registro=1;update detalle_scrap set cantidad=300 where id_produccion_hora=1",
);
// Boundary tests isolated by machine, avoiding dilution from other reference.
await db.exec(
  "insert into maquina(nombre)values('Umbral');update registro_produccion set id_maquina=2 where id_registro=1",
);
check(
  "3% exacto no alerta",
  (await db.query("select alerta_activa from v_scrap_turno where id_maquina=2"))
    .rows[0].alerta_activa === false,
);
await db.exec(
  "update produccion_hora set piezas_inyectadas=9999 where id_registro=1",
);
const boundary = (
  await db.query("select * from v_scrap_turno where id_maquina=2")
).rows[0];
check(
  "3.0003% alerta aunque se muestre 3.00",
  boundary.alerta_activa && Number(boundary.pct_scrap) === 3,
);
await db.exec("delete from detalle_scrap where id_produccion_hora=1");
check(
  "Eliminar detalle actualiza alerta",
  (await db.query("select alerta_activa from v_scrap_turno where id_maquina=2"))
    .rows[0].alerta_activa === false,
);
await asRole(2);
await fail(
  "Supervisor no abre otro turno",
  "select abrir_produccion('2026-10-07',1,2,1,1,1)",
);
await asRole(5);
const opened = (
  await db.query("select abrir_produccion('2026-10-06',1,1,1,1,1) id")
).rows[0].id;
await db.exec(`select guardar_produccion(${opened},8,100)`);
check(
  "Produccion sin scrap = 0%",
  Number(
    (
      await db.query(
        "select pct_scrap from v_scrap_turno where fecha='2026-10-06'",
      )
    ).rows[0].pct_scrap,
  ) === 0,
);
await db.exec(`select guardar_produccion(${opened},8,100)`);
check(
  "Repetir produccion no duplica total",
  Number(
    (
      await db.query(
        "select piezas_inyectadas from v_scrap_turno where fecha='2026-10-06'",
      )
    ).rows[0].piezas_inyectadas,
  ) === 100,
);
await fail(
  "Administrador no se desactiva a si mismo",
  "select administrar_perfil('administrador@example.invalid','Admin','administrador',null,false)",
);
await fail(
  "Supervisor requiere turno",
  "select administrar_perfil('nuevo@example.invalid','Nuevo','supervisor',null,true)",
);
await db.exec(
  "select administrar_perfil('nuevo@example.invalid','Nuevo','operador',null,true)",
);
await asRole(1);
await fail(
  "Operador no administra perfiles",
  "select administrar_perfil('otro@example.invalid','Otro','administrador',null,true)",
);
const capturaNocturna = (uuid) =>
  `select guardar_captura('2026-10-04',1,2,1,1,1,1,7,1,5,'','${uuid}')`;
await fail(
  "Operador con turno asignado no captura otro turno",
  capturaNocturna("55555555-5555-4555-8555-555555555555"),
);
check(
  "Captura rechazada por turno no deja encabezado",
  (await db.query("select * from registro_produccion where fecha='2026-10-04'"))
    .rows.length === 0,
);
await db.exec("reset role");
await db.exec("update usuario set id_turno=null where correo='operador@example.invalid'");
await asRole(1);
await db.exec(capturaNocturna("66666666-6666-4666-8666-666666666666"));
check(
  "Operador sin turno asignado puede capturar cualquier turno",
  (await db.query("select * from registro_produccion where fecha='2026-10-04' and id_turno=2"))
    .rows.length === 1,
);
await db.exec("reset role");
await db.exec("update usuario set id_turno=1 where correo='operador@example.invalid'");
await asRole(1);
await fail(
  "Lote resina incompatible no deja encabezado",
  "select guardar_captura('2026-10-05',1,1,1,1,1,999,7,1,2,'','44444444-4444-4444-8444-444444444444')",
);
check(
  "Transaccion invalida sin encabezado parcial",
  (await db.query("select * from registro_produccion where fecha='2026-10-05'"))
    .rows.length === 0,
);
await db.exec("reset role");
await db.exec("set role anon");
await fail("Anonimo sin acceso al panel", "select * from v_scrap_turno");
await fail("Anonimo sin acceso a perfiles", "select * from usuario");
await db.exec("reset role");
await asRole(5);
await db.exec("select administrar_perfil('pendiente@example.invalid','Pendiente','operador',1,true)");
await asRole(1);
await fail("Operador no retira invitaciones", "select retirar_invitacion('pendiente@example.invalid')");
await asRole(5);
await fail("No retira cuenta vinculada propia", "select retirar_invitacion('administrador@example.invalid')");
await fail("No retira cuenta vinculada ajena", "select retirar_invitacion('operador@example.invalid')");
await fail("Invitacion inexistente informa error", "select retirar_invitacion('ausente@example.invalid')");
await db.exec("select retirar_invitacion(' PENDIENTE@example.invalid ')");
await db.exec("select retirar_invitacion('pendiente@example.invalid')");
const retirada = (await db.query("select activo,invitacion_retirada_en from usuario where correo='pendiente@example.invalid'")).rows[0];
check("Retirada reversible e idempotente desactiva y archiva", !retirada.activo && !!retirada.invitacion_retirada_en);
await db.exec("reset role");
await db.exec("insert into auth.users values('00000000-0000-4000-8000-000000000006','pendiente@example.invalid',now())");
await asRole(6);
await db.exec("select vincular_mi_perfil()");
check("Invitado retirado no obtiene acceso al confirmar correo", (await db.query("select privado.rol_actual() rol")).rows[0].rol === null);
await asRole(5);
await db.exec("select administrar_perfil('pendiente@example.invalid','Restaurado','operador',1,true)");
check("Guardar perfil restaura invitacion sin duplicar", (await db.query("select count(*) n from usuario where correo='pendiente@example.invalid' and activo and invitacion_retirada_en is null")).rows[0].n === 1);
await asRole(6);
await db.exec("select vincular_mi_perfil()");
check("Invitacion restaurada vuelve a permitir vinculacion", (await db.query("select privado.rol_actual() rol")).rows[0].rol === 'operador');
await db.exec("reset role; set role anon");
await fail("Anonimo no retira invitaciones", "select retirar_invitacion('pendiente@example.invalid')");
await db.exec("reset role");
// Migrar datos historicos despues de probar el contrato anterior.
const antes = (await db.query('select count(*) n,sum(cantidad) total from detalle_scrap')).rows[0];
const moldesSql = await fs.readFile(root + '/supabase/migrations/202610140001_moldes_trs.sql', 'utf8');
await db.exec(moldesSql);
const catalogosAntes = (await db.query('select count(*) n from maquina_molde')).rows[0].n;
await db.exec(moldesSql);
check('Migracion de moldes repetible sin duplicados', (await db.query('select count(*) n from maquina_molde')).rows[0].n === catalogosAntes);
check('Conserva cantidades y detalles historicos', JSON.stringify(antes) === JSON.stringify((await db.query('select count(*) n,sum(cantidad) total from detalle_scrap')).rows[0]));
check('Nombre historico pasa al molde canonico', (await db.query('select m.codigo_molde from registro_produccion r join molde m using(id_molde) where id_registro=1')).rows[0].codigo_molde === 'Referencia 53');
check('Los 12 moldes de la foto estan relacionados', Number((await db.query("select count(*) n from maquina_molde mm join molde m using(id_molde) where m.codigo_molde not in ('Referencia 53','Referencia 54','PRUEBA')")).rows[0].n) === 12);
const par = (await db.query("select id_maquina,id_molde from maquina_molde join molde using(id_molde) where codigo_molde='GUIDE'")).rows[0];
const otro = (await db.query("select id_molde from molde where codigo_molde='BUTTON'")).rows[0].id_molde;
const capMolde = (uuid, qty=14, molde=par.id_molde, turno=1) => `select guardar_captura_molde('2026-10-08',${par.id_maquina},${turno},1,${molde},1,7,1,${qty},'','${uuid}') id`;
await asRole(1);
await fail('Formulario antiguo informa actualizar', first);
await fail('RPC nueva exige molde de la maquina', capMolde('77777777-7777-4777-8777-777777777777',14,otro));
await fail('RPC nueva conserva restriccion de turno', capMolde('77777777-7777-4777-8777-777777777777',14,par.id_molde,2));
await fail('RPC nueva rechaza cantidad negativa', capMolde('77777777-7777-4777-8777-777777777777',-1));
const nuevoId = (await db.query(capMolde('77777777-7777-4777-8777-777777777777'))).rows[0].id;
await db.exec(capMolde('77777777-7777-4777-8777-777777777777'));
check('Captura por molde sin pieza e idempotente', Number((await db.query(`select count(*) n from detalle_scrap d join produccion_hora h using(id_produccion_hora) where h.id_registro=${nuevoId}`)).rows[0].n) === 1 && (await db.query(`select id_pieza from registro_produccion where id_registro=${nuevoId}`)).rows[0].id_pieza === null);
check('Operador puede ver panel y alertas TRS', (await db.query('select * from v_panel_turno')).rows.length > 0 && (await db.query('select * from v_alertas_activas')).rows.length >= 0);
await fail('Operador no abre produccion nueva', `select abrir_produccion_molde('2026-10-08',${par.id_maquina},1,1,${par.id_molde})`);
await asRole(5);
check('Apertura reutiliza mismo grupo molde', (await db.query(`select abrir_produccion_molde('2026-10-08',${par.id_maquina},1,1,${par.id_molde}) id`)).rows[0].id === nuevoId);
await db.exec(`select guardar_produccion(${nuevoId},7,100)`);
check('TRS pendiente hasta cierre', (await db.query(`select pct_trs from v_panel_turno where id_maquina=${par.id_maquina}`)).rows[0].pct_trs === null);
await db.exec(`select cerrar_registro(${nuevoId},100,1,86)`);
const exacto = (await db.query(`select * from v_panel_turno where id_maquina=${par.id_maquina}`)).rows[0];
check('TRS exactamente 86 cumple', Number(exacto.pct_trs) === 86 && !exacto.alerta_trs);
await asRole(1);
await fail('Nuevo contrato respeta cierre', capMolde('88888888-8888-4888-8888-888888888888'));
await db.exec('reset role');
await db.exec(`update registro_produccion set objetivo_hora=10000.01 where id_registro=${nuevoId}; update produccion_hora set piezas_inyectadas=8614 where id_registro=${nuevoId}`);
const bajo = (await db.query(`select * from v_panel_turno where id_maquina=${par.id_maquina}`)).rows[0];
check('TRS 85.999914 alerta aunque redondee a 86', bajo.alerta_trs && Number(bajo.pct_trs) === 86);
check('Vista de alertas incluye TRS', (await db.query(`select mensaje from v_alertas_activas where id_maquina=${par.id_maquina}`)).rows[0].mensaje.includes('TRS'));
// Otro lote en el mismo turno comprueba suma ponderada y estado incompleto.
await db.exec("insert into lote_materia_prima(codigo_lote,id_resina) values('SEGUNDO',1)");
await db.exec(`update registro_produccion set objetivo_hora=100 where id_registro=${nuevoId}; update produccion_hora set piezas_inyectadas=100 where id_registro=${nuevoId}`);
await asRole(5);
const id2 = (await db.query(`select abrir_produccion_molde('2026-10-08',${par.id_maquina},1,2,${par.id_molde}) id`)).rows[0].id;
check('Registro abierto sin horas mantiene TRS pendiente del grupo', (await db.query(`select pct_trs from v_panel_turno where id_maquina=${par.id_maquina}`)).rows[0].pct_trs === null);
await db.exec(`select guardar_produccion(${id2},8,300); select guardar_produccion(${id2},9,300); select cerrar_registro(${id2},300,3,600)`);
const ponderado = (await db.query(`select * from v_panel_turno where id_maquina=${par.id_maquina}`)).rows[0];
check('TRS ponderado 686/1000, objetivo no se duplica por horas', Number(ponderado.pct_trs) === 68.60 && Number(ponderado.piezas_objetivo) === 1000);
await db.exec('reset role');
await db.exec(`insert into registro_produccion(fecha,id_maquina,id_turno,id_molde,id_lote) select fecha,id_maquina,id_turno,id_molde,id_lote from registro_produccion where id_registro=${nuevoId}`);
await asRole(1);
await fail('Grupos historicos duplicados no reciben capturas ambiguas', capMolde('99999999-9999-4999-8999-999999999999'));
await fail('Operador no escribe catalogos', `insert into maquina_molde values(1,${otro})`);
await db.exec('reset role; set role anon');
await fail('Anonimo no lee nuevas relaciones', 'select * from maquina_molde');
await fail('Anonimo no lee nuevo panel', 'select * from v_panel_turno');
await fail('Anonimo no llama nueva captura', capMolde('99999999-9999-4999-8999-999999999999'));
await db.exec('reset role');
const alertasSql = await fs.readFile(root + '/supabase/migrations/202610140002_demo_alertas.sql','utf8');
await db.exec(alertasSql);
const baseline = (await db.query('select count(*) n from alerta_historial')).rows[0].n;
await db.exec(alertasSql);
check('Historial repetible sin duplicar línea de base', (await db.query('select count(*) n from alerta_historial')).rows[0].n === baseline);
const realesAntes = (await db.query('select r.* from registro_produccion r join maquina m using(id_maquina) where not m.es_demo order by id_registro')).rows;
const demoSql = await fs.readFile(root + '/supabase/demo/20261014_demostracion.sql','utf8');
await db.exec(demoSql);
await db.exec(demoSql);
const demo = (await db.query('select p.* from v_panel_turno p join maquina m using(id_maquina) where m.es_demo')).rows;
check('DEMO repetible: 30 grupos y 30000 piezas', demo.length === 30 && demo.reduce((a,r)=>a+Number(r.piezas_inyectadas),0) === 30000);
check('DEMO suma 1365 piezas rechazadas', demo.reduce((a,r)=>a+Number(r.piezas_scrap),0) === 1365);
check('DEMO incluye cero scrap válido', demo.some(r=>Number(r.pct_scrap)===0 && !r.alerta_activa));
check('DEMO exactamente 3% no alerta', demo.filter(r=>Number(r.pct_scrap)===3).every(r=>!r.alerta_activa));
check('DEMO exactamente 86% cumple TRS', demo.filter(r=>Number(r.pct_trs)===86).length===3 && demo.filter(r=>Number(r.pct_trs)===86).every(r=>!r.alerta_trs));
check('DEMO alerta TRS menor a 86', demo.some(r=>r.alerta_trs));
check('No modifica ningún encabezado real', JSON.stringify(realesAntes) === JSON.stringify((await db.query('select r.* from registro_produccion r join maquina m using(id_maquina) where not m.es_demo order by id_registro')).rows));
for(let i=1;i<=5;i++) { await asRole(i); check(`Rol ${roles[i-1]} lee historial`, (await db.query('select count(*) n from alerta_historial')).rows[0].n>0); await fail(`Rol ${roles[i-1]} no falsifica historial`,"insert into alerta_historial(fecha,id_maquina,id_turno,tipo,estado) values('2026-10-14',1,1,'scrap','activa')"); }
await db.exec('reset role; set role anon');
await fail('Anónimo no consulta historial','select * from alerta_historial');
await db.exec('reset role');
// Recorrido de captura -> alerta -> producción corregida -> cierre bajo meta -> bloqueo.
const dr=(await db.query("select r.* from registro_produccion r join maquina m using(id_maquina) where m.es_demo order by r.id_registro limit 1")).rows[0];
await asRole(1);
const dc=`select guardar_captura_molde('2026-10-03',${dr.id_maquina},1,${dr.id_lote},${dr.id_molde},1,7,1,40,'DEMO','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') id`;
const flow=(await db.query(dc)).rows[0].id;
await asRole(2); await db.exec(`select guardar_produccion(${flow},7,1000)`);
let eventos=(await db.query("select * from alerta_historial where fecha='2026-10-03' order by id_alerta")).rows;
check('Captura sin producción no inventa alerta; al completar 4% sí',eventos.length===1 && eventos[0].estado==='activa' && Number(eventos[0].porcentaje)===4);
await db.exec(`select guardar_produccion(${flow},7,1000)`);
check('Reintento idéntico no duplica historial',(await db.query("select count(*) n from alerta_historial where fecha='2026-10-03'")).rows[0].n===1);
await db.exec(`select guardar_produccion(${flow},7,2000)`);
eventos=(await db.query("select * from alerta_historial where fecha='2026-10-03' order by id_alerta")).rows;
check('Historial conserva activación y resolución',eventos.length===2 && eventos[1].estado==='resuelta' && Number(eventos[1].porcentaje)===2);
await db.exec(`select cerrar_registro(${flow},2500,1,1960)`);
check('Cierre genera evento TRS bajo meta',(await db.query("select * from alerta_historial where fecha='2026-10-03' and tipo='trs'")).rows[0].estado==='activa');
await fail('Producción cerrada no se modifica',`select guardar_produccion(${flow},7,2500)`);
await asRole(1);
await fail('Máquina DEMO no admite lote real', `select guardar_captura_molde('2026-10-02',${dr.id_maquina},1,1,${dr.id_molde},1,7,1,10,'','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb')`);
await db.exec('reset role');
await db.exec("update usuario set activo=false where correo='calidad@example.invalid'");
await asRole(4);
check('Cuenta inactiva no ve historial',(await db.query('select * from alerta_historial')).rows.length===0);
await db.exec('reset role');
console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
await db.close();
