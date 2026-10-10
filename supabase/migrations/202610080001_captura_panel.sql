-- SIC SCRAP: incremento validado contra el esquema de 13 tablas.
-- No borra registros, no carga datos de las fotografias, no abre permisos anonimos.
-- Aplicar primero en pruebas. La activacion de RLS se entrega por separado.
begin;
create schema if not exists privado;
revoke all on schema privado from public;
grant usage on schema privado to authenticated;
alter table public.usuario add column if not exists auth_user_id uuid unique references auth.users(id);
alter table public.usuario add column if not exists id_turno integer references public.turno(id_turno);
alter table public.detalle_scrap add column if not exists solicitud_id uuid unique;
alter table public.detalle_scrap add column if not exists creado_por uuid references auth.users(id);
alter table public.detalle_scrap add column if not exists creado_en timestamptz default now();
alter table public.registro_produccion add column if not exists objetivo_hora numeric(12,2);
alter table public.registro_produccion add column if not exists horas_programadas numeric(5,2);
alter table public.registro_produccion add column if not exists cerrado_en timestamptz;
alter table public.registro_produccion add column if not exists cerrado_por uuid references auth.users(id);
create index if not exists rp_turno_fecha_idx on public.registro_produccion(fecha,id_maquina,id_turno);
create index if not exists ph_registro_hora_idx on public.produccion_hora(id_registro,numero_hora);
create index if not exists ds_hora_idx on public.detalle_scrap(id_produccion_hora);

create or replace function privado.rol_actual() returns text language sql stable security definer set search_path='' as $$
 select lower(translate(rol,'óÓ','oO')) from public.usuario where auth_user_id=auth.uid() and activo is true
$$;
create or replace function privado.turno_actual() returns integer language sql stable security definer set search_path='' as $$
 select id_turno from public.usuario where auth_user_id=auth.uid() and activo is true
$$;
revoke all on function privado.rol_actual(), privado.turno_actual() from public;
grant execute on function privado.rol_actual(), privado.turno_actual() to authenticated;

-- Cada detalle se cuenta una vez. Los registros antiguos incompletos son visibles
-- como pendientes y no se convierten artificialmente en un 0% saludable.
create or replace view public.v_produccion_hora with (security_invoker=true) as
select ph.id_produccion_hora,ph.id_registro,ph.numero_hora,ph.piezas_inyectadas,
 coalesce(d.scrap,0)::bigint piezas_scrap,
 (ph.piezas_inyectadas-coalesce(d.scrap,0))::bigint piezas_ok,
 rp.fecha,rp.id_maquina,rp.id_turno,rp.id_pieza,rp.id_lote,rp.cerrado_en
from public.produccion_hora ph join public.registro_produccion rp using(id_registro)
left join (select id_produccion_hora,sum(cantidad) scrap from public.detalle_scrap group by id_produccion_hora)d using(id_produccion_hora);
create or replace view public.v_scrap_turno with (security_invoker=true) as
select h.fecha,h.id_maquina,m.nombre maquina,h.id_turno,t.nombre turno,
 sum(h.piezas_inyectadas)::bigint piezas_inyectadas,sum(h.piezas_scrap)::bigint piezas_scrap,
 sum(h.piezas_ok)::bigint piezas_ok,
 count(*) filter(where h.piezas_scrap>h.piezas_inyectadas)::integer horas_incompletas,
 case when sum(h.piezas_inyectadas)>0 and bool_and(h.piezas_scrap<=h.piezas_inyectadas)
 then round(100.0*sum(h.piezas_scrap)/sum(h.piezas_inyectadas),2) end pct_scrap,
 case when sum(h.piezas_inyectadas)>0 and bool_and(h.piezas_scrap<=h.piezas_inyectadas)
 then 100*sum(h.piezas_scrap)>3*sum(h.piezas_inyectadas) else false end alerta_activa
from public.v_produccion_hora h join public.maquina m using(id_maquina) join public.turno t using(id_turno)
group by h.fecha,h.id_maquina,m.nombre,h.id_turno,t.nombre;
create or replace view public.v_scrap_turno_pieza with (security_invoker=true) as
select h.fecha,h.id_maquina,h.id_turno,h.id_pieza,p.nombre pieza,
 sum(h.piezas_inyectadas)::bigint piezas_inyectadas,sum(h.piezas_scrap)::bigint piezas_scrap,
 sum(h.piezas_ok)::bigint piezas_ok,
 case when sum(h.piezas_inyectadas)>0 and bool_and(h.piezas_scrap<=h.piezas_inyectadas)
 then round(100.0*sum(h.piezas_scrap)/sum(h.piezas_inyectadas),2) end pct_scrap
from public.v_produccion_hora h join public.pieza p using(id_pieza)
group by h.fecha,h.id_maquina,h.id_turno,h.id_pieza,p.nombre;
-- Estado actual derivado: no deja alertas obsoletas al editar/borrar o cambiar de grupo.
-- No representa un historial de notificaciones.
create or replace view public.v_alertas_activas with (security_invoker=true) as
select *, 'ALERTA: SCRAP SUPERIOR AL 3%'::text mensaje from public.v_scrap_turno where alerta_activa;

create or replace function public.guardar_captura(
 p_fecha date,p_maquina integer,p_turno integer,p_pieza integer,p_lote integer,p_molde integer,
 p_resina integer,p_hora integer,p_causa integer,p_cantidad integer,p_observaciones text,p_solicitud uuid
) returns integer language plpgsql security definer set search_path='' as $$
declare v_reg integer; v_hora integer; v_existente integer; v_rol text;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is distinct from 'operador' then raise exception 'Solo el operador puede registrar scrap'; end if;
 if p_fecha is null or p_fecha>(now() at time zone 'America/Mexico_City')::date or p_hora is null or p_hora not between 0 and 23 or p_cantidad is null or p_cantidad<=0 or p_solicitud is null then raise exception 'Fecha, hora o cantidad invalida'; end if;
 if length(coalesce(p_observaciones,''))>250 then raise exception 'Observaciones: maximo 250 caracteres'; end if;
 if not exists(select 1 from public.lote_materia_prima where id_lote=p_lote and id_resina=p_resina) then raise exception 'El lote no corresponde a la resina'; end if;
 if not exists(select 1 from public.maquina where id_maquina=p_maquina) or not exists(select 1 from public.turno where id_turno=p_turno) or not exists(select 1 from public.pieza where id_pieza=p_pieza) or not exists(select 1 from public.molde where id_molde=p_molde) or not exists(select 1 from public.causa_scrap where id_causa=p_causa) then raise exception 'Selecciona catalogos validos'; end if;
 -- Serializa reintentos y capturas concurrentes antes de leer/crear encabezados.
 perform pg_advisory_xact_lock(73001,1);
 select ph.id_registro into v_existente from public.detalle_scrap d join public.produccion_hora ph using(id_produccion_hora) where d.solicitud_id=p_solicitud and d.creado_por=auth.uid();
 if found then return v_existente; end if;
 select id_registro into v_reg from public.registro_produccion where fecha=p_fecha and id_maquina=p_maquina and id_turno=p_turno and id_pieza=p_pieza and id_lote=p_lote order by id_registro limit 1;
 if v_reg is null then
  insert into public.registro_produccion(fecha,id_maquina,id_turno,id_pieza,id_lote) values(p_fecha,p_maquina,p_turno,p_pieza,p_lote) returning id_registro into v_reg;
 end if;
 if exists(select 1 from public.registro_produccion where id_registro=v_reg and cerrado_en is not null) then raise exception 'Este registro de turno ya esta cerrado'; end if;
 if not exists(select 1 from public.uso_molde where id_registro=v_reg and id_molde=p_molde) then insert into public.uso_molde(id_registro,id_molde) values(v_reg,p_molde); end if;
 select id_produccion_hora into v_hora from public.produccion_hora where id_registro=v_reg and numero_hora=p_hora order by id_produccion_hora limit 1;
 if v_hora is null then insert into public.produccion_hora(id_registro,numero_hora,piezas_inyectadas,piezas_scrap) values(v_reg,p_hora,0,0) returning id_produccion_hora into v_hora; end if;
 insert into public.detalle_scrap(id_produccion_hora,id_causa,cantidad,observaciones,solicitud_id,creado_por) values(v_hora,p_causa,p_cantidad,nullif(p_observaciones,''),p_solicitud,auth.uid());
 update public.produccion_hora set piezas_scrap=(select coalesce(sum(cantidad),0) from public.detalle_scrap where id_produccion_hora=v_hora) where id_produccion_hora=v_hora;
 return v_reg;
end $$;

create or replace function public.guardar_produccion(p_registro integer,p_hora integer,p_inyectadas integer)
returns void language plpgsql security definer set search_path='' as $$
declare v_rol text; v_turno integer; v_hora integer; v_scrap bigint;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is null or v_rol not in ('supervisor','administrador') then raise exception 'Sin permiso para registrar produccion'; end if;
 if p_hora is null or p_hora not between 0 and 23 or p_inyectadas is null or p_inyectadas<0 then raise exception 'Produccion u hora invalida'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select id_turno into v_turno from public.registro_produccion where id_registro=p_registro and cerrado_en is null;
 if not found then raise exception 'Registro inexistente o cerrado'; end if;
 if v_rol='supervisor' and v_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes modificar tu turno asignado'; end if;
 select id_produccion_hora into v_hora from public.produccion_hora where id_registro=p_registro and numero_hora=p_hora order by id_produccion_hora limit 1;
 select coalesce(sum(cantidad),0) into v_scrap from public.detalle_scrap where id_produccion_hora=v_hora;
 if p_inyectadas<v_scrap then raise exception 'Las piezas inyectadas deben incluir las piezas scrap'; end if;
 if v_hora is null then insert into public.produccion_hora(id_registro,numero_hora,piezas_inyectadas,piezas_scrap) values(p_registro,p_hora,p_inyectadas,0);
 else update public.produccion_hora set piezas_inyectadas=p_inyectadas,piezas_scrap=v_scrap where id_produccion_hora=v_hora; end if;
end $$;

create or replace function public.cerrar_registro(p_registro integer,p_objetivo numeric,p_horas numeric,p_ok bigint)
returns void language plpgsql security definer set search_path='' as $$
declare v_turno integer; v_rol text; v_ok bigint;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is null or v_rol not in ('supervisor','administrador') then raise exception 'Sin permiso para cerrar turno'; end if;
 if p_objetivo is null or p_objetivo<=0 or p_horas is null or p_horas<=0 or p_horas>24 or p_ok is null then raise exception 'Objetivo, horas o piezas OK invalidos'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select id_turno into v_turno from public.registro_produccion where id_registro=p_registro and cerrado_en is null;
 if not found then raise exception 'Registro inexistente o ya cerrado'; end if;
 if v_rol='supervisor' and v_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes cerrar tu turno asignado'; end if;
 if not exists(select 1 from public.v_produccion_hora where id_registro=p_registro) or exists(select 1 from public.v_produccion_hora where id_registro=p_registro and piezas_scrap>piezas_inyectadas) then raise exception 'Completa primero la produccion por hora'; end if;
 select sum(piezas_ok) into v_ok from public.v_produccion_hora where id_registro=p_registro;
 if p_ok<>v_ok then raise exception 'Las piezas OK no coinciden con inyectadas menos scrap (%)',v_ok; end if;
 update public.registro_produccion set objetivo_hora=p_objetivo,horas_programadas=p_horas,cerrado_en=now(),cerrado_por=auth.uid() where id_registro=p_registro;
end $$;
revoke all on function public.guardar_captura(date,integer,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid),public.guardar_produccion(integer,integer,integer),public.cerrar_registro(integer,numeric,numeric,bigint) from public,anon;
grant execute on function public.guardar_captura(date,integer,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid),public.guardar_produccion(integer,integer,integer),public.cerrar_registro(integer,numeric,numeric,bigint) to authenticated;
grant select on public.v_produccion_hora,public.v_scrap_turno,public.v_scrap_turno_pieza,public.v_alertas_activas to authenticated;
revoke all on public.v_produccion_hora,public.v_scrap_turno,public.v_scrap_turno_pieza,public.v_alertas_activas from anon;

-- Un correo preasignado se vincula unicamente despues de verificar su identidad.
create or replace function public.vincular_mi_perfil() returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesion'; end if;
 update public.usuario u set auth_user_id=auth.uid()
 from auth.users a where a.id=auth.uid() and a.email_confirmed_at is not null
 and lower(u.correo)=lower(a.email) and u.auth_user_id is null and u.activo;
end $$;
revoke all on function public.vincular_mi_perfil() from public,anon;
grant execute on function public.vincular_mi_perfil() to authenticated;
-- El perfil no debe exponerse mientras se prepara la activacion completa.
drop policy if exists "Permitir lectura publica" on public.usuario;
drop policy if exists perfil_propio on public.usuario;
create policy perfil_propio on public.usuario for select to authenticated using(auth_user_id=auth.uid() or (select privado.rol_actual())='administrador');
revoke all on public.usuario from anon;
grant select on public.usuario to authenticated;


create or replace function public.abrir_produccion(p_fecha date,p_maquina integer,p_turno integer,p_pieza integer,p_lote integer,p_molde integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_reg integer; v_rol text;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is null or v_rol not in ('supervisor','administrador') then raise exception 'Sin permiso para abrir produccion'; end if;
 if v_rol='supervisor' and p_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes registrar tu turno asignado'; end if;
 if p_fecha is null or p_fecha>(now() at time zone 'America/Mexico_City')::date then raise exception 'Fecha invalida'; end if;
 if not exists(select 1 from public.maquina where id_maquina=p_maquina) or not exists(select 1 from public.turno where id_turno=p_turno) or not exists(select 1 from public.pieza where id_pieza=p_pieza) or not exists(select 1 from public.lote_materia_prima where id_lote=p_lote) or not exists(select 1 from public.molde where id_molde=p_molde) then raise exception 'Catalogos invalidos'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select id_registro into v_reg from public.registro_produccion where fecha=p_fecha and id_maquina=p_maquina and id_turno=p_turno and id_pieza=p_pieza and id_lote=p_lote order by id_registro limit 1;
 if v_reg is null then insert into public.registro_produccion(fecha,id_maquina,id_turno,id_pieza,id_lote) values(p_fecha,p_maquina,p_turno,p_pieza,p_lote) returning id_registro into v_reg; end if;
 if exists(select 1 from public.registro_produccion where id_registro=v_reg and cerrado_en is not null) then raise exception 'Registro ya cerrado'; end if;
 if not exists(select 1 from public.uso_molde where id_registro=v_reg and id_molde=p_molde) then insert into public.uso_molde(id_registro,id_molde)values(v_reg,p_molde); end if;
 return v_reg;
end $$;
revoke all on function public.abrir_produccion(date,integer,integer,integer,integer,integer) from public,anon;
grant execute on function public.abrir_produccion(date,integer,integer,integer,integer,integer) to authenticated;
create or replace function public.administrar_perfil(p_correo text,p_nombre text,p_rol text,p_turno integer,p_activo boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if privado.rol_actual() is distinct from 'administrador' then raise exception 'Solo el administrador puede gestionar perfiles'; end if;
 if p_correo is null or p_correo !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(p_correo)>254 or coalesce(length(trim(p_nombre)),0)=0 or length(p_nombre)>100 or p_rol is null or p_rol not in ('operador','supervisor','produccion','calidad','administrador') or p_activo is null then raise exception 'Perfil invalido'; end if;
 if p_rol='supervisor' and not exists(select 1 from public.turno where id_turno=p_turno) then raise exception 'Asigna un turno al supervisor'; end if;
 perform pg_advisory_xact_lock(73002,1);
 if exists(select 1 from public.usuario where lower(correo)=lower(trim(p_correo)) and auth_user_id=auth.uid()) and (p_rol<>'administrador' or not p_activo) then raise exception 'No puedes quitarte tu propio acceso administrador'; end if;
 insert into public.usuario(correo,nombre,rol,id_turno,activo) values(lower(trim(p_correo)),trim(p_nombre),p_rol,p_turno,p_activo)
 on conflict(correo) do update set nombre=excluded.nombre,rol=excluded.rol,id_turno=excluded.id_turno,activo=excluded.activo;
end $$;
revoke all on function public.administrar_perfil(text,text,text,integer,boolean) from public,anon;
grant execute on function public.administrar_perfil(text,text,text,integer,boolean) to authenticated;

commit;
