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

import {
    fmt,
    actualizarRecursoVisual,
    actualizarDesgloseDOM,
    actualizarTooltipsRecursosDOM,
} from './hudRenderUtils.js';

export { fmt };

/* ================================================================
   ESTADO DEL TIMER — compartido con otros módulos
================================================================ */

/** @type {{ tiempoTranscurrido: number, duracionTurno: number, intervalo: ReturnType<typeof setInterval>|null, rafId: number|null, inicioTurnoMs: number }} */
export const timerEstado = {
    tiempoTranscurrido: 0,   // segundos transcurridos en el turno actual
    duracionTurno:      10,  // duración total de cada turno en segundos
    intervalo:          null,
    rafId:              null,
    inicioTurnoMs:      0,
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
const elCiudadanos   = document.getElementById('val-ciudadanos');
const elEmpleados    = document.getElementById('val-empleados');
const elDesempleados = document.getElementById('val-desempleados');
const elResidenciales = document.getElementById('val-residenciales');

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

const refsDesglose = {
    elDsgPoblacion,
    elDsgFelicidad,
    elDsgDinero,
    elDsgEdificios,
    elDsgElectricidad,
    elDsgAgua,
    elDsgSubtotal,
    elDsgTotalBonif,
    elDsgTotalPenal,
    elDsgBonifLista,
    elDsgPenalLista,
    elDsgTotal,
};

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
    actualizarRecursoVisual('hud-dinero',       elDinero,       '$' + fmt(recursos.dinero));
    actualizarRecursoVisual('hud-electricidad', elElectricidad, fmt(recursos.electricidad) + ' u');
    actualizarRecursoVisual('hud-agua',         elAgua,         fmt(recursos.agua) + ' u');

    // --- Bienestar ---
    if (elComida)    elComida.textContent    = fmt(recursos.comida) + ' u';
    if (elFelicidad) elFelicidad.textContent = Math.round(gestor.calcularFelicidadPromedio()) + '%';

    // --- Ciudadanos, empleados, desempleados, edificios residenciales ---
    // Siempre calculado en tiempo real: funciona al crear ciudad, recargar y con mapa JSON
    const estadPob = gestor.obtenerEstadisticasCiudadanos();
    const estadEd  = gestor.obtenerEstadisticasEdificios();

    if (elCiudadanos)    elCiudadanos.textContent    = fmt(estadPob.total);
    if (elEmpleados)     elEmpleados.textContent     = fmt(estadPob.empleados);
    if (elDesempleados) {
        elDesempleados.textContent = fmt(estadPob.desempleados);
        elDesempleados.classList.toggle('bienestar-valor--alerta', estadPob.desempleados > 0);
    }
    if (elResidenciales) elResidenciales.textContent = fmt(estadEd.residenciales);

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
    actualizarDesgloseDOM(d, refsDesglose);
}

/**
 * Actualiza los tooltips de recursos con información de producción y consumo del turno.
 * Lee los datos de window.estadisticasRecursos que se crea en Juego.ejecutarTurno()
 */
export function actualizarTooltipsRecursos() {
    actualizarTooltipsRecursosDOM();
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
    // Solo resetear a 0 si no hay un valor restaurado desde localStorage
    if (!timerEstado.tiempoTranscurrido || timerEstado.tiempoTranscurrido <= 0) {
        timerEstado.tiempoTranscurrido = 0;
    } else if (timerEstado.tiempoTranscurrido > timerEstado.duracionTurno) {
        timerEstado.tiempoTranscurrido = timerEstado.duracionTurno;
    }
    timerEstado.inicioTurnoMs = Date.now() - (timerEstado.tiempoTranscurrido * 1000);
    actualizarTimerDOM(timerEstado.tiempoTranscurrido);

    const tickVisual = () => {
        if (!window.juego) {
            timerEstado.rafId = requestAnimationFrame(tickVisual);
            return;
        }

        if (window.juego.EstadoDeJuego.estaJugando()) {
            const elapsedSegundos = (Date.now() - timerEstado.inicioTurnoMs) / 1000;
            const elapsedClamped = Math.max(0, Math.min(timerEstado.duracionTurno, elapsedSegundos));
            timerEstado.tiempoTranscurrido = Math.floor(elapsedClamped);
            actualizarTimerDOM(elapsedClamped);
        }

        timerEstado.rafId = requestAnimationFrame(tickVisual);
    };

    timerEstado.rafId = requestAnimationFrame(tickVisual);

    timerEstado.intervalo = setInterval(() => {
        if (!window.juego) return;
        if (!window.juego.EstadoDeJuego.estaJugando()) return;

        // Mantener persistencia en segundos enteros para guardar/cargar partida.
        const elapsedSegundos = (Date.now() - timerEstado.inicioTurnoMs) / 1000;
        timerEstado.tiempoTranscurrido = Math.floor(Math.max(0, Math.min(timerEstado.duracionTurno, elapsedSegundos)));
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
    if (timerEstado.rafId !== null) {
        cancelAnimationFrame(timerEstado.rafId);
        timerEstado.rafId = null;
    }
}

/**
 * Actualiza los elementos DOM del timer (barra + textos).
 */
export function actualizarTimerDOM(progresoSegundos = timerEstado.tiempoTranscurrido) {
    const dur = timerEstado.duracionTurno;
    const act = Math.max(0, Math.min(dur, progresoSegundos));
    const pct = dur > 0 ? (act / dur) * 100 : 0;

    if (elBarraFill) {
        elBarraFill.style.width = `${pct}%`;
    }
    if (elTiempoAct) elTiempoAct.textContent = Math.floor(act) + 's';
    if (elTiempoTot) elTiempoTot.textContent = dur + 's';
}

/**
 * Callback que se ejecuta al inicio de cada nuevo turno.
 * Reinicia el contador visual y refresca el HUD.
 */
export function onNuevoTurno() {
    actualizarHUD();
    actualizarTooltipsRecursos();
}

/**
 * Se ejecuta exactamente cuando inicia el turno real del juego.
 * Reinicia timer visual y actualiza número de turno sin esperar el resto del procesamiento.
 * @param {number} numeroTurno
 */
export function onInicioTurnoReal(numeroTurno) {
    timerEstado.inicioTurnoMs = Date.now();
    timerEstado.tiempoTranscurrido = 0;
    if (elTurnoNum) elTurnoNum.textContent = numeroTurno;
    actualizarTimerDOM(0);
}

/* ================================================================
   POSICIONAMIENTO DINÁMICO DE TOOLTIPS
================================================================ */

/**
 * Configura los listeners de mouse para mostrar/ocultar tooltips.
 * El posicionamiento es automático con position: absolute + bottom: 100%
 */
export function configurarTooltipsRecursos() {
    const puedeHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const recursos = document.querySelectorAll('.hud-recurso');

    const cerrarTodosTooltips = () => {
        recursos.forEach(recurso => {
            const tt = recurso.querySelector('.hud-recurso-tooltip');
            if (tt) tt.classList.remove('visible');
            recurso.classList.remove('is-open');
            recurso.setAttribute('aria-expanded', 'false');
        });
    };

    // En touch no usamos mouseenter/mouseleave; el toggle lo maneja Hud.js con click.
    if (!puedeHover) {
        cerrarTodosTooltips();
        return;
    }

    // Al entrar en modo desktop, empezar desde estado limpio.
    cerrarTodosTooltips();
    
    recursos.forEach(recurso => {
        const tooltip = recurso.querySelector('.hud-recurso-tooltip');
        if (!tooltip) return;
        
        recurso.addEventListener('mouseenter', () => {
            // Evita que un tooltip previo quede abierto si se cambia rápido de recurso.
            cerrarTodosTooltips();
            tooltip.classList.add('visible');
        });
        
        recurso.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });

    document.addEventListener('mousemove', (e) => {
        if (!e.target.closest('.hud-recurso')) {
            cerrarTodosTooltips();
        }
    });
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

    if (panelDesglose) {
        panelDesglose.dataset.open = 'false';
        document.body.classList.remove('hud-desglose-open');
    }

    function actualizarPosicionDesglose() {
        if (!panelDesglose || !perfil) return;
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
