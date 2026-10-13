/**
 * Servidor HTTP con Node.js — Tarea Sesión 5
 * Universidad Mariano Gálvez de Guatemala · Desarrollo Web
 *
 * Temas de la sesión aplicados aquí:
 *   - process.argv            → parsearArgumentos
 *   - variables de entorno    → obtenerConfig
 *   - módulo os               → infoSistema
 *   - EventEmitter            → crearLogger
 *   - módulo fs/promises      → leerMensajes / agregarMensaje
 *   - módulo http             → crearServidor / iniciarServidor
 */

import http from 'node:http';
import { EventEmitter } from 'node:events';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

const PUERTO_DEFECTO = 3000;
const ARCHIVO_DEFECTO = 'data/mensajes.json';

// =====================================================
// Utilidades
// =====================================================

/**
 * Crea un id único para cada mensaje.
 * @returns {string}
 */
export function generarId() {
    return `m-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

/**
 * Lee el body (cuerpo) de una petición HTTP como string.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<string>}
 */
function leerBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

/**
 * Convierte un valor a número de puerto válido o devuelve el puerto por defecto.
 * @param {string|number|undefined} valor
 * @returns {number}
 */
function puertoValido(valor) {
    const n = Number.parseInt(valor, 10);
    return Number.isInteger(n) && n > 0 && n < 65536 ? n : PUERTO_DEFECTO;
}

/**
 * Envía una respuesta JSON.
 * @param {import('node:http').ServerResponse} res
 * @param {number} estado
 * @param {unknown} cuerpo
 */
function responderJSON(res, estado, cuerpo) {
    res.writeHead(estado, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(cuerpo));
}

// =====================================================
// Configuración, sistema y logger
// =====================================================

/**
 * Parsea los argumentos de la línea de comandos (process.argv).
 * Acepta: --nombre <valor> y --puerto <valor>.
 * Valores por defecto: nombre = "invitado", puerto = 3000.
 *
 * @param {string[]} argv - Arreglo completo (incluye las posiciones 0 y 1).
 * @returns {{ nombre: string, puerto: number }}
 */
export function parsearArgumentos(argv = []) {
    const resultado = { nombre: 'invitado', puerto: PUERTO_DEFECTO };
    const args = argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const siguiente = args[i + 1];
        if (args[i] === '--nombre' && siguiente !== undefined) {
            resultado.nombre = siguiente;
            i++;
        } else if (args[i] === '--puerto' && siguiente !== undefined) {
            resultado.puerto = puertoValido(siguiente);
            i++;
        }
    }
    return resultado;
}

/**
 * Construye la configuración de la app a partir de variables de entorno.
 * Lee: PORT, NOMBRE_APP y ARCHIVO_DATOS.
 * Valores por defecto: puerto 3000, nombreApp "mensajes-api",
 * archivoDatos "data/mensajes.json".
 *
 * @param {NodeJS.ProcessEnv} env
 * @returns {{ puerto: number, nombreApp: string, archivoDatos: string }}
 */
export function obtenerConfig(env = {}) {
    return {
        puerto: puertoValido(env.PORT),
        nombreApp: env.NOMBRE_APP || 'mensajes-api',
        archivoDatos: env.ARCHIVO_DATOS || ARCHIVO_DEFECTO,
    };
}

/**
 * Devuelve información del sistema usando el módulo os.
 * @returns {{ plataforma: string, nucleos: number, memoriaLibreMB: number, hostname: string }}
 */
export function infoSistema() {
    return {
        plataforma: os.platform(),
        nucleos: os.cpus().length,
        memoriaLibreMB: Math.round(os.freemem() / 1024 / 1024),
        hostname: os.hostname(),
    };
}

/**
 * Crea un logger basado en EventEmitter.
 * Devuelve un objeto con dos métodos:
 *   - registrar(mensaje): emite el evento "registro" con la cadena
 *     `[<fecha ISO>] <mensaje>`.
 *   - onRegistro(fn): suscribe fn al evento "registro".
 *
 * @returns {{ registrar: (mensaje: string) => void, onRegistro: (fn: (linea: string) => void) => void }}
 */
export function crearLogger() {
    const emisor = new EventEmitter();
    return {
        registrar(mensaje) {
            emisor.emit('registro', `[${new Date().toISOString()}] ${mensaje}`);
        },
        onRegistro(fn) {
            emisor.on('registro', fn);
        },
    };
}

// =====================================================
// Persistencia (fs/promises)
// =====================================================

/**
 * Lee el arreglo de mensajes desde un archivo JSON.
 * Si el archivo no existe, devuelve []. Si existe pero no es un arreglo, [].
 *
 * @param {string} archivoDatos - Ruta del archivo.
 * @returns {Promise<Array<{id: string, texto: string, fecha: string}>>}
 */
export async function leerMensajes(archivoDatos) {
    try {
        const contenido = await fs.readFile(archivoDatos, 'utf-8');
        const datos = JSON.parse(contenido);
        return Array.isArray(datos) ? datos : [];
    } catch (error) {
        if (error.code === 'ENOENT' || error instanceof SyntaxError) return [];
        throw error;
    }
}

/**
 * Agrega un mensaje al archivo y lo devuelve.
 * Si el texto es vacío (o solo espacios) devuelve null.
 * Crea el directorio si no existe y escribe el arreglo actualizado.
 *
 * @param {string} archivoDatos - Ruta del archivo.
 * @param {string} texto
 * @returns {Promise<{id: string, texto: string, fecha: string} | null>}
 */
export async function agregarMensaje(archivoDatos, texto) {
    const limpio = typeof texto === 'string' ? texto.trim() : '';
    if (!limpio) return null;

    const mensajes = await leerMensajes(archivoDatos);
    const nuevo = { id: generarId(), texto: limpio, fecha: new Date().toISOString() };
    mensajes.push(nuevo);

    await fs.mkdir(path.dirname(archivoDatos), { recursive: true });
    await fs.writeFile(archivoDatos, JSON.stringify(mensajes, null, 2), 'utf-8');
    return nuevo;
}

// =====================================================
// Servidor HTTP
// =====================================================

/**
 * Crea un servidor HTTP (sin escuchar aún) con estas rutas:
 *   GET  /            → 200 { mensaje, hora, sistema }
 *   GET  /mensajes    → 200 [ ...mensajes ]
 *   POST /mensajes    → 201 { nuevo mensaje }  (body JSON: { texto })
 *                      400 si falta el texto · 500 en caso de error
 *   cualquier otra    → 404 { error }
 *
 * @param {{ archivoDatos?: string, nombreApp?: string, logger?: ReturnType<typeof crearLogger> }} [configuracion]
 * @returns {import('node:http').Server}
 */
export function crearServidor(configuracion = {}) {
    const {
        archivoDatos = ARCHIVO_DEFECTO,
        nombreApp = 'mensajes-api',
        logger = crearLogger(),
    } = configuracion;

    return http.createServer(async (req, res) => {
        const { pathname } = new URL(req.url, 'http://localhost');
        logger.registrar(`${req.method} ${pathname}`);

        try {
            if (req.method === 'GET' && pathname === '/') {
                return responderJSON(res, 200, {
                    mensaje: `Bienvenido a ${nombreApp}`,
                    hora: new Date().toISOString(),
                    sistema: infoSistema(),
                });
            }

            if (req.method === 'GET' && pathname === '/mensajes') {
                return responderJSON(res, 200, await leerMensajes(archivoDatos));
            }

            if (req.method === 'POST' && pathname === '/mensajes') {
                let datos;
                try {
                    datos = JSON.parse(await leerBody(req));
                } catch {
                    return responderJSON(res, 400, { error: 'El cuerpo debe ser JSON válido' });
                }

                const nuevo = await agregarMensaje(archivoDatos, datos?.texto);
                if (!nuevo) {
                    return responderJSON(res, 400, { error: 'El campo "texto" es obligatorio' });
                }
                return responderJSON(res, 201, nuevo);
            }

            responderJSON(res, 404, { error: 'Ruta no encontrada' });
        } catch (error) {
            logger.registrar(`Error: ${error.message}`);
            responderJSON(res, 500, { error: 'Error interno del servidor' });
        }
    });
}

/**
 * Crea y arranca el servidor en el puerto indicado por configuracion.puerto.
 * Al arrancar, registra en el logger: "Servidor en http://localhost:<puerto>".
 *
 * @param {{ puerto?: number, archivoDatos?: string, nombreApp?: string, logger?: ReturnType<typeof crearLogger> }} [configuracion]
 * @returns {import('node:http').Server}
 */
export function iniciarServidor(configuracion = {}) {
    const logger = configuracion.logger ?? crearLogger();
    if (!configuracion.logger) logger.onRegistro((linea) => console.log(linea));

    const puerto = configuracion.puerto ?? PUERTO_DEFECTO;
    const servidor = crearServidor({ ...configuracion, logger });
    servidor.listen(puerto, () => {
        logger.registrar(`Servidor en http://localhost:${puerto}`);
    });
    return servidor;
}
