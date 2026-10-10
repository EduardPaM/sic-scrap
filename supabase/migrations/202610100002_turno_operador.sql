-- Un operador con turno asignado solo registra scrap de ese turno.
-- Sin turno asignado (operadores que rotan) el comportamiento no cambia.
-- Unica diferencia con la version anterior de guardar_captura: la validacion de turno.
begin;
create or replace function public.guardar_captura(
 p_fecha date,p_maquina integer,p_turno integer,p_pieza integer,p_lote integer,p_molde integer,
 p_resina integer,p_hora integer,p_causa integer,p_cantidad integer,p_observaciones text,p_solicitud uuid
) returns integer language plpgsql security definer set search_path='' as $$
declare v_reg integer; v_hora integer; v_existente integer; v_rol text;
begin
 v_rol:=privado.rol_actual();
 if auth.uid() is null or v_rol is distinct from 'operador' then raise exception 'Solo el operador puede registrar scrap'; end if;
 if privado.turno_actual() is not null and p_turno is distinct from privado.turno_actual() then raise exception 'Solo puedes registrar scrap de tu turno asignado'; end if;
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
revoke all on function public.guardar_captura(date,integer,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid) from public,anon;
grant execute on function public.guardar_captura(date,integer,integer,integer,integer,integer,integer,integer,integer,integer,text,uuid) to authenticated;
commit;
