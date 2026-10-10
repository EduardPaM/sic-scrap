"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Access } from "@/components/session";
type Perfil = {
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
  auth_user_id: string | null;
};
export default function Usuarios() {
  return (
    <Access roles={["administrador"]}>
      <Perfiles />
    </Access>
  );
}
function Perfiles() {
  const [rows, setRows] = useState<Perfil[]>([]);
  const [turnos, setTurnos] = useState<{ id_turno: number; nombre: string }[]>(
    [],
  );
  const [correo, setCorreo] = useState("");
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("operador");
  const [turno, setTurno] = useState("");
  const [activo, setActivo] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [retirar, setRetirar] = useState<Perfil | null>(null);
  useEffect(() => {
    if (retirar) document.getElementById("confirmar-invitacion")?.focus();
  }, [retirar]);
  async function load() {
    const { data, error } = await supabase
      .from("usuario")
      .select("nombre,correo,rol,activo,auth_user_id")
      .is("invitacion_retirada_en", null)
      .order("nombre");
    if (error) setMessage(error.message);
    else setRows(data ?? []);
  }
  useEffect(() => {
    const initial = setTimeout(() => void load(), 0);
    supabase
      .from("turno")
      .select("id_turno,nombre")
      .then(({ data }) => setTurnos(data ?? []));
    return () => clearTimeout(initial);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.rpc("administrar_perfil", {
        p_correo: correo,
        p_nombre: nombre,
        p_rol: rol,
        p_turno: turno ? Number(turno) : null,
        p_activo: activo,
      });
      setMessage(
        error
          ? error.message
          : "Perfil guardado. No se envió un correo: comparte el enlace de activación para que la persona cree su contraseña y solicite la confirmación.",
      );
      if (!error) await load();
    } catch {
      setMessage("No se pudo guardar. Reintenta.");
    } finally {
      setBusy(false);
    }
  }
  async function eliminarInvitacion() {
    if (!retirar || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("retirar_invitacion", { p_correo: retirar.correo });
      if (error) { setMessage(error.message); return; }
      setMessage(`Invitación de ${retirar.correo} retirada. Para restaurarla, vuelve a guardar su perfil con ese correo.`);
      setRetirar(null);
      await load();
    } catch { setMessage("No se confirmó la eliminación. Actualiza la lista antes de reintentar."); }
    finally { setBusy(false); }
  }
  return (
    <main className="workspace">
      <h1>Usuarios y permisos</h1>
      <p className="subtitle">
        Asigna el acceso antes de que cada integrante active su cuenta.
      </p>
      <section className="surface">
        <h2>Cómo activar a un integrante</h2>
        <ol>
          <li>Guarda su correo y sus permisos en este formulario.</li>
          <li>Comparte el enlace de activación. Cada persona crea su propia contraseña.</li>
          <li>La persona solicita la confirmación, revisa su correo y después inicia sesión.</li>
        </ol>
        <p>Guardar un perfil no envía una invitación por correo.</p>
        <p><a href="/activar-cuenta">Abrir página de activación</a></p>
        <button type="button" onClick={async () => {
          const url = window.location.origin + "/activar-cuenta";
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Enlace de activación copiado. Compártelo con la persona autorizada.");
          } catch {
            setMessage("Copia este enlace de activación: " + url);
          }
        }}>Copiar enlace de activación</button>
      </section>
      <form className="surface form-grid" onSubmit={submit}>
        <label>
          Nombre
          <input
            required
            maxLength={100}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />
        </label>
        <label>
          Correo autorizado
          <input
            required
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
          />
        </label>
        <label>
          Rol
          <select value={rol} onChange={(e) => setRol(e.target.value)}>
            {[
              "operador",
              "supervisor",
              "produccion",
              "calidad",
              "administrador",
            ].map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Turno asignado
          <select
            required={rol === "supervisor"}
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
          >
            <option value="">Sin turno</option>
            {turnos.map((t) => (
              <option key={t.id_turno} value={t.id_turno}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <select
            value={String(activo)}
            onChange={(e) => setActivo(e.target.value === "true")}
          >
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </label>
        <button className="primary" disabled={busy}>
          Guardar perfil
        </button>
      </form>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {retirar && <section id="confirmar-invitacion" tabIndex={-1} className="surface" role="region" aria-label="Confirmar eliminación de invitación">
        <h2>Eliminar invitación</h2>
        <p>¿Retirar a <strong>{retirar.nombre} ({retirar.correo})</strong> de la lista de invitados?</p>
        <p>Este correo perderá la autorización de acceso. Puedes restaurarlo guardando de nuevo su perfil. No se borrará una cuenta ni registros de producción.</p>
        <button type="button" disabled={busy} onClick={() => void eliminarInvitacion()}>{busy ? "Eliminando…" : "Confirmar eliminación"}</button>{" "}
        <button type="button" disabled={busy} onClick={() => setRetirar(null)}>Cancelar</button>
      </section>}
      <section className="surface table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Acceso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.correo}>
                <td>{r.nombre}</td>
                <td>{r.correo}</td>
                <td>{r.rol}</td>
                <td>
                  {!r.activo
                    ? "Inactivo"
                    : r.auth_user_id
                      ? "Vinculado"
                      : "Sin vincular"}
                </td>
                <td>{!r.auth_user_id
                  ? <button type="button" disabled={busy} onClick={() => { setRetirar(r); setMessage(""); }} aria-label={`Eliminar invitación de ${r.correo}`}>Eliminar invitación</button>
                  : <span className="hint">Cuenta vinculada: usa Estado Inactivo para retirar acceso.</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Las invitaciones eliminadas pueden restaurarse guardando de nuevo su perfil. {" "}
          Para actualizar un perfil usa su mismo correo. Cada persona establece
          su contraseña en la página de activación. Sin vincular significa que todavía no ha iniciado sesión con un correo confirmado; no indica que se haya enviado una invitación.
        </p>
      </section>
    </main>
  );
}
