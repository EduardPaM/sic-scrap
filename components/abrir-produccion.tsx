"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { moldePermitido, enlazarMaquinaMolde, type RelacionMolde } from "@/lib/moldes";
type Option = { id: number; nombre: string };
export function AbrirProduccion({ onOpen }: { onOpen: (id: number) => void }) {
  const [catalogos, setCatalogos] = useState<Record<string, Option[]>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [relaciones, setRelaciones] = useState<RelacionMolde[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fields = [
    ["maquina", "Máquina"],
    ["turno", "Turno"],
    ["lote", "Lote de resina"],
    ["molde", "Molde"],
  ];
  useEffect(() => {
    async function load() {
      const [m, t, relaciones, l, mo] = await Promise.all([
        supabase.from("maquina").select("id_maquina,nombre"),
        supabase.from("turno").select("id_turno,nombre"),
        supabase.from("maquina_molde").select("id_maquina,id_molde"),
        supabase.from("lote_materia_prima").select("id_lote,codigo_lote"),
        supabase.from("molde").select("id_molde,codigo_molde").eq("disponible_captura", true).order("codigo_molde"),
      ]);
      if ([m, t, relaciones, l, mo].some((r) => r.error)) {
        setError("No se pudieron cargar los catálogos.");
        return;
      }
      setRelaciones(relaciones.data ?? []);
      setCatalogos({
        maquina: (m.data ?? []).map((r) => ({
          id: r.id_maquina,
          nombre: r.nombre,
        })),
        turno: (t.data ?? []).map((r) => ({
          id: r.id_turno,
          nombre: r.nombre,
        })),
        lote: (l.data ?? []).map((r) => ({
          id: r.id_lote,
          nombre: r.codigo_lote,
        })),
        molde: (mo.data ?? []).map((r) => ({
          id: r.id_molde,
          nombre: r.codigo_molde,
        })),
      });
    }
    void load();
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data, error } = await supabase.rpc("abrir_produccion_molde", {
        p_fecha: values.fecha,
        p_maquina: Number(values.maquina),
        p_turno: Number(values.turno),
        p_lote: Number(values.lote),
        p_molde: Number(values.molde),
      });
      if (error) setError(error.message);
      else onOpen(data);
    } catch {
      setError("No se pudo conectar. Puedes reintentar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="surface">
      <summary>Abrir producción de un molde y lote</summary>
      <p className="hint">
        Permite registrar horas con cero scrap. Si el registro ya existe, se
        reutiliza.
        {" "}Puedes elegir primero máquina o molde: el otro se completa cuando
        tiene una sola relación. Si tiene varias, selecciona la combinación utilizada.
      </p>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Fecha de inicio del turno
          <input
            required
            type="date"
            value={values.fecha ?? ""}
            onChange={(e) => setValues({ ...values, fecha: e.target.value })}
          />
        </label>
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <select
              required
              value={values[key] ?? ""}
              onChange={(e) => setValues((prev) => key === "maquina" || key === "molde"
                ? enlazarMaquinaMolde(prev, key, e.target.value, relaciones)
                : { ...prev, [key]: e.target.value })}
            >
              <option value="">Seleccionar</option>
              {catalogos[key]?.filter((o) => key !== "molde" || moldePermitido(values.maquina, o.id, relaciones)).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button className="primary full" disabled={busy}>
          Abrir registro
        </button>
        {error && (
          <p role="alert" className="error full">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
