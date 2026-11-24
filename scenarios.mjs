import { one, rows, transaction } from './db.mjs';
import { move, countInventory } from './inventory.mjs';

export const scenarios = [
  {code:'01', sku:'PAP-001', warehouse:'T01', operations:[
    ['COMPRA','PAQ','20','12.30'],['COMPRA','PAQ','20','12.50','SIM-P02'],['VENTA','PAQ','10','16.90']
  ], expected:'30 paquetes · S/ 372.0000 · utilidad S/ 45.0000'},
  {code:'02', sku:'PAP-001', warehouse:'P02-A', operations:[
    ['COMPRA','PAQ','30','12.30'],['COMPRA','PAQ','10','12.30','SIM-P01','P02-B']
  ], expected:'30 paquetes en A y 10 en B. Una venta de 12 desde B debe rechazarse.'},
  {code:'03', sku:'CON-001', warehouse:'P03', operations:[
    ['COMPRA','BOL','20','30.90'],['CONSUMO','BOL','3','0']
  ], expected:'17 bolsas · S/ 525.3000'},
  {code:'04', sku:'ELE-001', warehouse:'S04', operations:[
    ['COMPRA','ROL','2','304.90'],['CONSUMO','M','12.5','0']
  ], expected:'187.5 m · S/ 571.6875'},
  {code:'05', sku:'ABA-001', warehouse:'M05', operations:[
    ['COMPRA','BOL','30','20.90'],['CONTEO','BOL','28']
  ], expected:'28 bolsas · S/ 585.2000'},
  {code:'06', sku:'LAT-001', warehouse:'T06', operations:[
    ['COMPRA','PACK','5','24.60'],['VENTA','PACK','2','27.00']
  ], expected:'18 latas · ingreso S/ 54.0000 · utilidad S/ 4.8000'},
  {code:'07', sku:'TIN-001', warehouse:'H07', operations:[
    ['COMPRA','PACK','10','73.90'],['CONTEO','PACK','11']
  ], expected:'11 packs · S/ 812.9000'},
  {code:'08', sku:'PIL-001', warehouse:'C08', operations:[
    ['COMPRA','PACK','8','13.90'],['VENTA','PACK','8','17.90']
  ], expected:'Stock cero · utilidad S/ 32.0000'}
];

export async function scenarioData(db) {
  const lookups=await rows(db,`SELECT 'articulo' AS lista,codigo_sku AS codigo,id_articulo::text AS valor FROM mae_articulos
    UNION ALL SELECT 'almacen',codigo,id_almacen::text FROM mae_almacenes
    UNION ALL SELECT 'unidad',codigo,id_unidad_medida::text FROM mae_unidades_medida
    UNION ALL SELECT 'COMPRA',numero_documento,id_proveedor::text FROM mae_proveedores
    UNION ALL SELECT 'VENTA',numero_documento,id_cliente::text FROM mae_clientes
    UNION ALL SELECT 'CONSUMO',codigo,id_centro_costo::text FROM mae_centros_costo`);
  return new Map(lookups.map(row=>[row.lista+':'+row.codigo,row.valor]));
}
export async function applyScenario(scenario, db, lookup) {
  const inTransaction=action=>action(db);
  const articulo=lookup.get('articulo:'+scenario.sku);
  for (const [tipo, unit, cantidad, precio, partyCode, warehouseCode] of scenario.operations) {
    const almacen=lookup.get('almacen:'+(warehouseCode||scenario.warehouse));
    const nota='Prueba académica · caso '+scenario.code;
    if (tipo==='CONTEO') await countInventory({almacen,articulo,cantidad,nota},'demo',inTransaction);
    else {
      const party=partyCode||{COMPRA:'SIM-P01',VENTA:'SIM-C01',CONSUMO:'SIM-ADM'}[tipo];
      const unidad=lookup.get('unidad:'+unit);
      const tercero=lookup.get(tipo+':'+party);
      await move({tipo,almacen,tercero,nota,lineas:[{articulo,unidad,cantidad,precio}]},'demo',inTransaction);
    }
  }
}
export async function loadDemo() {
  if (process.env.APP_LOAD_DEMO==='0') return;
  await transaction(async db=>{
    await db.query('SELECT pg_advisory_xact_lock(304123)');
    if (await one(db,"SELECT 1 FROM public.stockclaro_migraciones WHERE archivo='demo-operaciones-v1'")) return;
    if (await one(db,'SELECT 1 FROM trs_movimientos_cabecera LIMIT 1')) return;
    const lookup=await scenarioData(db);
    for (const scenario of scenarios) await applyScenario(scenario,db,lookup);
    await db.query("INSERT INTO public.stockclaro_migraciones VALUES ('demo-operaciones-v1')");
  });
}
