begin;
alter table public.usuario add column if not exists invitacion_retirada_en timestamptz;

-- Retirar es reversible: conservar el perfil evita perder trazabilidad.
create or replace function public.retirar_invitacion(p_correo text)
returns void language plpgsql security definer set search_path='' as $$
declare v_usuario public.usuario%rowtype;
begin
 if privado.rol_actual() is distinct from 'administrador' then
  raise exception 'Solo el administrador puede retirar invitaciones';
 end if;
 perform pg_advisory_xact_lock(73002,1);
 select * into v_usuario from public.usuario where lower(correo)=lower(trim(p_correo)) for update;
 if not found then raise exception 'La invitacion no existe'; end if;
 if v_usuario.auth_user_id is not null then
  raise exception 'La cuenta ya esta vinculada. Para retirar su acceso, cambia el estado del perfil a Inactivo';
 end if;
 update public.usuario set activo=false, invitacion_retirada_en=coalesce(invitacion_retirada_en,now())
 where id_usuario=v_usuario.id_usuario;
end $$;
revoke all on function public.retirar_invitacion(text) from public,anon;
grant execute on function public.retirar_invitacion(text) to authenticated;

-- Guardar de nuevo el mismo correo restaura una invitacion retirada.
create or replace function public.administrar_perfil(p_correo text,p_nombre text,p_rol text,p_turno integer,p_activo boolean)
returns void language plpgsql security definer set search_path='' as $$
begin
 if privado.rol_actual() is distinct from 'administrador' then raise exception 'Solo el administrador puede gestionar perfiles'; end if;
 if p_correo is null or p_correo !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or length(p_correo)>254 or coalesce(length(trim(p_nombre)),0)=0 or length(p_nombre)>100 or p_rol is null or p_rol not in ('operador','supervisor','produccion','calidad','administrador') or p_activo is null then raise exception 'Perfil invalido'; end if;
 if p_rol='supervisor' and not exists(select 1 from public.turno where id_turno=p_turno) then raise exception 'Asigna un turno al supervisor'; end if;
 perform pg_advisory_xact_lock(73002,1);
 if exists(select 1 from public.usuario where lower(correo)=lower(trim(p_correo)) and auth_user_id=auth.uid()) and (p_rol<>'administrador' or not p_activo) then raise exception 'No puedes quitarte tu propio acceso administrador'; end if;
 insert into public.usuario(correo,nombre,rol,id_turno,activo) values(lower(trim(p_correo)),trim(p_nombre),p_rol,p_turno,p_activo)
 on conflict(correo) do update set nombre=excluded.nombre,rol=excluded.rol,id_turno=excluded.id_turno,activo=excluded.activo,invitacion_retirada_en=null;
end $$;
revoke all on function public.administrar_perfil(text,text,text,integer,boolean) from public,anon;
grant execute on function public.administrar_perfil(text,text,text,integer,boolean) to authenticated;
commit;
