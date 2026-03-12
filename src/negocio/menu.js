/**
 * CIUDAD VIRTUAL — menu.js
 *
 * Lógica del menú de inicio. Responsabilidades:
 *  1. Detectar si existe partida guardada y habilitar "Continuar".
 *  2. Navegar entre la pantalla principal y el formulario.
 *  3. Cargar ciudades de Colombia via ApiRegion y manejar el autocompletado.
 *  4. Validar el formulario y guardar la configuración en localStorage
 *     antes de redirigir al juego (index.html).
 *
 * Comunicación con index.html (juego):
 *  - Al crear partida nueva: guarda en localStorage la clave 'config-nueva-partida'
 *    con los datos del formulario. grid.js los leerá al iniciar y llamará a
 *    Juego.crearCiudad(cfg).
 *  - Al continuar:          guarda en localStorage la clave 'accion-inicio' = 'continuar'.
 *    grid.js la leerá y llamará a Juego.cargarPartida().
 */

import ApiRegion from '../acceso_datos/API/ApiRegion.js';

/* ================================================================
   CONSTANTES
================================================================ */
const CLAVE_PARTIDA        = 'partida';          // usada por StorageManager / Juego
const CLAVE_CONFIG_NUEVA   = 'config-nueva-partida';
const CLAVE_ACCION         = 'accion-inicio';
const RUTA_JUEGO           = './index.html';     // relativa desde presentacion/vistas/

const MAPA_MIN = 15;
const MAPA_MAX = 30;
const TURNO_MIN_SEG = 10;

/* ================================================================
   REFERENCIAS AL DOM
================================================================ */
const pantallaMenu       = document.getElementById('pantalla-menu');
const pantallaFormulario = document.getElementById('pantalla-formulario');

const btnContinuar  = document.getElementById('btn-continuar');
const hintContinuar = document.getElementById('hint-continuar');
const btnNueva      = document.getElementById('btn-nueva');
const btnVolver     = document.getElementById('btn-volver');
const btnCrear      = document.getElementById('btn-crear');

const inputAlcalde  = document.getElementById('input-alcalde');
const inputCiudad   = document.getElementById('input-ciudad');
const inputRegion   = document.getElementById('input-region');
const regionOculta  = document.getElementById('region-seleccionada');
const regionError   = document.getElementById('region-error');
const acLista       = document.getElementById('autocomplete-lista');
const acSpinner     = document.getElementById('autocomplete-spinner');

const sliderMapa    = document.getElementById('slider-mapa');
const labelMapa     = document.getElementById('label-mapa');
const inputTurno    = document.getElementById('input-turno');
const formError     = document.getElementById('form-error');

/* ================================================================
   ESTADO LOCAL DEL MÓDULO
================================================================ */
let todasLasCiudades = [];   // lista completa cargada desde la API
let ciudadSeleccionada = null; // objeto ciudad elegido del autocomplete
let cargandoCiudades = false;

/* ================================================================
   1. VERIFICAR PARTIDA GUARDADA
================================================================ */
function hayPartidaGuardada() {
    try {
        return localStorage.getItem(CLAVE_PARTIDA) !== null;
    } catch {
        return false;
    }
}

function inicializarMenuPrincipal() {
    if (hayPartidaGuardada()) {
        btnContinuar.disabled = false;
        hintContinuar.textContent = 'Retomar donde lo dejaste';
    }
}

/* ================================================================
   2. NAVEGACIÓN ENTRE PANTALLAS
================================================================ */
function mostrarPantalla(pantalla) {
    document.querySelectorAll('.pantalla').forEach(p => p.classList.remove('activa'));
    pantalla.classList.add('activa');
}

btnNueva.addEventListener('click', () => {
    mostrarPantalla(pantallaFormulario);
    // Cargar ciudades la primera vez que se abre el formulario
    if (todasLasCiudades.length === 0 && !cargandoCiudades) {
        cargarCiudadesAPI();
    }
});

btnVolver.addEventListener('click', () => {
    mostrarPantalla(pantallaMenu);
    limpiarFormulario();
});

btnContinuar.addEventListener('click', () => {
    localStorage.setItem(CLAVE_ACCION, 'continuar');
    window.location.href = RUTA_JUEGO;
});

/* ================================================================
   3. CARGA DE CIUDADES DESDE LA API
================================================================ */
async function cargarCiudadesAPI() {
    cargandoCiudades = true;
    acSpinner.classList.remove('oculto');
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
        acSpinner.classList.add('oculto');
        inputRegion.disabled = false;
        inputRegion.placeholder = 'Escribe para buscar...';
        inputRegion.focus();
    }
}

/* ================================================================
   4. AUTOCOMPLETE DE CIUDADES
   Comportamiento tipo Google: filtra mientras se escribe,
   muestra lista desplegable, selección confirma el valor.
================================================================ */

// Filtra la lista completa con el texto escrito
function filtrarCiudades(texto) {
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

function mostrarSugerencias(sugerencias) {
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

function ocultarSugerencias() {
    acLista.classList.add('oculto');
    acLista.innerHTML = '';
}

function seleccionarCiudad(ciudad) {
    ciudadSeleccionada = ciudad;
    inputRegion.value = ciudad.name;
    regionOculta.value = JSON.stringify(ciudad);
    regionError.classList.add('oculto');
    ocultarSugerencias();
}

// Resetea la selección si el usuario borra el campo
function resetearSeleccion() {
    ciudadSeleccionada = null;
    regionOculta.value = '';
}

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

/* ================================================================
   5. SLIDER DEL MAPA
================================================================ */
sliderMapa.addEventListener('input', () => {
    const n = sliderMapa.value;
    labelMapa.textContent = `${n} × ${n}`;
});

/* ================================================================
   6. VALIDACIÓN Y CREACIÓN DE PARTIDA
================================================================ */
function validarFormulario() {
    const alcalde = inputAlcalde.value.trim();
    const ciudad  = inputCiudad.value.trim();
    const turno   = parseInt(inputTurno.value, 10);

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

    ocultarErrorForm();
    return true;
}

function mostrarErrorForm(msg) {
    formError.textContent = msg;
    formError.classList.remove('oculto');
}

function ocultarErrorForm() {
    formError.classList.add('oculto');
    formError.textContent = '';
}

btnCrear.addEventListener('click', () => {
    if (!validarFormulario()) return;

    const tamano = parseInt(sliderMapa.value, 10);
    const turnoSegundos = parseInt(inputTurno.value, 10);

    // Configuración que leerá grid.js al iniciar el juego
    const config = {
        alcalde:       inputAlcalde.value.trim(),
        nombre:        inputCiudad.value.trim(),
        regionNombre:  ciudadSeleccionada.name,
        regionId:      ciudadSeleccionada.id,
        ancho:         tamano,
        alto:          tamano,
        duracionTurno: turnoSegundos * 1000,   // Juego.crearCiudad espera ms
        dineroInicial: 50000,
    };

    // Limpiar posible acción anterior y guardar la nueva configuración
    localStorage.removeItem(CLAVE_ACCION);
    localStorage.setItem(CLAVE_CONFIG_NUEVA, JSON.stringify(config));

    // Redirigir al juego
    window.location.href = RUTA_JUEGO;
});

/* ================================================================
   7. UTILIDADES
================================================================ */
function limpiarFormulario() {
    inputAlcalde.value  = '';
    inputCiudad.value   = '';
    inputRegion.value   = '';
    regionOculta.value  = '';
    sliderMapa.value    = MAPA_MIN;
    labelMapa.textContent = `${MAPA_MIN} × ${MAPA_MIN}`;
    inputTurno.value    = TURNO_MIN_SEG;
    ciudadSeleccionada  = null;
    ocultarSugerencias();
    ocultarErrorForm();
    regionError.classList.add('oculto');
}

/* ================================================================
   INIT
================================================================ */
inicializarMenuPrincipal();
