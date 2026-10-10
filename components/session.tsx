"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
export type Perfil = { nombre: string; rol: string; id_turno: number | null };
const Context = createContext<{
  user: User | null;
  perfil: Perfil | null;
  loading: boolean;
}>({ user: null, perfil: null, loading: true });
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    user: User | null;
    perfil: Perfil | null;
    loading: boolean;
  }>({ user: null, perfil: null, loading: true });
  useEffect(() => {
    let generation = 0;
    async function load(user: User | null) {
      const current = ++generation;
      if (!user) {
        setState({ user: null, perfil: null, loading: false });
        return;
      }
      await supabase.rpc("vincular_mi_perfil");
      const { data } = await supabase
        .from("usuario")
        .select("nombre,rol,id_turno")
        .eq("auth_user_id", user.id)
        .eq("activo", true)
        .maybeSingle();
      if (current === generation)
        setState({ user, perfil: data, loading: false });
    }
    void supabase.auth.getUser().then(({ data }) => load(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => void load(session?.user ?? null), 0);
    });
    return () => {
      generation++;
      subscription.unsubscribe();
    };
  }, []);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
export function Access({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: string[];
}) {
  const { user, perfil, loading } = useSession();
  if (loading) return <p className="notice">Comprobando sesión…</p>;
  if (!user)
    return (
      <div className="notice">
        Inicia sesión para continuar. <a href="/login">Ir al acceso</a>
      </div>
    );
  if (!perfil)
    return (
      <p className="notice">
        Tu cuenta todavía no tiene un perfil activo. Solicita la asignación de
        rol al administrador.
      </p>
    );
  if (roles && !roles.includes(perfil.rol.toLowerCase()))
    return <p className="notice">Tu rol no tiene acceso a esta operación.</p>;
  return <>{children}</>;
}
