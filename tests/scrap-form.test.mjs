import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cambiarCampoScrap, camposFaltantes } from '../lib/scrap-form.ts';
import { moldePermitido, enlazarMaquinaMolde } from '../lib/moldes.ts';

const lotes = [{ id_lote: 1, id_resina: 2 }, { id_lote: 2, id_resina: 3 }];
const completo = { fecha: '2026-10-09', hora: '0', maquina: '1', turno: '2', lote: '1', molde: '1', resina: '2', cantidad: '587', causa: '4', observaciones: 'demasiada humedad' };

test('captura completa sin selector de pieza; molde obligatorio', () => {
  assert.deepEqual(camposFaltantes(completo), []);
  assert.deepEqual(camposFaltantes({ ...completo, molde: '' }), ['molde']);
});
test('solo ofrece moldes correspondientes a la maquina', () => {
  const relaciones = [{ id_maquina: 1, id_molde: 5 }, { id_maquina: 2, id_molde: 6 }];
  assert.equal(moldePermitido('', 5, relaciones), true);
  assert.equal(moldePermitido('1', 5, relaciones), true);
  assert.equal(moldePermitido('1', 6, relaciones), false);
  assert.equal(moldePermitido('3', 5, relaciones), true);
});

const relaciones = [
  { id_maquina: 1, id_molde: 10 },
  { id_maquina: 2, id_molde: 20 },
  { id_maquina: 2, id_molde: 21 },
  { id_maquina: 3, id_molde: 21 },
];
test('maquina con un solo molde lo completa automaticamente', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '', molde: '', cantidad: '9' }, 'maquina', '1', relaciones), { maquina: '1', molde: '10', cantidad: '9' });
});
test('molde elegido primero completa su unica maquina', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '', molde: '' }, 'molde', '20', relaciones), { maquina: '2', molde: '20' });
});
test('maquina con varios moldes no elige una referencia arbitraria', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '1', molde: '10' }, 'maquina', '2', relaciones), { maquina: '2', molde: '' });
});
test('molde compartido no elige maquina arbitrariamente', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '1', molde: '10' }, 'molde', '21', relaciones), { maquina: '', molde: '21' });
});
test('conserva combinacion valida y reasigna una incompatible', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '2', molde: '21' }, 'maquina', '2', relaciones), { maquina: '2', molde: '21' });
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '1', molde: '10' }, 'molde', '20', relaciones), { maquina: '2', molde: '20' });
});
test('limpiar seleccion limpia su contraparte y conserva la captura', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '2', molde: '20', cantidad: '9' }, 'molde', '', relaciones), { maquina: '', molde: '', cantidad: '9' });
});
test('relaciones repetidas no impiden autocompletar', () => {
  assert.deepEqual(enlazarMaquinaMolde({ maquina: '', molde: '' }, 'maquina', '1', [...relaciones, relaciones[0]]), { maquina: '1', molde: '10' });
});

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
