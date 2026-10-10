"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
export default function Activar() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin + "/panel" },
      });
      setMessage(
        error
          ? error.message
          : "Revisa tu correo para confirmar la cuenta. Después inicia sesión. Solo los correos autorizados reciben un rol.",
      );
    } catch {
      setMessage("No se pudo conectar. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace narrow">
      <h1>Activar cuenta autorizada</h1>
      <p className="subtitle">
        Establece tu contraseña y confirma tu correo para acceder al sistema.
      </p>
      <form className="surface form-grid single" onSubmit={submit}>
        <label>
          Correo autorizado
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña nueva
          <input
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <p className="hint">
          Usa al menos 12 caracteres. La cuenta requiere confirmación de correo
          y un perfil asignado por el administrador.
        </p>
        <button className="primary" disabled={busy}>
          {busy ? "Enviando…" : "Crear cuenta y enviar confirmación"}
        </button>
        {message && <p role="status">{message}</p>}
        <a href="/login">Ya tengo cuenta: iniciar sesión</a>
      </form>
    </main>
  );
}
