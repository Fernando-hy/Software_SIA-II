import { one, rows, transaction } from './db.mjs';
import { decimal, id, InputError } from './inventory.mjs';
import { catalogRules, validateCatalogText } from './public/catalog-rules.mjs';

const specs={
  unidades:{table:'mae_unidades_medida',key:'id_unidad_medida',labels:['Código','Nombre','Abreviatura']},
  almacenes:{table:'mae_almacenes',key:'id_almacen',labels:['Código','Nombre','Ubicación']},
  articulos:{table:'mae_articulos',key:'id_articulo',labels:['SKU','Descripción']},
  proveedores:{table:'mae_proveedores',key:'id_proveedor',labels:['Código de referencia','Razón social']},
  clientes:{table:'mae_clientes',key:'id_cliente',labels:['Código de referencia','Nombre']}
};
function fieldValue(field,validate) {
  try {
    return validate();
  } catch (error) {
    if (!(error instanceof InputError)) throw error;
    throw new InputError(error.message,error.status,field);
  }
}
const list=(db,sql)=>rows(db,sql);

export async function getCatalogs(db) {
  const [unidades,almacenes,articulos,conversiones,proveedores,clientes,centros]=await Promise.all([
    list(db,'SELECT id_unidad_medida,codigo,nombre,abreviatura,activo FROM mae_unidades_medida ORDER BY codigo'),
    list(db,'SELECT id_almacen,codigo,nombre,ubicacion,activo FROM mae_almacenes ORDER BY nombre'),
    list(db,`SELECT p.id_articulo,p.codigo_sku,p.descripcion,p.id_unidad_base,p.precio_venta_ref,p.stock_actual,p.activo,u.abreviatura
      FROM mae_articulos p JOIN mae_unidades_medida u ON u.id_unidad_medida=p.id_unidad_base ORDER BY p.codigo_sku`),
    list(db,'SELECT id_articulo,id_unidad_medida,factor_a_base FROM mae_articulo_unidades WHERE activo ORDER BY id_articulo'),
    list(db,'SELECT id_proveedor,numero_documento,razon_social,activo FROM mae_proveedores ORDER BY razon_social'),
    list(db,'SELECT id_cliente,numero_documento,nombre_razon_social,activo FROM mae_clientes ORDER BY nombre_razon_social'),
    list(db,'SELECT id_centro_costo,codigo,nombre,activo FROM mae_centros_costo ORDER BY nombre')
  ]);
  return {unidades,almacenes,articulos,conversiones,proveedores,clientes,centros};
}
export async function saveCatalog(kind,payload,user) {
  if (!Object.hasOwn(specs,kind)) throw new InputError('Catálogo inexistente.',404);
  const {table,key,labels}=specs[kind];
  const fields=Object.keys(catalogRules[kind]);
  const values=fields.map((field,i)=>{
    try {
      return validateCatalogText(catalogRules[kind][field],payload[field],labels[i]);
    } catch (error) {
      throw new InputError(error.message,400,field);
    }
  });
  if (kind==='articulos') {
    fields.push('id_unidad_base','precio_venta_ref');
    values.push(
      fieldValue('id_unidad_base',()=>id(payload.id_unidad_base,'una unidad base')),
      fieldValue('precio_venta_ref',()=>decimal(payload.precio_venta_ref??'0','El precio referencial',4,true))
    );
  }
  if ('activo' in payload && typeof payload.activo!=='boolean') {
    throw new InputError('El estado del registro debe ser activo o inactivo.',400,'activo');
  }
  const active=payload.activo!==false;
  const code=payload.id?id(payload.id,'un registro'):null;
  try {
    return await transaction(async db=>{
      const previous=code?await one(db,`SELECT * FROM ${table} WHERE ${key}=$1 FOR UPDATE`,[code]):null;
      if (code && !previous) throw new InputError('El registro ya no está disponible.',404);
      if (kind==='articulos') {
        if (!await one(db,'SELECT 1 FROM mae_unidades_medida WHERE id_unidad_medida=$1 AND activo FOR SHARE',[values[2]])) {
          throw new InputError('Selecciona una unidad base activa.',400,'id_unidad_base');
        }
        if (previous && String(previous.id_unidad_base)!==values[2]) {
          const used=await one(db,`SELECT 1 FROM trs_kardex_movimientos WHERE id_articulo=$1
            UNION ALL SELECT 1 FROM mae_articulo_unidades WHERE id_articulo=$1 LIMIT 1`,[code]);
          if (used) throw new InputError('La unidad base queda fija cuando existe kardex o unidades alternativas.',409,'id_unidad_base');
        }
      }
      if (kind==='unidades' && code && !active) {
        if (await one(db,'SELECT 1 FROM mae_articulos WHERE id_unidad_base=$1 AND activo LIMIT 1',[code])) {
          throw new InputError('La unidad es base de un artículo activo.',409,'activo');
        }
      }
      const names=[...fields,'activo'];
      values.push(active);
      let result;
      if (code) {
        if (kind==='articulos') {
          names.push('usuario_modificacion');
          values.push(user);
        }
        const assignments=names.map((name,index)=>name+'=$'+(index+1));
        if (kind==='articulos') assignments.push('fecha_modificacion=now()');
        result=await one(db,`UPDATE ${table} SET ${assignments.join(',')} WHERE ${key}=$${values.length+1} RETURNING *`,[...values,code]);
      } else {
        names.push('usuario_creacion');
        values.push(user);
        const placeholders=names.map((_,index)=>'$'+(index+1));
        result=await one(db,`INSERT INTO ${table} (${names.join(',')}) VALUES (${placeholders.join(',')}) RETURNING *`,values);
      }
      await db.query(`INSERT INTO trs_auditoria_log
        (tabla_afectada,id_registro_afectado,accion,datos_anteriores,datos_nuevos,usuario_evento)
        VALUES ($1,$2,$3,$4,$5,$6)`,[table,String(result[key]),code?'UPDATE':'INSERT',previous,result,user]);
      return result;
    });
  } catch (error) {
    if (error.code==='23505' && error.constraint===table+'_'+fields[0]+'_key') {
      throw new InputError(labels[0]+': ya existe un registro con ese valor.',409,fields[0]);
    }
    throw error;
  }
}
export async function saveConversion(payload,user) {
  const article=fieldValue('articulo',()=>id(payload.articulo,'un artículo'));
  const unit=fieldValue('unidad',()=>id(payload.unidad,'una unidad alternativa'));
  const factor=fieldValue('factor',()=>decimal(payload.factor,'El factor',6));
  return transaction(async db=>{
    const product=await one(db,'SELECT id_unidad_base FROM mae_articulos WHERE id_articulo=$1 AND activo FOR UPDATE',[article]);
    if (!product) throw new InputError('Selecciona un artículo activo.',400,'articulo');
    if (String(product.id_unidad_base)===unit) throw new InputError('La unidad alternativa debe ser distinta de la unidad base.',400,'unidad');
    if (!await one(db,'SELECT 1 FROM mae_unidades_medida WHERE id_unidad_medida=$1 AND activo FOR SHARE',[unit])) throw new InputError('Selecciona una unidad activa.',400,'unidad');
    const previous=await one(db,'SELECT * FROM mae_articulo_unidades WHERE id_articulo=$1 AND id_unidad_medida=$2',[article,unit]);
    const result=await one(db,`INSERT INTO mae_articulo_unidades
      (id_articulo,id_unidad_medida,factor_a_base,es_unidad_compra,es_unidad_venta)
      VALUES ($1,$2,$3,true,true) ON CONFLICT (id_articulo,id_unidad_medida)
      DO UPDATE SET factor_a_base=excluded.factor_a_base,activo=true RETURNING *`,[article,unit,factor]);
    await db.query(`INSERT INTO trs_auditoria_log
      (tabla_afectada,id_registro_afectado,accion,datos_anteriores,datos_nuevos,usuario_evento)
      VALUES ('mae_articulo_unidades',$1,$2,$3,$4,$5)`,
      [result.id_articulo_unidad,previous?'UPDATE':'INSERT',previous??null,result,user]);
    return result;
  });
}
