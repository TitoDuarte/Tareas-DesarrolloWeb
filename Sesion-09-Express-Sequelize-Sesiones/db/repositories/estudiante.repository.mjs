import { Estudiante } from '../models/estudiante.mjs';

export function listarEstudiantes() {
  return Estudiante.findAll();
}

export function buscarEstudiantePorId(id) {
  return Estudiante.findByPk(id);
}

export function crearEstudiante(datos) {
  return Estudiante.create(datos);
}

export async function actualizarEstudiante(id, datos) {
  const estudiante = await Estudiante.findByPk(id);
  if (!estudiante) {
    return null;
  }

  return estudiante.update(datos);
}

export async function eliminarEstudiante(id) {
  const estudiante = await Estudiante.findByPk(id);
  if (!estudiante) {
    return false;
  }

  await estudiante.destroy();
  return true;
}
