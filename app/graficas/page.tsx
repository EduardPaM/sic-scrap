"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";
import { Access } from "@/components/session";
import {
  cargarGraficas,
  type BarraPareto,
  type PuntoDia,
} from "@/lib/graficas";

// Colores de la paleta de gráficas (serie 1, serie 2 y estado crítico).
const AZUL = "#2a78d6";
const NARANJA = "#eb6834";
const CRITICO = "#d03b3b";
const REJILLA = "#edf0f5";
const TEXTO = "#64748b";
const LIMITE = 3;

const fmt = (x: number) => new Intl.NumberFormat("es-MX").format(x);
const fechaCorta = (f: string) => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
const fechaMx = (msAtras: number) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(
    new Date(Date.now() - msAtras),
  );

export default function Graficas() {
  return (
    <Access>
      <Contenido />
    </Access>
  );
}

function Contenido() {
  const [desde, setDesde] = useState(() => fechaMx(30 * 24 * 60 * 60 * 1000));
  const [hasta, setHasta] = useState(() => fechaMx(0));
  const [maquina, setMaquina] = useState("");
  const [maquinas, setMaquinas] = useState<{ id_maquina: number; nombre: string }[]>([]);
  const [dias, setDias] = useState<PuntoDia[]>([]);
  const [causas, setCausas] = useState<BarraPareto[]>([]);
  const [sinDato, setSinDato] = useState(0);
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(true);
  const peticion = useRef(0);

  useEffect(() => {
    void supabase
      .from("maquina")
      .select("id_maquina,nombre")
      .order("nombre")
      .then(({ data }) => setMaquinas(data ?? []));
  }, []);

  const cargar = useCallback(async () => {
    if (!desde || !hasta || desde > hasta) {
      setMensaje('Revisa las fechas: "desde" no puede ser posterior a "hasta".');
      return;
    }
    const actual = ++peticion.current;
    setCargando(true);
    try {
      const r = await cargarGraficas(desde, hasta, maquina);
      if (actual !== peticion.current) return;
      setDias(r.dias);
      setCausas(r.causas);
      setSinDato(r.turnosSinDato);
      setMensaje("");
    } catch (e) {
      if (actual !== peticion.current) return;
      setMensaje(e instanceof Error ? e.message : "No se pudieron cargar las gráficas.");
    } finally {
      if (actual === peticion.current) setCargando(false);
    }
  }, [desde, hasta, maquina]);

  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);

  const maxPct = Math.max(LIMITE + 1, ...dias.map((d) => d.pct));
  const techo = Math.ceil(maxPct + 0.5);
  const principales = causas.filter((c, i) => i === 0 || causas[i - 1].acumulado < 80);

  return (
    <main className="workspace">
      <div className="page-title">
        <div>
          <p className="eyebrow">ANÁLISIS DE SCRAP</p>
          <h1>Gráficas y Pareto</h1>
          <p className="subtitle">
            Tendencia del % scrap y causas que más piezas desechan · Cantidades en piezas
          </p>
        </div>
      </div>

      <div className="surface filters">
        <label>
          Desde
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label>
          Hasta
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label>
          Máquina
          <select value={maquina} onChange={(e) => setMaquina(e.target.value)}>
            <option value="">Todas las máquinas</option>
            {maquinas.map((m) => (
              <option key={m.id_maquina} value={m.id_maquina}>
                {m.nombre}
              </option>
            ))}
          </select>
        </label>
        <p className="hint">{cargando ? "Consultando…" : "Datos de la base oficial"}</p>
      </div>

      {mensaje && (
        <p role="alert" className="notice">
          {mensaje}
        </p>
      )}

      <section className="surface">
        <h2>% scrap por día</h2>
        {dias.length ? (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={dias} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                <CartesianGrid stroke={REJILLA} vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tickFormatter={fechaCorta}
                  tick={{ fill: TEXTO, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, techo]}
                  tickFormatter={(v: number) => `${v} %`}
                  tick={{ fill: TEXTO, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <ReferenceLine
                  y={LIMITE}
                  stroke={CRITICO}
                  strokeDasharray="6 4"
                  label={{ value: "Límite 3 %", position: "insideTopRight", fill: CRITICO, fontSize: 12 }}
                />
                <Tooltip content={(p) => <TooltipDia {...p} />} />
                <Line
                  type="linear"
                  dataKey="pct"
                  name="% scrap"
                  stroke={AZUL}
                  strokeWidth={2}
                  dot={{ r: 4, fill: AZUL, stroke: "white", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="empty">
            {cargando
              ? "Consultando producción…"
              : "No hay días con producción completa en este rango."}
          </p>
        )}
        <p className="hint">
          % scrap = piezas scrap ÷ piezas inyectadas × 100. Solo se grafican turnos con
          producción completa
          {sinDato > 0 &&
            `; ${sinDato} ${sinDato === 1 ? "turno queda" : "turnos quedan"} fuera porque les falta capturar producción`}
          .
        </p>
      </section>

      <section className="surface">
        <h2>Pareto de causas</h2>
        {causas.length ? (
          <>
            <div style={{ width: "100%", height: 360 }}>
              <ResponsiveContainer>
                <ComposedChart data={causas} margin={{ top: 16, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke={REJILLA} vertical={false} />
                  <XAxis
                    dataKey="codigo"
                    tick={{ fill: TEXTO, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    interval={0}
                  />
                  <YAxis
                    domain={[0, 100]}
                    ticks={[0, 20, 40, 60, 80, 100]}
                    tickFormatter={(v: number) => `${v} %`}
                    tick={{ fill: TEXTO, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={56}
                  />
                  <ReferenceLine
                    y={80}
                    stroke={TEXTO}
                    strokeDasharray="4 4"
                    label={{ value: "80 %", position: "insideTopLeft", fill: TEXTO, fontSize: 12 }}
                  />
                  <Tooltip content={(p) => <TooltipCausa {...p} />} cursor={{ fill: "#f3f6fa" }} />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: 12, color: TEXTO }} />
                  <Bar
                    dataKey="pct"
                    name="% del scrap"
                    fill={AZUL}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    isAnimationActive={false}
                  />
                  <Line
                    type="linear"
                    dataKey="acumulado"
                    name="% acumulado"
                    stroke={NARANJA}
                    strokeWidth={2}
                    dot={{ r: 4, fill: NARANJA, stroke: "white", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="hint">
              {principales.length === 1 ? "La causa" : `Las ${principales.length} causas`}{" "}
              {principales.map((c) => c.codigo).join(", ")}{" "}
              {principales.length === 1 ? "explica" : "explican"} el{" "}
              {principales[principales.length - 1].acumulado.toFixed(1)} % del scrap: ahí conviene
              actuar primero.
            </p>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    {["Código", "Causa", "Categoría", "Piezas", "% del scrap", "% acumulado"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {causas.map((c) => (
                    <tr key={c.codigo}>
                      <td>{c.codigo}</td>
                      <td>{c.nombre}</td>
                      <td>{c.categoria}</td>
                      <td>{fmt(c.piezas)}</td>
                      <td>{c.pct.toFixed(2)} %</td>
                      <td>{c.acumulado.toFixed(2)} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="empty">
            {cargando ? "Consultando causas…" : "No hay scrap registrado en este rango."}
          </p>
        )}
      </section>
    </main>
  );
}

type PropsTooltip<T> = {
  active?: boolean;
  payload?: ReadonlyArray<{ payload?: T }>;
};

function TooltipDia({ active, payload }: PropsTooltip<PuntoDia>) {
  const d = payload?.[0]?.payload;
  if (!active || !d) return null;
  const fuera = d.pct > LIMITE;
  return (
    <div className="chart-tooltip">
      <strong>{d.fecha}</strong>
      <span>
        {d.pct.toFixed(2)} % · {fmt(d.scrap)} de {fmt(d.inyectadas)} piezas
      </span>
      <span>{fuera ? "⚠ Fuera de rango (más de 3 %)" : "✓ En rango"}</span>
    </div>
  );
}

function TooltipCausa({ active, payload }: PropsTooltip<BarraPareto>) {
  const c = payload?.[0]?.payload;
  if (!active || !c) return null;
  return (
    <div className="chart-tooltip">
      <strong>
        {c.codigo} · {c.nombre}
      </strong>
      <span>{c.categoria}</span>
      <span>
        {fmt(c.piezas)} piezas · {c.pct.toFixed(2)} % del scrap
      </span>
      <span>Acumulado: {c.acumulado.toFixed(2)} %</span>
    </div>
  );
}
