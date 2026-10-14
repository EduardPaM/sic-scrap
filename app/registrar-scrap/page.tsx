"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Access, useSession } from "@/components/session";
import { camposScrap as campos, camposFaltantes, cambiarCampoScrap, type CampoScrap, type FormScrap } from "@/lib/scrap-form";

import { moldePermitido, type RelacionMolde } from "@/lib/moldes";

type Catalogo = { id: number; nombre: string };

export default function RegistrarScrapPage() {
  const [maquinas, setMaquinas] = useState<Catalogo[]>([]);
  const [turnos, setTurnos] = useState<Catalogo[]>([]);
  const [relaciones, setRelaciones] = useState<RelacionMolde[]>([]);
  const [lotes, setLotes] = useState<
    { id_lote: number; codigo_lote: string; id_resina: number }[]
  >([]);
  const [moldes, setMoldes] = useState<
    { id_molde: number; codigo_molde: string }[]
  >([]);
  const [resinas, setResinas] = useState<Catalogo[]>([]);
  const [causas, setCausas] = useState<
    { id_causa: number; codigo: string; nombre: string }[]
  >([]);

  const [form, setForm] = useState({
    maquina: "",
    turno: "",
    lote: "",
    molde: "",
    resina: "",
    cantidad: "",
    causa: "",
    observaciones: "",
    fecha: "",
    hora: "",
  });
  const solicitud = useRef<string | null>(null);
  const bloqueo = useRef(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [validar, setValidar] = useState(false);
  const [avisoLote, setAvisoLote] = useState("");
  const { perfil } = useSession();
  // Un operador con turno asignado solo captura ese turno (lo exige también la base de datos).
  const turnoFijo = perfil?.id_turno ? String(perfil.id_turno) : null;
  const datos = turnoFijo ? { ...form, turno: turnoFijo } : form;
  const faltantes = camposFaltantes(datos);
  function atributos(campo: CampoScrap) {
    return {
      id: `scrap-${campo}`,
      "aria-required": true as const,
      "aria-invalid": validar && faltantes.includes(campo),
    };
  }

  useEffect(() => {
    async function cargarCatalogos() {
      const [m, t, relaciones, l, mo, r, c] = await Promise.all([
        supabase.from("maquina").select("id_maquina, nombre"),
        supabase.from("turno").select("id_turno, nombre"),
        supabase.from("maquina_molde").select("id_maquina,id_molde"),
        supabase
          .from("lote_materia_prima")
          .select("id_lote, codigo_lote, id_resina"),
        supabase.from("molde").select("id_molde, codigo_molde").eq("disponible_captura", true).order("codigo_molde"),
        supabase.from("resina").select("id_resina, nombre"),
        supabase.from("causa_scrap").select("id_causa, codigo, nombre"),
      ]);
      setForm((prev) => ({
        ...prev,
        fecha: new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
        }).format(new Date()),
        hora: new Intl.DateTimeFormat("en-GB", {
          timeZone: "America/Mexico_City",
          hour: "2-digit",
          hourCycle: "h23",
        }).format(new Date()),
      }));
      if ([m, t, relaciones, l, mo, r, c].some((x) => x.error))
        setMensaje(
          "Error al cargar catálogos. Comprueba la sesión y la conexión.",
        );
      setMaquinas(
        m.data?.map((x) => ({ id: x.id_maquina, nombre: x.nombre })) ?? [],
      );
      setTurnos(
        t.data?.map((x) => ({ id: x.id_turno, nombre: x.nombre })) ?? [],
      );
      setRelaciones(relaciones.data ?? []);
      setLotes(l.data ?? []);
      setMoldes(mo.data ?? []);
      setResinas(
        r.data?.map((x) => ({ id: x.id_resina, nombre: x.nombre })) ?? [],
      );
      setCausas(c.data ?? []);
    }
    cargarCatalogos();
  }, []);

  function actualizarCampo(campo: keyof FormScrap, valor: string) {
    solicitud.current = null;
    setMensaje(null);
    const siguiente = cambiarCampoScrap(form, campo, valor, lotes);
    const limpiarLote = !!form.lote && !siguiente.lote;
    if (campo === "resina" || campo === "lote") {
      setAvisoLote(limpiarLote ? "La resina cambió: selecciona un lote que corresponda a esta resina." : "");
    }
    setForm((prev) => ({ ...cambiarCampoScrap(prev, campo, valor, lotes), ...(campo === "maquina" ? { molde: "" } : {}) }));
  }

  async function registrarScrap() {
    if (bloqueo.current) return;
    setMensaje(null);
    setValidar(true);
    if (faltantes.length) {
      setMensaje(`Falta completar: ${faltantes.map((campo) => campos[campo]).join(", ")}.`);
      document.getElementById(`scrap-${faltantes[0]}`)?.focus();
      return;
    }
    const cantidad = Number(form.cantidad),
      hora = Number(form.hora);
    if (
      !Number.isSafeInteger(cantidad) ||
      cantidad <= 0 ||
      cantidad > 2147483647 ||
      !Number.isInteger(hora) ||
      hora < 0 ||
      hora > 23
    ) {
      setMensaje("Error: cantidad entera positiva y hora entre 0 y 23.");
      return;
    }
    bloqueo.current = true;
    setEnviando(true);
    solicitud.current ??= crypto.randomUUID();
    try {
      const { data, error } = await supabase.rpc("guardar_captura_molde", {
        p_fecha: form.fecha,
        p_maquina: Number(form.maquina),
        p_turno: Number(datos.turno),
        p_lote: Number(form.lote),
        p_molde: Number(form.molde),
        p_resina: Number(form.resina),
        p_hora: hora,
        p_causa: Number(form.causa),
        p_cantidad: cantidad,
        p_observaciones: form.observaciones,
        p_solicitud: solicitud.current,
      });
      if (error) {
        setMensaje(`Error: ${error.message}`);
        return;
      }
      const { data: indicador, error: errorPanel } = await supabase
        .from("v_scrap_turno")
        .select("pct_scrap,alerta_activa")
        .eq("fecha", form.fecha)
        .eq("id_maquina", Number(form.maquina))
        .eq("id_turno", Number(datos.turno))
        .maybeSingle();
      const estado = errorPanel
        ? "No se pudo consultar la alerta; actualiza el panel."
        : indicador?.pct_scrap == null
          ? "Falta completar producción para calcular el porcentaje."
          : indicador.alerta_activa
            ? `ALERTA: SCRAP SUPERIOR AL 3% (${Number(indicador.pct_scrap).toFixed(2)} %).`
            : `Scrap del turno: ${Number(indicador.pct_scrap).toFixed(2)} %.`;
      setMensaje(
        `✓ Scrap registrado correctamente — Registro #${data}. ${estado}`,
      );
      setForm((prev) => ({
        ...prev,
        cantidad: "",
        causa: "",
        observaciones: "",
      }));
      solicitud.current = null;
      setValidar(false);
    } catch {
      setMensaje(
        "Error de conexión. Puedes reintentar sin duplicar la captura.",
      );
    } finally {
      bloqueo.current = false;
      setEnviando(false);
    }
  }

  return (
    <Access roles={["operador"]}>
      <main className="workspace narrow">
        <fieldset disabled={enviando} className="surface space-y-4">
          <p className="eyebrow">CAPTURA DE PLANTA</p>
          <h1>Registrar scrap</h1>
          <div className="form-grid">
            <label>
              Fecha de inicio del turno
              <input
                {...atributos("fecha")}
                type="date"
                value={form.fecha}
                onChange={(e) => actualizarCampo("fecha", e.target.value)}
              />
            </label>
            <label>
              Hora del reloj (0–23)
              <input
                {...atributos("hora")}
                type="number"
                min="0"
                max="23"
                value={form.hora}
                onChange={(e) => actualizarCampo("hora", e.target.value)}
              />
            </label>
          </div>
          <p className="hint">
            Para el turno nocturno usa la fecha en que comenzó, incluso después
            de medianoche. Cantidades en piezas.
          </p>
          <p className="text-sm text-muted-foreground">
            Todos los campos son obligatorios excepto Observaciones.
          </p>

          <div className="space-y-2">
            <Label>Máquina</Label>
            <Select
              value={form.maquina}
              onValueChange={(v) => actualizarCampo("maquina", v)}
            >
              <SelectTrigger {...atributos("maquina")} aria-label="Máquina">
                <SelectValue placeholder="Seleccionar máquina" />
              </SelectTrigger>
              <SelectContent>
                {maquinas.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Turno</Label>
            <Select
              value={datos.turno}
              onValueChange={(v) => actualizarCampo("turno", v)}
              disabled={!!turnoFijo}
            >
              <SelectTrigger {...atributos("turno")} aria-label="Turno">
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                {turnos.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Lote</Label>
            <Select
              value={form.lote}
              onValueChange={(v) => actualizarCampo("lote", v)}
            >
              <SelectTrigger {...atributos("lote")} aria-label="Lote" aria-describedby="ayuda-lote">
                <SelectValue placeholder="Seleccionar lote" />
              </SelectTrigger>
              <SelectContent>
                {!lotes.some((l) => !form.resina || l.id_resina === Number(form.resina)) && (
                  <p className="p-3 text-sm">No hay lotes disponibles para esta resina. Solicita el alta del lote al administrador.</p>
                )}
                {lotes
                  .filter(
                    (l) => !form.resina || l.id_resina === Number(form.resina),
                  )
                  .map((l) => (
                    <SelectItem key={l.id_lote} value={String(l.id_lote)}>
                      {l.codigo_lote}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p id="ayuda-lote" className="hint">
              {avisoLote || "Selecciona el lote real de materia prima. Su resina se completa automáticamente; si eliges otra resina, solo se muestran sus lotes."}
            </p>
            {validar && !form.lote && <p className="text-sm text-red-600">Falta seleccionar el lote.</p>}
          </div>

          <div className="space-y-2">
            <Label>Molde / # de parte</Label>
            <Select
              value={form.molde}
              onValueChange={(v) => actualizarCampo("molde", v)}
            >
              <SelectTrigger {...atributos("molde")} aria-label="Molde">
                <SelectValue placeholder={form.maquina ? "Seleccionar molde" : "Selecciona primero la máquina"} />
              </SelectTrigger>
              <SelectContent>
                {moldes.filter((m) => moldePermitido(form.maquina, m.id_molde, relaciones)).map((m) => (
                  <SelectItem key={m.id_molde} value={String(m.id_molde)}>
                    {m.codigo_molde}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resina</Label>
            <Select
              value={form.resina}
              onValueChange={(v) => actualizarCampo("resina", v)}
            >
              <SelectTrigger {...atributos("resina")} aria-label="Resina">
                <SelectValue placeholder="Seleccionar resina" />
              </SelectTrigger>
              <SelectContent>
                {resinas.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scrap-cantidad">Cantidad de scrap</Label>
            <Input
              {...atributos("cantidad")}
              type="number"
              min={1}
              value={form.cantidad}
              onChange={(e) => actualizarCampo("cantidad", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Causa del scrap</Label>
            <Select
              value={form.causa}
              onValueChange={(v) => actualizarCampo("causa", v)}
            >
              <SelectTrigger {...atributos("causa")} aria-label="Causa del scrap">
                <SelectValue placeholder="Seleccionar causa" />
              </SelectTrigger>
              <SelectContent>
                {causas.map((c) => (
                  <SelectItem key={c.id_causa} value={String(c.id_causa)}>
                    {c.codigo} — {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              maxLength={250}
              value={form.observaciones}
              onChange={(e) => actualizarCampo("observaciones", e.target.value)}
            />
          </div>

          {mensaje && (
            <p
              role="status"
              className={
                mensaje.startsWith("✓") ? "text-green-700" : "text-red-600"
              }
            >
              {mensaje}
            </p>
          )}

          <Button
            onClick={registrarScrap}
            disabled={enviando}
            className="w-full"
          >
            {enviando ? "Guardando..." : "REGISTRAR SCRAP"}
          </Button>
        </fieldset>
      </main>
    </Access>
  );
}
