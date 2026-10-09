import { Router } from 'express';
import session from 'express-session';
import { config } from './db/config.mjs';
import { autenticar, crearUsuario } from './db/repositories/usuario.repository.mjs';

// Sesión basada en cookie (connect.sid). El store por defecto es MemoryStore:
// suficiente para clase/desarrollo; en producción usar un store persistente.
export const sesion = session({
  secret: config.sessionSecret ?? 'dev-secret-cambiar',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 }, // 1 hora
});

export function requerirSesion(req, res, next) {
  if (!req.session.usuario) {
    return res.status(401).json({ error: 'Debe iniciar sesión' });
  }
  next();
}

function credencialesValidas(body) {
  return (
    body &&
    typeof body.username === 'string' &&
    typeof body.password === 'string' &&
    body.password.length >= 6
  );
}

export const authRouter = Router();

authRouter.post('/registro', async (req, res) => {
  if (!credencialesValidas(req.body)) {
    return res.status(400).json({ error: 'Se requiere username y password (mínimo 6 caracteres)' });
  }
  const usuario = await crearUsuario(req.body);
  res.status(201).json({ id: usuario.id, username: usuario.username });
});

authRouter.post('/login', async (req, res, next) => {
  if (!credencialesValidas(req.body)) {
    return res.status(400).json({ error: 'Se requiere username y password' });
  }
  const usuario = await autenticar(req.body.username, req.body.password);
  if (!usuario) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  // Regenerar el id de sesión evita session fixation
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.usuario = { id: usuario.id, username: usuario.username };
    res.json(req.session.usuario);
  });
});

authRouter.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.status(204).end();
  });
});

authRouter.get('/me', requerirSesion, (req, res) => {
  res.json(req.session.usuario);
});
