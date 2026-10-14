export type RelacionMolde = { id_maquina: number; id_molde: number };

// Los equipos antiguos sin relaciones siguen mostrando su catalogo disponible.
export function moldePermitido(maquina: string, molde: number, relaciones: RelacionMolde[]) {
  if (!maquina) return true;
  const asignados = relaciones.filter((r) => r.id_maquina === Number(maquina));
  return asignados.length === 0 || asignados.some((r) => r.id_molde === molde);
}

export function enlazarMaquinaMolde<T extends { maquina?: string; molde?: string }>(
  actual: T, campo: "maquina" | "molde", valor: string, relaciones: RelacionMolde[],
): T {
  const otro = campo === "maquina" ? "molde" : "maquina";
  if (!valor) return { ...actual, [campo]: "", [otro]: "" };
  const opciones = [...new Set(relaciones
    .filter((r) => (campo === "maquina" ? r.id_maquina : r.id_molde) === Number(valor))
    .map((r) => String(campo === "maquina" ? r.id_molde : r.id_maquina)))];
  // Sin relacion conocida se permite la seleccion manual de equipos historicos.
  // Varias relaciones requieren una eleccion; nunca asumir la primera fila.
  const asociado = opciones.length === 0 || opciones.includes(actual[otro] ?? "")
    ? actual[otro] ?? ""
    : opciones.length === 1 ? opciones[0] : "";
  return { ...actual, [campo]: valor, [otro]: asociado };
}
