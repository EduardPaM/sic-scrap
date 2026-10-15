import { supabase } from '@/lib/supabaseClient';
import { leerPaginas } from './paginacion';
export type OrigenDatos = 'real' | 'demo';
export async function maquinasOrigen(origen: OrigenDatos) {
  return leerPaginas<{ id_maquina: number; nombre: string }>((a, b) => supabase.from('maquina')
    .select('id_maquina,nombre').eq('es_demo', origen === 'demo').order('id_maquina').range(a, b));
}
