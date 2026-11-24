const code = max => ({
  type:'code', max, example:'DEP-001',
  hint:'Usa letras sin tilde o números. Se permiten guiones o guiones bajos entre bloques.'
});
const name = (min,max,example) => ({
  type:'name', min, max, example, hint:'Incluye al menos una letra.'
});
const codeFormat = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/i;
const textFormat = /^[\p{L}\p{M}\p{N} .,:;'’&()\/#%°º®™+_–-]+$/u;
const abbreviationFormat = /^[\p{L}\p{M}\p{N} .\/°ºµ-]+$/u;
const controlFormat = /[\p{Cc}\p{Cf}]/u;

export const catalogRules = {
  unidades:{
    codigo:{...code(15),example:'KG'},
    nombre:name(2,60,'Kilogramo'),
    abreviatura:{type:'abbreviation',min:1,max:10,example:'kg',hint:'Usa una abreviatura como kg, m² o kg/m³.'}
  },
  almacenes:{
    codigo:code(20),
    nombre:name(3,120,'Almacén principal'),
    ubicacion:{type:'location',min:2,max:200,optional:true,example:'Av. Lima 125, zona A',hint:'Opcional. Indica una dirección o ubicación interna.'}
  },
  articulos:{
    codigo_sku:{...code(40),example:'INV-001'},
    descripcion:name(3,250,'Cable THW 2.5 mm²')
  },
  proveedores:{
    numero_documento:{...code(25),example:'SIM-P03'},
    razon_social:name(2,200,'Abastecedor de prueba S.A.C.')
  },
  clientes:{
    numero_documento:{...code(25),example:'SIM-C02'},
    nombre_razon_social:name(2,200,'María Pérez')
  }
};

export function validateCatalogText(rule,value,label) {
  if (value==null || value==='') {
    if (rule.optional) return null;
    throw new Error(label+': completa este campo. Ejemplo: '+rule.example+'.');
  }
  if (typeof value!=='string' || controlFormat.test(value)) {
    throw new Error(label+': ingresa texto en una sola línea.');
  }
  const input=value.normalize('NFC').trim().replace(/\s+/gu,' ');
  if (!input && rule.optional) return null;
  if (input.length < (rule.min??1) || input.length > rule.max) {
    throw new Error(label+': ingresa entre '+(rule.min??1)+' y '+rule.max+' caracteres.');
  }
  if (rule.type==='code') {
    if (!codeFormat.test(input)) throw new Error(label+': '+rule.hint+' Ejemplo: '+rule.example+'.');
    return input.toUpperCase();
  }
  const format=rule.type==='abbreviation'?abbreviationFormat:textFormat;
  const meaningful=rule.type==='location'?/[\p{L}\p{N}]/u:/\p{L}/u;
  if (!format.test(input)) throw new Error(label+': revisa los caracteres. Ejemplo: '+rule.example+'.');
  if (!meaningful.test(input)) throw new Error(label+': '+rule.hint+' Ejemplo: '+rule.example+'.');
  return input;
}
