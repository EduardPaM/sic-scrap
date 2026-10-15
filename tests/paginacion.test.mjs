import { test } from 'node:test';
import assert from 'node:assert/strict';
import { leerPaginas } from '../lib/paginacion.ts';
test('lee más del límite de API sin perder ni duplicar filas',async()=>{
 const origen=Array.from({length:1205},(_,id)=>({id}));
 assert.deepEqual(await leerPaginas(async(a,b)=>({data:origen.slice(a,b+1),error:null})),origen);
});
test('error intermedio impide presentar un reporte parcial',async()=>{
 await assert.rejects(()=>leerPaginas(async(a)=>a===0?{data:Array(500).fill(1),error:null}:{data:null,error:{message:'Fallo de red'}}),/Fallo de red/);
});
test('cero filas y múltiplo exacto terminan correctamente',async()=>{
 assert.deepEqual(await leerPaginas(async()=>({data:[],error:null})),[]);
 assert.equal((await leerPaginas(async(a)=>({data:a===0?Array(500).fill(1):[],error:null}))).length,500);
});
