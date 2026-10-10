"use client";
import { useEffect, useState } from "react";
import { authRedirectFailed, supabase } from "@/lib/supabaseClient";

export default function RestablecerContrasena() {
  const [email, setEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function verificar() {
      try {
        // Wait for the SDK to process the recovery link before checking identity.
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (authRedirectFailed || sessionError || !session.session) return;
        const { data, error } = await supabase.auth.getUser();
        if (active && !error) setEmail(data.user?.email ?? "");
      } finally { if (active) setChecking(false); }
    }
    void verificar().catch(() => { if (active) setMessage("No se pudo verificar el enlace. Comprueba tu conexión y vuelve a abrirlo."); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") setEmail("");
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !email || done) return;
    if (password.length < 12) { setMessage("Usa al menos 12 caracteres."); return; }
    if (password !== confirm) { setMessage("Las contraseñas no coinciden."); return; }
    setBusy(true);
    setMessage("");
    try {
      const { data: identity, error: identityError } = await supabase.auth.getUser();
      if (identityError || identity.user?.email !== email) {
        setEmail("");
        setMessage("La sesión cambió o venció. Abre de nuevo tu enlace de recuperación.");
        return;
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage(error.code === "same_password"
          ? "Elige una contraseña diferente de la anterior."
          : "No se pudo cambiar la contraseña. Usa al menos 12 caracteres; si el enlace venció, solicita uno nuevo.");
        return;
      }
      setPassword(""); setConfirm(""); setDone(true);
      // Password is already changed even if closing the local session fails.
      try {
        const { error: logoutError } = await supabase.auth.signOut({ scope: "local" });
        setMessage(logoutError
          ? "Contraseña actualizada. No se pudo cerrar esta sesión; puedes hacerlo con Salir."
          : "Contraseña actualizada. Ya puedes iniciar sesión con tu nueva contraseña.");
      } catch { setMessage("Contraseña actualizada. No se pudo cerrar esta sesión; puedes hacerlo con Salir."); }
    } catch { setMessage("No se confirmó la operación. Comprueba tu conexión antes de volver a intentarlo."); }
    finally { setBusy(false); }
  }
  return <main className="workspace narrow">
    <h1>Restablecer contraseña</h1>
    {checking ? <p role="status">Verificando acceso…</p> : done ? <section className="surface">
      <p role="status">{message || "Contraseña actualizada."}</p><a href="/login">Iniciar sesión</a>
    </section> : !email ? <section className="surface">
      <p role="alert">{message || "Abre el enlace de recuperación enviado a tu correo. Si venció o ya fue utilizado, solicita uno nuevo."}</p>
      <a href="/recuperar-contrasena">Solicitar otro enlace</a>
    </section> : <form onSubmit={guardar} className="surface form-grid single">
      <p>Cuenta: <strong>{email}</strong></p>
      <label>Contraseña nueva<input required type="password" autoComplete="new-password" minLength={12} value={password} onChange={(e) => setPassword(e.target.value)} disabled={busy} /></label>
      <label>Confirmar contraseña nueva<input required type="password" autoComplete="new-password" minLength={12} value={confirm} onChange={(e) => setConfirm(e.target.value)} disabled={busy} /></label>
      <p className="hint">Usa al menos 12 caracteres. No compartas tu contraseña.</p>
      {message && <p role="alert">{message}</p>}
      <button className="primary" disabled={busy}>{busy ? "Guardando…" : "Guardar nueva contraseña"}</button>
      <a href="/recuperar-contrasena">Solicitar otro enlace</a>
    </form>}
  </main>;
}
