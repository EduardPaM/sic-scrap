import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cambiarCampoScrap, camposFaltantes } from '../lib/scrap-form.ts';

const lotes = [{ id_lote: 1, id_resina: 2 }, { id_lote: 2, id_resina: 3 }];
const completo = { fecha: '2026-10-09', hora: '0', maquina: '1', turno: '2', pieza: '3', lote: '1', molde: '1', resina: '2', cantidad: '587', causa: '4', observaciones: 'demasiada humedad' };

test('identifica el lote faltante del caso reportado sin perder la captura', () => {
  const form = { ...completo, lote: '' };
  assert.deepEqual(camposFaltantes(form), ['lote']);
  assert.equal(form.cantidad, '587');
});
test('seleccionar lote completa su resina y conserva los demas campos', () => {
  assert.deepEqual(cambiarCampoScrap({ ...completo, lote: '', resina: '' }, 'lote', '1', lotes), completo);
});
test('elegir la resina compatible NO borra el lote', () => {
  assert.deepEqual(cambiarCampoScrap(completo, 'resina', '2', lotes), completo);
});
test('cambiar a otra resina exige otro lote sin perder cantidad ni observaciones', () => {
  assert.deepEqual(cambiarCampoScrap(completo, 'resina', '3', lotes), { ...completo, resina: '3', lote: '' });
});
test('cambiar un campo independiente conserva lote y resina', () => {
  assert.deepEqual(cambiarCampoScrap(completo, 'cantidad', '10', lotes), { ...completo, cantidad: '10' });
});
test('no exige observaciones, permite medianoche e identifica todos los faltantes', () => {
  assert.deepEqual(camposFaltantes({ ...completo, observaciones: '' }), []);
  assert.deepEqual(camposFaltantes({ ...completo, hora: '', lote: '', cantidad: ' ' }), ['hora', 'lote', 'cantidad']);
});
