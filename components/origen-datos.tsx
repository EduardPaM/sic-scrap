import type { OrigenDatos } from '@/lib/origen-datos';
export function SelectorOrigen({ value, onChange, disabled = false }: { value: OrigenDatos; onChange: (v: OrigenDatos) => void; disabled?: boolean }) {
  return <div><label>Origen de datos<select value={value} disabled={disabled} onChange={e => onChange(e.target.value as OrigenDatos)}>
    <option value="real">Producción real</option><option value="demo">Demostración (datos hipotéticos)</option>
  </select></label>{value === 'demo' && <p role="status" className="notice">DEMOSTRACIÓN: cantidades hipotéticas para pruebas. No representan resultados de planta.</p>}</div>;
}
