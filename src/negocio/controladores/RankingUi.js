/**
 * CIUDAD VIRTUAL — RankingUI.js
 *
 * Responsabilidad única: gestión del ranking.
 *  - Cargar y guardar ranking en localStorage
 *  - Registrar la ciudad actual
 *  - Renderizar tabla del panel lateral
 *  - Renderizar tabla del modal Game Over
 *  - Exportar ranking a JSON
 *  - Reiniciar ranking
 *
 * Depende de:
 *  - Ranking.js  (modelo de datos del ranking)
 *  - StorageManager.js
 *  - fmt (HudPanel.js) — para formatear números
 */

import Ranking from '../logica/Ranking.js';
import { storage } from './PartidaManager.js';
import { fmt } from './HudPanel.js';

/* ================================================================
   CONSTANTES
================================================================ */

const CLAVE_RANKING = 'ranking';

/* ================================================================
   INSTANCIA DEL RANKING
================================================================ */

export const rankingManager = new Ranking();

/* ================================================================
   PERSISTENCIA
================================================================ */

/**
 * Carga el ranking guardado desde localStorage al iniciar.
 */
export function cargarRankingDesdeStorage() {
    const datos = storage.cargar(CLAVE_RANKING);
    if (datos && Array.isArray(datos)) {
        datos.forEach(entrada => rankingManager.agregarEntrada(entrada));
    }
}

/**
 * Persiste el ranking actual en localStorage.
 */
export function guardarRanking() {
    storage.guardar(CLAVE_RANKING, rankingManager.getEntradas());
}

/**
 * Actualiza la entrada existente de la ciudad actual o la crea si no existe.
 * Busca por nombre + alcalde (combinación única que funcionaba bien).
 * Preserva el ciudadId para identificar la partida actual.
 */
export function actualizarOAgregarEnRanking() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const ciudadId = juego.ciudad.ciudadId;
    const nombreCiudad = juego.ciudad.nombre;
    const alcaldeActual = juego.ciudad.alcalde;
    const datosActualizados = {
        nombreCiudad,
        alcalde: alcaldeActual,
        puntuacion: juego.puntaje || 0,
        poblacion: juego.gestorCiudadanos.calcularTotalCiudadanos(),
        felicidad: Math.round(juego.gestorCiudadanos.calcularFelicidadPromedio()),
        turno: juego.numeroTurno,
        fecha: new Date().toISOString(),
        ciudadId: ciudadId
    };

    // Buscar entrada por nombre + alcalde (combinación única)
    // Esto evita duplicados cuando se actualiza durante la partida activa
    const indexExistente = rankingManager.entradas.findIndex(
        e => e.nombreCiudad === nombreCiudad && e.alcalde === alcaldeActual
    );

    if (indexExistente !== -1) {
        // Actualizar entrada existente, preservando fecha original (fecha de inicio de esta partida)
        const entrada = rankingManager.entradas[indexExistente];
        const fechaOriginal = entrada.fecha;
        Object.assign(entrada, datosActualizados);
        entrada.fecha = fechaOriginal;
    } else {
        // Crear nueva entrada si no existe
        rankingManager.agregarEntrada(datosActualizados);
    }

    rankingManager.ordenarPorPuntaje();
    guardarRanking();
}

/* ================================================================
   RENDERIZADO
================================================================ */

/**
 * Construye las filas HTML de una lista de entradas.
 * @param {Array} entradas
 * @param {string|null} ciudadActual — nombre de la ciudad en juego (para resaltarla)
 * @param {HTMLElement} tbody
 * @param {string} [prefixExtra] — prefijo para entradas fuera del top (ej. "…#")
 */
function _renderizarFilas(entradas, ciudadActual, tbody, prefixExtra = '#') {
    entradas.forEach((e, i) => {
        const tr = document.createElement('tr');
        if (e.nombreCiudad === ciudadActual) tr.classList.add('ranking-actual');
        const fechaFormato = new Date(e.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
        tr.innerHTML = `
            <td>${prefixExtra}${i + 1}</td>
            <td>${e.nombreCiudad}</td>
            <td>${e.alcalde}</td>
            <td>${fmt(e.puntuacion)}</td>
            <td>${fmt(e.poblacion)}</td>
            <td>${e.felicidad}%</td>
            <td>${e.turno}</td>
            <td>${fechaFormato}</td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Renderiza la tabla del panel lateral de ranking.
 */
export function renderizarRanking() {
    const tbody = document.getElementById('ranking-tbody');
    const vacio = document.getElementById('ranking-vacio');
    const tabla = document.getElementById('ranking-tabla');
    if (!tbody) return;

    tbody.innerHTML = '';
    const entradas = rankingManager.obtenerTop(10);

    if (entradas.length === 0) {
        if (tabla) tabla.style.display = 'none';
        if (vacio) vacio.style.display = 'block';
        return;
    }

    if (tabla) tabla.style.display = '';
    if (vacio) vacio.style.display = 'none';

    const ciudadActual = window.juego?.ciudad?.nombre ?? null;
    _renderizarFilas(entradas, ciudadActual, tbody);

    // Mostrar posición de la ciudad actual si no está en top 10
    if (ciudadActual) {
        const todas = rankingManager.entradas;
        const pos   = todas.findIndex(e => e.nombreCiudad === ciudadActual);
        if (pos >= 10) {
            const trExtra = document.createElement('tr');
            trExtra.classList.add('ranking-actual');
            const e = todas[pos];
            const fechaFormato = new Date(e.fecha).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
            trExtra.innerHTML = `
                <td>…#${pos + 1}</td>
                <td>${e.nombreCiudad}</td>
                <td>${e.alcalde}</td>
                <td>${fmt(e.puntuacion)}</td>
                <td>${fmt(e.poblacion)}</td>
                <td>${e.felicidad}%</td>
                <td>${e.turno}</td>
                <td>${fechaFormato}</td>
            `;
            tbody.appendChild(trExtra);
        }
    }
}

/**
 * Abre (o cierra) el panel lateral de ranking.
 * Al abrir, actualiza la entrada de la ciudad actual antes de renderizar.
 */
export function abrirRanking() {
    const panel = document.getElementById('panel-ranking');
    if (!panel) return;
    const abierto = panel.dataset.open === 'true';
    if (abierto) {
        panel.dataset.open = 'false';
        document.body.classList.remove('panel-ranking-abierto');
    } else {
        actualizarOAgregarEnRanking();
        renderizarRanking();
        panel.dataset.open = 'true';
        document.body.classList.add('panel-ranking-abierto');
    }
}

/**
 * Abre el ranking como modal centrado (pantalla de Game Over).
 * Registra la ciudad actual antes de mostrar.
 */
export function abrirRankingGameOver() {
    const modal = document.getElementById('modal-ranking-gameover');
    if (!modal) return;

    const tbody = document.getElementById('ranking-tbody-go');
    const vacio = document.getElementById('ranking-vacio-go');
    const tabla = document.getElementById('ranking-tabla-go');

    actualizarOAgregarEnRanking();

    const entradas = rankingManager.obtenerTop(10);
    if (!tbody) return;
    tbody.innerHTML = '';

    if (entradas.length === 0) {
        if (tabla) tabla.style.display = 'none';
        if (vacio) vacio.style.display = 'block';
    } else {
        if (tabla) tabla.style.display = '';
        if (vacio) vacio.style.display = 'none';
        const ciudadActual = window.juego?.ciudad?.nombre ?? null;
        _renderizarFilas(entradas, ciudadActual, tbody);
    }

    modal.dataset.visible = 'true';
}

/* ================================================================
   REGISTRAR EVENTOS DE BOTONES
================================================================ */

/**
 * Registra todos los listeners relacionados con el ranking.
 * Se llama una sola vez desde Hud.js al inicializar.
 * @param {Function} irAlMenu — función que limpia localStorage y redirige al menú
 */
export function registrarEventosRanking(irAlMenu) {
    const btnRanking = document.getElementById('btn-ranking');
    if (btnRanking) btnRanking.addEventListener('click', abrirRanking);

    document.getElementById('btn-ranking-cerrar')
        ?.addEventListener('click', () => {
            document.getElementById('panel-ranking').dataset.open = 'false';
            document.body.classList.remove('panel-ranking-abierto');
        });

    document.getElementById('btn-ranking-exportar')
        ?.addEventListener('click', () => {
            const datos = storage.cargar(CLAVE_RANKING);
            if (!datos) return;
            const json = JSON.stringify(datos, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href     = url;
            a.download = 'ranking_ciudad_virtual.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

    document.getElementById('btn-ranking-reiniciar')
        ?.addEventListener('click', () => {
            if (confirm('¿Reiniciar el ranking? Esta acción no se puede deshacer.')) {
                rankingManager.reiniciar();
                guardarRanking();
                renderizarRanking();
            }
        });

    // Modal Game Over → ver ranking
    document.getElementById('btn-game-over-ranking')
        ?.addEventListener('click', () => {
            document.getElementById('modal-game-over').dataset.visible = 'false';
            abrirRankingGameOver();
        });

    // Modal ranking Game Over → cerrar (volver a game over)
    document.getElementById('btn-go-ranking-cerrar')
        ?.addEventListener('click', () => {
            document.getElementById('modal-ranking-gameover').dataset.visible = 'false';
            document.getElementById('modal-game-over').dataset.visible = 'true';
        });

    // Modal ranking Game Over → nueva partida
    document.getElementById('btn-go-ranking-nueva-partida')
        ?.addEventListener('click', irAlMenu);
}