/**
 * app.js — Servidor Express (API REST + sitio estático)
 * Tarea Sesión 7 · Desarrollo Web · UMG
 *
 * Los tests de `tests/api.test.js` describen exactamente el contrato
 * que debe cumplir cada endpoint (son tu guía).
 */

import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// __dirname en ES Modules
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

// ============================================================
// MIDDLEWARES
// ============================================================

/**
 * "Autenticación falsa": exige el header `x-api-key`.
 * La clave esperada viene de process.env.API_KEY (por defecto 'umg-2026').
 *
 * @type {import('express').RequestHandler}
 */
export function autenticacionFalsa(req, res, next) {
    const clave = req.get('x-api-key');
    if (clave !== (process.env.API_KEY ?? 'umg-2026')) {
        return res.status(401).json({ error: 'No autorizado' });
    }
    next();
}

const esTextoNoVacio = (valor) => typeof valor === 'string' && valor.trim() !== '';

/**
 * Validación básica del cuerpo de un alumno.
 * Responde 400 con { error } si algo es inválido; si no, continúa.
 *
 * @type {import('express').RequestHandler}
 */
export function validarAlumno(req, res, next) {
    const { nombre, apellido, email, edad } = req.body ?? {};

    if (!esTextoNoVacio(nombre)) {
        return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!esTextoNoVacio(apellido)) {
        return res.status(400).json({ error: 'El apellido es obligatorio' });
    }
    if (!esTextoNoVacio(email) || !email.includes('@')) {
        return res.status(400).json({ error: 'El email es obligatorio y debe contener @' });
    }
    if (edad !== undefined && edad !== null && (typeof edad !== 'number' || Number.isNaN(edad) || edad < 0)) {
        return res.status(400).json({ error: 'La edad debe ser un número mayor o igual a 0' });
    }
    next();
}

/** Deja solo los campos permitidos de un alumno (ignora id u otros extras). */
const datosAlumno = ({ nombre, apellido, email, edad }) => ({
    nombre: nombre.trim(),
    apellido: apellido.trim(),
    email: email.trim(),
    ...(edad !== undefined && edad !== null ? { edad } : {}),
});

// ============================================================
// APP
// ============================================================

/**
 * Crea la app de Express con sus rutas.
 * Recibe el repositorio por parámetro (inyección de dependencias).
 *
 * @param {import('./repositorio.js').RepositorioAlumnos} repositorio
 * @returns {import('express').Express}
 */
export function crearApp(repositorio) {
    const app = express();

    // Middlewares base
    app.use(express.json());

    // Sitio web estático (public/index.html, styles.css, app.js)
    app.use(express.static(join(__dirname, '..', 'public')));

    // Lista todos los alumnos
    app.get('/alumnos', (req, res) => {
        res.status(200).json(repositorio.listar());
    });

    // Un alumno por id, o 404
    app.get('/alumnos/:id', (req, res) => {
        const alumno = repositorio.obtener(req.params.id);
        if (!alumno) return res.status(404).json({ error: 'Alumno no encontrado' });
        res.status(200).json(alumno);
    });

    // Crear alumno
    app.post('/alumnos', autenticacionFalsa, validarAlumno, (req, res) => {
        const creado = repositorio.crear(datosAlumno(req.body));
        res.status(201).json(creado);
    });

    // Actualizar alumno
    app.put('/alumnos/:id', autenticacionFalsa, validarAlumno, (req, res) => {
        const actualizado = repositorio.actualizar(req.params.id, datosAlumno(req.body));
        if (!actualizado) return res.status(404).json({ error: 'Alumno no encontrado' });
        res.status(200).json(actualizado);
    });

    // Eliminar alumno
    app.delete('/alumnos/:id', autenticacionFalsa, (req, res) => {
        if (!repositorio.eliminar(req.params.id)) {
            return res.status(404).json({ error: 'Alumno no encontrado' });
        }
        res.status(204).end();
    });

    return app;
}
