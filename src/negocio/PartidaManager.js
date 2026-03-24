/**
 * CIUDAD VIRTUAL — PartidaManager.js
 *
 * Responsabilidad única: persistencia de la partida.
 *  - Guardar partida manualmente con mensaje visual
 *  - Autosave cada 30 segundos
 *  - Exportar ciudad a JSON descargable (HU-021)
 *  - Importar ciudad desde archivo JSON (HU-021)
 *
 * Depende de:
 *  - timerEstado  (HudPanel.js) — para persistir duración del turno
 *  - detenerTimerTurno / detenerAutosave (propios o importados)
 *  - StorageManager (acceso_datos)
 */

import StorageManager from '../acceso_datos/StorageManager.js';
import { timerEstado, detenerTimerTurno } from './HudPanel.js';

export const storage = new StorageManager();

/* ================================================================
   ESTADO AUTOSAVE
================================================================ */

let _autosaveIntervalo = null;

/* ================================================================
   UTILIDAD MODAL
================================================================ */

/**
 * Muestra u oculta un elemento modal por data-visible.
 * @param {HTMLElement|null} modal
 * @param {boolean} visible
 */
function setModal(modal, visible) {
    if (!modal) return;
    modal.dataset.visible = visible ? 'true' : 'false';
}

/* ================================================================
   GUARDAR PARTIDA
================================================================ */

/**
 * Muestra el indicador "Guardando…", guarda la partida en localStorage
 * y luego cambia a "¡Guardado!" por 2 segundos.
 */
export function guardarConMensaje() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const el  = document.getElementById('hud-guardando');
    const txt = document.getElementById('guardando-texto');
    if (!el || !txt) return;

    el.classList.remove('guardado');
    txt.textContent = 'Guardando...';
    el.dataset.visible = 'true';

    // Persistir duración del turno y tiempo transcurrido
    juego.StorageManager.guardar('config-turno', {
        duracionTurno:      timerEstado.duracionTurno,
        tiempoTranscurrido: timerEstado.tiempoTranscurrido,
    });

    juego.guardarPartida();

    setTimeout(() => {
        el.classList.add('guardado');
        txt.textContent = '¡Guardado!';
        setTimeout(() => {
            el.dataset.visible = 'false';
            el.classList.remove('guardado');
        }, 2000);
    }, 600);
}

/* ================================================================
   AUTOSAVE
================================================================ */

/**
 * Inicia el autosave cada 30 segundos (solo cuando el juego está activo).
 */
export function iniciarAutosave() {
    if (_autosaveIntervalo !== null) return;
    _autosaveIntervalo = setInterval(() => {
        if (window.juego?.EstadoDeJuego?.estaJugando()) {
            guardarConMensaje();
        }
    }, 30000);
}

/**
 * Detiene el autosave.
 */
export function detenerAutosave() {
    if (_autosaveIntervalo !== null) {
        clearInterval(_autosaveIntervalo);
        _autosaveIntervalo = null;
    }
}

/* ================================================================
   EXPORTAR CIUDAD (HU-021)
================================================================ */

/**
 * Genera y descarga un archivo JSON con el estado completo de la ciudad.
 * Nombre: ciudad_{nombre}_{fecha}.json
 * Cierra el modal de pausa si está abierto.
 */
export function exportarCiudad() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const ciudad   = juego.ciudad;
    const recursos = ciudad.recursos;
    const gestor   = juego.gestorCiudadanos;
    const mapa     = ciudad.mapa;

    const exportData = {
        cityName:    ciudad.nombre,
        mayor:       ciudad.alcalde,
        gridSize:    { width: mapa.ancho, height: mapa.alto },
        coordinates: ciudad.coordenadas ?? null,
        turn:        juego.numeroTurno,
        score:       juego.puntaje || 0,
        map:         mapa.toJSON ? mapa.toJSON() : mapa,
        buildings:   ciudad.construcciones.map(c => c.toJSON ? c.toJSON() : c),
        roads:       ciudad.construcciones
                        .filter(c => c.constructor?.name === 'Vias')
                        .map(c => c.toJSON ? c.toJSON() : c),
        resources: {
            dinero:       recursos.dinero,
            electricidad: recursos.electricidad,
            agua:         recursos.agua,
            comida:       recursos.comida,
        },
        citizens:   gestor.ciudadanos.map(c => c.toJSON ? c.toJSON() : c),
        population: gestor.calcularTotalCiudadanos(),
        happiness:  Math.round(gestor.calcularFelicidadPromedio()),
    };

    const json   = JSON.stringify(exportData, null, 2);
    const blob   = new Blob([json], { type: 'application/json' });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement('a');
    const fecha  = new Date().toISOString().slice(0, 10);
    a.href       = url;
    a.download   = `ciudad_${ciudad.nombre.replace(/\s+/g, '_')}_${fecha}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Notificación de éxito
    const el  = document.getElementById('hud-guardando');
    const txt = document.getElementById('guardando-texto');
    if (el && txt) {
        el.classList.remove('guardado');
        txt.textContent = 'Ciudad exportada ✔';
        el.dataset.visible = 'true';
        setTimeout(() => {
            el.classList.add('guardado');
            setTimeout(() => {
                el.dataset.visible = 'false';
                el.classList.remove('guardado');
            }, 2000);
        }, 100);
    }

    // NO cerrar modal de pausa al exportar
}

/* ================================================================
   IMPORTAR CIUDAD (HU-021)
================================================================ */

/**
 * Abre el modal de confirmación de importar ciudad.
 */
export function abrirModalImportar() {
    // El mensaje de error permanece oculto hasta que ocurra un error real
    setModal(document.getElementById('modal-pausa'), false);
    setModal(document.getElementById('modal-importar'), true);
}

/**
 * Procesa el archivo JSON seleccionado e importa la ciudad.
 * La partida actual se PIERDE (el usuario fue advertido en el modal).
 * @param {File} archivo
 */
export function procesarArchivoImportacion(archivo) {
    const reader = new FileReader();

    reader.onload = function (e) {
        try {
            const datos = JSON.parse(e.target.result);

            if (!datos.cityName || !datos.map) {
                throw new Error('El archivo no parece un JSON de ciudad válido.');
            }

            const juego = window.juego;

            // Detener todo antes de reemplazar
            if (juego) juego.SistemaDeTurnos.detener();
            detenerTimerTurno();
            detenerAutosave();
            if (window.movimientoCiudadanos) window.movimientoCiudadanos.detener();

            // Transformar al formato interno de StorageManager ('partida')
            const partida = {
                ciudad: {
                    nombre:         datos.cityName,
                    alcalde:        datos.mayor,
                    recursos:       datos.resources || {},
                    construcciones: datos.buildings || [],
                    mapa:           datos.map,
                    coordenadas:    datos.coordinates || null,
                },
                numeroTurno: datos.turn    || 0,
                ciudadanos:  datos.citizens || [],
                recoleccion: null,
            };

            // Persistir y recargar limpio
            if (juego) {
                juego.StorageManager.guardar('partida', partida);
                juego.StorageManager.guardar('config-turno', {
                    duracionTurno: timerEstado.duracionTurno,
                });
                juego.StorageManager.eliminar('estado-juego');
            }
            localStorage.setItem('accion-inicio', 'continuar');

            setModal(document.getElementById('modal-importar'), false);
            window.location.reload();

        } catch (err) {
            const aviso = document.getElementById('importar-aviso-error');
            const texto = document.getElementById('importar-error-texto');
            if (aviso && texto) {
                texto.textContent = 'Error: ' + err.message;
                aviso.dataset.visible = 'true';
            }
            console.error('[PartidaManager] Error al importar ciudad:', err);
        }
    };

    reader.onerror = function () {
        const aviso = document.getElementById('importar-aviso-error');
        const texto = document.getElementById('importar-error-texto');
        if (aviso && texto) {
            texto.textContent = 'No se pudo leer el archivo.';
            aviso.dataset.visible = 'true';
        }
    };

    reader.readAsText(archivo);
}

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners relacionados con persistencia de partida.
 * Se llama una sola vez desde Hud.js al inicializar.
 */
export function registrarEventosPartida() {
    document.getElementById('btn-guardar-partida')
        ?.addEventListener('click', guardarConMensaje);

    document.getElementById('btn-exportar-ciudad')
        ?.addEventListener('click', exportarCiudad);

    document.getElementById('btn-importar-ciudad')
        ?.addEventListener('click', abrirModalImportar);

    // Modal importar
    document.getElementById('btn-importar-confirmar')
        ?.addEventListener('click', () => {
            document.getElementById('input-importar-ciudad')?.click();
        });

    document.getElementById('btn-importar-cancelar')
        ?.addEventListener('click', () => {
            setModal(document.getElementById('modal-importar'), false);
            setModal(document.getElementById('modal-pausa'), true);
        });

    document.getElementById('input-importar-ciudad')
        ?.addEventListener('change', (e) => {
            const archivo = e.target.files?.[0];
            if (archivo) procesarArchivoImportacion(archivo);
            e.target.value = '';
        });
}