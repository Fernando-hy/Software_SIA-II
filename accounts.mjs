import { hashPassword, one, transaction, verifyPassword } from './db.mjs';
import { InputError } from './inventory.mjs';

export function validatePassword(password) {
  if (typeof password!=='string' || [...password].length<12 || [...password].length>128 ||
      !/\p{L}/u.test(password) || !/[0-9]/.test(password) || /[\p{Cc}\p{Cf}]/u.test(password)) {
    throw new InputError('La contraseña nueva debe tener entre 12 y 128 caracteres, al menos una letra y un número.',400,'nueva');
  }
}
export async function changePassword(user,payload) {
  const {actual,nueva,confirmacion}=payload;
  if (typeof actual!=='string' || !actual || [...actual].length>160) {
    throw new InputError('Ingresa tu contraseña actual.',400,'actual');
  }
  validatePassword(nueva);
  if (nueva!==confirmacion) throw new InputError('Las contraseñas nuevas deben coincidir.',400,'confirmacion');
  if (actual===nueva) throw new InputError('Elige una contraseña diferente de la actual.',400,'nueva');
  return transaction(async db=>{
    const entry=await one(db,'SELECT clave_hash FROM app_usuarios WHERE usuario=$1 FOR UPDATE',[user]);
    if (!entry || !verifyPassword(actual,entry.clave_hash)) {
      throw new InputError('La contraseña actual es incorrecta.',403,'actual');
    }
    await db.query('UPDATE app_usuarios SET clave_hash=$1,clave_actualizada_en=now() WHERE usuario=$2',
      [hashPassword(nueva),user]);
    await db.query('DELETE FROM app_sesiones WHERE usuario=$1',[user]);
    await db.query(`INSERT INTO trs_auditoria_log
      (tabla_afectada,id_registro_afectado,accion,datos_nuevos,usuario_evento)
      VALUES ('app_usuarios',$1,'UPDATE',$2,$1)`,[user,{evento:'Cambio de contraseña'}]);
    return {ok:true};
  });
}
