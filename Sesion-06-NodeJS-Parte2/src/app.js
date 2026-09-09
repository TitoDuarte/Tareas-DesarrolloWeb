/**
 * Procesador de logs y sistema de inventario — Tarea Sesión 6
 * Universidad Mariano Gálvez de Guatemala · Desarrollo Web
 *
 * Implementa las funciones marcadas con TODO para que los tests pasen.
 * No cambies los nombres exportados ni su firma.
 *
 * Temas de la sesión aplicados aquí:
 *   - ES Modules avanzado (named/default exports, re-exports)  → ./src/index.js
 *   - __dirname/__filename con import.meta.url                 → este archivo
 *   - Streams y pipelines (Transform para filtrar)             → filtrarLogs
 *   - Testing con node:test (unitario + integración)           → tests/
 *   - better-sqlite3 (CRUD, transacciones)                     → ./src/db.js
 */

import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// __dirname y __filename reproducidos con import.meta.url (ES Modules)
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = dirname(__filename);

// =====================================================
// Utilidades (ya implementadas — no las modifiques)
// =====================================================

/**
 * Crea un id único.
 * @returns {string}
 */
export function generarId() {
    return `r-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

// =====================================================
// TODO: implementa las siguientes funciones
// =====================================================

/**
 * Componentes y módulos.
 *
 * TODO 1: crea un módulo `src/math.js` (named exports) con:
 *   - const PI = 3.14159
 *   - function sumar(a, b)
 *   - function restar(a, b)
 *
 * TODO 2: crea un módulo `src/logger.js` (default export) con:
 *   - default function registrarProceso(msg) → string con formato
 *     `[fecha ISO] msg` (solo devuelve el string, no lo imprime)
 *
 * TODO 3: en `src/index.js` re-exporta (barrel exports) todo lo anterior:
 *   export { PI, sumar, restar } from "./math.js";
 *   export { default as logger } from "./logger.js";
 *   export { ... } from "./app.js";   // las funciones públicas
 *
 * Cuando termines, corre el test "Estructura de módulos"
 * para verificar que los re-exports funcionan.
 */

export async function filtrarLogs(origen, destino, texto) {
    let matches = 0;
    const { Transform } = await import('node:stream');
    
    const filterTransform = new Transform({
        transform(chunk, encoding, callback) {
            const data = chunk.toString();
            if (this._buffer === undefined) this._buffer = '';
            this._buffer += data;
            
            const lines = this._buffer.split('\n');
            this._buffer = lines.pop(); // keep last incomplete line
            
            for (const line of lines) {
                if (line.includes(texto)) {
                    matches++;
                    this.push(line + '\n');
                }
            }
            callback();
        },
        flush(callback) {
            if (this._buffer && this._buffer.includes(texto)) {
                matches++;
                this.push(this._buffer + '\n');
            }
            callback();
        }
    });

    await pipeline(
        createReadStream(origen, { encoding: 'utf-8' }),
        filterTransform,
        createWriteStream(destino, { encoding: 'utf-8' })
    );

    return matches;
}

export async function leerLineas(ruta) {
    return new Promise((resolve, reject) => {
        const lines = [];
        let buffer = '';
        const stream = createReadStream(ruta, { encoding: 'utf-8' });
        
        stream.on('data', (chunk) => {
            buffer += chunk;
            const parts = buffer.split(/\r?\n/);
            buffer = parts.pop();
            for (const p of parts) {
                if (p.trim() !== '') lines.push(p);
            }
        });
        
        stream.on('end', () => {
            if (buffer.trim() !== '') lines.push(buffer);
            resolve(lines);
        });
        
        stream.on('error', reject);
    });
}

export function rutaAbsoluta(rutaRelativa) {
    return join(__dirname, rutaRelativa);
}

export function parsearEnv(contenido) {
    const result = {};
    const lines = contenido.split(/\r?\n/);
    for (const line of lines) {
        const t = line.trim();
        if (t && !t.startsWith('#')) {
            const parts = t.split('=');
            if (parts.length >= 2) {
                const key = parts[0].trim().toUpperCase();
                const value = parts.slice(1).join('=').trim();
                result[key] = value;
            }
        }
    }
    return result;
}