import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Usuario } from '../models/usuario.mjs';

const scryptAsync = promisify(scrypt);

async function hashear(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

async function verificar(password, almacenado) {
  const [salt, hash] = almacenado.split(':');
  const calculado = await scryptAsync(password, salt, 64);
  return timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
}

export async function crearUsuario({ username, password }) {
  return Usuario.create({ username, passwordHash: await hashear(password) });
}

// Devuelve el usuario si las credenciales son correctas, si no null
export async function autenticar(username, password) {
  const usuario = await Usuario.findOne({ where: { username } });
  if (!usuario || !(await verificar(password, usuario.passwordHash))) {
    return null;
  }
  return usuario;
}
