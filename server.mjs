import express from 'express';
import { randomBytes } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { initialize, one, pool, rows, tokenHash, verifyPassword, hashPassword, transaction } from './db.mjs';
import { countInventory, id, InputError, move } from './inventory.mjs';
import { getCatalogs, saveCatalog, saveConversion } from './catalogs.mjs';
import { loadDemo, scenarios } from './scenarios.mjs';
import { changePassword } from './accounts.mjs';
import { exportReport } from './exports.mjs';

const SESSION='stockclaro_sid';
const SESSION_MS=8*60*60*1000;
const baseCookie={httpOnly:true,sameSite:'strict',secure:process.env.COOKIE_SECURE==='1',path:'/'};
const dummy=hashPassword(randomBytes(16).toString('hex'));
const failures=new Map();
function cookie(req) {
  const match=/(?:^|;\s*)stockclaro_sid=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie??'');
  return match?.[1];
}
function dateParam(value) {
  if (!value) return null;
  if (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new InputError('Ingresa una fecha válida.');
  const parsed=new Date(value+'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10)!==value || value.startsWith('0000')) {
    throw new InputError('Ingresa una fecha válida.');
  }
  return value;
}
function filters(query) {
  const warehouse=query.almacen?id(query.almacen,'un almacén'):null;
  const article=query.articulo?id(query.articulo,'un artículo'):null;
  const from=dateParam(query.desde);
  const to=dateParam(query.hasta);
  if (from && to && from>to) throw new InputError('La fecha inicial debe ser anterior o igual a la fecha final.');
  return [warehouse,article,from,to];
}

const reports={
  async valorado(selected) {
    const [a,p]=selected;
    return rows(pool,`SELECT * FROM vw_inventario_valorado WHERE ($1::int IS NULL OR id_almacen=$1)
      AND ($2::bigint IS NULL OR id_articulo=$2) ORDER BY codigo_almacen,codigo_sku`,[a,p]);
  },
  async utilidad(selected) {
    const [a,p,from,to]=selected;
    return rows(pool,`SELECT *, to_char(mes_operacion AT TIME ZONE 'America/Lima','YYYY-MM') AS mes
      FROM vw_utilidad_bruta_articulo WHERE ($1::int IS NULL OR id_almacen=$1)
      AND ($2::bigint IS NULL OR id_articulo=$2)
      AND ($3::date IS NULL OR (mes_operacion AT TIME ZONE 'America/Lima')::date >= date_trunc('month',$3::date::timestamp)::date)
      AND ($4::date IS NULL OR (mes_operacion AT TIME ZONE 'America/Lima')::date <= date_trunc('month',$4::date::timestamp)::date)
      ORDER BY mes_operacion DESC,nombre_almacen,codigo_sku`,[a,p,from,to]);
  },
  async kardex(selected) {
    return rows(pool,`SELECT k.*,c.numero_movimiento,t.nombre AS tipo,t.codigo AS operacion,
      a.nombre AS almacen,p.codigo_sku,p.descripcion,u.abreviatura
      FROM trs_kardex_movimientos k JOIN trs_movimientos_cabecera c USING(id_movimiento)
      JOIN mae_tipos_movimiento t ON t.id_tipo_movimiento=k.id_tipo_movimiento
      JOIN mae_almacenes a ON a.id_almacen=k.id_almacen JOIN mae_articulos p ON p.id_articulo=k.id_articulo
      JOIN mae_unidades_medida u ON u.id_unidad_medida=p.id_unidad_base
      WHERE NOT k.anulado AND ($1::int IS NULL OR k.id_almacen=$1) AND ($2::bigint IS NULL OR k.id_articulo=$2)
      AND ($3::date IS NULL OR (k.fecha_movimiento AT TIME ZONE 'America/Lima')::date >= $3)
      AND ($4::date IS NULL OR (k.fecha_movimiento AT TIME ZONE 'America/Lima')::date <= $4)
      ORDER BY k.orden_cronologico DESC,k.id_kardex DESC`,selected);
  },
};

export function createApp() {
  const app=express();
  app.disable('x-powered-by');
  app.use((req,res,next)=>{
    res.set({
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
      'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'same-origin'
    });
    next();
  });
  app.get('/healthz',async (req,res)=>{
    await pool.query('SELECT 1');
    res.json({ok:true});
  });
  app.use(express.json({limit:'64kb'}));
  app.use('/api',(req,res,next)=>{
    res.set('Cache-Control','no-store');
    if (req.method==='POST' && (req.get('X-Nexo-Inventario')!=='app' || !req.is('application/json'))) {
      return res.status(403).json({error:'Solicitud no válida.'});
    }
    if (req.method==='POST' && (!req.body || typeof req.body!=='object' || Array.isArray(req.body))) {
      return res.status(400).json({error:'Se esperaba un formulario válido.'});
    }
    next();
  });
  app.post('/api/login',async (req,res)=>{
    const user=String(req.body.usuario??'').trim().toLowerCase();
    const password=String(req.body.clave??'');
    if (!user || !password || user.length>60 || password.length>160) throw new InputError('Revisa el usuario y la contraseña.');
    const now=Date.now();
    for (const [key,entry] of failures) if (entry.until<=now) failures.delete(key);
    const key=req.ip;
    const attempt=failures.get(key);
    if (attempt?.count>=8) throw new InputError('Espera unos minutos antes de volver a intentar.',429);
    const entry=await one(pool,'SELECT * FROM app_usuarios WHERE usuario=$1',[user]);
    if (!verifyPassword(password,entry?.clave_hash??dummy) || !entry) {
      failures.set(key,{until:attempt?.until??now+300000,count:(attempt?.count??0)+1});
      throw new InputError('Usuario o contraseña incorrectos.',401);
    }
    failures.delete(key);
    const token=randomBytes(32).toString('hex');
    await transaction(async db=>{
      const current=await one(db,'SELECT clave_hash FROM app_usuarios WHERE usuario=$1 FOR SHARE',[user]);
      if (current?.clave_hash!==entry.clave_hash) throw new InputError('La contraseña cambió. Vuelve a iniciar sesión.',401);
      await db.query('DELETE FROM app_sesiones WHERE vence<=now() OR token_hash=$1',[tokenHash(cookie(req)??token)]);
      await db.query('INSERT INTO app_sesiones VALUES ($1,$2,$3)',[tokenHash(token),entry.usuario,new Date(now+SESSION_MS)]);
    });
    res.cookie(SESSION,token,{...baseCookie,maxAge:SESSION_MS}).json({usuario:entry.usuario,nombre:entry.nombre});
  });
  app.use('/api',async (req,res,next)=>{
    const token=cookie(req);
    const user=token?await one(pool,`SELECT u.usuario,u.nombre FROM app_sesiones s
      JOIN app_usuarios u USING(usuario) WHERE s.token_hash=$1 AND s.vence>now()`,[tokenHash(token)]):null;
    if (!user) return res.status(401).json({error:'Inicia sesión para continuar.'});
    req.user=user;
    next();
  });
  app.get('/api/session',(req,res)=>res.json(req.user));
  app.post('/api/cuenta/clave',async (req,res)=>{
    await changePassword(req.user.usuario,req.body);
    res.clearCookie(SESSION,baseCookie).json({ok:true});
  });
  app.post('/api/logout',async (req,res)=>{
    await pool.query('DELETE FROM app_sesiones WHERE token_hash=$1',[tokenHash(cookie(req))]);
    res.clearCookie(SESSION,baseCookie).json({ok:true});
  });
  app.get('/api/catalogos',async (req,res)=>res.json(await getCatalogs(pool)));
  app.post('/api/catalogos/:kind',async (req,res)=>res.json(await saveCatalog(req.params.kind,req.body,req.user.usuario)));
  app.post('/api/conversiones',async (req,res)=>res.json(await saveConversion(req.body,req.user.usuario)));
  app.post('/api/movimientos',async (req,res)=>res.status(201).json(await move(req.body,req.user.usuario)));
  app.post('/api/conteos',async (req,res)=>res.status(201).json(await countInventory(req.body,req.user.usuario)));
  for (const [kind,load] of Object.entries(reports)) {
    app.get('/api/'+kind,async (req,res)=>res.json(await load(filters(req.query))));
    app.get('/api/'+kind+'/exportar/:format',async (req,res)=>{
      const {format}=req.params;
      if (!['pdf','xlsx'].includes(format)) throw new InputError('Formato no disponible.',404);
      const selected=filters(req.query);
      const records=await load(selected);
      if (records.length>5000) throw new InputError('El reporte supera las 5,000 filas. Selecciona un almacén, artículo o período más corto.',422);
      const [warehouse,article,from,to]=selected;
      const [storedWarehouse,storedArticle]=await Promise.all([
        warehouse?one(pool,'SELECT nombre FROM mae_almacenes WHERE id_almacen=$1',[warehouse]):null,
        article?one(pool,'SELECT descripcion FROM mae_articulos WHERE id_articulo=$1',[article]):null
      ]);
      const report=await exportReport(kind,format,records,{
        warehouse:storedWarehouse?.nombre??'Todos los almacenes',
        article:storedArticle?.descripcion??'Todos los artículos',from,to,user:req.user.usuario
      });
      res.type(report.type).attachment(report.filename).send(report.data);
    });
  }
  app.get('/api/movimientos',async (req,res)=>{
    const [warehouse, article, from, to]=filters(req.query);
    res.json(await rows(pool,`SELECT m.id_movimiento,m.numero_movimiento,m.fecha_movimiento,m.observaciones,
      a.nombre AS almacen,t.nombre AS tipo,t.codigo,p.razon_social,cl.nombre_razon_social,cc.nombre AS centro,
      (SELECT count(*) FROM trs_movimientos_detalle d WHERE d.id_movimiento=m.id_movimiento)::int AS lineas
      FROM trs_movimientos_cabecera m JOIN mae_almacenes a USING(id_almacen)
      JOIN mae_tipos_movimiento t USING(id_tipo_movimiento)
      LEFT JOIN mae_proveedores p USING(id_proveedor) LEFT JOIN mae_clientes cl USING(id_cliente)
      LEFT JOIN mae_centros_costo cc USING(id_centro_costo)
      WHERE ($1::int IS NULL OR m.id_almacen=$1)
      AND ($2::bigint IS NULL OR EXISTS(SELECT 1 FROM trs_movimientos_detalle d WHERE d.id_movimiento=m.id_movimiento AND d.id_articulo=$2))
      AND ($3::date IS NULL OR (m.fecha_movimiento AT TIME ZONE 'America/Lima')::date >= $3)
      AND ($4::date IS NULL OR (m.fecha_movimiento AT TIME ZONE 'America/Lima')::date <= $4)
      ORDER BY m.fecha_movimiento DESC,m.id_movimiento DESC`,[warehouse,article,from,to]));
  });
  app.get('/api/movimientos/:number',async (req,res)=>{
    const data=await rows(pool,`SELECT d.*,p.codigo_sku,p.descripcion,u.abreviatura,k.costo_total_mov,
           k.saldo_cantidad,k.saldo_valorizado FROM trs_movimientos_detalle d
      JOIN trs_movimientos_cabecera m USING(id_movimiento) JOIN mae_articulos p USING(id_articulo)
      JOIN mae_unidades_medida u ON u.id_unidad_medida=d.id_unidad_medida
      LEFT JOIN trs_kardex_movimientos k ON k.id_movimiento_det=d.id_movimiento_det AND NOT k.anulado
      WHERE m.numero_movimiento=$1 ORDER BY d.numero_linea`,[req.params.number]);
    if (!data.length) throw new InputError('Movimiento no encontrado.',404);
    res.json(data);
  });
  app.get('/api/conteos',async (req,res)=>{
    const [warehouse,article]=filters(req.query);
    res.json(await rows(pool,`SELECT f.codigo_toma,f.fecha_corte,f.estado,f.observaciones,a.nombre AS almacen,
      p.codigo_sku,p.descripcion,d.stock_sistema_corte,d.cantidad_contada_final,d.diferencia_cantidad,d.diferencia_valorizada,
      m.numero_movimiento AS ajuste
      FROM trs_inventarios_fisicos f JOIN mae_almacenes a USING(id_almacen)
      JOIN trs_diferencias_inventario_detalle d USING(id_inventario_fisico) JOIN mae_articulos p USING(id_articulo)
      LEFT JOIN trs_ajustes_inventario j USING(id_inventario_fisico)
      LEFT JOIN trs_movimientos_cabecera m ON m.id_movimiento=j.id_movimiento_ajuste
      WHERE ($1::int IS NULL OR f.id_almacen=$1) AND ($2::bigint IS NULL OR d.id_articulo=$2)
      ORDER BY f.fecha_corte DESC,f.id_inventario_fisico DESC`,[warehouse,article]));
  });
  app.get('/api/escenarios',async (req,res)=>{
    const data=await rows(pool,`SELECT e.*,a.codigo_sku,a.descripcion,w.nombre AS almacen,w.codigo AS codigo_almacen,s.nombre AS almacen_secundario
      FROM app_escenarios e JOIN mae_articulos a USING(id_articulo)
      JOIN mae_almacenes w ON w.id_almacen=e.id_almacen
      LEFT JOIN mae_almacenes s ON s.id_almacen=e.id_almacen_secundario ORDER BY e.codigo`);
    res.json(data.map(item=>({...item,esperado:scenarios.find(s=>s.code===item.codigo)?.expected})));
  });
  app.get('/api/auditoria',async (req,res)=>res.json(await rows(pool,`SELECT id_auditoria,tabla_afectada,
    id_registro_afectado,accion,usuario_evento,fecha_evento FROM trs_auditoria_log ORDER BY id_auditoria DESC LIMIT 200`)));
  app.use('/api',(req,res)=>res.status(404).json({error:'Opción no disponible.'}));
  app.use(express.static(fileURLToPath(new URL('./public/',import.meta.url))));
  app.use((error,req,res,next)=>{
    if (res.headersSent) return next(error);
    if (error.code==='23505') return res.status(409).json({error:'El código o número ya existe.'});
    if (error.code==='23503') return res.status(409).json({error:'Revisa que los catálogos y registros seleccionados existan.'});
    if (['22003','22P02','23514'].includes(error.code)) return res.status(400).json({error:'Un valor está fuera de los límites permitidos.'});
    if (error.status && error.status<500) return res.status(error.status).json({error:error.message, campo:error.field??null});
    console.error(error);
    res.status(500).json({error:'No se pudo completar la operación. Revisa la conexión a PostgreSQL.'});
  });
  return app;
}

if (process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    await initialize();
    await loadDemo();
    const host=process.env.HOST||'127.0.0.1';
    const port=Number(process.env.PORT||3000);
    createApp().listen(port,host,()=>console.log('Nexo Inventario disponible en http://localhost:'+port));
  } catch (error) {
    console.error('No se pudo iniciar Nexo Inventario. Revisa DATABASE_URL y usa una base vacía para la instalación inicial.',error.message);
    await pool.end();
    process.exitCode=1;
  }
}
