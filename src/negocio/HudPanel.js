/**
 * CIUDAD VIRTUAL — HudPanel.js
 *
 * Responsabilidad única: actualizar el DOM del HUD.
 *  - Panel de perfil (ciudad, alcalde, puntuación)
 *  - Panel de recursos (dinero, electricidad, agua, comida, felicidad)
 *  - Timer visual del turno (barra de progreso + tiempo)
 *  - Observer del sidebar (clase body 'sidebar-cerrado')
 *
 * Exporta `timerEstado` para que otros módulos puedan leerlo/modificarlo,
 * y las funciones `iniciarTimerTurno`, `detenerTimerTurno`, `onNuevoTurno`.
 */

/* ================================================================
   ESTADO DEL TIMER — compartido con otros módulos
================================================================ */

/** @type {{ tiempoTranscurrido: number, duracionTurno: number, intervalo: ReturnType<typeof setInterval>|null }} */
export const timerEstado = {
    tiempoTranscurrido: 0,   // segundos transcurridos en el turno actual
    duracionTurno:      10,  // duración total de cada turno en segundos
    intervalo:          null,
};

/* ================================================================
   REFERENCIAS DOM
================================================================ */

const elCiudad       = document.getElementById('perfil-ciudad');
const elAlcalde      = document.getElementById('perfil-alcalde-nombre');
const elScore        = document.getElementById('perfil-score');

const elDinero       = document.getElementById('val-dinero');
const elElectricidad = document.getElementById('val-electricidad');
const elAgua         = document.getElementById('val-agua');
const elComida       = document.getElementById('val-comida');
const elFelicidad    = document.getElementById('val-felicidad');

const elTurnoNum     = document.getElementById('val-turno');
const elBarraFill    = document.getElementById('turno-barra-fill');
const elTiempoAct    = document.getElementById('val-tiempo-actual');
const elTiempoTot    = document.getElementById('val-tiempo-total');

/* ---- Referencias desglose puntuación ---- */
const elDsgPoblacion    = document.getElementById('dsg-poblacion');
const elDsgFelicidad    = document.getElementById('dsg-felicidad');
const elDsgDinero       = document.getElementById('dsg-dinero');
const elDsgEdificios    = document.getElementById('dsg-edificios');
const elDsgElectricidad = document.getElementById('dsg-electricidad');
const elDsgAgua         = document.getElementById('dsg-agua');
const elDsgSubtotal     = document.getElementById('dsg-subtotal');
const elDsgTotalBonif   = document.getElementById('dsg-total-bonif');
const elDsgTotalPenal   = document.getElementById('dsg-total-penal');
const elDsgBonifLista   = document.getElementById('dsg-bonif-lista');
const elDsgPenalLista   = document.getElementById('dsg-penal-lista');
const elDsgTotal        = document.getElementById('dsg-total');

/* ================================================================
   UTILIDADES
================================================================ */

/**
 * Formatea un número con separadores de miles (locale colombiano).
 * @param {number} n
 * @returns {string}
 */
export function fmt(n) {
    if (n === undefined || n === null) return '0';
    return Math.round(n).toLocaleString('es-CO');
}

/* ================================================================
   ACTUALIZAR HUD
================================================================ */

/**
 * Actualiza todos los paneles del HUD con el estado actual del juego.
 * Se llama en cada tick del timer y al inicio de cada turno.
 */
export function actualizarHUD() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const ciudad   = juego.ciudad;
    const recursos = ciudad.recursos;
    const gestor   = juego.gestorCiudadanos;

    // --- Perfil ---
    if (elCiudad)  elCiudad.textContent  = ciudad.nombre  || '–';
    if (elAlcalde) elAlcalde.textContent = ciudad.alcalde || '–';
    if (elScore)   elScore.textContent   = fmt(juego.puntaje || 0);

    // --- Recursos top-bar ---
    _actualizarRecurso('hud-dinero',       elDinero,       '$' + fmt(recursos.dinero));
    _actualizarRecurso('hud-electricidad', elElectricidad, fmt(recursos.electricidad) + ' u');
    _actualizarRecurso('hud-agua',         elAgua,         fmt(recursos.agua) + ' u');

    // --- Bienestar ---
    if (elComida)    elComida.textContent    = fmt(recursos.comida) + ' u';
    if (elFelicidad) elFelicidad.textContent = Math.round(gestor.calcularFelicidadPromedio()) + '%';

    // --- Turno ---
    if (elTurnoNum) elTurnoNum.textContent = juego.numeroTurno;

    // --- Desglose de puntuación ---
    if (juego.desglosePuntaje) actualizarDesglose(juego.desglosePuntaje);
}

/**
 * Actualiza el panel de desglose de puntuación en el DOM.
 * @param {object} d - Objeto retornado por Puntuacion.obtenerDesglose()
 */
function actualizarDesglose(d) {
    if (!elDsgTotal) return;

    const fmtPts = n => (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('es-CO');

    if (elDsgPoblacion)    elDsgPoblacion.textContent    = fmtPts(d.puntosPoblacion);
    if (elDsgFelicidad)    elDsgFelicidad.textContent    = fmtPts(d.puntosFelicidad);
    if (elDsgDinero)       elDsgDinero.textContent       = fmtPts(d.puntosDinero);
    if (elDsgEdificios)    elDsgEdificios.textContent    = fmtPts(d.puntosEdificios);
    if (elDsgElectricidad) elDsgElectricidad.textContent = fmtPts(d.puntosElectricidad);
    if (elDsgAgua)         elDsgAgua.textContent         = fmtPts(d.puntosAgua);
    if (elDsgSubtotal)     elDsgSubtotal.textContent     = fmtPts(d.subtotal);

    if (elDsgTotalBonif) elDsgTotalBonif.textContent = '+' + d.totalBonificaciones.toLocaleString('es-CO');
    if (elDsgTotalPenal) elDsgTotalPenal.textContent = '-' + d.totalPenalizaciones.toLocaleString('es-CO');

    // Bonificaciones activas
    if (elDsgBonifLista) {
        const bonifs = [];
        if (d.bonificaciones.empleadosTodos  > 0) bonifs.push('✓ +500 Todos empleados');
        if (d.bonificaciones.felicidadAlta   > 0) bonifs.push('✓ +300 Felicidad > 80');
        if (d.bonificaciones.recursosPositivos > 0) bonifs.push('✓ +200 Recursos positivos');
        if (d.bonificaciones.poblacionGrande > 0) bonifs.push('✓ +1000 Más de 1.000 hab.');
        elDsgBonifLista.innerHTML = bonifs.length
            ? bonifs.map(t => `<div class="desglose-item-bonif">${t}</div>`).join('')
            : '<div class="desglose-sin-items">Sin bonificaciones</div>';
    }

    // Penalizaciones activas
    if (elDsgPenalLista) {
        const penals = [];
        if (d.penalizaciones.dineroNegativo       > 0) penals.push('✗ -500 Dinero negativo');
        if (d.penalizaciones.electricidadNegativa > 0) penals.push('✗ -300 Sin electricidad');
        if (d.penalizaciones.aguaNegativa         > 0) penals.push('✗ -300 Sin agua');
        if (d.penalizaciones.felicidadBaja        > 0) penals.push('✗ -400 Felicidad < 40');
        if (d.penalizaciones.desempleados         > 0) penals.push(`✗ -${d.penalizaciones.desempleados} Desempleados`);
        elDsgPenalLista.innerHTML = penals.length
            ? penals.map(t => `<div class="desglose-item-penal">${t}</div>`).join('')
            : '<div class="desglose-sin-items">Sin penalizaciones</div>';
    }

    if (elDsgTotal) elDsgTotal.textContent = d.puntuacionFinal.toLocaleString('es-CO');
}

/**
 * Aplica clase 'negativo' y colores de dinero según el valor numérico.
 * @param {string} contenedorId
 * @param {HTMLElement} el
 * @param {string} texto
 */
function _actualizarRecurso(contenedorId, el, texto) {
    if (!el) return;
    el.textContent = texto;
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const num = parseFloat(texto.replace(/[^0-9\-]/g, ''));
    contenedor.classList.toggle('negativo', num < 0);

    if (contenedorId === 'hud-dinero') {
        el.classList.remove('dinero-verde', 'dinero-amarillo', 'dinero-rojo');
        if (num >= 10000) el.classList.add('dinero-verde');
        else if (num < 5000) el.classList.add('dinero-amarillo');
        if (num < 1000) el.classList.add('dinero-rojo');
    }
}

/* ================================================================
   TIMER VISUAL DEL TURNO
================================================================ */

/**
 * Inicia el intervalo del timer visual (tick cada segundo).
 * Si ya hay uno corriendo, lo detiene primero.
 * Preserva tiempoTranscurrido si ya fue restaurado desde localStorage.
 */
export function iniciarTimerTurno() {
    detenerTimerTurno();
    // Solo resetear a 1 si no hay un valor restaurado desde localStorage
    if (!timerEstado.tiempoTranscurrido || timerEstado.tiempoTranscurrido <= 0) {
        timerEstado.tiempoTranscurrido = 1;
    }
    actualizarTimerDOM();

    timerEstado.intervalo = setInterval(() => {
        if (!window.juego) return;
        if (!window.juego.EstadoDeJuego.estaJugando()) return;

        timerEstado.tiempoTranscurrido++;
        if (timerEstado.tiempoTranscurrido > timerEstado.duracionTurno) {
            timerEstado.tiempoTranscurrido = 1;
        }
        actualizarTimerDOM();
    }, 1000);
}

/**
 * Detiene el intervalo del timer visual.
 */
export function detenerTimerTurno() {
    if (timerEstado.intervalo !== null) {
        clearInterval(timerEstado.intervalo);
        timerEstado.intervalo = null;
    }
}

/**
 * Actualiza los elementos DOM del timer (barra + textos).
 */
export function actualizarTimerDOM() {
    const dur = timerEstado.duracionTurno;
    const act = timerEstado.tiempoTranscurrido;
    const pct = dur > 0 ? (act / dur) * 100 : 0;

    if (elBarraFill) elBarraFill.style.width = pct + '%';
    if (elTiempoAct) elTiempoAct.textContent = act + 's';
    if (elTiempoTot) elTiempoTot.textContent = dur + 's';
}

/**
 * Callback que se ejecuta al inicio de cada nuevo turno.
 * Reinicia el contador visual y refresca el HUD.
 */
export function onNuevoTurno() {
    timerEstado.tiempoTranscurrido = 1;
    actualizarTimerDOM();
    actualizarHUD();
}

/* ================================================================
   SIDEBAR OBSERVER
================================================================ */

/**
 * Observa el atributo data-open del sidebar y sincroniza
 * la clase 'sidebar-cerrado' en el body.
 * También registra el toggle del panel de desglose.
 */
export function observarSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;

    function sincronizar() {
        const abierto = sidebar.dataset.open === 'true';
        document.body.classList.toggle('sidebar-cerrado', !abierto);
    }

    sincronizar();
    const obs = new MutationObserver(sincronizar);
    obs.observe(sidebar, { attributes: true, attributeFilter: ['data-open'] });

    // Ajusta el despliegue de desglose para landscape según el ancho real del perfil
    const btnDesglose = document.getElementById('hud-desglose-toggle');
    const panelDesglose = document.getElementById('hud-desglose');
    const perfil = document.getElementById('hud-perfil');

    function actualizarPosicionDesglose() {
        if (!panelDesglose || !perfil) return;

        const esLandscape = window.matchMedia('(orientation: landscape) and (max-height: 500px)').matches;
        
        if (!esLandscape) {
            panelDesglose.style.left = '';
            return;
        }

        const rectPerfil = perfil.getBoundingClientRect();
        const destinoIzq = Math.round(rectPerfil.right + 8); // 8px gap fijo para landscape
        panelDesglose.style.left = `${destinoIzq}px`;
    }

    if (btnDesglose && panelDesglose) {
        btnDesglose.addEventListener('click', function () {
            const abierto = panelDesglose.dataset.open === 'true';
            const nuevoEstado = !abierto;
            panelDesglose.dataset.open = nuevoEstado ? 'true' : 'false';
            document.body.classList.toggle('hud-desglose-open', nuevoEstado);
        });
    }

    window.addEventListener('resize', actualizarPosicionDesglose);
    actualizarPosicionDesglose();

    if (perfil) {
        const observerPerfil = new MutationObserver(actualizarPosicionDesglose);
        observerPerfil.observe(perfil, { childList: true, subtree: true, characterData: true });
    }
}
