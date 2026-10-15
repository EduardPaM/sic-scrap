"use client";
import { useEffect, useState } from 'react';
import { Access } from '@/components/session';
import { SelectorOrigen } from '@/components/origen-datos';
import { maquinasOrigen, type OrigenDatos } from '@/lib/origen-datos';
import { supabase } from '@/lib/supabaseClient';
import { leerPaginas } from '@/lib/paginacion';
type Alerta = { id_alerta: number; fecha: string; id_maquina: number; id_turno: number; tipo: string; estado: string; porcentaje: number | null; registrado_en: string };
export default function Alertas() { return <Access><Historial /></Access>; }
function Historial() {
  const [origen,setOrigen] = useState<OrigenDatos>('real');
  const [desde,setDesde] = useState(() => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Mexico_City'}).format(new Date(Date.now()-30*86400000)));
  const [filas,setFilas] = useState<Alerta[]>([]);
  const [equipos,setEquipos] = useState<Record<number,string>>({});
  const [turnos,setTurnos] = useState<Record<number,string>>({});
  const [error,setError] = useState('');
  const [cargando,setCargando] = useState(true);
  const [revision,setRevision] = useState(0);
  useEffect(() => {
    let vivo = true;
    async function cargar() {
      setCargando(true); setError('');
      try {
        if(!desde) throw new Error('Selecciona la fecha inicial.');
        const m = await maquinasOrigen(origen);
        const t = await leerPaginas<{ id_turno:number; nombre:string }>((a,b) => supabase.from('turno').select('id_turno,nombre').order('id_turno').range(a,b));
        const data = m.length ? await leerPaginas<Alerta>((a,b) => supabase.from('alerta_historial').select('*').eq('tipo','scrap').in('id_maquina',m.map(x=>x.id_maquina)).gte('fecha',desde).order('id_alerta',{ascending:false}).range(a,b)) : [];
        if(vivo) { setFilas(data); setEquipos(Object.fromEntries(m.map(x=>[x.id_maquina,x.nombre]))); setTurnos(Object.fromEntries(t.map(x=>[x.id_turno,x.nombre]))); }
      } catch(e) { if(vivo) { setFilas([]); setError(e instanceof Error ? e.message : 'No se pudo cargar el historial.'); } }
      finally { if(vivo) setCargando(false); }
    }
    void cargar(); return () => { vivo=false; };
  },[origen,desde,revision]);
  return <main className="workspace"><div className="page-title"><div><p className="eyebrow">TRAZABILIDAD</p><h1>Historial de alertas</h1><p className="subtitle">Cambios de estado y porcentaje de scrap.</p></div><button disabled={cargando} onClick={()=>setRevision(v=>v+1)}>Actualizar</button></div>
    <div className="surface filters"><SelectorOrigen value={origen} onChange={v=>{setOrigen(v);setFilas([]);}} /><label>Fecha del turno desde<input type="date" value={desde} onChange={e=>setDesde(e.target.value)} /></label></div>
    <p className="hint">El historial comienza al instalar esta función. La hora de registro es la de observación, no la del evento original. «Pendiente» indica datos insuficientes; no significa que la alerta esté resuelta. Consulta las alertas actuales en el Panel.</p>
    {error && <p role="alert" className="notice">{error}</p>}
    <section className="surface table-scroll"><table><thead><tr>{['Observado','Fecha turno','Máquina','Turno','Indicador','Estado','Porcentaje'].map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{filas.map(r=><tr key={r.id_alerta}><td>{new Date(r.registrado_en).toLocaleString('es-MX')}</td><td>{r.fecha}</td><td>{equipos[r.id_maquina]}</td><td>{turnos[r.id_turno]}</td><td>{r.tipo.toUpperCase()}</td><td>{r.estado}</td><td>{r.porcentaje===null?'Pendiente':`${Number(r.porcentaje).toFixed(2)} %`}</td></tr>)}</tbody></table>{!filas.length&&<p>{cargando?'Consultando…':'No hay eventos para esta selección.'}</p>}</section>
  </main>;
}
