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

import Ranking from './Ranking.js';
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
 * Registra la ciudad actual en el ranking y lo persiste.
 */
export function registrarEnRanking() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    rankingManager.agregarEntrada({
        nombreCiudad: juego.ciudad.nombre,
        alcalde:      juego.ciudad.alcalde,
        puntuacion:   juego.puntaje || 0,
        poblacion:    juego.gestorCiudadanos.calcularTotalCiudadanos(),
        felicidad:    Math.round(juego.gestorCiudadanos.calcularFelicidadPromedio()),
        turno:        juego.numeroTurno,
    });
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
        tr.innerHTML = `
            <td>${prefixExtra}${i + 1}</td>
            <td>${e.nombreCiudad}</td>
            <td>${e.alcalde}</td>
            <td>${fmt(e.puntuacion)}</td>
            <td>${fmt(e.poblacion)}</td>
            <td>${e.felicidad}%</td>
            <td>${e.turno}</td>
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
            trExtra.innerHTML = `
                <td>…#${pos + 1}</td>
                <td>${e.nombreCiudad}</td>
                <td>${e.alcalde}</td>
                <td>${fmt(e.puntuacion)}</td>
                <td>${fmt(e.poblacion)}</td>
                <td>${e.felicidad}%</td>
                <td>${e.turno}</td>
            `;
            tbody.appendChild(trExtra);
        }
    }
}

/**
 * Abre (o cierra) el panel lateral de ranking.
 */
export function abrirRanking() {
    const panel = document.getElementById('panel-ranking');
    if (!panel) return;
    if (panel.dataset.open === 'true') {
        panel.dataset.open = 'false';
    } else {
        renderizarRanking();
        panel.dataset.open = 'true';
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

    registrarEnRanking();
    guardarRanking();

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