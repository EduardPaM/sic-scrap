'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type Catalogo = { id: number; nombre: string }

export default function RegistrarScrapPage() {
  const [maquinas, setMaquinas] = useState<Catalogo[]>([])
  const [turnos, setTurnos] = useState<Catalogo[]>([])
  const [piezas, setPiezas] = useState<Catalogo[]>([])
  const [lotes, setLotes] = useState<{ id_lote: number; codigo_lote: string }[]>([])
  const [moldes, setMoldes] = useState<{ id_molde: number; codigo_molde: string }[]>([])
  const [resinas, setResinas] = useState<Catalogo[]>([])
  const [causas, setCausas] = useState<{ id_causa: number; codigo: string; nombre: string }[]>([])

  const [form, setForm] = useState({
    maquina: '', turno: '', pieza: '', lote: '', molde: '',
    resina: '', cantidad: '', causa: '', observaciones: ''
  })
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    async function cargarCatalogos() {
      const [m, t, p, l, mo, r, c] = await Promise.all([
        supabase.from('maquina').select('id_maquina, nombre'),
        supabase.from('turno').select('id_turno, nombre'),
        supabase.from('pieza').select('id_pieza, nombre'),
        supabase.from('lote_materia_prima').select('id_lote, codigo_lote'),
        supabase.from('molde').select('id_molde, codigo_molde'),
        supabase.from('resina').select('id_resina, nombre'),
        supabase.from('causa_scrap').select('id_causa, codigo, nombre'),
      ])
      setMaquinas(m.data?.map(x => ({ id: x.id_maquina, nombre: x.nombre })) ?? [])
      setTurnos(t.data?.map(x => ({ id: x.id_turno, nombre: x.nombre })) ?? [])
      setPiezas(p.data?.map(x => ({ id: x.id_pieza, nombre: x.nombre })) ?? [])
      setLotes(l.data ?? [])
      setMoldes(mo.data ?? [])
      setResinas(r.data?.map(x => ({ id: x.id_resina, nombre: x.nombre })) ?? [])
      setCausas(c.data ?? [])
    }
    cargarCatalogos()
  }, [])

  function actualizarCampo(campo: string, valor: string) {
    setForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function registrarScrap() {
    setMensaje(null)

    if (!form.maquina || !form.turno || !form.pieza || !form.lote ||
        !form.molde || !form.resina || !form.causa) {
      setMensaje('Error: completa todos los campos obligatorios.')
      return
    }
    const cantidadNum = parseInt(form.cantidad, 10)
    if (!Number.isInteger(cantidadNum) || cantidadNum <= 0) {
      setMensaje('Error: la cantidad debe ser un número entero mayor a 0.')
      return
    }

    setEnviando(true)

    // 1) Crear el registro de producción
    const { data: registro, error: errRegistro } = await supabase
      .from('registro_produccion')
      .insert({
        fecha: new Date().toISOString().split('T')[0],
        id_maquina: Number(form.maquina),
        id_pieza: Number(form.pieza),
        id_lote: Number(form.lote),
        id_turno: Number(form.turno),
      })
      .select()
      .single()

    if (errRegistro || !registro) {
      setMensaje('Error al guardar el registro. Intenta de nuevo.')
      setEnviando(false)
      return
    }

    // 2) Vincular el molde usado
    await supabase.from('uso_molde').insert({
      id_registro: registro.id_registro,
      id_molde: Number(form.molde),
    })

    // 3) Crear la hora de producción (con el scrap capturado)
    const { data: hora, error: errHora } = await supabase
      .from('produccion_hora')
      .insert({
        id_registro: registro.id_registro,
        numero_hora: new Date().getHours(),
        piezas_inyectadas: 0,
        piezas_scrap: cantidadNum,
      })
      .select()
      .single()

    if (errHora || !hora) {
      setMensaje('Error al guardar el detalle de producción.')
      setEnviando(false)
      return
    }

    // 4) Registrar el detalle de scrap con causa
    const { error: errDetalle } = await supabase.from('detalle_scrap').insert({
      id_produccion_hora: hora.id_produccion_hora,
      id_causa: Number(form.causa),
      cantidad: cantidadNum,
      observaciones: form.observaciones || null,
    })

    setEnviando(false)

    if (errDetalle) {
      setMensaje('Error al guardar la causa del scrap.')
      return
    }

    setMensaje(`✓ Scrap registrado correctamente — Registro #${registro.id_registro}`)
    setForm({ maquina: '', turno: '', pieza: '', lote: '', molde: '', resina: '', cantidad: '', causa: '', observaciones: '' })
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-bold">Registrar Scrap</h1>
      <p className="text-sm text-muted-foreground">Captura rápida de piezas rechazadas</p>

      <div className="space-y-2">
        <Label>Máquina</Label>
        <Select onValueChange={(v) => actualizarCampo('maquina', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar máquina" /></SelectTrigger>
          <SelectContent>
            {maquinas.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Turno</Label>
        <Select onValueChange={(v) => actualizarCampo('turno', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar turno" /></SelectTrigger>
          <SelectContent>
            {turnos.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Pieza / producto</Label>
        <Select onValueChange={(v) => actualizarCampo('pieza', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar producto" /></SelectTrigger>
          <SelectContent>
            {piezas.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Lote</Label>
        <Select onValueChange={(v) => actualizarCampo('lote', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar lote" /></SelectTrigger>
          <SelectContent>
            {lotes.map(l => <SelectItem key={l.id_lote} value={String(l.id_lote)}>{l.codigo_lote}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Molde</Label>
        <Select onValueChange={(v) => actualizarCampo('molde', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar molde" /></SelectTrigger>
          <SelectContent>
            {moldes.map(m => <SelectItem key={m.id_molde} value={String(m.id_molde)}>{m.codigo_molde}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Resina</Label>
        <Select onValueChange={(v) => actualizarCampo('resina', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar resina" /></SelectTrigger>
          <SelectContent>
            {resinas.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nombre}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Cantidad de scrap</Label>
        <Input
          type="number"
          min={1}
          value={form.cantidad}
          onChange={(e) => actualizarCampo('cantidad', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label>Causa del scrap</Label>
        <Select onValueChange={(v) => actualizarCampo('causa', v)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar causa" /></SelectTrigger>
          <SelectContent>
            {causas.map(c => (
              <SelectItem key={c.id_causa} value={String(c.id_causa)}>
                {c.codigo} — {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Observaciones (opcional)</Label>
        <Textarea
          value={form.observaciones}
          onChange={(e) => actualizarCampo('observaciones', e.target.value)}
        />
      </div>

      {mensaje && (
        <p className={mensaje.startsWith('✓') ? 'text-green-600' : 'text-red-600'}>
          {mensaje}
        </p>
      )}

      <Button onClick={registrarScrap} disabled={enviando} className="w-full">
        {enviando ? 'Guardando...' : 'REGISTRAR SCRAP'}
      </Button>
    </div>
  )
}