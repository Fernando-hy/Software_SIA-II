import { pool,hashPassword,transaction } from './db.mjs';
import { validatePassword } from './accounts.mjs';

const password=process.env.NEW_DEMO_PASSWORD;
try {
  validatePassword(password);
  await transaction(async db=>{
    const result=await db.query("UPDATE app_usuarios SET clave_hash=$1,clave_actualizada_en=now() WHERE usuario='demo'",[hashPassword(password)]);
    if (!result.rowCount) throw new Error('Inicia el sistema una vez antes de cambiar la contraseña.');
    await db.query("DELETE FROM app_sesiones WHERE usuario='demo'");
    await db.query(`INSERT INTO trs_auditoria_log
      (tabla_afectada,id_registro_afectado,accion,datos_nuevos,usuario_evento)
      VALUES ('app_usuarios','demo','UPDATE',$1,'demo')`,[{evento:'Restablecimiento local de contraseña'}]);
  });
  console.log('Contraseña actualizada. Inicia sesión nuevamente.');
} catch (error) {
  console.error(error.message);
  process.exitCode=1;
} finally {
  await pool.end();
}
