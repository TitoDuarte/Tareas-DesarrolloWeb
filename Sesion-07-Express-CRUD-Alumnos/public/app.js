/**
 * app.js — Lógica del sitio (Fetch + Dialogs)
 * Tarea Sesión 7 · Desarrollo Web · UMG
 *
 * La API exige el header `x-api-key` en las operaciones de escritura
 * (POST, PUT, DELETE).
 */

const API = '/alumnos';
const API_KEY = 'umg-2026'; // debe coincidir con config.env

// Helper ya resuelto: cabeceras para las peticiones
const cabeceras = (conJson = true) => ({
    ...(conJson ? { 'Content-Type': 'application/json' } : {}),
    'x-api-key': API_KEY,
});

// Referencias del DOM (ya resueltas)
const tabla = document.querySelector('#tablaAlumnos tbody');
const mensaje = document.querySelector('#mensaje');
const dialogoForm = document.querySelector('#dialogoForm');
const dialogoEliminar = document.querySelector('#dialogoEliminar');
const form = document.querySelector('#formAlumno');
const tituloForm = document.querySelector('#tituloForm');
const nombreEliminar = document.querySelector('#nombreEliminar');

let idEnEdicion = null;        // null = crear | string = editar
let idAEliminar = null;

/** Muestra un mensaje de éxito ('ok') o de error ('error'). */
function mostrarMensaje(texto, tipo = 'ok') {
    mensaje.textContent = texto;
    mensaje.className = tipo;
}

/** Lee el error que devolvió la API (o arma uno genérico con el status). */
async function leerError(respuesta) {
    try {
        const cuerpo = await respuesta.json();
        return cuerpo?.error ?? `Error ${respuesta.status}`;
    } catch {
        return `Error ${respuesta.status}`;
    }
}

/** Crea una celda <td> con texto (textContent evita inyectar HTML). */
function crearCelda(texto) {
    const celda = document.createElement('td');
    celda.textContent = texto;
    return celda;
}

/** Crea un botón de acción para una fila. */
function crearBoton(texto, clase, alHacerClick) {
    const boton = document.createElement('button');
    boton.type = 'button';
    boton.textContent = texto;
    boton.className = clase;
    boton.addEventListener('click', alHacerClick);
    return boton;
}

/** GET /alumnos y pinta las filas en la tabla. */
async function cargarAlumnos() {
    try {
        const respuesta = await fetch(API);
        if (!respuesta.ok) throw new Error(await leerError(respuesta));
        const alumnos = await respuesta.json();

        tabla.replaceChildren();
        for (const alumno of alumnos) {
            const fila = document.createElement('tr');
            fila.append(
                crearCelda(alumno.id),
                crearCelda(alumno.nombre),
                crearCelda(alumno.apellido),
                crearCelda(alumno.email),
                crearCelda(alumno.edad ?? ''),
            );

            const acciones = document.createElement('td');
            acciones.className = 'acciones-fila';
            acciones.append(
                crearBoton('✏️ Editar', 'btn-editar', () => abrirDialogoEditar(alumno.id)),
                crearBoton('🗑️ Eliminar', 'btn-eliminar',
                    () => eliminarAlumno(alumno.id, `${alumno.nombre} ${alumno.apellido}`)),
            );
            fila.append(acciones);
            tabla.append(fila);
        }
    } catch (error) {
        mostrarMensaje(`No se pudo cargar la lista: ${error.message}`, 'error');
    }
}

/** Limpia el formulario y abre el dialog en modo "crear". */
function abrirDialogoNuevo() {
    form.reset();
    tituloForm.textContent = 'Nuevo alumno';
    idEnEdicion = null;
    dialogoForm.showModal();
}

/** Precarga al alumno en el formulario y abre el dialog en modo "editar". */
async function abrirDialogoEditar(id) {
    try {
        const respuesta = await fetch(`${API}/${id}`);
        if (!respuesta.ok) throw new Error(await leerError(respuesta));
        const alumno = await respuesta.json();

        form.reset();
        form.elements.nombre.value = alumno.nombre;
        form.elements.apellido.value = alumno.apellido;
        form.elements.email.value = alumno.email;
        form.elements.edad.value = alumno.edad ?? '';
        tituloForm.textContent = 'Editar alumno';
        idEnEdicion = id;
        dialogoForm.showModal();
    } catch (error) {
        mostrarMensaje(`No se pudo abrir el alumno: ${error.message}`, 'error');
    }
}

/** POST (crear) o PUT (editar) según idEnEdicion. */
async function guardarAlumno(event) {
    event.preventDefault(); // evita que el dialog se cierre antes de guardar

    const datos = {
        nombre: form.elements.nombre.value.trim(),
        apellido: form.elements.apellido.value.trim(),
        email: form.elements.email.value.trim(),
    };
    const edad = form.elements.edad.value;
    if (edad !== '') datos.edad = Number(edad);

    const editando = idEnEdicion !== null;
    try {
        const respuesta = await fetch(editando ? `${API}/${idEnEdicion}` : API, {
            method: editando ? 'PUT' : 'POST',
            headers: cabeceras(),
            body: JSON.stringify(datos),
        });
        if (!respuesta.ok) throw new Error(await leerError(respuesta));

        dialogoForm.close();
        await cargarAlumnos();
        mostrarMensaje(editando ? 'Alumno actualizado' : 'Alumno creado');
    } catch (error) {
        mostrarMensaje(`No se pudo guardar: ${error.message}`, 'error');
    }
}

/** Abre el dialog de confirmación para el alumno indicado. */
function eliminarAlumno(id, nombre = '') {
    idAEliminar = id;
    nombreEliminar.textContent = nombre;
    dialogoEliminar.showModal();
}

/** DELETE /alumnos/:id del alumno pendiente de confirmar. */
async function confirmarEliminar() {
    try {
        const respuesta = await fetch(`${API}/${idAEliminar}`, {
            method: 'DELETE',
            headers: cabeceras(false),
        });
        if (!respuesta.ok) throw new Error(await leerError(respuesta));

        dialogoEliminar.close();
        await cargarAlumnos();
        mostrarMensaje('Alumno eliminado');
    } catch (error) {
        dialogoEliminar.close();
        mostrarMensaje(`No se pudo eliminar: ${error.message}`, 'error');
    }
}

// ============================================================
// Conexión de eventos
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#btnNuevo').addEventListener('click', abrirDialogoNuevo);
    form.addEventListener('submit', guardarAlumno);
    document.querySelector('#btnCancelar').addEventListener('click', () => dialogoForm.close());
    document.querySelector('#btnCancelarEliminar').addEventListener('click', () => dialogoEliminar.close());
    document.querySelector('#btnConfirmarEliminar').addEventListener('click', confirmarEliminar);
    cargarAlumnos();
});
