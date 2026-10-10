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
await db.exec(
  await fs.readFile(
    root + "/supabase/migrations/202610080002_activar_rls.sql",
    "utf8",
  ),
);
const tests = [];
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
console.log(JSON.stringify({ passed: tests.length, tests }, null, 2));
await db.close();
