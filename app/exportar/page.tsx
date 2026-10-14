'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { exportarScrapExcel } from '@/lib/exportarScrap'
import { Access } from '@/components/session'

function fechaLocal(d: Date) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export default function ExportarPage() {
  return <Access><FormularioExportacion /></Access>
}

function FormularioExportacion() {
  const hoy = new Date()
  const haceSieteDias = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [desde, setDesde] = useState(fechaLocal(haceSieteDias))
  const [hasta, setHasta] = useState(fechaLocal(hoy))
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  async function exportar() {
    setMensaje(null)
    if (!desde || !hasta) {
      setMensaje('Error: selecciona las dos fechas.')
      return
    }
    if (desde > hasta) {
      setMensaje('Error: la fecha "desde" no puede ser posterior a "hasta".')
      return
    }

    setExportando(true)
    try {
      const r = await exportarScrapExcel(desde, hasta)
      setMensaje(`✓ Descargado ${r.archivo} — ${r.filasDetalle} registros de scrap, ${r.filasHora} horas de producción`)
    } catch (e) {
      setMensaje(`Error: ${e instanceof Error ? e.message : 'no se pudo exportar.'}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Exportar a Excel</h1>
      <p className="text-sm text-muted-foreground">
        Registros de scrap con máquina, turno, molde, lote, resina y causa (cantidades en piezas), para auditoría.
      </p>

      <div className="space-y-2">
        <Label htmlFor="desde">Desde</Label>
        <Input id="desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="hasta">Hasta</Label>
        <Input id="hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} />
      </div>

      {mensaje && (
        <p className={mensaje.startsWith('✓') ? 'text-green-600' : 'text-red-600'}>
          {mensaje}
        </p>
      )}

      <Button onClick={exportar} disabled={exportando} className="w-full">
        {exportando ? 'Generando archivo...' : 'EXPORTAR'}
      </Button>
    </div>
  )
}
