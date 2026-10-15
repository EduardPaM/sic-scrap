-- Historial desde la instalación. No reconstruye fechas de avisos anteriores.
begin;
select pg_advisory_xact_lock(73001,1);
alter table public.maquina add column if not exists es_demo boolean not null default false;
alter table public.lote_materia_prima add column if not exists es_demo boolean not null default false;
create or replace function privado.validar_origen() returns trigger language plpgsql set search_path='' as $$
begin
 if (select es_demo from public.maquina where id_maquina=new.id_maquina) is distinct from
    (select es_demo from public.lote_materia_prima where id_lote=new.id_lote) then
  raise exception 'La máquina y el lote deben pertenecer al mismo origen: producción real o demostración.';
 end if;
 return new;
end $$;
revoke all on function privado.validar_origen() from public,anon,authenticated;
drop trigger if exists validar_origen_registro on public.registro_produccion;
create trigger validar_origen_registro before insert or update of id_maquina,id_lote on public.registro_produccion for each row execute function privado.validar_origen();
create table if not exists public.alerta_historial (
 id_alerta bigint generated always as identity primary key,
 fecha date not null, id_maquina integer not null references public.maquina,
 id_turno integer not null references public.turno,
 tipo text not null check(tipo in ('scrap','trs')),
 estado text not null check(estado in ('activa','resuelta','pendiente')),
 porcentaje numeric, registrado_en timestamptz not null default now(), creado_por uuid
);
create index if not exists alerta_historial_grupo on public.alerta_historial(fecha,id_maquina,id_turno,tipo,id_alerta desc);
alter table public.alerta_historial enable row level security;
revoke all on public.alerta_historial from public,anon,authenticated;
grant select on public.alerta_historial to authenticated;
drop policy if exists lectura_equipo on public.alerta_historial;
create policy lectura_equipo on public.alerta_historial for select to authenticated
using((select privado.rol_actual()) in ('operador','supervisor','produccion','calidad','administrador'));

create or replace function privado.evaluar_alertas(p_reg integer) returns void
language plpgsql security definer set search_path='' as $$
declare r record; p record; anterior record; v_tipo text; v_pct numeric; v_estado text; v_activa boolean;
begin
 select fecha,id_maquina,id_turno into r from public.registro_produccion where id_registro=p_reg;
 if not found then return; end if;
 perform pg_advisory_xact_lock(73001,1);
 select * into p from public.v_panel_turno where fecha=r.fecha and id_maquina=r.id_maquina and id_turno=r.id_turno;
 if not found then return; end if;
 foreach v_tipo in array array['scrap','trs'] loop
  v_pct:=case when v_tipo='scrap' then p.pct_scrap else p.pct_trs end;
  v_activa:=case when v_tipo='scrap' then p.alerta_activa else p.alerta_trs end;
  v_estado:=case when v_pct is null then 'pendiente' when v_activa then 'activa' else 'resuelta' end;
  select * into anterior from public.alerta_historial where fecha=r.fecha and id_maquina=r.id_maquina and id_turno=r.id_turno and tipo=v_tipo order by id_alerta desc limit 1;
  -- Registrar la primera alerta y cada cambio posterior, sin inventar avisos en grupos sanos.
  if (anterior.id_alerta is null and v_estado='activa') or
    (anterior.id_alerta is not null and (anterior.estado is distinct from v_estado or anterior.porcentaje is distinct from v_pct)) then
   insert into public.alerta_historial(fecha,id_maquina,id_turno,tipo,estado,porcentaje,creado_por)
   values(r.fecha,r.id_maquina,r.id_turno,v_tipo,v_estado,v_pct,auth.uid());
  end if;
 end loop;
end $$;
create or replace function privado.actualizar_alertas() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_reg integer; v_anterior integer;
begin
 if tg_table_name='detalle_scrap' then
  if tg_op<>'INSERT' then select id_registro into v_anterior from public.produccion_hora where id_produccion_hora=old.id_produccion_hora; end if;
  if tg_op<>'DELETE' then select id_registro into v_reg from public.produccion_hora where id_produccion_hora=new.id_produccion_hora; end if;
 else
  if tg_op<>'INSERT' then v_anterior:=old.id_registro; end if;
  if tg_op<>'DELETE' then v_reg:=new.id_registro; end if;
 end if;
 perform privado.evaluar_alertas(v_reg);
 if v_anterior is distinct from v_reg then perform privado.evaluar_alertas(v_anterior); end if;
 return new;
end $$;
revoke all on function privado.evaluar_alertas(integer),privado.actualizar_alertas() from public,anon,authenticated;
drop trigger if exists historial_captura on public.detalle_scrap;
create trigger historial_captura after insert or update or delete on public.detalle_scrap for each row execute function privado.actualizar_alertas();
drop trigger if exists historial_produccion on public.produccion_hora;
create trigger historial_produccion after insert or update or delete on public.produccion_hora for each row execute function privado.actualizar_alertas();
drop trigger if exists historial_cierre on public.registro_produccion;
create trigger historial_cierre after insert or update on public.registro_produccion for each row execute function privado.actualizar_alertas();
-- Línea de base tomada hoy, con fecha de observación actual.
do $$ declare r record; begin
 for r in select distinct on(fecha,id_maquina,id_turno) id_registro from public.registro_produccion order by fecha,id_maquina,id_turno,id_registro loop
  perform privado.evaluar_alertas(r.id_registro);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
