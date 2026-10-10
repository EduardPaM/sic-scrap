-- Activar cuando al menos un administrador tenga cuenta Auth vinculada.
begin;
do $$ begin
 if not exists(select 1 from public.usuario where auth_user_id is not null and lower(rol)='administrador' and activo) then
  raise exception 'Crea y vincula primero la cuenta administradora. No se cambiaron permisos.';
 end if;
end $$;
do $$ declare t text; pol record; begin
 foreach t in array array['maquina','pieza','resina','lote_materia_prima','molde','turno','personal','causa_scrap','registro_produccion','uso_molde','produccion_hora','detalle_scrap','usuario'] loop
  execute format('alter table public.%I enable row level security',t);
  for pol in select policyname from pg_policies where schemaname='public' and tablename=t loop
   execute format('drop policy %I on public.%I',pol.policyname,t);
  end loop;
  execute format('revoke all on public.%I from anon',t);
  execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  if t='usuario' then
   execute 'create policy perfil_propio on public.usuario for select to authenticated using(auth_user_id=auth.uid() or (select privado.rol_actual())=''administrador'')';
  else
   execute format('create policy lectura_equipo on public.%I for select to authenticated using ((select privado.rol_actual()) in (''operador'',''supervisor'',''produccion'',''calidad'',''administrador''))',t);
  end if;
 end loop;
end $$;
-- Toda escritura de produccion pasa por RPC atomicas con permisos y turno comprobados.
commit;
