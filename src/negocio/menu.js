/**
 * CIUDAD VIRTUAL — menu.js
 *
 * Lógica del menú de inicio. Responsabilidades:
 *  1. Detectar si existe partida guardada y habilitar "Continuar".
 *  2. Navegar entre la pantalla principal y el formulario.
 *  3. Cargar ciudades de Colombia via ApiRegion y manejar el autocompletado.
 *  4. Validar el formulario y guardar la configuración en localStorage
 *     antes de redirigir al juego (index.html).
 *  5. Permitir cargar mapas desde archivos TXT o definir tamaño manual.
 *
 * Comunicación con index.html (juego):
 *  - Al crear partida nueva: guarda en localStorage la clave 'config-nueva-partida'
 *    con los datos del formulario. grid.js los leerá al iniciar y llamará a
 *    Juego.crearCiudad(cfg).
 *  - Al continuar:          guarda en localStorage la clave 'accion-inicio' = 'continuar'.
 *    grid.js la leerá y llamará a Juego.cargarPartida().
 */

import ApiRegion from '../acceso_datos/API/ApiRegion.js';
import MapImporter from '../acceso_datos/MapImporter.js';

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

// Elementos para opciones de mapa
const radiosMapaTipo = document.querySelectorAll('input[name="mapa-tipo"]');
const seccionManual  = document.getElementById('seccion-manual');
const seccionTxt     = document.getElementById('seccion-txt');
const inputTxt       = document.getElementById('input-txt');
const txtInfo        = document.getElementById('txt-info');
const txtArchivo     = document.getElementById('txt-archivo');
const txtDimensiones = document.getElementById('txt-dimensiones');
const txtError       = document.getElementById('txt-error');

/* ================================================================
   ESTADO LOCAL DEL MÓDULO
================================================================ */
let todasLasCiudades = [];   // lista completa cargada desde la API
let ciudadSeleccionada = null; // objeto ciudad elegido del autocomplete
let cargandoCiudades = false;

// Estado del mapa TXT
let mapaTextoCargado = null;  // objeto con { ancho, alto, matriz, metadatos }

/* ================================================================
   1. VERIFICAR PARTIDA GUARDADA
================================================================ */
/**
 * Indica si existe una partida guardada en localStorage.
 * @returns {boolean}
 */
function hayPartidaGuardada() {
    try {
        return localStorage.getItem(CLAVE_PARTIDA) !== null;
    } catch {
        return false;
    }
}

/**
 * Inicializa estado visual del menú principal.
 */
function inicializarMenuPrincipal() {
    if (hayPartidaGuardada()) {
        btnContinuar.disabled = false;
        hintContinuar.textContent = 'Retomar donde lo dejaste';
    }
}

/* ================================================================
   2. NAVEGACIÓN ENTRE PANTALLAS
================================================================ */
/**
 * Cambia la pantalla activa en el flujo del menú.
 * @param {HTMLElement} pantalla
 */
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
/**
 * Carga el listado de ciudades desde API y prepara autocomplete.
 * @returns {Promise<void>}
 */
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

/**
 * Filtra ciudades por el texto ingresado.
 * @param {string} texto
 * @returns {Array<object>}
 */
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

/**
 * Renderiza sugerencias del autocomplete.
 * @param {Array<object>} sugerencias
 */
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

/**
 * Oculta y limpia la lista de sugerencias.
 */
function ocultarSugerencias() {
    acLista.classList.add('oculto');
    acLista.innerHTML = '';
}

/**
 * Fija una ciudad seleccionada en el formulario.
 * @param {object} ciudad
 */
function seleccionarCiudad(ciudad) {
    ciudadSeleccionada = ciudad;
    inputRegion.value = ciudad.name;
    regionOculta.value = JSON.stringify(ciudad);
    regionError.classList.add('oculto');
    ocultarSugerencias();
}

/**
 * Resetea la ciudad seleccionada actual.
 */
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
   5. SLIDER DEL MAPA Y OPCIONES DE CONFIGURACIÓN
================================================================ */
sliderMapa.addEventListener('input', () => {
    const n = sliderMapa.value;
    labelMapa.textContent = `${n} × ${n}`;
});

/**
 * Maneja el cambio entre opciones de mapa (manual vs TXT).
 */
function configurarOpcionesMapaTipo() {
    radiosMapaTipo.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const tipo = e.target.value;
            if (tipo === 'manual') {
                seccionManual.classList.remove('oculto');
                seccionTxt.classList.add('oculto');
                mapaTextoCargado = null;
                inputTxt.value = '';
                txtInfo.classList.add('oculto');
                txtError.classList.add('oculto');
            } else if (tipo === 'json') {
                seccionManual.classList.add('oculto');
                seccionTxt.classList.remove('oculto');
                mapaTextoCargado = null;
                inputTxt.click(); // Abre diálogo de archivo
            }
        });
    });
}

/**
 * Procesa el archivo JSON seleccionado.
 */
inputTxt.addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) {
        mapaTextoCargado = null;
        txtInfo.classList.add('oculto');
        txtError.classList.add('oculto');
        return;
    }

    try {
        txtError.classList.add('oculto');
        txtError.textContent = '';

        // Procesar archivo con MapImporter
        const datosValidados = await MapImporter.procesarArchivoTXT(archivo);
        mapaTextoCargado = datosValidados;

        // Mostrar información del mapa
        txtArchivo.textContent = `✓ Archivo cargado: ${archivo.name}`;
        txtDimensiones.textContent = `Tamaño detectado: ${datosValidados.ancho} × ${datosValidados.alto}`;
        txtInfo.classList.remove('oculto');

    } catch (error) {
        // Si hay error, podemos dejar la opción TXT seleccionada pero mostrar error
        mapaTextoCargado = null;
        txtInfo.classList.add('oculto');
        txtError.textContent = `Error al cargar archivo: ${error.message}`;
        txtError.classList.remove('oculto');
        inputTxt.value = '';
    }
});

/* ================================================================
   6. VALIDACIÓN Y CREACIÓN DE PARTIDA
================================================================ */
/**
 * Valida datos del formulario de creación de partida.
 * Considera ambas opciones: tamaño manual o cargar desde JSON.
 * @returns {boolean}
 */
function validarFormulario() {
    const alcalde = inputAlcalde.value.trim();
    const ciudad  = inputCiudad.value.trim();
    const turno   = parseInt(inputTurno.value, 10);
    const mapaType = document.querySelector('input[name="mapa-tipo"]:checked').value;

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
    } else if (mapaType === 'json') {
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
function mostrarErrorForm(msg) {
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

btnCrear.addEventListener('click', () => {
    if (!validarFormulario()) return;

    const mapaType = document.querySelector('input[name="mapa-tipo"]:checked').value;
    const turnoSegundos = parseInt(inputTurno.value, 10);
    let ancho, alto;

    // Determinar dimensiones según el tipo de mapa
    if (mapaType === 'manual') {
        ancho = parseInt(sliderMapa.value, 10);
        alto = parseInt(sliderMapa.value, 10);
    } else if (mapaType === 'json') {
        ancho = mapaTextoCargado.ancho;
        alto = mapaTextoCargado.alto;
    }

    // Configuración que leerá grid.js al iniciar el juego
    const config = {
        alcalde:       inputAlcalde.value.trim(),
        nombre:        inputCiudad.value.trim(),
        regionNombre:  ciudadSeleccionada.name,
        regionId:      ciudadSeleccionada.id,
        ancho:         ancho,
        alto:          alto,
        duracionTurno: turnoSegundos * 1000,   // Juego.crearCiudad espera ms
        dineroInicial: 50000,
    };

    // Si se cargó un mapa desde TXT, incluir los datos del mapa
    if (mapaType === 'json' && mapaTextoCargado) {
        config.matrizJSON = mapaTextoCargado.matriz;
    }

    // Limpiar posible acción anterior y guardar la nueva configuración
    localStorage.removeItem(CLAVE_ACCION);
    localStorage.setItem(CLAVE_CONFIG_NUEVA, JSON.stringify(config));

    // Redirigir al juego
    window.location.href = RUTA_JUEGO;
});

/* ================================================================
   7. UTILIDADES
================================================================ */
/**
 * Limpia y resetea todos los controles del formulario.
 */
function limpiarFormulario() {
    inputAlcalde.value  = '';
    inputCiudad.value   = '';
    inputRegion.value   = '';
    regionOculta.value  = '';
    sliderMapa.value    = MAPA_MIN;
    labelMapa.textContent = `${MAPA_MIN} × ${MAPA_MIN}`;
    inputTurno.value    = TURNO_MIN_SEG;
    ciudadSeleccionada  = null;
    mapaJsonCargado     = null;
    inputTxt.value     = '';
    ocultarSugerencias();
    ocultarErrorForm();
    regionError.classList.add('oculto');
    jsonError.classList.add('oculto');
    jsonInfo.classList.add('oculto');
    // Resetear opción de mapa a manual
    document.querySelector('input[name="mapa-tipo"][value="manual"]').checked = true;
    seccionManual.classList.remove('oculto');
    seccionJson.classList.add('oculto');
}

/* ================================================================
   INIT
================================================================ */
inicializarMenuPrincipal();
configurarOpcionesMapaTipo();
