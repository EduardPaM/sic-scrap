"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Access, useSession } from "@/components/session";
type KPI = {
  fecha: string;
  id_maquina: number;
  maquina: string;
  id_turno: number;
  turno: string;
  piezas_inyectadas: number;
  piezas_scrap: number;
  piezas_ok: number;
  pct_scrap: number | null;
  horas_incompletas: number;
  alerta_activa: boolean;
};
const fmt = (x: number) => new Intl.NumberFormat("es-MX").format(x);
// Sin fecha elegida solo se consultan los últimos 30 días para no recorrer todo el historial cada 15 s.
const hace30Dias = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
export default function Panel() {
  return (
    <Access>
      <Dashboard />
    </Access>
  );
}
function Dashboard() {
  const { perfil } = useSession();
  const [date, setDate] = useState("");
  const [machine, setMachine] = useState("");
  const [rows, setRows] = useState<KPI[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");
  const request = useRef({ generation: 0 });
  const load = useCallback(async () => {
    const current = ++request.current.generation;
    let q = supabase
      .from("v_scrap_turno")
      .select("*")
      .order("fecha", { ascending: false });
    q = date ? q.eq("fecha", date) : q.gte("fecha", hace30Dias());
    const { data, error } = await q.limit(1000);
    if (current !== request.current.generation) return;
    if (error) {
      setMessage(`No se pudo consultar el panel: ${error.message}`);
      setRows([]);
    } else {
      setRows(data ?? []);
      setMessage(
        (data?.length ?? 0) >= 1000
          ? "Se muestran hasta 1,000 grupos. Filtra una fecha para acotar los resultados."
          : "",
      );
      setUpdated(new Date().toLocaleTimeString("es-MX"));
    }
    setLoading(false);
  }, [date]);
  useEffect(() => {
    const tracker = request.current;
    const initial = setTimeout(() => void load(), 0);
    const timer = setInterval(() => void load(), 15000);
    return () => {
      tracker.generation++;
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [load]);
  const filtered = rows.filter(
    (r) => !machine || String(r.id_maquina) === machine,
  );
  const alerts = filtered.filter((r) => r.alerta_activa);
  const qty = filtered.reduce((a, r) => a + Number(r.piezas_inyectadas), 0);
  const scrap = filtered.reduce((a, r) => a + Number(r.piezas_scrap), 0);
  return (
    <main className="workspace">
      <div className="page-title">
        <div>
          <p className="eyebrow">CONTROL DE PRODUCCIÓN</p>
          <h1>Panel de scrap</h1>
          <p className="subtitle">
            Resultados por fecha, máquina y turno · Cantidades en piezas
          </p>
        </div>
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          disabled={loading}
        >
          Actualizar
        </button>
      </div>
      <div className="surface filters">
        <label>
          Fecha del turno
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <label>
          Máquina
          <select value={machine} onChange={(e) => setMachine(e.target.value)}>
            <option value="">Todas las máquinas</option>
            {Array.from(
              new Map(rows.map((r) => [r.id_maquina, r.maquina])).entries(),
            ).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">
          Actualizado: {updated || "—"}
          <br />
          Actualización automática cada 15 s
          {!date && (
            <>
              <br />
              Sin fecha elegida: últimos 30 días
            </>
          )}
        </p>
      </div>
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <div className="metrics">
        <article>
          <span>Piezas inyectadas</span>
          <strong>{fmt(qty)}</strong>
        </article>
        <article>
          <span>Piezas scrap</span>
          <strong>{fmt(scrap)}</strong>
        </article>
        <article>
          <span>Turnos con alerta</span>
          <strong>{alerts.length}</strong>
        </article>
        <article>
          <span>Grupos por completar</span>
          <strong>{filtered.filter((r) => r.pct_scrap === null).length}</strong>
        </article>
      </div>
      {alerts.map((r) => (
        <div
          role="status"
          className="alert-box"
          key={`${r.fecha}-${r.id_maquina}-${r.id_turno}`}
        >
          <strong>ALERTA: SCRAP SUPERIOR AL 3%</strong>
          <span>
            {r.maquina} · {r.turno} · {r.fecha} ·{" "}
            {Number(r.pct_scrap).toFixed(2)} %
          </span>
        </div>
      ))}
      <section className="surface">
        <h2>Detalle por máquina y turno</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "Fecha",
                  "Máquina",
                  "Turno",
                  "Inyectadas",
                  "Scrap",
                  "OK",
                  "% scrap",
                  "Estado",
                ].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.fecha}-${r.id_maquina}-${r.id_turno}`}>
                  <td>{r.fecha}</td>
                  <td>{r.maquina}</td>
                  <td>{r.turno}</td>
                  <td>{fmt(r.piezas_inyectadas)}</td>
                  <td>{fmt(r.piezas_scrap)}</td>
                  <td>{r.pct_scrap === null ? "—" : fmt(r.piezas_ok)}</td>
                  <td>
                    {r.pct_scrap === null
                      ? "—"
                      : Number(r.pct_scrap).toFixed(2) + " %"}
                  </td>
                  <td>
                    <span
                      className={
                        r.pct_scrap === null
                          ? "badge pending"
                          : r.alerta_activa
                            ? "badge danger"
                            : "badge good"
                      }
                    >
                      {r.pct_scrap === null
                        ? "Falta producción"
                        : r.alerta_activa
                          ? "Fuera de rango"
                          : "En rango"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <p className="empty">
            {loading
              ? "Consultando producción…"
              : "No hay registros para esta selección."}
          </p>
        )}
        <p className="hint">
          % scrap = piezas scrap ÷ piezas inyectadas × 100. El umbral se evalúa
          sin redondear. Un turno sin producción completa no se presenta como 0
          %.
        </p>
      </section>
      <p className="hint">
        Sesión: {perfil?.rol}. La fecha corresponde al inicio del turno.
      </p>
    </main>
  );
}
