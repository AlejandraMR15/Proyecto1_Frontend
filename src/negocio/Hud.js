/**
 * CIUDAD VIRTUAL — HUD.js
 *
 * Gestiona toda la interfaz de usuario del juego:
 *  - Panel de perfil (ciudad, alcalde, puntuación)
 *  - Panel de recursos (dinero, electricidad, agua, comida, felicidad)
 *  - Timer del turno (barra de progreso + tiempo)
 *  - Botón de pausa y modal de pausa
 *  - Modal de configuraciones
 *  - Modal de ranking
 *  - Modal de finalizar partida
 *
 * Depende de window.juego (instancia de Juego) expuesto por grid.js.
 * Se inicializa después de que grid.js haya creado el juego.
 */

import Ranking from './Ranking.js';
import StorageManager from '../acceso_datos/StorageManager.js';

/* ================================================================
   CONSTANTES
================================================================ */
const CLAVE_RANKING = 'ranking';

/* ================================================================
   ESTADO INTERNO DEL HUD
================================================================ */

/** Configuración mutable durante la partida */
const config = {
    aguaPorCiudadano:      1,
    electricidadPorCiudadano: 1,
    comidaPorCiudadano:    1,
    beneficioServicio:     10,
    tasaCrecimiento:       3,
};

/** Timer del turno */
const timerEstado = {
    tiempoTranscurrido: 0,   // segundos desde inicio del turno
    duracionTurno:      10,  // segundos totales del turno
    intervalo:          null,
};

/* ================================================================
   REFERENCIAS DOM
================================================================ */

// Perfil
const elCiudad    = document.getElementById('perfil-ciudad');
const elAlcalde   = document.getElementById('perfil-alcalde-nombre');
const elScore     = document.getElementById('perfil-score');

// Recursos top
const elDinero        = document.getElementById('val-dinero');
const elElectricidad  = document.getElementById('val-electricidad');
const elAgua          = document.getElementById('val-agua');

// Bienestar (panel separado)
const elComida     = document.getElementById('val-comida');
const elFelicidad  = document.getElementById('val-felicidad');

// Timer
const elTurnoNum    = document.getElementById('val-turno');
const elBarraFill   = document.getElementById('turno-barra-fill');
const elTiempoAct   = document.getElementById('val-tiempo-actual');
const elTiempoTot   = document.getElementById('val-tiempo-total');

// Botones control
const btnPausa   = document.getElementById('btn-pausa');
const btnRanking = document.getElementById('btn-ranking');

// Modales
const modalPausa     = document.getElementById('modal-pausa');
const modalConfig    = document.getElementById('modal-config');
const modalFinalizar = document.getElementById('modal-finalizar');

/* ================================================================
   UTILIDADES
================================================================ */

/**
 * Formatea un número con separadores de miles.
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
    if (n === undefined || n === null) return '0';
    return Math.round(n).toLocaleString('es-CO');
}

/**
 * Muestra u oculta un modal.
 * @param {HTMLElement} modal
 * @param {boolean} visible
 */
function setModal(modal, visible) {
    if (!modal) return;
    modal.dataset.visible = visible ? 'true' : 'false';
}

/* ================================================================
   ACTUALIZAR HUD — se llama en cada tick y en cada turno
================================================================ */

/**
 * Actualiza todos los paneles del HUD con el estado actual del juego.
 */
function actualizarHUD() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const ciudad   = juego.ciudad;
    const recursos = ciudad.recursos;
    const gestor   = juego.gestorCiudadanos;

    // --- Perfil ---
    if (elCiudad)  elCiudad.textContent  = ciudad.nombre   || '–';
    if (elAlcalde) elAlcalde.textContent = ciudad.alcalde  || '–';
    if (elScore)   elScore.textContent   = fmt(juego.puntaje || 0);

    // --- Recursos top-bar ---
    actualizarRecurso('hud-dinero',        elDinero,       '$' + fmt(recursos.dinero));
    actualizarRecurso('hud-electricidad',  elElectricidad, fmt(recursos.electricidad) + ' u');
    actualizarRecurso('hud-agua',          elAgua,         fmt(recursos.agua) + ' u');

    // --- Secundarios (comida y felicidad) ---
    if (elComida)    elComida.textContent    = fmt(recursos.comida) + ' u';
    if (elFelicidad) elFelicidad.textContent = Math.round(gestor.calcularFelicidadPromedio()) + '%';

    // --- Turno ---
    if (elTurnoNum) elTurnoNum.textContent = juego.numeroTurno;
}

/**
 * Aplica clase 'negativo' si el valor es < 0 y actualiza el texto.
 * @param {string} contenedorId
 * @param {HTMLElement} el
 * @param {string} texto
 */
function actualizarRecurso(contenedorId, el, texto) {
    if (!el) return;
    el.textContent = texto;
    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;
    // Extraer número del texto para comparar
    const num = parseFloat(texto.replace(/[^0-9\-]/g, ''));
    contenedor.classList.toggle('negativo', num < 0);
}

/* ================================================================
   TIMER DEL TURNO
================================================================ */

/**
 * Inicia el intervalo del timer visual del turno (tick cada segundo).
 */
function iniciarTimerTurno() {
    detenerTimerTurno();
    timerEstado.tiempoTranscurrido = 0;
    actualizarTimerDOM();

    timerEstado.intervalo = setInterval(() => {
        if (!window.juego) return;
        // Si el juego está pausado, no avanzar el timer visual
        if (!window.juego.EstadoDeJuego.estaJugando()) return;

        timerEstado.tiempoTranscurrido++;

        // Reiniciar timer cuando se completa el turno (el SistemaTurnos ya lo reinicia)
        if (timerEstado.tiempoTranscurrido >= timerEstado.duracionTurno) {
            timerEstado.tiempoTranscurrido = 0;
        }

        actualizarTimerDOM();
    }, 1000);
}

/**
 * Detiene el intervalo del timer visual.
 */
function detenerTimerTurno() {
    if (timerEstado.intervalo !== null) {
        clearInterval(timerEstado.intervalo);
        timerEstado.intervalo = null;
    }
}

/**
 * Actualiza los elementos DOM del timer.
 */
function actualizarTimerDOM() {
    const dur  = timerEstado.duracionTurno;
    const act  = timerEstado.tiempoTranscurrido;
    const pct  = dur > 0 ? (act / dur) * 100 : 0;

    if (elBarraFill) elBarraFill.style.width = pct + '%';
    if (elTiempoAct) elTiempoAct.textContent = act + 's';
    if (elTiempoTot) elTiempoTot.textContent = dur + 's';
}

/**
 * Reinicia el contador del timer al inicio de cada turno.
 */
function onNuevoTurno() {
    timerEstado.tiempoTranscurrido = 0;
    actualizarTimerDOM();
    actualizarHUD();
}

/* ================================================================
   PAUSA / REANUDAR
================================================================ */

/**
 * Alterna entre pausar y reanudar el juego.
 */
function togglePausa() {
    const juego = window.juego;
    if (!juego) return;

    if (juego.EstadoDeJuego.estaJugando()) {
        juego.pausarJuego();
        btnPausa.textContent = '▶';
        btnPausa.classList.add('pausado');
        // Pausar movimiento de ciudadanos
        if (window.movimientoCiudadanos) window.movimientoCiudadanos.detener();
        // Bloquear interacción con el viewport
        document.getElementById('viewport')?.classList.add('bloqueado');
        setModal(modalPausa, true);
    } else if (juego.EstadoDeJuego.estaEnPausa()) {
        reanudarJuego();
    }
}

/**
 * Reanuda el juego y cierra el modal de pausa.
 */
function reanudarJuego() {
    const juego = window.juego;
    if (!juego) return;
    juego.reanudarJuego();
    btnPausa.textContent = '⏸';
    btnPausa.classList.remove('pausado');
    // Reanudar movimiento de ciudadanos
    if (window.movimientoCiudadanos) window.movimientoCiudadanos.iniciar();
    // Desbloquear viewport
    document.getElementById('viewport')?.classList.remove('bloqueado');
    setModal(modalPausa, false);
}

/* ================================================================
   CONFIGURACIONES
================================================================ */

/**
 * Abre el modal de configuraciones con los valores actuales.
 */
function abrirConfig() {
    setModal(modalPausa, false);
    setModal(modalConfig, true);

    // Cargar valores actuales en los inputs
    document.getElementById('cfg-duracion-turno').value      = timerEstado.duracionTurno;
    document.getElementById('cfg-agua-ciudadano').value      = config.aguaPorCiudadano;
    document.getElementById('cfg-elec-ciudadano').value      = config.electricidadPorCiudadano;
    document.getElementById('cfg-comida-ciudadano').value    = config.comidaPorCiudadano;
    document.getElementById('cfg-beneficio-servicio').value  = config.beneficioServicio;
    document.getElementById('cfg-tasa-crecimiento').value    = config.tasaCrecimiento;
}

/**
 * Guarda los valores del formulario de configuración y los aplica.
 */
function guardarConfig() {
    const juego = window.juego;

    const nuevaDuracion = Math.max(5, parseInt(document.getElementById('cfg-duracion-turno').value) || 10);
    config.aguaPorCiudadano           = Math.max(0, parseInt(document.getElementById('cfg-agua-ciudadano').value)   || 0);
    config.electricidadPorCiudadano   = Math.max(0, parseInt(document.getElementById('cfg-elec-ciudadano').value)   || 0);
    config.comidaPorCiudadano         = Math.max(0, parseInt(document.getElementById('cfg-comida-ciudadano').value) || 0);
    config.beneficioServicio          = Math.max(1, parseInt(document.getElementById('cfg-beneficio-servicio').value) || 10);
    config.tasaCrecimiento            = Math.min(3, Math.max(1, parseInt(document.getElementById('cfg-tasa-crecimiento').value) || 3));

    // Aplicar duración al sistema de turnos
    timerEstado.duracionTurno = nuevaDuracion;
    if (juego && juego.SistemaDeTurnos) {
        juego.SistemaDeTurnos.cambiarDuracion(nuevaDuracion * 1000);
    }

    // Persistir la duración inmediatamente para que sobreviva recargas
    if (juego && juego.StorageManager) {
        juego.StorageManager.guardar('config-turno', { duracionTurno: nuevaDuracion });
    }

    // Aplicar tasa de crecimiento
    if (juego && juego.gestorCiudadanos) {
        juego.gestorCiudadanos.tasaCrecimiento = config.tasaCrecimiento;
    }

    actualizarTimerDOM();
    setModal(modalConfig, false);
    setModal(modalPausa, true);
}

/* ================================================================
   RANKING
================================================================ */

const rankingManager = new Ranking();
const storage = new StorageManager();

/**
 * Carga el ranking desde localStorage al iniciar.
 */
function cargarRankingDesdeStorage() {
    const datos = storage.cargar(CLAVE_RANKING);
    if (datos && Array.isArray(datos)) {
        datos.forEach(entrada => rankingManager.agregarEntrada(entrada));
    }
}

/**
 * Guarda el ranking actual en localStorage.
 */
function guardarRanking() {
    storage.guardar(CLAVE_RANKING, rankingManager.getEntradas());
}

/**
 * Registra la ciudad actual en el ranking.
 */
function registrarEnRanking() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    rankingManager.agregarEntrada({
        nombreCiudad: juego.ciudad.nombre,
        alcalde:      juego.ciudad.alcalde,
        puntuacion:   juego.puntaje || 0,
        poblacion:    juego.gestorCiudadanos.calcularTotalCiudadanos(),
        felicidad:    Math.round(juego.gestorCiudadanos.calcularFelicidadPromedio()),
        turno:        juego.numeroTurno
    });
    guardarRanking();
}

/**
 * Renderiza la tabla del ranking en el modal.
 */
function renderizarRanking() {
    const tbody = document.getElementById('ranking-tbody');
    const vacio = document.getElementById('ranking-vacio');
    const tabla = document.getElementById('ranking-tabla');

    const entradas = rankingManager.obtenerTop(10);

    if (!tbody) return;
    tbody.innerHTML = '';

    if (entradas.length === 0) {
        if (tabla) tabla.style.display = 'none';
        if (vacio) vacio.style.display = 'block';
        return;
    }

    if (tabla) tabla.style.display = '';
    if (vacio) vacio.style.display = 'none';

    const ciudadActual = window.juego?.ciudad?.nombre ?? null;

    entradas.forEach((e, i) => {
        const tr = document.createElement('tr');
        if (e.nombreCiudad === ciudadActual) tr.classList.add('ranking-actual');
        tr.innerHTML = `
            <td>#${i + 1}</td>
            <td>${e.nombreCiudad}</td>
            <td>${e.alcalde}</td>
            <td>${fmt(e.puntuacion)}</td>
            <td>${fmt(e.poblacion)}</td>
            <td>${e.felicidad}%</td>
            <td>${e.turno}</td>
        `;
        tbody.appendChild(tr);
    });

    // Mostrar posición de la ciudad actual si no está en top 10
    if (ciudadActual) {
        const todasEntradas = rankingManager.entradas;
        const pos = todasEntradas.findIndex(e => e.nombreCiudad === ciudadActual);
        if (pos >= 10) {
            const trExtra = document.createElement('tr');
            trExtra.classList.add('ranking-actual');
            const e = todasEntradas[pos];
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
 * Abre el panel lateral de ranking y lo renderiza.
 */
function abrirRanking() {
    const panel = document.getElementById('panel-ranking');
    if (!panel) return;
    const estaAbierto = panel.dataset.open === 'true';
    if (estaAbierto) {
        panel.dataset.open = 'false';
    } else {
        renderizarRanking();
        panel.dataset.open = 'true';
    }
}

/* ================================================================
   FINALIZAR PARTIDA
================================================================ */

/**
 * Finaliza la partida: registra en ranking, limpia localStorage y vuelve al menú.
 */
function finalizarPartida() {
    const juego = window.juego;
    if (juego) {
        juego.pausarJuego();
        registrarEnRanking();
        juego.guardarPartida();
    }
    detenerTimerTurno();
    detenerAutosave();
    storage.eliminar('partida');
    storage.eliminar('config-turno');
    window.location.href = '../vistas/menu.html';
}

/* ================================================================
   EVENTOS DE BOTONES
================================================================ */

// Botón pausa en top-bar
if (btnPausa) btnPausa.addEventListener('click', togglePausa);

// Botón ranking en top-bar
if (btnRanking) btnRanking.addEventListener('click', abrirRanking);

// Modal pausa
document.getElementById('btn-reanudar')?.addEventListener('click', reanudarJuego);
document.getElementById('btn-configuraciones')?.addEventListener('click', abrirConfig);
document.getElementById('btn-guardar-partida')?.addEventListener('click', guardarConMensaje);
document.getElementById('btn-finalizar')?.addEventListener('click', () => {
    setModal(modalPausa, false);
    setModal(modalFinalizar, true);
});

// Modal configuraciones
document.getElementById('btn-cfg-guardar')?.addEventListener('click', guardarConfig);
document.getElementById('btn-cfg-cancelar')?.addEventListener('click', () => {
    setModal(modalConfig, false);
    setModal(modalPausa, true);
});

// Panel ranking lateral
document.getElementById('btn-ranking-cerrar')?.addEventListener('click', () => {
    document.getElementById('panel-ranking').dataset.open = 'false';
});
document.getElementById('btn-ranking-exportar')?.addEventListener('click', () => {
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
document.getElementById('btn-ranking-reiniciar')?.addEventListener('click', () => {
    if (confirm('¿Reiniciar el ranking? Esta acción no se puede deshacer.')) {
        rankingManager.reiniciar();
        guardarRanking();
        renderizarRanking();
    }
});

// Modal finalizar
document.getElementById('btn-finalizar-confirmar')?.addEventListener('click', finalizarPartida);
document.getElementById('btn-finalizar-cancelar')?.addEventListener('click', () => {
    setModal(modalFinalizar, false);
    setModal(modalPausa, true);
});

// Tecla ESC → pausar/reanudar juego o cerrar modal abierto
document.addEventListener('keydown', (e) => {
    if (e.code !== 'Escape') return;
    if (e.target.tagName === 'INPUT') return;
    e.preventDefault();

    // Si hay algún modal de config, finalizar, etc. abierto → cerrarlo primero
    if (modalConfig.dataset.visible === 'true') {
        setModal(modalConfig, false);
        setModal(modalPausa, true);
        return;
    }
    if (modalFinalizar.dataset.visible === 'true') {
        setModal(modalFinalizar, false);
        setModal(modalPausa, true);
        return;
    }
    // Si el ranking está abierto → cerrarlo
    const panelRanking = document.getElementById('panel-ranking');
    if (panelRanking && panelRanking.dataset.open === 'true') {
        panelRanking.dataset.open = 'false';
        return;
    }
    // Modal de pausa → reanudar; juego corriendo → pausar
    togglePausa();
});

// Cerrar modales al hacer click en el overlay (fuera de la caja)
[modalPausa, modalConfig, modalFinalizar].forEach(modal => {
    if (!modal) return;
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            // No cerrar el modal de pausa con click fuera (es intencional)
            if (modal === modalPausa) return;
            setModal(modal, false);
        }
    });
});

/* ================================================================
   AUTOSAVE — cada 30 segundos
================================================================ */

let _autosaveIntervalo = null;

/**
 * Muestra el mensaje de guardado, guarda la partida, y luego
 * cambia el mensaje a "Guardado ✔" por 2 segundos antes de ocultarlo.
 */
function guardarConMensaje() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;

    const el = document.getElementById('hud-guardando');
    const txt = document.getElementById('guardando-texto');
    if (!el || !txt) return;

    // Mostrar "Guardando..."
    el.classList.remove('guardado');
    txt.textContent = 'Guardando...';
    el.dataset.visible = 'true';

    // Guardar duración del turno actual junto a la partida
    juego.StorageManager.guardar('config-turno', {
        duracionTurno: timerEstado.duracionTurno
    });

    // Guardar
    juego.guardarPartida();

    // Cambiar a "Guardado ✔" tras un breve instante
    setTimeout(() => {
        el.classList.add('guardado');
        txt.textContent = '¡Guardado!';
        // Ocultar después de 2 segundos
        setTimeout(() => {
            el.dataset.visible = 'false';
            el.classList.remove('guardado');
        }, 2000);
    }, 600);
}

/**
 * Inicia el intervalo de autosave cada 30 segundos.
 */
function iniciarAutosave() {
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
function detenerAutosave() {
    if (_autosaveIntervalo !== null) {
        clearInterval(_autosaveIntervalo);
        _autosaveIntervalo = null;
    }
}

// Exponer globalmente para que otros módulos puedan forzar un guardado con mensaje
window.guardarPartida = guardarConMensaje;

/**
 * Intenta inicializar el HUD. Si window.juego aún no está listo,
 * reintenta hasta 50 veces con 100ms de espera.
 * @param {number} [intentos=0]
 */
function intentarInit(intentos = 0) {
    if (window.juego && window.juego.ciudad) {
        initHUD();
    } else if (intentos < 50) {
        setTimeout(() => intentarInit(intentos + 1), 100);
    } else {
        console.warn('[HUD] No se pudo encontrar window.juego después de 50 intentos.');
    }
}

/**
 * Inicializa el HUD una vez que el juego está listo.
 */
function initHUD() {
    const juego = window.juego;

    // Leer duración del turno — primero buscar si hay una guardada,
    // si no usar la que configuró el jugador al crear la ciudad
    const configTurnoGuardada = juego.StorageManager.cargar('config-turno');
    if (configTurnoGuardada && configTurnoGuardada.duracionTurno) {
        timerEstado.duracionTurno = configTurnoGuardada.duracionTurno;
        juego.SistemaDeTurnos.cambiarDuracion(timerEstado.duracionTurno * 1000);
    } else {
        const durMs = juego.SistemaDeTurnos.duracion;
        timerEstado.duracionTurno = Math.round(durMs / 1000);
    }

    // Cargar ranking guardado
    cargarRankingDesdeStorage();

    // Actualizar HUD con estado inicial
    actualizarHUD();
    actualizarTimerDOM();

    // Registrar el callback onTurno ANTES de iniciarJuego,
    // para que SistemaTurnos ya reciba la versión con el HUD incluido
    const ejecutarTurnoOriginal = juego.ejecutarTurno.bind(juego);
    juego.ejecutarTurno = function () {
        ejecutarTurnoOriginal();
        onNuevoTurno();
    };

    // Arrancar el juego (SistemaTurnos.iniciar captura juego.ejecutarTurno ya wrappeado)
    juego.iniciarJuego();

    // Arrancar el timer visual
    iniciarTimerTurno();

    // Arrancar autosave cada 30 segundos
    iniciarAutosave();

    // Observar cambios en el sidebar para reposicionar perfil/bienestar
    _observarSidebar();

    console.info('[HUD] Inicializado. Duración turno:', timerEstado.duracionTurno + 's');
}

/**
 * Observa el atributo data-open del sidebar para añadir/quitar
 * la clase 'sidebar-cerrado' en body.
 */
function _observarSidebar() {
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

// Arrancar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => intentarInit());

/**
 * Exponer actualizarHUD globalmente para que otros módulos
 * (menuConstruccion, sistema de burbujas, etc.) puedan refrescar
 * el HUD inmediatamente después de cualquier cambio en los recursos.
 *
 * Uso desde cualquier módulo:
 *   window.refrescarHUD();
 */
window.refrescarHUD = actualizarHUD;