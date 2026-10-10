"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setMessage("No se pudo iniciar sesión. Revisa tu correo y contraseña.");
      } else router.push("/panel");
    } catch {
      setMessage("No se pudo conectar. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="workspace narrow">
      <p className="eyebrow">ACCESO AL SISTEMA</p>
      <h1>Bienvenido a SIC SCRAP</h1>
      <p className="subtitle">
        Consulta la producción y registra los datos de tu turno.
      </p>
      <form className="surface form-grid single" onSubmit={submit}>
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {message && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy}>
          {busy ? "Ingresando…" : "Iniciar sesión"}
        </button>
        <a href="/activar-cuenta">Primera vez: activar mi cuenta autorizada</a>
        <p className="hint">
          Las cuentas y sus permisos son asignados por el administrador.
        </p>
      </form>
    </main>
  );
}
