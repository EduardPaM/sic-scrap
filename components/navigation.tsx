"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "./session";
import { supabase } from "@/lib/supabaseClient";
export function Navigation() {
  const { user, perfil } = useSession();
  const path = usePathname();
  const rol = perfil?.rol.toLowerCase();
  const links = [
    ["/panel", "Panel"],
    ["/graficas", "Gráficas"],
    ["/exportar", "Exportar"],
    ...(rol === "administrador" ? [["/usuarios", "Usuarios"]] : []),
    ...(rol === "operador" ? [["/registrar-scrap", "Capturar scrap"]] : []),
    ...(["supervisor", "administrador"].includes(rol ?? "")
      ? [["/cierre-turno", "Producción y cierre"]]
      : []),
  ];
  return (
    <header className="site-header">
      <div className="brand">
        <span className="brand-icon">S</span>
        <div>
          <strong>SIC SCRAP</strong>
          <small>Registro y trazabilidad de producción</small>
        </div>
      </div>
      <nav aria-label="Navegación principal">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <div className="identity">
        {user ? (
          <>
            <span>
              {perfil?.nombre ?? user.email}
              <small>{perfil?.rol ?? "Sin rol"}</small>
            </span>
            <button onClick={() => void supabase.auth.signOut()}>Salir</button>
          </>
        ) : (
          <Link href="/login">Iniciar sesión</Link>
        )}
      </div>
    </header>
  );
}
