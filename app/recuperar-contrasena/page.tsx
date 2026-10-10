"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RecuperarContrasena() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setRecovery(true);
          setMessage("");
        }
      });

    // El enlace de recuperaciÃ³n puede procesarse antes de montar la pÃ¡gina.
    const params = new URLSearchParams(window.location.hash.slice(1));
    void supabase.auth.getSession().then(({ data, error }) => {
      if (params.has("error")) {
        setMessage("El enlace no es valido o vencio. Solicita uno nuevo.");
      } else if (
        params.get("type") === "recovery" &&
        !error &&
        data.session
      ) {
        setRecovery(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");

    try {
      if (!recovery) {
        const { error } = await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              window.location.origin + "/recuperar-contrasena",
          },
        );
        setMessage(
          error
            ? error.message
            : "Solicitud enviada. Revisa tu correo y abre el enlace mÃ¡s reciente.",
        );
      } else {
        if (password !== confirm) {
          setMessage("Las contraseÃ±as no coinciden.");
          return;
        }

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
          setMessage(error.message);
        } else {
          setPassword("");
          setConfirm("");
          setDone(true);
          setMessage("ContraseÃ±a actualizada correctamente.");
        }
      }
    } catch {
      setMessage("No se pudo conectar. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="workspace narrow">
      <h1>Recuperar contraseÃ±a</h1>
      {done ? (
        <div className="surface">
          <p role="status">{message}</p>
          <a href="/panel">Ir al panel</a>
        </div>
      ) : (
        <form className="surface form-grid single" onSubmit={submit}>
          {recovery ? (
            <>
              <label>
                ContraseÃ±a nueva
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <label>
                Repite la contraseÃ±a
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              </label>
              <p>Usa al menos 12 caracteres.</p>
            </>
          ) : (
            <label>
              Correo de tu cuenta
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Procesando..."
              : recovery
                ? "Guardar contraseÃ±a"
                : "Enviar correo de recuperaciÃ³n"}
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      )}
    </main>
  );
}
