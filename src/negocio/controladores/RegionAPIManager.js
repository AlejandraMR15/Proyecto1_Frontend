/**
 * CIUDAD VIRTUAL — AutocompleteManager.js
 *
 * Responsabilidad única: Gestionar el autocomplete de ciudades de Colombia.
 * - Cargar ciudades desde API
 * - Filtrar y renderizar sugerencias
 * - Manejar selección y navegación con teclado
 */

import ApiRegion from '../../acceso_datos/API/ApiRegion.js';

/* ================================================================
   REFERENCIAS AL DOM
================================================================ */
const inputRegion   = document.getElementById('input-region');
const regionOculta  = document.getElementById('region-seleccionada');
const regionError   = document.getElementById('region-error');
const acLista       = document.getElementById('autocomplete-lista');

/* ================================================================
   ESTADO LOCAL
================================================================ */
let todasLasCiudades = [];    // lista completa cargada desde la API
let ciudadSeleccionada = null; // objeto ciudad elegido del autocomplete
let cargandoCiudades = false;

/* ================================================================
   FUNCIONES PÚBLICAS
================================================================ */

/**
 * Carga el listado de ciudades desde API y prepara autocomplete.
 * @returns {Promise<void>}
 */
export async function cargarCiudadesAPI() {
    cargandoCiudades = true;
    inputRegion.disabled = true;
    inputRegion.placeholder = 'Cargando ciudades...';

    try {
        const api = new ApiRegion();
        // obtenerTodasLasCiudades() retorna el array directo de la API
        todasLasCiudades = await api.obtenerTodasLasCiudades();
        // Ordenar alfabéticamente para mejor experiencia
        todasLasCiudades.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
        console.error('Error al cargar ciudades:', error);
        todasLasCiudades = [];
        inputRegion.placeholder = 'Error al cargar ciudades';
    } finally {
        cargandoCiudades = false;
        inputRegion.disabled = false;
        inputRegion.placeholder = 'Escribe para buscar...';
    }
}

/**
 * Retorna la ciudad seleccionada actualmente.
 * @returns {object|null}
 */
export function obtenerCiudadSeleccionada() {
    return ciudadSeleccionada;
}

/**
 * Exporta el estado de si está cargando ciudades.
 * @returns {boolean}
 */
export function estaCargandoCiudades() {
    return cargandoCiudades;
}

/**
 * Exporta el total de ciudades cargadas.
 * @returns {number}
 */
export function totalCiudadesCargadas() {
    return todasLasCiudades.length;
}

/**
 * Filtra ciudades por el texto ingresado.
 * @param {string} texto
 * @returns {Array<object>}
 */
export function filtrarCiudades(texto) {
    if (!texto.trim()) return [];
    const normalizado = texto.trim().toLowerCase();
    // Coincidencias que EMPIEZAN con el texto primero, luego las que lo CONTIENEN
    const empiezan = todasLasCiudades.filter(c =>
        c.name.toLowerCase().startsWith(normalizado)
    );
    const contienen = todasLasCiudades.filter(c =>
        !c.name.toLowerCase().startsWith(normalizado) &&
        c.name.toLowerCase().includes(normalizado)
    );
    return [...empiezan, ...contienen].slice(0, 8); // máximo 8 sugerencias
}

/**
 * Renderiza sugerencias del autocomplete.
 * @param {Array<object>} sugerencias
 */
export function mostrarSugerencias(sugerencias) {
    acLista.innerHTML = '';

    if (sugerencias.length === 0) {
        const li = document.createElement('li');
        li.className = 'ac-vacio';
        li.textContent = 'Sin resultados';
        acLista.appendChild(li);
    } else {
        sugerencias.forEach(ciudad => {
            const li = document.createElement('li');
            li.textContent = ciudad.name;
            li.addEventListener('mousedown', (e) => {
                // mousedown en vez de click para que no se dispare el blur primero
                e.preventDefault();
                seleccionarCiudad(ciudad);
            });
            acLista.appendChild(li);
        });
    }

    acLista.classList.remove('oculto');
}

/**
 * Oculta y limpia la lista de sugerencias.
 */
export function ocultarSugerencias() {
    acLista.classList.add('oculto');
    acLista.innerHTML = '';
}

/**
 * Fija una ciudad seleccionada en el formulario.
 * @param {object} ciudad
 */
export function seleccionarCiudad(ciudad) {
    ciudadSeleccionada = ciudad;
    inputRegion.value = ciudad.name;
    regionOculta.value = JSON.stringify(ciudad);
    regionError.classList.add('oculto');
    ocultarSugerencias();
}

/**
 * Resetea la ciudad seleccionada actual.
 */
export function resetearSeleccion() {
    ciudadSeleccionada = null;
    regionOculta.value = '';
}

/**
 * Inicializa los listeners del autocomplete.
 */
export function inicializarAutocomplete() {
    inputRegion.addEventListener('input', () => {
        resetearSeleccion();
        const texto = inputRegion.value;
        if (!texto.trim()) {
            ocultarSugerencias();
            return;
        }
        if (todasLasCiudades.length === 0) return; // aún cargando
        const sugerencias = filtrarCiudades(texto);
        mostrarSugerencias(sugerencias);
    });

    inputRegion.addEventListener('focus', () => {
        if (inputRegion.value.trim() && todasLasCiudades.length > 0) {
            const sugerencias = filtrarCiudades(inputRegion.value);
            if (sugerencias.length > 0) mostrarSugerencias(sugerencias);
        }
    });

    inputRegion.addEventListener('blur', () => {
        // Pequeño delay para que el mousedown del li se ejecute antes
        setTimeout(ocultarSugerencias, 150);
        // Si el texto no coincide exactamente con una ciudad seleccionada, invalidar
        if (!ciudadSeleccionada && inputRegion.value.trim()) {
            regionError.textContent = 'Selecciona una ciudad de la lista';
            regionError.classList.remove('oculto');
        }
    });

    // Navegación con teclado en la lista
    inputRegion.addEventListener('keydown', (e) => {
        const items = acLista.querySelectorAll('li:not(.ac-vacio)');
        const activo = acLista.querySelector('.ac-activo');
        let idx = -1;

        if (activo) {
            idx = Array.from(items).indexOf(activo);
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (activo) activo.classList.remove('ac-activo');
            const siguiente = items[idx + 1] ?? items[0];
            if (siguiente) siguiente.classList.add('ac-activo');

        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (activo) activo.classList.remove('ac-activo');
            const anterior = items[idx - 1] ?? items[items.length - 1];
            if (anterior) anterior.classList.add('ac-activo');

        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activo) {
                const nombreElegido = activo.textContent;
                const ciudad = todasLasCiudades.find(c => c.name === nombreElegido);
                if (ciudad) seleccionarCiudad(ciudad);
            }

        } else if (e.key === 'Escape') {
            ocultarSugerencias();
        }
    });
}
