import { one, rows, transaction } from './db.mjs';

export class InputError extends Error {
  constructor(message, status = 400, field = null) {
    super(message);
    this.status = status;
    this.field = field;
  }
}
export function requiredText(value, label, max) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > max) throw new InputError(label + ' debe tener entre 1 y ' + max + ' caracteres.');
  return text;
}
export function optionalText(value, label, max) {
  if (value == null || value === '') return '';
  if (typeof value !== 'string' || value.trim().length > max) {
    throw new InputError(label + ' admite hasta ' + max + ' caracteres.');
  }
  return value.trim();
}
export function id(value, label) {
  if (!/^[1-9]\d{0,17}$/.test(String(value))) throw new InputError('Selecciona ' + label + '.');
  return String(value);
}
export function decimal(value, label, digits, allowZero = false) {
  const text = String(value ?? '');
  if (!new RegExp('^\\d{1,9}(\\.\\d{1,' + digits + '})?$').test(text) || (!allowZero && Number(text) === 0)) {
    throw new InputError(label + ' debe ser ' + (allowZero ? 'mayor o igual a cero' : 'mayor que cero') +
      ', con hasta nueve dígitos enteros y ' + digits + ' decimales.');
  }
  return text;
}

async function audit(db, table, recordId, action, user, data, previous = null) {
  await db.query(`INSERT INTO trs_auditoria_log
    (tabla_afectada,id_registro_afectado,accion,datos_anteriores,datos_nuevos,usuario_evento)
    VALUES ($1,$2,$3,$4,$5,$6)`, [table, recordId, action, previous, data, user]);
}
async function warehouse(db, warehouseId) {
  if (!await one(db,'SELECT 1 FROM mae_almacenes WHERE id_almacen=$1 AND activo FOR SHARE',[warehouseId])) {
    throw new InputError('El almacén debe estar activo.');
  }
}
async function lockedArticles(db, articleIds) {
  const result = await rows(db, `SELECT * FROM mae_articulos
    WHERE id_articulo=ANY($1::bigint[]) AND activo ORDER BY id_articulo FOR UPDATE`, [articleIds]);
  if (result.length !== articleIds.length) throw new InputError('Selecciona artículos activos y sin duplicados.');
  return new Map(result.map(item => [String(item.id_articulo), item]));
}
async function balance(db, warehouseId, articleId) {
  return await one(db,`SELECT stock_actual, costo_promedio_alm, valor_actual_alm
    FROM mae_existencias_almacen WHERE id_almacen=$1 AND id_articulo=$2`,[warehouseId,articleId])
    ?? {stock_actual:'0',costo_promedio_alm:'0',valor_actual_alm:'0'};
}
async function createMovement(db, type, warehouseId, user, note, party) {
  return one(db,`INSERT INTO trs_movimientos_cabecera
    (numero_movimiento,id_tipo_movimiento,id_almacen,id_moneda,fecha_movimiento,
     id_proveedor,id_cliente,id_centro_costo,id_motivo_ajuste,observaciones,usuario_creacion)
    SELECT 'MOV-' || lpad(n::text,greatest(6,length(n::text)),'0'),t.id_tipo_movimiento,$1,
           m.id_moneda,clock_timestamp(),$2,$3,$4,$5,$6,$7
      FROM mae_tipos_movimiento t CROSS JOIN mae_monedas m
      CROSS JOIN nextval('app_numero_movimiento') AS n
     WHERE t.codigo=$8 AND t.activo AND m.codigo_iso='PEN' AND m.activo
    RETURNING *`, [warehouseId,party.proveedor??null,party.cliente??null,party.centro??null,
    party.motivo??null,note,user,type]);
}
async function alternateFactor(db, article, unitId) {
  const unit = await one(db, 'SELECT 1 FROM mae_unidades_medida WHERE id_unidad_medida=$1 AND activo', [unitId]);
  if (!unit) throw new InputError('La unidad de medida debe estar activa.');
  if (String(article.id_unidad_base) === unitId) return '1';
  const conversion = await one(db,`SELECT factor_a_base FROM mae_articulo_unidades
    WHERE id_articulo=$1 AND id_unidad_medida=$2 AND activo`,[article.id_articulo, unitId]);
  if (!conversion) throw new InputError('La unidad no está configurada para este artículo.');
  return conversion.factor_a_base;
}
async function calculate(db, current, quantity, factor, price, type) {
  const result = await one(db, `WITH op AS (
    SELECT round($1::numeric * $2::numeric,4) AS qty, $3::numeric AS stock,
           $4::numeric AS book, $5::numeric AS cpp, $1::numeric * $6::numeric AS document,
           $7::text AS kind
  ), cost AS (
    SELECT *, CASE WHEN kind='COMPRA' THEN round(document,4)
              WHEN kind='AJUSTE_ENTRADA' THEN round(qty * cpp,4)
              WHEN qty=stock THEN book
              ELSE least(book,round(qty * cpp,4)) END AS movement_value,
           CASE WHEN kind IN ('COMPRA','AJUSTE_ENTRADA') THEN 1 ELSE -1 END AS sign
    FROM op
  ), inventory AS (
    SELECT *, stock + sign * qty AS balance, book + sign * movement_value AS inventory_value FROM cost
  )
  SELECT qty, sign, balance, inventory_value, movement_value,
    CASE WHEN kind='COMPRA' THEN round(movement_value/nullif(qty,0),6)
         ELSE cpp END AS unit_cost,
    CASE WHEN balance<=0 THEN 0
         WHEN kind='COMPRA' THEN round(inventory_value/balance,6) ELSE cpp END AS new_cpp,
    CASE WHEN kind='VENTA' THEN round(document,4) END AS sales_value
  FROM inventory`, [quantity, factor, current.stock_actual, current.valor_actual_alm, current.costo_promedio_alm,price,type]);
  if (Number(result.qty) === 0) throw new InputError('La cantidad convertida es menor a la precisión del inventario.');
  if (Number(result.balance) < 0) throw new InputError('Stock insuficiente en el almacén seleccionado. Disponible: ' + current.stock_actual + '.',409);
  if ((type==='COMPRA' && Number(result.movement_value)===0) || (type==='VENTA' && Number(result.sales_value)===0)) {
    throw new InputError('El importe debe alcanzar S/ 0.0001 con la cantidad y el precio ingresados.');
  }
  return result;
}
async function postLine(db, header, article, line, type, number, user) {
  const factor = await alternateFactor(db,article,line.unit);
  const current = await balance(db,header.id_almacen,article.id_articulo);
  const op = await calculate(db,current,line.quantity,factor,line.price,type);
  const detail = await one(db,`INSERT INTO trs_movimientos_detalle
    (id_movimiento,numero_linea,id_articulo,id_unidad_medida,cantidad_ingresada,factor_conversion,
     cantidad_base,precio_unit_moneda,costo_unit_base,subtotal_base,importe_venta_base)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id_movimiento_det`,
    [header.id_movimiento,number,article.id_articulo,line.unit,line.quantity,factor,op.qty,
      line.price,op.unit_cost,op.sales_value??op.movement_value,op.sales_value]);
  await db.query(`INSERT INTO trs_kardex_movimientos
    (id_almacen,id_articulo,id_movimiento,id_movimiento_det,id_tipo_movimiento,fecha_movimiento,
     orden_cronologico,cantidad_entrada,cantidad_salida,costo_unitario_mov,costo_total_mov,
     saldo_cantidad,costo_promedio_nuevo,saldo_valorizado)
    VALUES ($1,$2,$3,$4,$5,$6,nextval('app_orden_kardex'),$7,$8,$9,$10,$11,$12,$13)`,
    [header.id_almacen,article.id_articulo,header.id_movimiento,detail.id_movimiento_det,
     header.id_tipo_movimiento,header.fecha_movimiento,op.sign===1?op.qty:0,op.sign===-1?op.qty:0,
     op.unit_cost,op.movement_value,op.balance,op.new_cpp,op.inventory_value]);
  await db.query(`INSERT INTO mae_existencias_almacen
    (id_almacen,id_articulo,stock_actual,costo_promedio_alm,valor_actual_alm)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (id_almacen,id_articulo) DO UPDATE SET stock_actual=excluded.stock_actual,
      costo_promedio_alm=excluded.costo_promedio_alm,valor_actual_alm=excluded.valor_actual_alm,fecha_actualizacion=now()`,
    [header.id_almacen,article.id_articulo,op.balance,op.new_cpp,op.inventory_value]);
  await db.query(`UPDATE mae_articulos SET stock_actual=s.stock,
    costo_promedio_actual=CASE WHEN s.stock=0 THEN 0 ELSE round(s.valor/s.stock,6) END,
    fecha_modificacion=now(),usuario_modificacion=$2
    FROM (SELECT sum(stock_actual) AS stock,sum(valor_actual_alm) AS valor
          FROM mae_existencias_almacen WHERE id_articulo=$1) s WHERE id_articulo=$1`,[article.id_articulo,user]);
  return op;
}

export async function move(payload, user, run = transaction) {
  const type = payload.tipo;
  const warehouseId = id(payload.almacen,'un almacén');
  const party = {};
  if (type==='COMPRA') party.proveedor=id(payload.tercero,'un proveedor');
  else if (type==='VENTA') party.cliente=id(payload.tercero,'un cliente');
  else if (type==='CONSUMO') party.centro=id(payload.tercero,'un centro de costo');
  else throw new InputError('Selecciona un tipo de movimiento válido.');
  const note = optionalText(payload.nota,'La referencia u observación',400);
  if (!Array.isArray(payload.lineas) || !payload.lineas.length || payload.lineas.length>25) {
    throw new InputError('Registra entre 1 y 25 líneas.');
  }
  const lines = payload.lineas.map((line,index) => {
    const lineNumber=index+1;
    if (!line || typeof line!=='object' || Array.isArray(line)) {
      throw new InputError('La línea '+lineNumber+' no tiene el formato esperado.');
    }
    const fields=[
      ['article','articulo',value=>id(value,'un artículo')],
      ['unit','unidad',value=>id(value,'una unidad')],
      ['quantity','cantidad',value=>decimal(value,'La cantidad',4)],
      ['price','precio',value=>type==='CONSUMO'?'0':decimal(value,type==='COMPRA'?'El costo unitario':'El precio unitario',6)]
    ];
    return Object.fromEntries(fields.map(([key, field, validate])=>{
      try {
        return [key,validate(line[field])];
      } catch (error) {
        if (!(error instanceof InputError)) throw error;
        throw new InputError('Línea '+lineNumber+'. '+error.message,error.status,'lineas.'+index+'.'+field);
      }
    }));
  });
  const articleIds=lines.map(line=>line.article);
  if (new Set(articleIds).size!==articleIds.length) {
    throw new InputError('Cada artículo debe figurar en una sola línea por movimiento.');
  }
  const parties={
    COMPRA:['mae_proveedores','id_proveedor','proveedor','El proveedor'],
    VENTA:['mae_clientes','id_cliente','cliente','El cliente'],
    CONSUMO:['mae_centros_costo','id_centro_costo','centro','El centro de costo']
  };
  return run(async db => {
    await warehouse(db,warehouseId);
    const [partyTable,partyId,partyKey,partyLabel]=parties[type];
    if (!await one(db,`SELECT 1 FROM ${partyTable} WHERE ${partyId}=$1 AND activo FOR SHARE`,[party[partyKey]])) {
      throw new InputError(partyLabel+' debe existir y estar activo.',409,'tercero');
    }
    const articles = await lockedArticles(db,articleIds);
    const header = await createMovement(db,type,warehouseId,user,note,party);
    if (!header) throw new InputError('Falta configurar el tipo de movimiento o la moneda PEN.',500);
    const results=[];
    for (const [index,line] of lines.entries()) {
      results.push(await postLine(db,header,articles.get(line.article),line,type,index+1,user));
    }
    await audit(db,'trs_movimientos_cabecera',header.id_movimiento,'INSERT',user,header);
    return {numero:header.numero_movimiento,resultados:results};
  });
}

export async function countInventory(payload,user,run = transaction) {
  const warehouseId=id(payload.almacen,'un almacén');
  const articleId=id(payload.articulo,'un artículo');
  const counted=decimal(payload.cantidad,'El conteo físico',4,true);
  const note=optionalText(payload.nota,'La observación',250);
  return run(async db => {
    await warehouse(db,warehouseId);
    const article=(await lockedArticles(db,[articleId])).get(articleId);
    const current=await balance(db,warehouseId,articleId);
    if (Number(current.stock_actual) === 0 && Number(counted) > 0 && Number(current.costo_promedio_alm) === 0) {
      throw new InputError('El artículo carece de costo vigente en este almacén. Registra primero el ingreso valorizado.',409);
    }
    const record=await one(db,`WITH n AS (SELECT nextval('app_codigo_conteo') AS id)
      INSERT INTO trs_inventarios_fisicos
        (codigo_toma,id_almacen,fecha_corte,responsable,estado,observaciones,usuario_creacion,fecha_aprobacion,usuario_aprobacion)
      SELECT 'TOMA-' || lpad(id::text,greatest(5,length(id::text)),'0'),$1,clock_timestamp(),$2,'CONCILIADO',$3,$2,now(),$2 FROM n
      RETURNING *`,[warehouseId,user,note]);
    await db.query(`INSERT INTO trs_conteo_fisico_registros
      (id_inventario_fisico,id_articulo,cantidad_contada,contador_nombre,observaciones)
      VALUES ($1,$2,$3,$4,$5)`,[record.id_inventario_fisico,articleId,counted,user,note]);
    const difference=await one(db,`SELECT $1::numeric-$2::numeric AS qty,
      abs($1::numeric-$2::numeric) AS absolute, sign($1::numeric-$2::numeric)::int AS sign`,
      [counted,current.stock_actual]);
    let value='0';
    let adjustment=null;
    if (difference.sign!==0) {
      const type=difference.sign===1?'AJUSTE_ENTRADA':'AJUSTE_SALIDA';
      const reason=await one(db,'SELECT id_motivo_ajuste FROM mae_motivos_ajuste WHERE signo_esperado=$1 AND activo ORDER BY id_motivo_ajuste LIMIT 1',[difference.sign]);
      adjustment=await createMovement(db,type,warehouseId,user,record.codigo_toma,{motivo:reason.id_motivo_ajuste});
      const op=await postLine(db,adjustment,article,{
        quantity:difference.absolute,unit:String(article.id_unidad_base),price:'0'
      },type,1,user);
      value=difference.sign===1?op.movement_value:'-'+op.movement_value;
      await db.query(`INSERT INTO trs_ajustes_inventario (id_inventario_fisico,id_movimiento_ajuste,usuario_ajuste)
        VALUES ($1,$2,$3)`,[record.id_inventario_fisico,adjustment.id_movimiento,user]);
      await db.query("UPDATE trs_inventarios_fisicos SET estado='AJUSTADO' WHERE id_inventario_fisico=$1",[record.id_inventario_fisico]);
      await audit(db,'trs_movimientos_cabecera',adjustment.id_movimiento,'INSERT',user,adjustment);
    }
    await db.query(`INSERT INTO trs_diferencias_inventario_detalle
      (id_inventario_fisico,id_articulo,stock_sistema_corte,cantidad_contada_final,
       diferencia_cantidad,costo_promedio_vigente,diferencia_valorizada,ajustar_diferencia)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[record.id_inventario_fisico,articleId,current.stock_actual,counted,
      difference.qty,current.costo_promedio_alm,value,difference.sign!==0]);
    await audit(db,'trs_inventarios_fisicos',record.id_inventario_fisico,'INSERT',user,
      {codigo:record.codigo_toma,contado:counted,diferencia:difference.qty,ajuste:adjustment?.numero_movimiento??null});
    return {codigo:record.codigo_toma,diferencia:difference.qty,ajuste:adjustment?.numero_movimiento??null};
  });
}
