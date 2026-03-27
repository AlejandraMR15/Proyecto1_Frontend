/**
 * CIUDAD VIRTUAL — MapaConfiguradorManager.js
 *
 * Responsabilidad única: Gestionar la configuración del tipo de mapa.
 * - Obtener tipo de mapa seleccionado (manual o TXT)
 * - Manejar cambio entre opciones de mapa
 * - Procesar carga de archivos TXT
 */

import MapImporter from '../../acceso_datos/MapImporter.js';

/* ================================================================
   REFERENCIAS AL DOM
================================================================ */
const radiosMapaTipo = document.querySelectorAll('input[name="mapa-tipo"]');
const seccionManual  = document.getElementById('seccion-manual');
const seccionTxt     = document.getElementById('seccion-txt');
const inputTxt       = document.getElementById('input-txt');
const txtInfo        = document.getElementById('txt-info');
const txtArchivo     = document.getElementById('txt-archivo');
const txtDimensiones = document.getElementById('txt-dimensiones');
const txtError       = document.getElementById('txt-error');

/* ================================================================
   ESTADO LOCAL
================================================================ */
let mapaTextoCargado = null;  // objeto con { ancho, alto, matriz, metadatos }

/* ================================================================
   FUNCIONES PÚBLICAS
================================================================ */

/**
 * Obtiene el tipo de mapa seleccionado actualmente.
 * @returns {string} 'manual' o 'txt'
 */
export function obtenerTipoMapaSeleccionado() {
    return document.querySelector('input[name="mapa-tipo"]:checked').value;
}

/**
 * Retorna los datos del mapa TXT cargado.
 * @returns {object|null}
 */
export function obtenerMapaTextoCargado() {
    return mapaTextoCargado;
}

/**
 * Retorna las dimensiones del slider (para mapa manual).
 * @returns {object} { ancho, alto }
 */
export function obtenerDimensionesSlider() {
    const sliderMapa = document.getElementById('slider-mapa');
    const valor = parseInt(sliderMapa.value, 10);
    return { ancho: valor, alto: valor };
}

/**
 * Limpia el mapa TXT cargado.
 */
export function limpiarMapaCargado() {
    mapaTextoCargado = null;
}

/**
 * Reinicia la sección de mapa al estado inicial (manual).
 */
export function reiniciarConfigurador() {
    // Limpiar estado del mapa TXT
    mapaTextoCargado = null;
    inputTxt.value = '';
    txtInfo.classList.add('oculto');
    txtError.classList.add('oculto');
    
    // Resetear opciones de mapa
    document.querySelector('input[name="mapa-tipo"][value="manual"]').checked = true;
    seccionManual.classList.remove('oculto');
    seccionTxt.classList.add('oculto');
    
    // Resetear slider a valor inicial
    const sliderMapa = document.getElementById('slider-mapa');
    const labelMapa = document.getElementById('label-mapa');
    const MAPA_MIN = 15;
    sliderMapa.value = MAPA_MIN;
    labelMapa.textContent = `${MAPA_MIN} × ${MAPA_MIN}`;
}

/**
 * Inicializa el listener del slider del mapa manual.
 */
function inicializarSlider() {
    const sliderMapa = document.getElementById('slider-mapa');
    const labelMapa = document.getElementById('label-mapa');
    
    sliderMapa.addEventListener('input', () => {
        const n = sliderMapa.value;
        labelMapa.textContent = `${n} × ${n}`;
    });
}

/**
 * Inicializa los listeners para cambios entre opciones de mapa.
 */
export function inicializarConfigurador() {
    inicializarSlider();
    
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
            } else if (tipo === 'txt') {
                seccionManual.classList.add('oculto');
                seccionTxt.classList.remove('oculto');
                mapaTextoCargado = null;
                inputTxt.click(); // Abre diálogo de archivo
            }
        });
    });

    /**
     * Procesa el archivo TXT seleccionado.
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
}
