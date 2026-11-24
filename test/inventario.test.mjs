import assert from 'node:assert/strict';
import { once } from 'node:events';
import { randomBytes } from 'node:crypto';
import { before, after, test } from 'node:test';
import pg from 'pg';

const testDb='stockclaro_test_'+randomBytes(6).toString('hex');
let admin, pool, server, base, cookie, lookup;
let createApp, initialize, rows, scenarioData;

before(async ()=>{
  const config=process.env.DATABASE_URL?{connectionString:process.env.DATABASE_URL}:{};
  admin=new pg.Client({...config,database:'postgres'});
  await admin.connect();
  await admin.query('CREATE DATABASE '+testDb);
  if (process.env.DATABASE_URL) {
    const url=new URL(process.env.DATABASE_URL);
    url.pathname='/'+testDb;
    process.env.DATABASE_URL=url.toString();
  } else {
    process.env.PGDATABASE=testDb;
  }
  process.env.DEMO_PASSWORD='NexoInventarioTest-2026!';
  ({pool,initialize,rows}=await import('../db.mjs'));
  ({createApp}=await import('../server.mjs'));
  ({scenarioData}=await import('../scenarios.mjs'));
  await initialize();
  lookup=await scenarioData(pool);
  server=createApp().listen(0,'127.0.0.1');
  await once(server,'listening');
  base='http://127.0.0.1:'+server.address().port+'/api/';
  const login=await request('login',{usuario:'demo',clave:process.env.DEMO_PASSWORD},200,false);
  cookie=login.response.headers.get('set-cookie').split(';')[0];
});

after(async ()=>{
  if(server)await new Promise(resolve=>server.close(resolve));
  if(pool)await pool.end();
  if(admin) {
    try {await admin.query('DROP DATABASE IF EXISTS '+testDb);}
    finally {await admin.end();}
  }
});
async function request(route,data,status=200,authenticated=true) {
  const headers={};
  if (authenticated&&cookie)headers.Cookie=cookie;
  if (data!==undefined)Object.assign(headers,{'Content-Type':'application/json','X-Nexo-Inventario':'app'});
  const response=await fetch(base+route,{headers,method:data===undefined?'GET':'POST',body:data===undefined?undefined:JSON.stringify(data)});
  const json=await response.json();
  assert.equal(response.status,status,route+': '+JSON.stringify(json));
  return {response,json};
}
function item(warehouse,sku) {
  return {almacen:lookup.get('almacen:'+warehouse),articulo:lookup.get('articulo:'+sku)};
}
async function post(warehouse,sku,tipo,unit,cantidad,precio,expected=201) {
  const {almacen,articulo}=item(warehouse,sku);
  const unidad=lookup.get('unidad:'+unit);
  const tercero=lookup.get(tipo+':'+{COMPRA:'SIM-P01',VENTA:'SIM-C01',CONSUMO:'SIM-ADM'}[tipo]);
  return (await request('movimientos',{tipo,almacen,tercero,lineas:[{articulo,unidad,cantidad,precio}]},expected)).json;
}
async function report(name,warehouse,sku) {
  return (await request(name+'?'+new URLSearchParams(item(warehouse,sku)))).json;
}
async function stock(warehouse,sku,expectedQty,expectedValue,expectedCost) {
  const [result]=await report('valorado',warehouse,sku);
  assert.equal(result.stock_actual,expectedQty);
  assert.equal(result.valor_inventario,expectedValue);
  if(expectedCost!==undefined)assert.equal(result.costo_promedio,expectedCost);
  return result;
}
async function profit(warehouse,sku,income,cost,margin) {
  const [result]=await report('utilidad',warehouse,sku);
  assert.equal(result.ingreso_ventas_base,income);
  assert.equal(result.costo_ventas_cpp,cost);
  assert.equal(result.utilidad_bruta,margin);
}
async function physical(warehouse,sku,cantidad) {
  return (await request('conteos',{...item(warehouse,sku),cantidad},201)).json;
}
test('01 · Tai Loy · Kardex de tres movimientos y utilidad',async ()=>{
  await post('T01','PAP-001','COMPRA','PAQ','20','12.30');
  await post('T01','PAP-001','COMPRA','PAQ','20','12.50');
  await post('T01','PAP-001','VENTA','PAQ','10','16.90');
  await stock('T01','PAP-001','30.0000','372.0000','12.400000');
  await profit('T01','PAP-001','169.0000','124.0000','45.0000');
  const kardex=(await report('kardex','T01','PAP-001')).reverse();
  const actual=kardex.map(k=>[k.saldo_cantidad,k.costo_promedio_nuevo,k.saldo_valorizado]);
  assert.deepEqual(actual,[['20.0000','12.300000','246.0000'],
    ['40.0000','12.400000','496.0000'],['30.0000','12.400000','372.0000']]);
  console.log('Kardex PostgreSQL:',JSON.stringify(actual));
});
test('02 · Panita · Separación de almacenes y rechazo sin mutaciones',async ()=>{
  await post('P02-A','PAP-001','COMPRA','PAQ','30','12.30');
  await post('P02-B','PAP-001','COMPRA','PAQ','10','12.30');
  const before=(await report('movimientos','P02-B','PAP-001')).length;
  const rejected=await post('P02-B','PAP-001','VENTA','PAQ','12','16.90',409);
  assert.match(rejected.error,/Stock insuficiente/);
  assert.equal((await report('movimientos','P02-B','PAP-001')).length,before);
  assert.equal((await report('kardex','P02-B','PAP-001')).length,1);
  await stock('P02-A','PAP-001','30.0000','369.0000');
  await stock('P02-B','PAP-001','10.0000','123.0000');
  await stock('T01','PAP-001','30.0000','372.0000');
  const [master]=await rows(pool,"SELECT stock_actual,costo_promedio_actual FROM mae_articulos WHERE codigo_sku='PAP-001'");
  assert.deepEqual(master,{stock_actual:'70.0000',costo_promedio_actual:'12.342857'});
  console.log('Almacenes 30 y 10; salida rechazada; consolidado de los tres almacenes 70.');
});
test('03 · Promart · Consumo sin generar ventas',async ()=>{
  await post('P03','CON-001','COMPRA','BOL','20','30.90');
  await post('P03','CON-001','CONSUMO','BOL','3','0');
  await stock('P03','CON-001','17.0000','525.3000');
  assert.deepEqual(await report('utilidad','P03','CON-001'),[]);
  const [k]=await report('kardex','P03','CON-001');
  assert.equal(k.costo_total_mov,'92.7000');
  console.log('17 bolsas; valor S/ 525.3000; sin ventas.');
});
test('04 · Sodimac · Conversión de rollos y salida de metros fraccionarios',async ()=>{
  await post('S04','ELE-001','COMPRA','ROL','2','304.90');
  await post('S04','ELE-001','CONSUMO','M','12.5','0');
  await stock('S04','ELE-001','187.5000','571.6875','3.049000');
  console.log('187.5000 metros; S/ 571.6875; costo por metro S/ 3.049000.');
});
test('05 · Metro · Faltante aplicado al inventario y registrado en Kardex',async ()=>{
  await post('M05','ABA-001','COMPRA','BOL','30','20.90');
  const count=await physical('M05','ABA-001','28');
  assert.equal(count.diferencia,'-2.0000');
  assert.match(count.ajuste,/^MOV-/);
  const [record]=await report('conteos','M05','ABA-001');
  assert.equal(record.diferencia_valorizada,'-41.8000');
  assert.equal(record.estado,'AJUSTADO');
  assert.equal(record.ajuste,count.ajuste);
  await stock('M05','ABA-001','28.0000','585.2000');
  console.log('Faltante de 2 bolsas; ajuste -S/ 41.8000; valor final S/ 585.2000.');
});
test('06 · Tottus · Venta por packs sin duplicar ingresos al convertir',async ()=>{
  await post('T06','LAT-001','COMPRA','PACK','5','24.60');
  const sale=await post('T06','LAT-001','VENTA','PACK','2','27.00');
  await stock('T06','LAT-001','18.0000','73.8000','4.100000');
  await profit('T06','LAT-001','54.0000','49.2000','4.8000');
  const {json:[detail]}=await request('movimientos/'+sale.numero);
  assert.equal(detail.cantidad_base,'12.0000');
  assert.equal(detail.importe_venta_base,'54.0000');
  console.log('12 latas vendidas; ingreso S/ 54.0000; costo S/ 49.2000; utilidad S/ 4.8000.');
});
test('07 · Hiraoka · Sobrante y segundo conteo sin diferencia',async ()=>{
  await post('H07','TIN-001','COMPRA','PACK','10','73.90');
  assert.equal((await physical('H07','TIN-001','11')).diferencia,'1.0000');
  const same=await physical('H07','TIN-001','11');
  assert.equal(same.ajuste,null);
  const [zero,adjusted]=await report('conteos','H07','TIN-001');
  assert.equal(zero.diferencia_cantidad,'0.0000');
  assert.equal(adjusted.diferencia_valorizada,'73.9000');
  await stock('H07','TIN-001','11.0000','812.9000');
  console.log('Sobrante de 1 pack; 11 packs por S/ 812.9000; repetición sin ajuste.');
});
test('08 · Coolbox · Venta que agota stock, valor y promedio',async ()=>{
  await post('C08','PIL-001','COMPRA','PACK','8','13.90');
  await post('C08','PIL-001','VENTA','PACK','8','17.90');
  await stock('C08','PIL-001','0.0000','0.0000','0.000000');
  await profit('C08','PIL-001','143.2000','111.2000','32.0000');
  console.log('Stock y valor cero; utilidad S/ 32.0000.');
});
test('09 · Mantenimiento de catálogos y sesión protegida',async ()=>{
  await request('catalogos',undefined,401,false);
  await request('login',{usuario:'demo',clave:'clave incorrecta'},401,false);
  const {json:unit}=await request('catalogos/unidades',{codigo:'DOC',nombre:'Docena',abreviatura:'doc'});
  const {json:warehouse}=await request('catalogos/almacenes',{codigo:'LAB',nombre:'Almacén de prueba'});
  const {json:product}=await request('catalogos/articulos',{codigo_sku:'LAB-001',descripcion:'Producto de prueba',
    id_unidad_base:lookup.get('unidad:UND'),precio_venta_ref:'0'});
  await request('conversiones',{articulo:product.id_articulo,unidad:unit.id_unidad_medida,factor:'12'});
  await request('catalogos/almacenes',{id:warehouse.id_almacen,codigo:'LAB',nombre:'Almacén de prueba actualizado'});
  const {json}=await request('catalogos');
  assert.ok(json.almacenes.some(w=>w.nombre==='Almacén de prueba actualizado'));
  assert.ok(json.conversiones.some(c=>c.id_articulo===product.id_articulo&&Number(c.factor_a_base)===12));
  console.log('Altas, edición y conversión guardadas; credenciales inválidas no permiten el acceso.');
});
test('10 · Dos ventas concurrentes sobre una sola unidad disponible',async ()=>{
  await post('C08','PIL-001','COMPRA','PACK','1','13.90');
  const {almacen,articulo}=item('C08','PIL-001');
  const options={method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json','X-Nexo-Inventario':'app'},
    body:JSON.stringify({tipo:'VENTA',almacen,tercero:lookup.get('VENTA:SIM-C01'),
    lineas:[{articulo,unidad:lookup.get('unidad:PACK'),cantidad:'1',precio:'17.90'}]})};
  const replies=await Promise.all([fetch(base+'movimientos',options),fetch(base+'movimientos',options)]);
  assert.deepEqual(replies.map(r=>r.status).sort(),[201,409]);
  await Promise.all(replies.map(r=>r.json()));
  await stock('C08','PIL-001','0.0000','0.0000');
  console.log('Se aceptó una sola venta. La segunda fue rechazada con HTTP 409.');
});
test('11 · Validaciones de formatos, límites y catálogos activos',async ()=>{
  const badCode=await request('catalogos/unidades',{codigo:'A- -B',nombre:'Unidad',abreviatura:'un'},400);
  assert.equal(badCode.json.campo,'codigo');
  const invalidQuantity=await post('C08','PIL-001','COMPRA','PACK','1.00001','13.90',400);
  assert.equal(invalidQuantity.campo,'lineas.0.cantidad');
  const invalidPrice=await post('C08','PIL-001','COMPRA','PACK','1','0',400);
  assert.equal(invalidPrice.campo,'lineas.0.precio');
  const {almacen,articulo}=item('C08','PIL-001');
  const payload={tipo:'COMPRA',almacen,tercero:'1',
    lineas:[{articulo,unidad:lookup.get('unidad:PACK'),cantidad:'1',precio:'13.90'}]};
  await request('movimientos',{...payload,nota:'x'.repeat(401)},400);
  await request('movimientos',{...payload,lineas:[payload.lineas[0],payload.lineas[0]]},400);
  await request('movimientos',{...payload,lineas:[null]},400);
  const {json:provider}=await request('catalogos/proveedores',{numero_documento:'SIM-OFF',razon_social:'Proveedor inactivo',activo:false});
  const inactive=await request('movimientos',{...payload,tercero:provider.id_proveedor},409);
  assert.equal(inactive.json.campo,'tercero');
  console.log('Rechazados: códigos inválidos, exceso de decimales, compra a cero, nota muy larga, líneas repetidas e inactivos.');
});
test('12 · PDF y Excel mantienen los filtros y los importes del reporte',async ()=>{
  const query=new URLSearchParams(item('T06','LAT-001'));
  const ExcelJS=(await import('exceljs')).default;
  const pdf=await fetch(base+'utilidad/exportar/pdf?'+query,{headers:{Cookie:cookie}});
  assert.equal(pdf.status,200);
  assert.match(pdf.headers.get('content-type'),/^application\/pdf/);
  assert.match(pdf.headers.get('content-disposition'),/nexo-inventario-utilidad/);
  assert.equal(Buffer.from(await pdf.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
  for(const kind of ['utilidad','valorado','kardex']){
    const response=await fetch(base+kind+'/exportar/xlsx?'+query,{headers:{Cookie:cookie}});
    assert.equal(response.status,200);
    assert.match(response.headers.get('content-type'),/spreadsheetml/);
    const book=new ExcelJS.Workbook();
    await book.xlsx.load(Buffer.from(await response.arrayBuffer()));
    const sheet=book.worksheets[0];
    assert.match(sheet.getCell('A2').value,/Almacén de conservas/);
    const rows=kind==='kardex'?2:1;
    assert.match(sheet.autoFilter,new RegExp("[A-Z]"+(4+rows)+"$"));
    if(kind==='utilidad'){
      assert.equal(sheet.getCell('F5').value,54);
      assert.equal(sheet.getCell('G5').value,49.20);
      assert.equal(sheet.getCell('H5').value,4.8);
      assert.equal(sheet.getCell('H8').value.result,4.8);
    }
    if(kind==='valorado')assert.equal(sheet.getCell('G5').value,73.80);
    if(kind==='kardex')assert.equal(sheet.getCell('J6').value,73.80);
  }
  const unavailable=await fetch(base+'utilidad/exportar/pdf?'+query);
  assert.equal(unavailable.status,401);
  console.log('Archivos PDF y XLSX auténticos con filtros idénticos. Excel: ingreso 54.00, costo 49.20 y utilidad 4.80.');
});
test('13 · Cambio de contraseña con validación, revocación y nuevo ingreso',async ()=>{
  const original=process.env.DEMO_PASSWORD;
  const next='NexoNuevaClave-42';
  await request('cuenta/clave',{actual:original,nueva:'Ab1',confirmacion:'Ab1'},400);
  await request('cuenta/clave',{actual:original,nueva:next,confirmacion:original},400);
  await request('cuenta/clave',{actual:'Incorrecta',nueva:next,confirmacion:next},403);
  await request('cuenta/clave',{actual:original,nueva:next,confirmacion:next});
  await request('session',undefined,401);
  await request('login',{usuario:'demo',clave:original},401,false);
  const updated=await request('login',{usuario:'demo',clave:next},200,false);
  cookie=updated.response.headers.get('set-cookie').split(';')[0];
  const [audit]=await rows(pool,"SELECT datos_nuevos FROM trs_auditoria_log WHERE tabla_afectada='app_usuarios'");
  assert.deepEqual(audit.datos_nuevos,{evento:'Cambio de contraseña'});
  console.log('Contraseña actualizada, sesiones anteriores inválidas e ingreso con la nueva contraseña confirmado.');
});
test('14 · Reglas de mantenimiento y mensajes por campo',async ()=>{
  const baseUnit=lookup.get('unidad:UND');
  const product={codigo_sku:'DEMO-COH',descripcion:'Cable THW 2.5 mm²',id_unidad_base:baseUnit,precio_venta_ref:'1.2500'};
  const checks=[
    ['articulos',{...product,descripcion:'1234'},'descripcion'],
    ['articulos',{...product,precio_venta_ref:'-1'},'precio_venta_ref'],
    ['articulos',{...product,precio_venta_ref:'0.12345'},'precio_venta_ref'],
    ['unidades',{codigo:'M-VALID',nombre:'Metro',abreviatura:'123'},'abreviatura'],
    ['almacenes',{codigo:'A-VALID',nombre:'   '},'nombre'],
    ['almacenes',{codigo:'A-VALID',nombre:'Depósito',ubicacion:'---'},'ubicacion'],
    ['proveedores',{numero_documento:'SIM-VAL',razon_social:'     1234'},'razon_social'],
    ['clientes',{numero_documento:'SIM-VAL',nombre_razon_social:'Ana\nTest'},'nombre_razon_social']
  ];
  for (const [kind,payload,field] of checks) {
    const {json}=await request('catalogos/'+kind,payload,400);
    assert.equal(json.campo,field);
  }
  const {json:unit}=await request('catalogos/unidades',{codigo:' m-cuad ',nombre:' Metro   cuadrado ',abreviatura:'m²'});
  assert.equal(unit.codigo,'M-CUAD');
  assert.equal(unit.nombre,'Metro cuadrado');
  const duplicate=await request('catalogos/unidades',{codigo:'m-cuad',nombre:'Metro cuadrado',abreviatura:'m²'},409);
  assert.equal(duplicate.json.campo,'codigo');
  const created=await request('catalogos/articulos',product);
  const articulo=created.json.id_articulo;
  const duplicateProduct=await request('catalogos/articulos',{...product,codigo_sku:'demo-coh'},409);
  assert.equal(duplicateProduct.json.campo,'codigo_sku');
  const sameUnit=await request('conversiones',{articulo,unidad:baseUnit,factor:'1'},400);
  assert.equal(sameUnit.json.campo,'unidad');
  const zero=await request('conversiones',{articulo,unidad:unit.id_unidad_medida,factor:'0'},400);
  assert.equal(zero.json.campo,'factor');
  await request('conversiones',{articulo,unidad:unit.id_unidad_medida,factor:'1.000001'});
  const changed=await request('catalogos/articulos',{...product,id:articulo,id_unidad_base:unit.id_unidad_medida},409);
  assert.equal(changed.json.campo,'id_unidad_base');
  const {json:catalog}=await request('catalogos');
  assert.deepEqual(catalog.articulos.filter(row=>row.codigo_sku===product.codigo_sku).map(row=>row.descripcion),[product.descripcion]);
  assert.ok(!catalog.almacenes.some(row=>row.codigo==='A-VALID'));
  console.log('Rechazo de campos incoherentes, duplicados y conversiones inválidas; formatos reales con tildes y símbolos de medida aceptados.');
});
test('15 · Cierre de sesión revoca el acceso',async ()=>{
  await request('logout',{});
  await request('session',undefined,401);
});
