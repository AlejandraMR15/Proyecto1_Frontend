/**
 * CIUDAD VIRTUAL — menu.js (COORDINADOR)
 *
 * Responsabilidad única: Orquestar navegación y creación de partida.
 * - Detectar si existe partida guardada
 * - Coordinar navegación entre pantallas
 * - Delega responsabilidades a managers especializados
 *
 * Comunicación con index.html (juego):
 *  - Al crear partida nueva: guarda en localStorage la clave 'config-nueva-partida'
 *    con los datos del formulario. grid.js los leerá al iniciar y llamará a
 *    Juego.crearCiudad(cfg).
 *  - Al continuar:          guarda en localStorage la clave 'accion-inicio' = 'continuar'.
 *    grid.js la leerá y llamará a Juego.cargarPartida().
 */

import { 
    cargarCiudadesAPI, 
    obtenerCiudadSeleccionada, 
    inicializarAutocomplete 
} from './RegionAPIManager.js';
import { 
    obtenerTipoMapaSeleccionado, 
    obtenerMapaTextoCargado, 
    obtenerDimensionesSlider,
    inicializarConfigurador, 
    reiniciarConfigurador
} from './MapaConfiguradorManager.js';
import { 
    validarFormulario, 
    limpiarFormulario
} from './FormularioValidator.js';
import { 
    leerPartidaDesdeArchivoJSON 
} from '../../acceso_datos/ImportadorCiudad.js';
import { reiniciarHistorialRecursos } from './historialRecursos.js';
import StorageManager from '../../acceso_datos/StorageManager.js';

/* ================================================================
   CONSTANTES
================================================================ */
const CLAVE_PARTIDA        = 'partida';          // usada por StorageManager / Juego
const CLAVE_CONFIG_NUEVA   = 'config-nueva-partida';
const CLAVE_ACCION         = 'accion-inicio';
const RUTA_JUEGO           = './index.html';     // relativa desde presentacion/vistas/
const storageManager       = new StorageManager();

/* ================================================================
   REFERENCIAS AL DOM
================================================================ */
const pantallaMenu       = document.getElementById('pantalla-menu');
const pantallaFormulario = document.getElementById('pantalla-formulario');

const btnContinuar  = document.getElementById('btn-continuar');
const hintContinuar = document.getElementById('hint-continuar');
const btnNueva      = document.getElementById('btn-nueva');
const btnImportarCiudad  = document.getElementById('btn-importar-ciudad');
const hintImportarCiudad = document.getElementById('hint-importar');
const inputImportarCiudadMenu = document.getElementById('input-importar-ciudad-menu');
const btnVolver     = document.getElementById('btn-volver');
const btnCrear      = document.getElementById('btn-crear');


/* ================================================================
   1. VERIFICAR PARTIDA GUARDADA
================================================================ */
/**
 * Indica si existe una partida guardada en localStorage.
 * @returns {boolean}
 */
function hayPartidaGuardada() {
    try {
        return storageManager.cargar(CLAVE_PARTIDA) !== null;
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

    // Evita quedar "a mitad" al cambiar entre menú y formulario en móvil.
    requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;

        // En landscape móvil el scroll vive dentro del contenedor del formulario.
        if (pantalla && typeof pantalla.scrollTo === 'function') {
            pantalla.scrollTo(0, 0);
        }
    });
}

/* ================================================================
   3. EVENT LISTENERS
================================================================ */

/**
 * Abre el formulario de nueva partida y carga ciudades la primera vez.
 */
btnNueva.addEventListener('click', () => {
    mostrarPantalla(pantallaFormulario);
    // Cargar ciudades la primera vez que se abre el formulario
    cargarCiudadesAPI();
});

/**
 * Vuelve al menú principal y limpia el formulario.
 */
btnVolver.addEventListener('click', () => {
    mostrarPantalla(pantallaMenu);
    limpiarFormulario();
    reiniciarConfigurador();
});

/**
 * Continúa una partida guardada.
 */
btnContinuar.addEventListener('click', () => {
    storageManager.guardar(CLAVE_ACCION, 'continuar');
    window.location.href = RUTA_JUEGO;
});

/**
 * Crea y guarda una nueva partida.
 */
btnCrear.addEventListener('click', () => {
    if (!validarFormulario()) return;

    const mapaType = obtenerTipoMapaSeleccionado();
    const turnoSegundos = parseInt(document.getElementById('input-turno').value, 10);
    const ciudadSeleccionada = obtenerCiudadSeleccionada();
    const inputAlcalde = document.getElementById('input-alcalde');
    const inputCiudad = document.getElementById('input-ciudad');
    let ancho, alto;

    // Determinar dimensiones según el tipo de mapa
    if (mapaType === 'manual') {
        const dimensiones = obtenerDimensionesSlider();
        ancho = dimensiones.ancho;
        alto = dimensiones.alto;
    } else if (mapaType === 'txt') {
        const mapaTextoCargado = obtenerMapaTextoCargado();
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
    if (mapaType === 'txt' && obtenerMapaTextoCargado()) {
        config.matrizJSON = obtenerMapaTextoCargado().matriz;
    }

    // Limpiar posible acción anterior y guardar la nueva configuración
    storageManager.eliminar(CLAVE_ACCION);
    storageManager.guardar(CLAVE_CONFIG_NUEVA, config);

    // Redirigir al juego
    window.location.href = RUTA_JUEGO;
});

/**
 * Abre el selector de archivo para importar una ciudad desde JSON.
 */
btnImportarCiudad.addEventListener('click', () => {
    inputImportarCiudadMenu.click();
});

/**
 * Procesa el archivo JSON seleccionado para importar una ciudad.
 */
inputImportarCiudadMenu.addEventListener('change', async (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    try {
        const partida = await leerPartidaDesdeArchivoJSON(archivo);

        storageManager.guardar(CLAVE_PARTIDA, partida);
        storageManager.eliminar(CLAVE_CONFIG_NUEVA);
        reiniciarHistorialRecursos();
        storageManager.guardar(CLAVE_ACCION, 'continuar');

        hintImportarCiudad.textContent = 'Archivo cargado. Iniciando ciudad...';
        window.location.href = RUTA_JUEGO;

    } catch (error) {
        console.error('Error al importar ciudad desde JSON:', error);
        hintImportarCiudad.textContent = `Error: ${error.message}`;
    } finally {
        inputImportarCiudadMenu.value = '';
    }
});

/* ================================================================
   INIT
================================================================ */
inicializarMenuPrincipal();
inicializarAutocomplete();
inicializarConfigurador();
