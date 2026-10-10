"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { AbrirProduccion } from "@/components/abrir-produccion";
import { Access } from "@/components/session";
type Registro = {
  id_registro: number;
  fecha: string;
  id_maquina: number;
  id_turno: number;
  id_pieza: number;
  cerrado_en: string | null;
};
type Hora = {
  id_produccion_hora: number;
  numero_hora: number;
  piezas_inyectadas: number;
  piezas_scrap: number;
  piezas_ok: number;
};
export default function Cierre() {
  return (
    <Access roles={["supervisor", "administrador"]}>
      <Formulario />
    </Access>
  );
}
function Formulario() {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [id, setId] = useState("");
  const [horas, setHoras] = useState<Hora[]>([]);
  const [hora, setHora] = useState("");
  const [iny, setIny] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [programadas, setProgramadas] = useState("");
  const [ok, setOk] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [nombres, setNombres] = useState<Record<string, Record<number, string>>>({});
  useEffect(() => {
    // Nombres para mostrar en el selector; si falla la consulta se muestran los números como antes.
    Promise.all([
      supabase.from("maquina").select("id_maquina,nombre"),
      supabase.from("turno").select("id_turno,nombre"),
      supabase.from("pieza").select("id_pieza,nombre"),
    ]).then(([m, t, p]) =>
      setNombres({
        maquina: Object.fromEntries((m.data ?? []).map((r) => [r.id_maquina, r.nombre])),
        turno: Object.fromEntries((t.data ?? []).map((r) => [r.id_turno, r.nombre])),
        pieza: Object.fromEntries((p.data ?? []).map((r) => [r.id_pieza, r.nombre])),
      }),
    );
    supabase
      .from("registro_produccion")
      .select("id_registro,fecha,id_maquina,id_turno,id_pieza,cerrado_en")
      .order("fecha", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        setRegistros(data ?? []);
        if (error) setMessage(error.message);
      });
  }, []);
  async function refresh(value: string) {
    const { data, error } = await supabase
      .from("v_produccion_hora")
      .select("*")
      .eq("id_registro", Number(value))
      .order("numero_hora");
    setHoras(data ?? []);
    if (error) setMessage(error.message);
  }
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("guardar_produccion", {
        p_registro: Number(id),
        p_hora: Number(hora),
        p_inyectadas: Number(iny),
      });
      if (error) setMessage(error.message);
      else {
        setMessage("Producción guardada. El panel ya usa el nuevo total.");
        await refresh(id);
      }
    } catch {
      setMessage("Error de conexión. Reintenta el mismo total.");
    } finally {
      setBusy(false);
    }
  }
  async function cerrar(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("cerrar_registro", {
        p_registro: Number(id),
        p_objetivo: Number(objetivo),
        p_horas: Number(programadas),
        p_ok: Number(ok),
      });
      if (error) setMessage(error.message);
      else {
        setMessage("Cierre guardado correctamente.");
        setRegistros((prev) =>
          prev.map((r) =>
            r.id_registro === Number(id)
              ? { ...r, cerrado_en: new Date().toISOString() }
              : r,
          ),
        );
      }
    } catch {
      setMessage("No se confirmó el cierre. Actualiza antes de reintentar.");
    } finally {
      setBusy(false);
    }
  }
  const closed = !!registros.find((r) => r.id_registro === Number(id))
    ?.cerrado_en;
  return (
    <main className="workspace narrow">
      <p className="eyebrow">SUPERVISIÓN</p>
      <h1>Producción y cierre de turno</h1>
      <p className="subtitle">
        Captura el total de piezas inyectadas de cada hora, incluyendo el scrap.
      </p>
      <AbrirProduccion
        onOpen={(value) => {
          setId(String(value));
          void refresh(String(value));
          supabase
            .from("registro_produccion")
            .select("id_registro,fecha,id_maquina,id_turno,id_pieza,cerrado_en")
            .order("fecha", { ascending: false })
            .limit(500)
            .then(({ data }) => setRegistros(data ?? []));
        }}
      />
      <section className="surface form-grid single">
        <label>
          Registro de producción
          <select
            required
            value={id}
            onChange={(e) => {
              setId(e.target.value);
              setHoras([]);
              setMessage("");
              void refresh(e.target.value);
            }}
          >
            <option value="">Selecciona un registro</option>
            {registros.map((r) => (
              <option key={r.id_registro} value={r.id_registro}>
                #{r.id_registro} · {r.fecha} ·{" "}
                {nombres.maquina?.[r.id_maquina] ?? `Máquina ${r.id_maquina}`} ·{" "}
                {nombres.turno?.[r.id_turno] ?? `Turno ${r.id_turno}`} ·{" "}
                {nombres.pieza?.[r.id_pieza] ?? `Pieza ${r.id_pieza}`}
                {r.cerrado_en ? " · Cerrado" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Hora</th>
                <th>Inyectadas</th>
                <th>Scrap</th>
                <th>OK</th>
              </tr>
            </thead>
            <tbody>
              {horas.map((h) => (
                <tr key={h.id_produccion_hora}>
                  <td>{h.numero_hora}:00</td>
                  <td>{h.piezas_inyectadas}</td>
                  <td>{h.piezas_scrap}</td>
                  <td>{h.piezas_ok < 0 ? "Pendiente" : h.piezas_ok}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!horas.length && (
            <p className="hint">
              {id
                ? "Este registro todavía no tiene horas capturadas."
                : "Selecciona un registro para ver sus horas."}
            </p>
          )}
        </div>
      </section>
      <form onSubmit={guardar} className="surface form-grid">
        <h2 className="full">Producción por hora</h2>
        <label>
          Hora del reloj
          <input
            type="number"
            required
            min="0"
            max="23"
            step="1"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
          />
        </label>
        <label>
          Total inyectado en esa hora
          <input
            type="number"
            required
            min="0"
            max="2147483647"
            step="1"
            value={iny}
            onChange={(e) => setIny(e.target.value)}
          />
        </label>
        <p className="hint full">
          El total reemplaza el valor de esa hora; no se suma otra vez. El
          supervisor solo puede modificar su turno asignado.
        </p>
        <button className="primary full" disabled={busy || !id || closed}>
          Guardar producción
        </button>
      </form>
      <form onSubmit={cerrar} className="surface form-grid">
        <h2 className="full">Confirmar cierre</h2>
        <label>
          Piezas OK del registro
          <input
            required
            type="number"
            min="0"
            step="1"
            value={ok}
            onChange={(e) => setOk(e.target.value)}
          />
        </label>
        <label>
          Objetivo de piezas por hora
          <input
            required
            type="number"
            min="0.01"
            max="9999999999"
            step="0.01"
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
          />
        </label>
        <label>
          Horas programadas
          <input
            required
            type="number"
            min="0.01"
            max="24"
            step="0.01"
            value={programadas}
            onChange={(e) => setProgramadas(e.target.value)}
          />
        </label>
        <p className="hint">
          El cierre se realiza por registro de pieza y lote. Las piezas OK deben
          coincidir con la producción horaria.
        </p>
        <button className="primary full" disabled={busy || !id || closed}>
          {closed ? "Registro cerrado" : "Guardar cierre"}
        </button>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
    </main>
  );
}
