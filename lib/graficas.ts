// Datos para las gráficas de % scrap y Pareto de causas (HU-09).
// Solo lee de Supabase. El % scrap por turno ya viene calculado en la vista
// v_scrap_turno; aquí solo se suman piezas para agrupar por día.
import { supabase } from "@/lib/supabaseClient";
import { pareto, pctPorDia, type Causa, type FilaTurno } from "@/lib/graficas-calculo";

export type { BarraPareto, PuntoDia } from "@/lib/graficas-calculo";

// PostgREST manda los filtros .in() en la URL; se parte en bloques.
const TAM_BLOQUE = 200;

export async function cargarGraficas(desde: string, hasta: string, maquina: string) {
  let turnos = supabase
    .from("v_scrap_turno")
    .select("fecha,id_maquina,piezas_inyectadas,piezas_scrap,pct_scrap")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  let horas = supabase
    .from("v_produccion_hora")
    .select("id_produccion_hora")
    .gte("fecha", desde)
    .lte("fecha", hasta);
  if (maquina) {
    turnos = turnos.eq("id_maquina", Number(maquina));
    horas = horas.eq("id_maquina", Number(maquina));
  }
  const [t, h, c] = await Promise.all([
    turnos.limit(5000),
    horas.limit(20000),
    supabase.from("causa_scrap").select("id_causa,codigo,nombre,categoria"),
  ]);
  if (t.error) throw new Error(`No se pudo leer el % scrap: ${t.error.message}`);
  if (h.error) throw new Error(`No se pudo leer la producción: ${h.error.message}`);
  if (c.error) throw new Error(`No se pudo leer el catálogo de causas: ${c.error.message}`);

  const ids = (h.data ?? []).map((x: { id_produccion_hora: number }) => x.id_produccion_hora);
  const detalles: { id_causa: number | null; cantidad: number | null }[] = [];
  for (let i = 0; i < ids.length; i += TAM_BLOQUE) {
    const { data, error } = await supabase
      .from("detalle_scrap")
      .select("id_causa,cantidad")
      .in("id_produccion_hora", ids.slice(i, i + TAM_BLOQUE));
    if (error) throw new Error(`No se pudo leer el detalle de scrap: ${error.message}`);
    detalles.push(...(data ?? []));
  }

  const filas = (t.data ?? []) as FilaTurno[];
  return {
    dias: pctPorDia(filas),
    turnosSinDato: filas.filter((f) => f.pct_scrap === null).length,
    causas: pareto(detalles, (c.data ?? []) as Causa[]),
  };
}
