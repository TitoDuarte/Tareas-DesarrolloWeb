/**
 * HTTP Inspector CLI
 *
 * Tarea de la Sesión 1: Fundamentos de la Web
 *
 * Esta tarea NO usa la red, ni async/await, ni librerías externas.
 * Solo la biblioteca estándar de Node + tipos básicos de TypeScript.
 *
 * Idea: aplicar lo que aprendiste sobre HTTP (URLs, métodos, códigos
 * de estado y cabeceras) implementando pequeñas funciones puras.
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Resultado de analizar una URL. */
export interface UrlParts {
  /** Protocolo tal como lo devuelve la WHATWG URL, p. ej. "https:". */
  protocol: string;
  /** Host (puede incluir puerto), p. ej. "api.ejemplo.com:443". */
  host: string;
  /** Ruta, p. ej. "/users". */
  pathname: string;
  /** Query string con el "?" inicial, p. ej. "?id=1&name=Ana". */
  search: string;
  /** Lista de pares [clave, valor] de los query params. */
  query: Array<[string, string]>;
}

/** Categoría de un código de estado HTTP. */
export type StatusCategory =
  | "1xx Informativo"
  | "2xx Éxito"
  | "3xx Redirección"
  | "4xx Error del cliente"
  | "5xx Error del servidor"
  | "Desconocido";

/** Mapa de cabeceras HTTP. */
export type Headers = Record<string, string>;

// ---------------------------------------------------------------------------
// Funciones a implementar
// ---------------------------------------------------------------------------

/**
 * Analiza una URL y extrae sus partes principales usando la API nativa URL.
 * 
 * @param url La URL completa a analizar.
 * @returns Un objeto con el protocolo, host, pathname, search y los query params.
 * @throws {TypeError} Si la URL no es válida.
 */
export function parseUrl(url: string): UrlParts {
  const u = new URL(url);
  return {
    protocol: u.protocol,
    host: u.host,
    pathname: u.pathname,
    search: u.search,
    query: Array.from(u.searchParams.entries())
  };
}

/**
 * Clasifica un código de estado HTTP en su categoría correspondiente.
 * 
 * @param code El código numérico de estado HTTP.
 * @returns La categoría en formato string legible.
 */
export function classifyStatus(code: number): StatusCategory {
  if (code >= 100 && code < 200) return "1xx Informativo";
  if (code >= 200 && code < 300) return "2xx Éxito";
  if (code >= 300 && code < 400) return "3xx Redirección";
  if (code >= 400 && code < 500) return "4xx Error del cliente";
  if (code >= 500 && code < 600) return "5xx Error del servidor";
  return "Desconocido";
}

/**
 * Parsea un texto con líneas de cabeceras HTTP al formato de diccionario.
 * Ignora las líneas vacías o aquellas que no contienen el separador ":".
 * 
 * @param text Un bloque de texto con múltiples cabeceras.
 * @returns Un objeto Record donde cada llave es el nombre de la cabecera y el valor es su contenido.
 */
export function parseHeaders(text: string): Headers {
  const headers: Headers = {};
  const lines = text.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;
    const name = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    headers[name] = value;
  }
  return headers;
}

/**
 * Combina la información de la URL, el código de estado y las cabeceras
 * para generar un resumen legible de la petición.
 * 
 * @param url La URL de destino.
 * @param status El código de estado HTTP (ej. 200).
 * @param headersText Texto plano con las cabeceras.
 * @returns Un string formateado con el resumen completo de la solicitud.
 */
export function summarizeRequest(
  url: string,
  status: number,
  headersText: string,
): string {
  const category = classifyStatus(status);
  const headers = parseHeaders(headersText);
  let summary = `Resumen de la petición\n`;
  summary += `──────────────────────\n`;
  summary += `URL:     ${url}\n`;
  summary += `Status:  ${status} (${category})\n`;
  summary += `Headers:\n`;
  for (const [name, value] of Object.entries(headers)) {
    summary += `  • ${name}: ${value}\n`;
  }
  return summary;
}

// ---------------------------------------------------------------------------
// CLI (opcional, pero recomendado para probar manualmente)
// ---------------------------------------------------------------------------

if (require.main === module) {
  const [, , cmd, ...args] = process.argv;
  try {
    if (cmd === "parse-url" && args[0]) {
      const parts = parseUrl(args[0]);
      console.log(JSON.stringify(parts, null, 2));
    } else if (cmd === "status" && args[0]) {
      const cat = classifyStatus(Number(args[0]));
      console.log(cat);
    } else if (cmd === "headers" && args.length > 0) {
      const h = parseHeaders(args.join(" "));
      console.log(JSON.stringify(h, null, 2));
    } else if (cmd === "summary" && args.length >= 2) {
      const [url, status, ...rest] = args;
      console.log(summarizeRequest(url, Number(status), rest.join(" ")));
    } else {
      console.log("Uso:");
      console.log('  npm start parse-url "https://ejemplo.com/path?a=1"');
      console.log("  npm start status 404");
      console.log('  npm start headers "Content-Type: application/json"');
      console.log('  npm start summary "https://x.com" 200 "Content-Type: application/json"');
    }
  } catch (e) {
    console.error("Error:", (e as Error).message);
    process.exit(1);
  }
}
