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
  async function load() {
    const { data, error } = await supabase
      .from("usuario")
      .select("nombre,correo,rol,activo,auth_user_id")
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
          : "Perfil guardado. La persona puede activar su cuenta y confirmar su correo.",
      );
      if (!error) await load();
    } catch {
      setMessage("No se pudo guardar. Reintenta.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace">
      <h1>Usuarios y permisos</h1>
      <p className="subtitle">
        Asigna el acceso antes de que cada integrante active su cuenta.
      </p>
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
      <section className="surface table-scroll">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Acceso</th>
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
                      : "Por activar"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Para actualizar un perfil usa su mismo correo. Cada persona establece
          su contraseña en /activar-cuenta.
        </p>
      </section>
    </main>
  );
}
