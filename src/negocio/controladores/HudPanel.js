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
const elCiudadanos   = document.getElementById('val-ciudadanos');
const elEmpleados    = document.getElementById('val-empleados');
const elDesempleados = document.getElementById('val-desempleados');
const elResidenciales = document.getElementById('val-residenciales');

const elTurnoNum     = document.getElementById('val-turno');
const elBarraFill    = document.getElementById('turno-barra-fill');
const elTiempoAct    = document.getElementById('val-tiempo-actual');
const elTiempoTot    = document.getElementById('val-tiempo-total');

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

/**
 * Actualiza los tooltips de recursos con información de producción y consumo del turno.
 * Lee los datos de window.estadisticasRecursos que se crea en Juego.ejecutarTurno()
 */
export function actualizarTooltipsRecursos() {
    // Inicializar con valores por defecto si no existen
    if (!window.estadisticasRecursos) {
        window.estadisticasRecursos = {
            produccion: { dinero: 0, electricidad: 0, agua: 0, comida: 0 },
            consumo: { dinero: 0, electricidad: 0, agua: 0, comida: 0 },
            actual: { dinero: 0, electricidad: 0, agua: 0, comida: 0 }
        };
    }

    const stats = window.estadisticasRecursos;
    
    // Configuración de recursos: [id-tooltip, tipo-recurso, sufijo]
    const recursos = [
        ['tooltip-dinero', 'dinero', ''],
        ['tooltip-electricidad', 'electricidad', ' u'],
        ['tooltip-agua', 'agua', ' u']
    ];

    recursos.forEach(([tooltipId, tipo, sufijo]) => {
        const tooltip = document.getElementById(tooltipId);
        if (!tooltip) {
            console.warn(`[Tooltip] No se encontró elemento: #${tooltipId}`);
            return;
        }

        let produccion = stats.produccion[tipo] || 0;
        let consumo = stats.consumo[tipo] || 0;
        
        // Limitar agua a 2 decimales
        if (tipo === 'agua') {
            produccion = Math.round(produccion * 100) / 100;
            consumo = Math.round(consumo * 100) / 100;
        }
        
        const balance = produccion - consumo;

        // Formatear valores
        const prodText = produccion > 0 ? `+${produccion}` : `${produccion}`;
        const consText = consumo > 0 ? `-${consumo}` : `${consumo}`;
        const balText = balance > 0 ? `+${balance}` : `${balance}`;

        // Actualizar el tooltip
        const prodSpan = tooltip.querySelector('.tooltip-prod');
        const consSpan = tooltip.querySelector('.tooltip-cons');
        const balSpan = tooltip.querySelector('.tooltip-balance-val');

        if (prodSpan) prodSpan.textContent = prodText + sufijo;
        if (consSpan) consSpan.textContent = consText + sufijo;
        if (balSpan) {
            balSpan.textContent = balText + sufijo;
            // Cambiar color del balance según si es positivo o negativo
            balSpan.style.color = balance > 0 ? '#4ade80' : balance < 0 ? '#ff6b6b' : '#fbbf24';
        }
    });
}

/* ================================================================
   TIMER VISUAL DEL TURNO
================================================================ */

/**
 * Inicia el intervalo del timer visual (tick cada segundo).
 * Si ya hay uno corriendo, lo detiene primero.
 */
export function iniciarTimerTurno() {
    detenerTimerTurno();
    timerEstado.tiempoTranscurrido = 1;
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
    actualizarTooltipsRecursos();
}

/* ================================================================
   POSICIONAMIENTO DINÁMICO DE TOOLTIPS
================================================================ */

/**
 * Configura los listeners de mouse para mostrar/ocultar tooltips.
 * El posicionamiento es automático con position: absolute + bottom: 100%
 */
export function configurarTooltipsRecursos() {
    const recursos = document.querySelectorAll('.hud-recurso');
    
    recursos.forEach(recurso => {
        const tooltip = recurso.querySelector('.hud-recurso-tooltip');
        if (!tooltip) return;
        
        recurso.addEventListener('mouseenter', () => {
            tooltip.classList.add('visible');
        });
        
        recurso.addEventListener('mouseleave', () => {
            tooltip.classList.remove('visible');
        });
    });
}

/* ================================================================
   SIDEBAR OBSERVER
================================================================ */

/**
 * Observa el atributo data-open del sidebar y sincroniza
 * la clase 'sidebar-cerrado' en el body.
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
}