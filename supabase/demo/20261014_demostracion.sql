-- Datos hipotéticos autorizados para la demostración. Repetible, sin sobrescribir capturas.
-- Equipos y lote exclusivos DEMO; las máquinas reales permanecen intactas.
begin;
select pg_advisory_xact_lock(73001,1);
do $$ declare tabla text; clave text; begin
 for tabla,clave in select * from (values ('maquina','id_maquina'),('lote_materia_prima','id_lote'),('registro_produccion','id_registro'),('produccion_hora','id_produccion_hora'),('detalle_scrap','id_detalle_scrap'),('uso_molde','id_uso_molde')) t(a,b) loop
  execute format('select setval(pg_get_serial_sequence(%L,%L),greatest(coalesce((select max(%I) from public.%I),0)+1,1),false)','public.'||tabla,clave,clave,tabla);
 end loop;
end $$;
do $$
declare equipo record; v_maquina int; v_molde int; v_resina int; v_lote int; v_turno int;
 v_reg int; v_hora int; v_causas int[]; dia int; hora int; rechazo int; cantidad int; objetivo numeric; f date;
begin
 select min(id_resina) into v_resina from public.resina;
 select min(id_turno) into v_turno from public.turno;
 select array_agg(id_causa order by id_causa) into v_causas from public.causa_scrap;
 if v_resina is null or v_turno is null or cardinality(v_causas)<1 then raise exception 'Se requieren catálogos antes de cargar DEMO'; end if;
 select id_lote into v_lote from public.lote_materia_prima where codigo_lote='DEMO-20261014-HIPOTETICO' and es_demo order by id_lote limit 1;
 if v_lote is null then insert into public.lote_materia_prima(codigo_lote,id_resina,es_demo) values('DEMO-20261014-HIPOTETICO',v_resina,true) returning id_lote into v_lote; end if;
 for equipo in select * from (values (1,'DEMO · BORCHE 90 TON','CLIPS Y DIVISOR QUESERA'),(2,'DEMO · HAITIAN 230 TON','DEFROSTING'),(3,'DEMO · KRAUSS MAFFEI 360 TON','GUIDE')) t(n,nombre,molde) loop
  select id_molde into v_molde from public.molde where codigo_molde=equipo.molde order by id_molde limit 1;
  if v_molde is null then raise exception 'Falta molde %',equipo.molde; end if;
  select id_maquina into v_maquina from public.maquina where nombre=equipo.nombre and es_demo order by id_maquina limit 1;
  if v_maquina is null then insert into public.maquina(nombre,es_demo) values(equipo.nombre,true) returning id_maquina into v_maquina; end if;
  insert into public.maquina_molde values(v_maquina,v_molde) on conflict do nothing;
  for dia in 0..9 loop
   f:=date '2026-10-05'+dia;
   if exists(select 1 from public.registro_produccion where fecha=f and id_maquina=v_maquina and id_turno=v_turno and id_molde=v_molde and id_lote=v_lote) then continue; end if;
   rechazo:=(array[20,30,40,80,10,140,60,0,25,50])[1+(dia+equipo.n-1)%10];
   objetivo:=case when dia%3=0 then 1200 else 1000 end;
   if rechazo=140 then objetivo:=1000; end if;
   insert into public.registro_produccion(fecha,id_maquina,id_turno,id_molde,id_lote) values(f,v_maquina,v_turno,v_molde,v_lote) returning id_registro into v_reg;
   insert into public.uso_molde(id_registro,id_molde) values(v_reg,v_molde);
   for hora in 7..8 loop
    cantidad:=case when hora=7 then rechazo*3/4 else rechazo-rechazo*3/4 end;
    insert into public.produccion_hora(id_registro,numero_hora,piezas_inyectadas,piezas_scrap) values(v_reg,hora,500,0) returning id_produccion_hora into v_hora;
    if cantidad>0 then
     insert into public.detalle_scrap(id_produccion_hora,id_causa,cantidad,observaciones,solicitud_id)
     values(v_hora,v_causas[1+((dia+hora+equipo.n)%least(cardinality(v_causas),6))],cantidad,'DEMO HIPOTÉTICA 20261014. No corresponde a una película real.',gen_random_uuid());
     update public.produccion_hora set piezas_scrap=cantidad where id_produccion_hora=v_hora;
    end if;
   end loop;
   update public.registro_produccion set objetivo_hora=objetivo/2,horas_programadas=2,cerrado_en=now() where id_registro=v_reg;
  end loop;
 end loop;
end $$;
commit;
