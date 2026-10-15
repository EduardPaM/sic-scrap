-- Retira TRS del flujo vigente sin borrar datos ni migraciones históricas.
begin;
select pg_advisory_xact_lock(73001,1);
create or replace function public.cerrar_registro_scrap(p_registro integer,p_ok bigint)
returns void language plpgsql security definer set search_path='' as $$
declare v_turno integer; v_rol text; v_ok bigint;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is null or v_rol not in ('supervisor','administrador') then raise exception 'Sin permiso para cerrar turno'; end if;
 if p_ok is null or p_ok<0 then raise exception 'Piezas OK invalidas'; end if;
 perform pg_advisory_xact_lock(73001,1);
 select id_turno into v_turno from public.registro_produccion where id_registro=p_registro and cerrado_en is null;
 if not found then raise exception 'Registro inexistente o ya cerrado'; end if;
 if v_rol='supervisor' and v_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes cerrar tu turno asignado'; end if;
 if not exists(select 1 from public.v_produccion_hora where id_registro=p_registro) or exists(select 1 from public.v_produccion_hora where id_registro=p_registro and piezas_scrap>piezas_inyectadas) then raise exception 'Completa primero la produccion por hora'; end if;
 select sum(piezas_ok) into v_ok from public.v_produccion_hora where id_registro=p_registro;
 if p_ok<>v_ok then raise exception 'Las piezas OK no coinciden con inyectadas menos scrap (%)',v_ok; end if;
 update public.registro_produccion set cerrado_en=now(),cerrado_por=auth.uid() where id_registro=p_registro;
end $$;

revoke all on function public.cerrar_registro_scrap(integer,bigint) from public,anon;
grant execute on function public.cerrar_registro_scrap(integer,bigint) to authenticated;
-- El cliente anterior debe actualizarse; no seguir exigiendo objetivos de TRS.
revoke execute on function public.cerrar_registro(integer,numeric,numeric,bigint) from authenticated;
create or replace function privado.evaluar_alertas(p_reg integer) returns void
language plpgsql security definer set search_path='' as $$
declare r record; p record; anterior record; v_tipo text; v_pct numeric; v_estado text; v_activa boolean;
begin
 select fecha,id_maquina,id_turno into r from public.registro_produccion where id_registro=p_reg;
 if not found then return; end if;
 perform pg_advisory_xact_lock(73001,1);
 select * into p from public.v_scrap_turno where fecha=r.fecha and id_maquina=r.id_maquina and id_turno=r.id_turno;
 if not found then return; end if;
 foreach v_tipo in array array['scrap'] loop
  v_pct:=p.pct_scrap;
  v_activa:=p.alerta_activa;
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

-- Conserva las columnas del contrato anterior, neutralizadas para compatibilidad.
create or replace view public.v_panel_turno with(security_invoker=true) as
select s.*,null::numeric piezas_objetivo,0::integer registros_pendientes_trs,
 null::numeric pct_trs,false alerta_trs from public.v_scrap_turno s;
create or replace view public.v_alertas_activas with(security_invoker=true) as
select s.*,'ALERTA: SCRAP SUPERIOR AL 3%'::text mensaje,
 null::numeric pct_trs,false alerta_trs from public.v_scrap_turno s where s.alerta_activa;
-- Los eventos TRS anteriores permanecen archivados. Solo se generan eventos scrap.
notify pgrst,'reload schema';
commit;
