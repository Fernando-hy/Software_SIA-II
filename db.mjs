import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const connection = process.env.DATABASE_URL ? {connectionString:process.env.DATABASE_URL} : {
  host:process.env.PGHOST||'127.0.0.1', user:process.env.PGUSER||'stockclaro',
  password:process.env.PGPASSWORD||'stockclaro_local', database:process.env.PGDATABASE||'stockclaro'
};
export const pool = new pg.Pool({...connection, options:'-c search_path=inventario,public -c timezone=America/Lima', connectionTimeoutMillis:5000});
pool.on('error', error => console.error('Conexión PostgreSQL:', error.message));

export async function transaction(action) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await action(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
export async function rows(db, statement, params = []) {
  return (await db.query(statement, params)).rows;
}
export async function one(db, statement, params = []) {
  return (await rows(db, statement, params))[0];
}
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + scryptSync(password, salt, 64).toString('hex');
}
export function verifyPassword(password, hash) {
  const [salt, value] = hash.split(':');
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(value, 'hex'));
}
export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export async function initialize() {
  const directory = new URL('./db/', import.meta.url);
  await transaction(async db => {
    await db.query('SELECT pg_advisory_xact_lock(304122)');
    await db.query('CREATE TABLE IF NOT EXISTS public.stockclaro_migraciones (archivo text PRIMARY KEY)');
    const files = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
    for (const file of files) {
      if (await one(db, 'SELECT 1 FROM public.stockclaro_migraciones WHERE archivo=$1', [file])) continue;
      await db.query(await readFile(new URL(file, directory), 'utf8'));
      await db.query('INSERT INTO public.stockclaro_migraciones VALUES ($1)', [file]);
    }
    if (!await one(db, "SELECT 1 FROM app_usuarios WHERE usuario='demo'")) {
      await db.query('INSERT INTO app_usuarios (usuario,nombre,clave_hash) VALUES ($1,$2,$3)', [
        'demo', 'Operador de inventario', hashPassword(process.env.DEMO_PASSWORD || 'NexoInventario2026!')
      ]);
    }
  });
}
