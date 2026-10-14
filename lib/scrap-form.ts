export const camposScrap = {
  fecha: "Fecha de inicio del turno",
  hora: "Hora del reloj",
  maquina: "Máquina",
  turno: "Turno",
  lote: "Lote",
  molde: "Molde",
  resina: "Resina",
  cantidad: "Cantidad de scrap",
  causa: "Causa del scrap",
} as const;

export type CampoScrap = keyof typeof camposScrap;
export type FormScrap = Record<CampoScrap | "observaciones", string>;
type Lote = { id_lote: number; id_resina: number };

export function camposFaltantes(form: FormScrap): CampoScrap[] {
  return (Object.keys(camposScrap) as CampoScrap[]).filter((campo) => !form[campo].trim());
}

export function cambiarCampoScrap(form: FormScrap, campo: keyof FormScrap, valor: string, lotes: Lote[]) {
  const siguiente = { ...form, [campo]: valor };
  if (campo === "lote") {
    const lote = lotes.find((l) => String(l.id_lote) === valor);
    if (lote) siguiente.resina = String(lote.id_resina);
  }
  if (campo === "resina" && form.lote) {
    const lote = lotes.find((l) => String(l.id_lote) === form.lote);
    if (!lote || lote.id_resina !== Number(valor)) siguiente.lote = "";
  }
  return siguiente;
}
