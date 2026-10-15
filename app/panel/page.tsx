"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Access, useSession } from "@/components/session";
import { SelectorOrigen } from '@/components/origen-datos';
import { maquinasOrigen, type OrigenDatos } from '@/lib/origen-datos';
import { leerPaginas } from '@/lib/paginacion';
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
  pct_trs: number | null;
  alerta_trs: boolean;
  registros_pendientes_trs: number;
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
  const [origen, setOrigen] = useState<OrigenDatos>('real');
  const [date, setDate] = useState("");
  const [machine, setMachine] = useState("");
  const [rows, setRows] = useState<KPI[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState("");
  const request = useRef({ generation: 0 });
  const load = useCallback(async () => {
    const current = ++request.current.generation;
    try {
    const equipos = await maquinasOrigen(origen);
    if (current !== request.current.generation) return;
    if (!equipos.length) { setRows([]); setMessage('No hay máquinas para este origen.'); setLoading(false); return; }
    let q = supabase
      .from("v_panel_turno")
      .select("*")
      .in('id_maquina', equipos.map(m => m.id_maquina))
      .order("fecha", { ascending: false }).order('id_maquina').order('id_turno');
    q = date ? q.eq("fecha", date) : q.gte("fecha", hace30Dias());
    const data = await leerPaginas<KPI>((a,b) => q.range(a,b));
    if (current !== request.current.generation) return;
      setRows(data ?? []);
      setMessage('');
      setUpdated(new Date().toLocaleTimeString("es-MX"));
    } catch(e) {
      if (current !== request.current.generation) return;
      setRows([]); setMessage(e instanceof Error ? e.message : 'No se pudo consultar el panel.');
    }
    setLoading(false);
  }, [date, origen]);
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
  const alerts = filtered.filter((r) => r.alerta_activa || r.alerta_trs);
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
        <SelectorOrigen value={origen} onChange={v => { setOrigen(v); setMachine(''); setRows([]); }} />
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
          <strong>{[r.alerta_activa && "SCRAP SUPERIOR AL 3%", r.alerta_trs && "TRS INFERIOR AL 86%"].filter(Boolean).join(" · ")}</strong>
          <span>
            {r.maquina} · {r.turno} · {r.fecha} ·{" "}
            Scrap: {r.pct_scrap == null ? "Pendiente" : `${Number(r.pct_scrap).toFixed(2)} %`} · TRS: {r.pct_trs == null ? "Pendiente de cierre" : `${Number(r.pct_trs).toFixed(2)} %`}
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
                  "Estado scrap",
                  "TRS (meta ≥ 86%)",
                  "Estado TRS",
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
                  <td>{r.pct_trs == null ? "—" : `${Number(r.pct_trs).toFixed(2)} %`}</td>
                  <td><span className={r.pct_trs == null ? "badge pending" : r.alerta_trs ? "badge danger" : "badge good"}>
                    {r.pct_trs == null ? `Pendiente de cierre (${r.registros_pendientes_trs})` : r.alerta_trs ? "Bajo meta" : "Meta cumplida"}
                  </span></td>
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
          {" "}TRS = piezas OK ÷ (objetivo por hora × horas programadas) × 100.
          Se suman los objetivos de los registros una sola vez, no se promedian porcentajes.
          Se calcula al cerrar todos los registros del grupo. Exactamente 86% cumple la meta;
          un valor inferior activa alerta, sin redondear para decidir.
        </p>
      </section>
      <p className="hint">
        Sesión: {perfil?.rol}. La fecha corresponde al inicio del turno.
      </p>
    </main>
  );
}
