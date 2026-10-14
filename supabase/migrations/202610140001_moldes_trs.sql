-- Unidad oficial: piezas. Molde = numero/nombre de parte.
-- Historicos: Eduardo confirmo conservar Guide 83 / Guide 84 como moldes.
-- No se borran registros, piezas antiguas ni uso_molde: quedan como evidencia.
begin;
select pg_advisory_xact_lock(73001,1);
alter table public.registro_produccion add column if not exists id_molde integer references public.molde(id_molde);
alter table public.registro_produccion alter column id_pieza drop not null;
alter table public.molde add column if not exists disponible_captura boolean not null default true;
create table if not exists privado.pieza_molde_legacy (
 id_pieza integer primary key references public.pieza(id_pieza),
 id_molde integer not null references public.molde(id_molde)
);
revoke all on privado.pieza_molde_legacy from public,anon,authenticated;
alter table privado.pieza_molde_legacy enable row level security;

-- Los ID originales fueron insertados manualmente; sincronizar las secuencias.
select setval(pg_get_serial_sequence('public.molde','id_molde'),greatest(coalesce((select max(id_molde) from public.molde),0)+1,1),false);
select setval(pg_get_serial_sequence('public.maquina','id_maquina'),greatest(coalesce((select max(id_maquina) from public.maquina),0)+1,1),false);
do $$ declare p record; v_id integer; begin
 for p in select * from public.pieza order by id_pieza loop
  if not exists(select 1 from privado.pieza_molde_legacy where id_pieza=p.id_pieza) then
   select id_molde into v_id from public.molde where lower(trim(codigo_molde))=lower(trim(p.nombre)) order by id_molde limit 1;
   if v_id is null then insert into public.molde(codigo_molde) values(p.nombre) returning id_molde into v_id; end if;
   insert into privado.pieza_molde_legacy values(p.id_pieza,v_id);
  end if;
 end loop;
end $$;
update public.registro_produccion r set id_molde=p.id_molde
from privado.pieza_molde_legacy p where r.id_pieza=p.id_pieza and r.id_molde is null;
-- Solo el caso sin referencia antigua y un unico molde permite inferencia segura.
update public.registro_produccion r set id_molde=u.id_molde
from (select id_registro,min(id_molde) id_molde from public.uso_molde group by id_registro having count(distinct id_molde)=1) u
where r.id_registro=u.id_registro and r.id_molde is null;
do $$ begin
 if exists(select 1 from public.registro_produccion where id_molde is null) then
  raise exception 'Hay registros sin correspondencia de molde. Revisar antes de migrar.';
 end if;
end $$;
alter table public.registro_produccion alter column id_molde set not null;
comment on column public.registro_produccion.id_pieza is 'Referencia historica; las nuevas capturas usan exclusivamente id_molde.';
comment on table public.pieza is 'Catalogo historico retirado de la aplicacion. No usar para nuevas capturas.';
update public.molde m set disponible_captura=false where codigo_molde ~ '^MO-[0-9]+$'
and not exists(select 1 from public.registro_produccion r where r.id_molde=m.id_molde);
create index if not exists registro_grupo_molde_idx on public.registro_produccion(fecha,id_maquina,id_turno,id_molde,id_lote);

-- Catalogo de la fotografia. Cada fila se conserva como una referencia completa.
create table if not exists public.maquina_molde (
 id_maquina integer not null references public.maquina(id_maquina),
 id_molde integer not null references public.molde(id_molde),
 primary key(id_maquina,id_molde)
);
alter table public.maquina_molde enable row level security;
revoke all on public.maquina_molde from public,anon,authenticated;
grant select on public.maquina_molde to authenticated;
drop policy if exists lectura_equipo on public.maquina_molde;
create policy lectura_equipo on public.maquina_molde for select to authenticated
using((select privado.rol_actual()) in ('operador','supervisor','produccion','calidad','administrador'));
-- Corregir la grafia del mismo equipo sin cambiar su ID ni duplicarlo.
update public.maquina set nombre='HAITIAN 230 TON'
where upper(replace(nombre,' ',''))='HAITAN230TON'
and not exists(select 1 from public.maquina where upper(trim(nombre))='HAITIAN 230 TON');
do $$ declare r record; v_maquina integer; v_molde integer; begin
 for r in select * from (values
 ('BORCHE 90 TON','CLIPS Y DIVISOR QUESERA'),
 ('NISSEI 110 TON','HALTER, PLA, STF, HL, Q (CUADRADO)'),
 ('NISSEI 110 TON','GAP'),
 ('KRAUSS MAFFEI 150 TON','ORGANIGORRA'),
 ('NISSEI 180 TON','TRAEGER'),
 ('NISSEI 180 TON','DECKEL ASOE'),
 ('NISSEI 180 TON (NVA)','HALTER PLA, STF, VL, QS'),
 ('NISSEI 220 TON','BUTTON'),
 ('NISSEI 220 TON','BASE CANASTA FLEX'),
 ('HAITIAN 230 TON','DEFROSTING'),
 ('HAITIAN 230 TON','DECKEL SRA. SLINE'),
 ('KRAUSS MAFFEI 360 TON','GUIDE')
 ) as fuente(maquina,molde) loop
  select id_maquina into v_maquina from public.maquina where upper(trim(nombre))=r.maquina order by id_maquina limit 1;
  if v_maquina is null then insert into public.maquina(nombre) values(r.maquina) returning id_maquina into v_maquina; end if;
  select id_molde into v_molde from public.molde where upper(trim(codigo_molde))=r.molde order by id_molde limit 1;
  if v_molde is null then insert into public.molde(codigo_molde) values(r.molde) returning id_molde into v_molde; end if;
  insert into public.maquina_molde values(v_maquina,v_molde) on conflict do nothing;
 end loop;
end $$;
-- Conservar tambien las combinaciones que realmente se usaron antes.
insert into public.maquina_molde select distinct id_maquina,id_molde from public.registro_produccion
where id_maquina is not null on conflict do nothing;

-- Compartido por las dos RPC; no es invocable desde el cliente.
create or replace function privado.registro_molde(p_fecha date,p_maquina integer,p_turno integer,p_lote integer,p_molde integer)
returns integer language plpgsql set search_path='' as $$
declare v_reg integer; v_cantidad integer;
begin
 if p_fecha is null or p_fecha>(now() at time zone 'America/Mexico_City')::date then raise exception 'Fecha invalida'; end if;
 if not exists(select 1 from public.maquina where id_maquina=p_maquina)
 or not exists(select 1 from public.turno where id_turno=p_turno)
 or not exists(select 1 from public.lote_materia_prima where id_lote=p_lote)
 or not exists(select 1 from public.molde where id_molde=p_molde and disponible_captura) then raise exception 'Selecciona catalogos validos'; end if;
 if exists(select 1 from public.maquina_molde where id_maquina=p_maquina)
 and not exists(select 1 from public.maquina_molde where id_maquina=p_maquina and id_molde=p_molde) then raise exception 'El molde no corresponde a la maquina seleccionada'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select min(id_registro),count(*) into v_reg,v_cantidad from public.registro_produccion
 where fecha=p_fecha and id_maquina=p_maquina and id_turno=p_turno and id_molde=p_molde and id_lote=p_lote;
 if v_cantidad>1 then raise exception 'Hay registros historicos duplicados para este grupo. Solicita su revision antes de agregar capturas.'; end if;
 if v_reg is null then
  insert into public.registro_produccion(fecha,id_maquina,id_turno,id_molde,id_lote) values(p_fecha,p_maquina,p_turno,p_molde,p_lote) returning id_registro into v_reg;
  insert into public.uso_molde(id_registro,id_molde) values(v_reg,p_molde);
 end if;
 if exists(select 1 from public.registro_produccion where id_registro=v_reg and cerrado_en is not null) then raise exception 'Este registro de turno ya esta cerrado'; end if;
 return v_reg;
end $$;
revoke all on function privado.registro_molde(date,integer,integer,integer,integer) from public,anon,authenticated;

create or replace function public.abrir_produccion_molde(p_fecha date,p_maquina integer,p_turno integer,p_lote integer,p_molde integer)
returns integer language plpgsql security definer set search_path='' as $$
declare v_rol text;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is null or v_rol not in ('supervisor','administrador') then raise exception 'Sin permiso para abrir produccion'; end if;
 if v_rol='supervisor' and p_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes registrar tu turno asignado'; end if;
 return privado.registro_molde(p_fecha,p_maquina,p_turno,p_lote,p_molde);
end $$;
create or replace function public.guardar_captura_molde(
 p_fecha date,p_maquina integer,p_turno integer,p_lote integer,p_molde integer,
 p_resina integer,p_hora integer,p_causa integer,p_cantidad integer,p_observaciones text,p_solicitud uuid
) returns integer language plpgsql security definer set search_path='' as $$
declare v_reg integer; v_hora integer; v_existente integer;
begin
 if auth.uid() is null or privado.rol_actual() is distinct from 'operador' then raise exception 'Solo el operador puede registrar scrap'; end if;
 if privado.turno_actual() is not null and p_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes registrar scrap de tu turno asignado'; end if;
 if p_hora is null or p_hora not between 0 and 23 or p_cantidad is null or p_cantidad<=0 or p_solicitud is null then raise exception 'Hora o cantidad invalida'; end if;
 if length(coalesce(p_observaciones,''))>250 then raise exception 'Observaciones: maximo 250 caracteres'; end if;
 if not exists(select 1 from public.lote_materia_prima where id_lote=p_lote and id_resina=p_resina) then raise exception 'El lote no corresponde a la resina'; end if;
 if not exists(select 1 from public.causa_scrap where id_causa=p_causa) then raise exception 'Selecciona una causa valida'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select ph.id_registro into v_existente from public.detalle_scrap d join public.produccion_hora ph using(id_produccion_hora) where d.solicitud_id=p_solicitud and d.creado_por=auth.uid();
 if found then return v_existente; end if;
 v_reg:=privado.registro_molde(p_fecha,p_maquina,p_turno,p_lote,p_molde);
 select id_produccion_hora into v_hora from public.produccion_hora where id_registro=v_reg and numero_hora=p_hora order by id_produccion_hora limit 1;
 if v_hora is null then insert into public.produccion_hora(id_registro,numero_hora,piezas_inyectadas,piezas_scrap) values(v_reg,p_hora,0,0) returning id_produccion_hora into v_hora; end if;
 insert into public.detalle_scrap(id_produccion_hora,id_causa,cantidad,observaciones,solicitud_id,creado_por) values(v_hora,p_causa,p_cantidad,nullif(p_observaciones,''),p_solicitud,auth.uid());
 update public.produccion_hora set piezas_scrap=(select coalesce(sum(cantidad),0) from public.detalle_scrap where id_produccion_hora=v_hora) where id_produccion_hora=v_hora;
 return v_reg;
end $$;
revoke all on function public.abrir_produccion_molde(date,integer,integer,integer,integer),public.guardar_captura_molde(date,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid) from public,anon;
grant execute on function public.abrir_produccion_molde(date,integer,integer,integer,integer),public.guardar_captura_molde(date,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid) to authenticated;
-- Los formularios viejos deben actualizarse: no seguir creando dos identidades.
create or replace function public.abrir_produccion(p_fecha date,p_maquina integer,p_turno integer,p_pieza integer,p_lote integer,p_molde integer)
returns integer language plpgsql security definer set search_path='' as $$ begin raise exception 'Actualiza la pagina: ahora la produccion se registra solo por molde.'; end $$;
create or replace function public.guardar_captura(p_fecha date,p_maquina integer,p_turno integer,p_pieza integer,p_lote integer,p_molde integer,p_resina integer,p_hora integer,p_causa integer,p_cantidad integer,p_observaciones text,p_solicitud uuid)
returns integer language plpgsql security definer set search_path='' as $$ begin raise exception 'Actualiza la pagina: ahora el scrap se registra solo por molde.'; end $$;

-- Una fila por registro evita multiplicar el objetivo por cada hora o causa.
create or replace view public.v_trs_registro with(security_invoker=true) as
select r.id_registro,r.fecha,r.id_maquina,r.id_turno,r.id_molde,r.id_lote,r.cerrado_en,
 r.objetivo_hora*r.horas_programadas piezas_objetivo,
 coalesce(h.inyectadas,0)::bigint piezas_inyectadas,coalesce(h.scrap,0)::bigint piezas_scrap,
 coalesce(h.ok,0)::bigint piezas_ok,coalesce(h.completo,false) produccion_completa,
 (r.cerrado_en is not null and r.objetivo_hora>0 and r.horas_programadas>0 and coalesce(h.completo,false)) valido_trs,
 case when r.cerrado_en is not null and r.objetivo_hora>0 and r.horas_programadas>0 and coalesce(h.completo,false)
 then round(100.0*h.ok/(r.objetivo_hora*r.horas_programadas),2) end pct_trs,
 case when r.cerrado_en is not null and r.objetivo_hora>0 and r.horas_programadas>0 and coalesce(h.completo,false)
 then 100.0*h.ok<86*r.objetivo_hora*r.horas_programadas else false end alerta_trs
from public.registro_produccion r left join (
 select id_registro,sum(piezas_inyectadas) inyectadas,sum(piezas_scrap) scrap,sum(piezas_ok) ok,
 bool_and(piezas_scrap<=piezas_inyectadas) completo from public.v_produccion_hora group by id_registro
) h using(id_registro);
create or replace view public.v_panel_turno with(security_invoker=true) as
select s.*,t.piezas_objetivo,t.registros_pendientes_trs,
 case when t.completo and t.piezas_objetivo>0 then round(100.0*t.ok/t.piezas_objetivo,2) end pct_trs,
 case when t.completo and t.piezas_objetivo>0 then 100.0*t.ok<86*t.piezas_objetivo else false end alerta_trs
from public.v_scrap_turno s join (
 select fecha,id_maquina,id_turno,sum(piezas_objetivo) piezas_objetivo,sum(piezas_ok) ok,
 bool_and(coalesce(valido_trs,false)) completo,count(*) filter(where not coalesce(valido_trs,false))::integer registros_pendientes_trs
 from public.v_trs_registro group by fecha,id_maquina,id_turno
) t using(fecha,id_maquina,id_turno);
create or replace view public.v_scrap_turno_molde with(security_invoker=true) as
select r.fecha,r.id_maquina,r.id_turno,r.id_molde,m.codigo_molde molde,
 sum(r.piezas_inyectadas)::bigint piezas_inyectadas,sum(r.piezas_scrap)::bigint piezas_scrap,sum(r.piezas_ok)::bigint piezas_ok,
 case when sum(r.piezas_inyectadas)>0 and bool_and(r.produccion_completa)
 then round(100.0*sum(r.piezas_scrap)/sum(r.piezas_inyectadas),2) end pct_scrap
from public.v_trs_registro r join public.molde m using(id_molde)
group by r.fecha,r.id_maquina,r.id_turno,r.id_molde,m.codigo_molde;
create or replace view public.v_alertas_activas with(security_invoker=true) as
select s.*,case when t.alerta_trs and s.alerta_activa then 'SCRAP SUPERIOR AL 3% Y TRS INFERIOR AL 86%'
 when t.alerta_trs then 'TRS INFERIOR AL 86%' else 'ALERTA: SCRAP SUPERIOR AL 3%' end mensaje,
 t.pct_trs,t.alerta_trs from public.v_scrap_turno s join public.v_panel_turno t using(fecha,id_maquina,id_turno)
where s.alerta_activa or t.alerta_trs;
revoke all on public.v_trs_registro,public.v_panel_turno,public.v_scrap_turno_molde from public,anon;
grant select on public.v_trs_registro,public.v_panel_turno,public.v_scrap_turno_molde to authenticated;
notify pgrst,'reload schema';
commit;
