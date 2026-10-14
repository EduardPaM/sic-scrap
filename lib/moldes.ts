export type RelacionMolde = { id_maquina: number; id_molde: number };

// Los equipos antiguos sin relaciones siguen mostrando su catalogo disponible.
export function moldePermitido(maquina: string, molde: number, relaciones: RelacionMolde[]) {
  if (!maquina) return false;
  const asignados = relaciones.filter((r) => r.id_maquina === Number(maquina));
  return asignados.length === 0 || asignados.some((r) => r.id_molde === molde);
}
