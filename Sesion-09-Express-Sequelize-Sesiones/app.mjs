import express from 'express';
import { UniqueConstraintError, ValidationError } from 'sequelize';
import { conectar } from './db/db.mjs';
import {
  actualizarEstudiante,
  buscarEstudiantePorId,
  crearEstudiante,
  eliminarEstudiante,
  listarEstudiantes,
} from './db/repositories/estudiante.repository.mjs';
import { LANG } from './db/lang.mjs';
import { authRouter, requerirSesion, sesion } from './auth.mjs';

const app = express();
const PORT = 5000;

await conectar();

app.use(express.json());
app.use(sesion);
app.use('/auth', authRouter);

const camposEstudiante = ['nombre', 'email', 'carrera'];
const uuidValido = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validarId(req, res, next) {
  if (!uuidValido.test(req.params.id)) {
    return res.status(400).json({ error: 'El id debe ser un UUID válido' });
  }
  next();
}

function validarCampos(body, { completo = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'El cuerpo de la solicitud debe ser un objeto JSON';
  }
  const camposDesconocidos = Object.keys(body).filter((campo) => !camposEstudiante.includes(campo));
  if (camposDesconocidos.length) {
    return `Campos no permitidos: ${camposDesconocidos.join(', ')}`;
  }

  if (completo) {
    const camposFaltantes = camposEstudiante.filter((campo) => body[campo] === undefined);
    if (camposFaltantes.length) {
      return `Faltan campos requeridos: ${camposFaltantes.join(', ')}`;
    }
  } else if (!Object.keys(body).length) {
    return 'Debe enviar al menos un campo para actualizar';
  }
}

app.get('/', (req, res) => {
  res.send('Hola');
});

// Todas las rutas de /estudiantes requieren sesión iniciada
app.use('/estudiantes', requerirSesion);

app.get('/estudiantes', async (req, res) => {
  const estudiantes = await listarEstudiantes();
  res.json(estudiantes);
});

app.get('/estudiantes/:id', validarId, async (req, res) => {
  const estudiante = await buscarEstudiantePorId(req.params.id);
  if (!estudiante) {
    return res.status(404).json({ error: LANG["es"]["student.notFound"] });
  }
  res.json(estudiante);
});

app.post('/estudiantes', async (req, res) => {
  const error = validarCampos(req.body, { completo: true });
  if (error) {
    return res.status(400).json({ error });
  }

  const estudiante = await crearEstudiante(req.body);
  res.status(201).json(estudiante);
});

app.put('/estudiantes/:id', validarId, async (req, res) => {
  const error = validarCampos(req.body, { completo: true });
  if (error) {
    return res.status(400).json({ error });
  }

  const estudiante = await actualizarEstudiante(req.params.id, req.body);
  if (!estudiante) {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  res.json(estudiante);
});

app.patch('/estudiantes/:id', validarId, async (req, res) => {
  const error = validarCampos(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  const estudiante = await actualizarEstudiante(req.params.id, req.body);
  if (!estudiante) {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  res.json(estudiante);
});

app.delete('/estudiantes/:id', validarId, async (req, res) => {
  const eliminado = await eliminarEstudiante(req.params.id);
  if (!eliminado) {
    return res.status(404).json({ error: 'Estudiante no encontrado' });
  }

  res.status(204).end();
});

//Middleware
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud contiene JSON inválido' });
  }

  if (err instanceof UniqueConstraintError) {
    return res.status(409).json({
      error: 'Ya existe un registro con ese valor único (email o username)',
      detalles: err.errors.map(({ path, message }) => ({ field: path, message: message })),
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      error: 'Los datos del estudiante no son válidos',
      detalles: err.errors.map(({ path, message }) => ({ field: path, message: message })),
    });
  }

  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`Server corriendo en ${PORT}`);
});