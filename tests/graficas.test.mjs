import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pctPorDia, pareto } from '../lib/graficas-calculo.ts';

const causas = [
  { id_causa: 1, codigo: 'C-01', nombre: 'Purgas excesivas en arranque y cambio', categoria: 'Máquina' },
  { id_causa: 3, codigo: 'C-03', nombre: 'Fallas y desgaste del molde', categoria: 'Máquina' },
  { id_causa: 4, codigo: 'C-04', nombre: 'Resina con humedad / secado insuficiente', categoria: 'Material' },
];

test('el % por día coincide con el caso de la película (28 de 570 = 4.91 %)', () => {
  const dias = pctPorDia([{ fecha: '2026-10-06', id_maquina: 2, piezas_inyectadas: 570, piezas_scrap: 28, pct_scrap: 4.91 }]);
  assert.deepEqual(dias, [{ fecha: '2026-10-06', inyectadas: 570, scrap: 28, pct: 4.91 }]);
});

test('el % por día suma piezas de todas las máquinas y no promedia porcentajes', () => {
  const dias = pctPorDia([
    { fecha: '2026-10-05', id_maquina: 1, piezas_inyectadas: 500, piezas_scrap: 10, pct_scrap: 2 },
    { fecha: '2026-10-05', id_maquina: 2, piezas_inyectadas: 100, piezas_scrap: 8, pct_scrap: 8 },
  ]);
  assert.equal(dias[0].pct, 3); // 18 / 600, no (2 + 8) / 2 = 5
});

test('un turno sin producción completa no se dibuja como 0 % y los días salen en orden', () => {
  const dias = pctPorDia([
    { fecha: '2026-10-07', id_maquina: 3, piezas_inyectadas: 0, piezas_scrap: 7, pct_scrap: null },
    { fecha: '2026-10-06', id_maquina: 1, piezas_inyectadas: 200, piezas_scrap: 2, pct_scrap: 1 },
    { fecha: '2026-10-05', id_maquina: 1, piezas_inyectadas: 100, piezas_scrap: 1, pct_scrap: 1 },
  ]);
  assert.deepEqual(dias.map((d) => d.fecha), ['2026-10-05', '2026-10-06']);
});

test('Pareto ordena de mayor a menor y el acumulado termina en 100 %', () => {
  const r = pareto(
    [
      { id_causa: 4, cantidad: 28 },
      { id_causa: 3, cantidad: 10 },
      { id_causa: 4, cantidad: 2 },
      { id_causa: 1, cantidad: 10 },
    ],
    causas,
  );
  assert.deepEqual(r.map((c) => [c.codigo, c.piezas, c.pct, c.acumulado]), [
    ['C-04', 30, 60, 60],
    ['C-01', 10, 20, 80],
    ['C-03', 10, 20, 100],
  ]);
});

test('Pareto ignora registros sin causa o sin cantidad y no falla sin datos', () => {
  assert.deepEqual(pareto([{ id_causa: null, cantidad: 5 }, { id_causa: 1, cantidad: 0 }], causas), []);
  const r = pareto([{ id_causa: 9, cantidad: 3 }], causas);
  assert.equal(r[0].codigo, '#9');
});
