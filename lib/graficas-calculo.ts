// Cálculos puros de las gráficas de % scrap y Pareto (sin dependencias, se prueban con npm test).
export type FilaTurno = {
  fecha: string;
  id_maquina: number;
  piezas_inyectadas: number;
  piezas_scrap: number;
  pct_scrap: number | null;
};

export type PuntoDia = {
  fecha: string;
  inyectadas: number;
  scrap: number;
  pct: number;
};

export type Causa = {
  id_causa: number;
  codigo: string;
  nombre: string;
  categoria: string;
};

export type BarraPareto = {
  codigo: string;
  nombre: string;
  categoria: string;
  piezas: number;
  pct: number;
  acumulado: number;
};

const redondear2 = (x: number) => Math.round(x * 100) / 100;

/**
 * % Scrap por día = scrap ÷ inyectadas × 100, sumando solo los turnos que la
 * vista pudo calcular (pct_scrap no nulo). Un día sin producción completa no
 * se dibuja como 0 %: simplemente no tiene punto.
 */
export function pctPorDia(filas: FilaTurno[]): PuntoDia[] {
  const dias = new Map<string, { inyectadas: number; scrap: number }>();
  for (const f of filas) {
    if (f.pct_scrap === null) continue;
    const d = dias.get(f.fecha) ?? { inyectadas: 0, scrap: 0 };
    d.inyectadas += Number(f.piezas_inyectadas);
    d.scrap += Number(f.piezas_scrap);
    dias.set(f.fecha, d);
  }
  return [...dias.entries()]
    .filter(([, d]) => d.inyectadas > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, d]) => ({
      fecha,
      inyectadas: d.inyectadas,
      scrap: d.scrap,
      pct: redondear2((100 * d.scrap) / d.inyectadas),
    }));
}

/**
 * Pareto: piezas de scrap por causa, de mayor a menor, con el % que
 * representa cada causa y el % acumulado. Todo en la misma escala (0–100 %).
 */
export function pareto(
  detalles: { id_causa: number | null; cantidad: number | null }[],
  causas: Causa[],
): BarraPareto[] {
  const porCausa = new Map<number, number>();
  for (const d of detalles) {
    if (d.id_causa === null || !d.cantidad) continue;
    porCausa.set(d.id_causa, (porCausa.get(d.id_causa) ?? 0) + Number(d.cantidad));
  }
  const total = [...porCausa.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  const catalogo = new Map(causas.map((c) => [c.id_causa, c]));
  let acumuladas = 0;
  return [...porCausa.entries()]
    .map(([id, piezas]) => {
      const c = catalogo.get(id);
      return {
        codigo: c?.codigo ?? `#${id}`,
        nombre: c?.nombre ?? "Causa sin catálogo",
        categoria: c?.categoria ?? "",
        piezas,
      };
    })
    .sort((a, b) => b.piezas - a.piezas || a.codigo.localeCompare(b.codigo))
    .map((c) => {
      acumuladas += c.piezas;
      return {
        ...c,
        pct: redondear2((100 * c.piezas) / total),
        acumulado: redondear2((100 * acumuladas) / total),
      };
    });
}
