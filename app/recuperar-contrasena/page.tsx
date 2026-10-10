"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/restablecer-contrasena",
      });
      setMessage(error
        ? error.status === 429
          ? "Has solicitado varios correos. Espera unos minutos antes de volver a intentarlo."
          : "No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos."
        : "Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña. Revisa también spam y utiliza el correo más reciente.");
    } catch {
      setMessage("No se pudo conectar. Comprueba tu conexión y vuelve a intentarlo.");
    } finally { setBusy(false); }
  }
  return <main className="workspace narrow">
    <h1>Recuperar contraseña</h1>
    <p className="subtitle">Te enviaremos un enlace para que establezcas una contraseña nueva.</p>
    <form onSubmit={enviar} className="surface form-grid single">
      <label>Correo de tu cuenta
        <input type="email" autoComplete="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} disabled={busy} />
      </label>
      <button className="primary" disabled={busy}>{busy ? "Enviando…" : "Enviar enlace de recuperación"}</button>
      {message && <p role="status">{message}</p>}
      <a href="/login">Volver al inicio de sesión</a>
    </form>
  </main>;
}
