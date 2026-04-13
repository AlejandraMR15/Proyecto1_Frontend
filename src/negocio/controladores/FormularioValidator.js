/**
 * CIUDAD VIRTUAL — FormularioValidator.js
 *
 * Responsabilidad única: Validar y limpiar el formulario de nueva partida.
 * - Validar campos del formulario
 * - Gestionar mensajes de error
 * - Limpiar el formulario
 */

import { obtenerCiudadSeleccionada } from './RegionAPIManager.js';
import { obtenerTipoMapaSeleccionado, obtenerMapaTextoCargado } from './MapaConfiguradorManager.js';

/* ================================================================
   CONSTANTES
================================================================ */
const TURNO_MIN_SEG = 10;

/* ================================================================
   REFERENCIAS AL DOM
================================================================ */
const inputAlcalde  = document.getElementById('input-alcalde');
const inputCiudad   = document.getElementById('input-ciudad');
const inputRegion   = document.getElementById('input-region');
const inputTurno    = document.getElementById('input-turno');
const formError     = document.getElementById('form-error');
const regionError   = document.getElementById('region-error');
const inputTxt      = document.getElementById('input-txt');

/* ================================================================
   FUNCIONES PÚBLICAS
================================================================ */

/**
 * Valida datos del formulario de creación de partida.
 * Considera ambas opciones: tamaño manual o cargar desde archivo TXT.
 * @returns {boolean}
 */
export function validarFormulario() {
    const alcalde = inputAlcalde.value.trim();
    const ciudad  = inputCiudad.value.trim();
    const turno   = parseInt(inputTurno.value, 10);
    const mapaType = obtenerTipoMapaSeleccionado();
    const ciudadSeleccionada = obtenerCiudadSeleccionada();

    if (!alcalde) {
        mostrarErrorForm('El nombre del alcalde es obligatorio.');
        inputAlcalde.focus();
        return false;
    }
    if (!ciudad) {
        mostrarErrorForm('El nombre de la ciudad es obligatorio.');
        inputCiudad.focus();
        return false;
    }
    if (!ciudadSeleccionada) {
        mostrarErrorForm('Debes seleccionar una ciudad geográfica de la lista.');
        regionError.classList.remove('oculto');
        inputRegion.focus();
        return false;
    }
    if (isNaN(turno) || turno < TURNO_MIN_SEG) {
        mostrarErrorForm(`La duración del turno debe ser al menos ${TURNO_MIN_SEG} segundos.`);
        inputTurno.focus();
        return false;
    }

    // Validar según el tipo de mapa seleccionado
    if (mapaType === 'manual') {
        // Si es manual, ya el slider valida el tamaño (15-30)
        // No hay validación adicional necesaria
    } else if (mapaType === 'txt') {
        const mapaTextoCargado = obtenerMapaTextoCargado();
        if (!mapaTextoCargado) {
            mostrarErrorForm('Debes cargar un archivo TXT válido del mapa.');
            inputTxt.focus();
            return false;
        }
    }

    ocultarErrorForm();
    return true;
}

/**
 * Muestra un mensaje de error de validación del formulario.
 * @param {string} msg
 */
export function mostrarErrorForm(msg) {
    formError.textContent = msg;
    formError.classList.remove('oculto');
}

/**
 * Oculta el mensaje de error del formulario.
 */
function ocultarErrorForm() {
    formError.classList.add('oculto');
    formError.textContent = '';
}

/**
 * Limpia y resetea todos los controles del formulario.
 */
export function limpiarFormulario() {
    inputAlcalde.value  = '';
    inputCiudad.value   = '';
    inputRegion.value   = '';
    inputTurno.value    = TURNO_MIN_SEG;
    ocultarErrorForm();
    regionError.classList.add('oculto');
}
