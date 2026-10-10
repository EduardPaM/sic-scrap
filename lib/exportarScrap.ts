// Exportación de registros de scrap a Excel (HU-10, auditorías IATF/ISO).
// Solo LEE de Supabase: no inserta, no modifica y no toca el esquema.
// Las tablas se consultan por separado y se unen aquí para no depender
// de los nombres de las llaves foráneas en PostgREST.

import { supabase } from '@/lib/supabaseClient'

type Fila = Record<string, string | number>

// PostgREST manda los filtros .in() en la URL; se parte en bloques para no exceder su largo.
const TAM_BLOQUE = 200

async function consultarPorIds<T>(
  tabla: string,
  columnas: string,
  campo: string,
  ids: number[],
): Promise<T[]> {
  const resultado: T[] = []
  for (let i = 0; i < ids.length; i += TAM_BLOQUE) {
    const bloque = ids.slice(i, i + TAM_BLOQUE)
    const { data, error } = await supabase.from(tabla).select(columnas).in(campo, bloque)
    if (error) throw new Error(`Error al leer ${tabla}: ${error.message}`)
    resultado.push(...((data ?? []) as T[]))
  }
  return resultado
}

async function consultarTodo<T>(tabla: string, columnas: string): Promise<T[]> {
  const { data, error } = await supabase.from(tabla).select(columnas)
  if (error) throw new Error(`Error al leer ${tabla}: ${error.message}`)
  return (data ?? []) as T[]
}

function indexar<T>(lista: T[], clave: keyof T): Map<number, T> {
  return new Map(lista.map(x => [Number(x[clave]), x]))
}

type Registro = {
  id_registro: number; fecha: string; id_maquina: number | null; id_pieza: number | null
  id_lote: number | null; id_turno: number | null; id_operador: number | null
}
type Hora = {
  id_produccion_hora: number; id_registro: number; numero_hora: number | null
  piezas_inyectadas: number | null; piezas_scrap: number | null
}
type Detalle = {
  id_detalle_scrap: number; id_produccion_hora: number; id_causa: number | null
  cantidad: number | null; observaciones: string | null
}
type UsoMolde = { id_registro: number; id_molde: number }
type Lote = { id_lote: number; codigo_lote: string; id_resina: number | null }
type Causa = { id_causa: number; codigo: string; nombre: string; categoria: string }

export type ResultadoExportacion = { filasDetalle: number; filasHora: number; archivo: string }

/**
 * % Scrap oficial: Scrap / (OK + Scrap) × 100 = Scrap / Piezas Inyectadas × 100.
 * Si no hay piezas inyectadas capturadas (o son menos que el scrap) no se calcula,
 * para no reportar un porcentaje falso.
 */
export function porcentajeScrap(inyectadas: number, scrap: number): number | null {
  if (inyectadas <= 0 || scrap > inyectadas) return null
  return Math.round((scrap / inyectadas) * 10000) / 100
}

export async function exportarScrapExcel(desde: string, hasta: string): Promise<ResultadoExportacion> {
  // 1) Registros de producción dentro del rango de fechas
  const { data: regData, error: regError } = await supabase
    .from('registro_produccion')
    .select('id_registro, fecha, id_maquina, id_pieza, id_lote, id_turno, id_operador')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: true })
  if (regError) throw new Error(`Error al leer registro_produccion: ${regError.message}`)
  const registros = (regData ?? []) as Registro[]
  if (registros.length === 0) throw new Error('No hay registros en ese rango de fechas.')

  const idsRegistro = registros.map(r => r.id_registro)

  // 2) Horas, moldes y catálogos
  const [horas, usosMolde, maquinas, piezas, lotes, resinas, turnos, moldes, causas, personal] =
    await Promise.all([
      consultarPorIds<Hora>('produccion_hora',
        'id_produccion_hora, id_registro, numero_hora, piezas_inyectadas, piezas_scrap',
        'id_registro', idsRegistro),
      consultarPorIds<UsoMolde>('uso_molde', 'id_registro, id_molde', 'id_registro', idsRegistro),
      consultarTodo<{ id_maquina: number; nombre: string }>('maquina', 'id_maquina, nombre'),
      consultarTodo<{ id_pieza: number; nombre: string }>('pieza', 'id_pieza, nombre'),
      consultarTodo<Lote>('lote_materia_prima', 'id_lote, codigo_lote, id_resina'),
      consultarTodo<{ id_resina: number; nombre: string }>('resina', 'id_resina, nombre'),
      consultarTodo<{ id_turno: number; nombre: string }>('turno', 'id_turno, nombre'),
      consultarTodo<{ id_molde: number; codigo_molde: string }>('molde', 'id_molde, codigo_molde'),
      consultarTodo<Causa>('causa_scrap', 'id_causa, codigo, nombre, categoria'),
      consultarTodo<{ id_personal: number; nombre: string }>('personal', 'id_personal, nombre'),
    ])

  // 3) Detalle de scrap con causa
  const detalles = await consultarPorIds<Detalle>('detalle_scrap',
    'id_detalle_scrap, id_produccion_hora, id_causa, cantidad, observaciones',
    'id_produccion_hora', horas.map(h => h.id_produccion_hora))

  const mRegistro = indexar(registros, 'id_registro')
  const mHora = indexar(horas, 'id_produccion_hora')
  const mMaquina = indexar(maquinas, 'id_maquina')
  const mPieza = indexar(piezas, 'id_pieza')
  const mLote = indexar(lotes, 'id_lote')
  const mResina = indexar(resinas, 'id_resina')
  const mTurno = indexar(turnos, 'id_turno')
  const mMolde = indexar(moldes, 'id_molde')
  const mCausa = indexar(causas, 'id_causa')
  const mPersonal = indexar(personal, 'id_personal')

  const moldesPorRegistro = new Map<number, string[]>()
  for (const u of usosMolde) {
    const codigo = mMolde.get(u.id_molde)?.codigo_molde ?? `#${u.id_molde}`
    const lista = moldesPorRegistro.get(u.id_registro) ?? []
    if (!lista.includes(codigo)) lista.push(codigo)
    moldesPorRegistro.set(u.id_registro, lista)
  }

  // Columnas de trazabilidad comunes a ambas hojas
  function trazabilidad(r: Registro): Fila {
    const lote = r.id_lote != null ? mLote.get(r.id_lote) : undefined
    const resina = lote?.id_resina != null ? mResina.get(lote.id_resina) : undefined
    return {
      'ID registro': r.id_registro,
      'Fecha': r.fecha,
      'Turno': r.id_turno != null ? mTurno.get(r.id_turno)?.nombre ?? '' : '',
      'Máquina': r.id_maquina != null ? mMaquina.get(r.id_maquina)?.nombre ?? '' : '',
      'Referencia de pieza': r.id_pieza != null ? mPieza.get(r.id_pieza)?.nombre ?? '' : '',
      'Lote': lote?.codigo_lote ?? '',
      'Resina (del lote)': resina?.nombre ?? '',
      'Molde': (moldesPorRegistro.get(r.id_registro) ?? []).join(', '),
      'Operador': r.id_operador != null ? mPersonal.get(r.id_operador)?.nombre ?? '' : '',
    }
  }

  // Hoja 1: una fila por causa de scrap registrada
  const hojaDetalle: Fila[] = []
  for (const d of detalles) {
    const h = mHora.get(d.id_produccion_hora)
    const r = h ? mRegistro.get(h.id_registro) : undefined
    if (!h || !r) continue
    const causa = d.id_causa != null ? mCausa.get(d.id_causa) : undefined
    hojaDetalle.push({
      ...trazabilidad(r),
      'Hora': h.numero_hora ?? '',
      'Código causa': causa?.codigo ?? '',
      'Causa': causa?.nombre ?? '',
      'Categoría (6M)': causa?.categoria ?? '',
      'Scrap (piezas)': d.cantidad ?? 0,
      'Observaciones': d.observaciones ?? '',
    })
  }

  // Hoja 2: una fila por hora de producción, con % Scrap oficial
  const hojaHora: Fila[] = []
  for (const h of horas) {
    const r = mRegistro.get(h.id_registro)
    if (!r) continue
    const inyectadas = h.piezas_inyectadas ?? 0
    const scrap = h.piezas_scrap ?? 0
    const pct = porcentajeScrap(inyectadas, scrap)
    hojaHora.push({
      ...trazabilidad(r),
      'Hora': h.numero_hora ?? '',
      'Piezas inyectadas (OK + Scrap)': inyectadas,
      'Piezas OK': pct === null ? '' : inyectadas - scrap,
      'Piezas scrap': scrap,
      '% Scrap': pct === null ? 'Sin piezas OK capturadas' : pct,
    })
  }

  const ordenar = (a: Fila, b: Fila) =>
    String(a['Fecha']).localeCompare(String(b['Fecha'])) ||
    Number(a['ID registro']) - Number(b['ID registro'])
  hojaDetalle.sort(ordenar)
  hojaHora.sort(ordenar)

  const hojaInfo = [
    { 'Campo': 'Sistema', 'Valor': 'SIC SCRAP · Trazabilidad de scrap' },
    { 'Campo': 'Rango de fechas', 'Valor': `${desde} a ${hasta}` },
    { 'Campo': 'Generado', 'Valor': new Date().toLocaleString('es-MX') },
    { 'Campo': 'Unidad de scrap', 'Valor': 'Piezas' },
    { 'Campo': 'Fórmula % Scrap', 'Valor': 'Scrap / (OK + Scrap) × 100' },
    { 'Campo': 'Nota', 'Valor': 'El % Scrap solo se calcula cuando hay piezas inyectadas capturadas.' },
    { 'Campo': 'Filas de detalle', 'Valor': String(hojaDetalle.length) },
    { 'Campo': 'Filas por hora', 'Valor': String(hojaHora.length) },
  ]

  // 4) Generar el archivo (SheetJS se carga solo al exportar)
  const XLSX = await import('xlsx')
  const libro = XLSX.utils.book_new()
  const agregar = (filas: object[], nombre: string) => {
    const hoja = XLSX.utils.json_to_sheet(filas)
    const encabezados = Object.keys(filas[0] ?? {})
    hoja['!cols'] = encabezados.map(h => ({
      wch: Math.min(45, Math.max(h.length, ...filas.map(f => String((f as Fila)[h] ?? '').length)) + 2),
    }))
    XLSX.utils.book_append_sheet(libro, hoja, nombre)
  }
  agregar(hojaDetalle.length ? hojaDetalle : [{ 'Sin datos': 'No hay detalle de scrap en el rango' }], 'Detalle scrap')
  agregar(hojaHora.length ? hojaHora : [{ 'Sin datos': 'No hay producción por hora en el rango' }], 'Por hora')
  agregar(hojaInfo, 'Info')

  const archivo = `SIC_SCRAP_${desde}_a_${hasta}.xlsx`
  XLSX.writeFile(libro, archivo)

  return { filasDetalle: hojaDetalle.length, filasHora: hojaHora.length, archivo }
}
