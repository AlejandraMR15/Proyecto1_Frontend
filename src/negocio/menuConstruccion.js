/**
 * CIUDAD VIRTUAL — menuConstruccion.js
 *
 * Gestiona la interacción del panel lateral de construcción:
 *  - Abrir / cerrar el sidebar con el botón de cierre y la pestaña flotante.
 *  - Expandir / colapsar las categorías del acordeón.
 *  - Modo construcción: seleccionar edificio del sidebar y colocarlo en el mapa.
 *  - Modal de información al hacer click en celda ocupada.
 */
 
import Residencial       from '../modelos/construccion/tiposEdificios/residencial.js';
import Comercial         from '../modelos/construccion/tiposEdificios/comercial.js';
import Industrial        from '../modelos/construccion/tiposEdificios/industrial.js';
import Servicio          from '../modelos/construccion/tiposEdificios/servicio.js';
import PlantasDeUtilidad from '../modelos/construccion/tiposEdificios/plantasUtilidad.js';
import Parques           from '../modelos/construccion/parques.js';
import Vias              from '../modelos/construccion/vias.js';
 
/* ================================================================
   CONFIGURACIONES POR DEFECTO DE CADA EDIFICIO
   Mapeadas por el data-id del item en el sidebar.
================================================================ */
const EDIFICIOS_CONFIG = {
    'res-001': {
        etiqueta: 'R1',
        label:    'Casa',
        fabrica:  (id) => new Residencial(1000, id, 'Casa', 50, 5, 3, true, 4, [])
    },
    'res-002': {
        etiqueta: 'R2',
        label:    'Apartamento',
        fabrica:  (id) => new Residencial(3000, id, 'Apartamento', 100, 15, 10, true, 12, [])
    },
    'com-001': {
        etiqueta: 'C1',
        label:    'Tienda',
        fabrica:  (id) => new Comercial(2000, id, 'Tienda', 80, 8, 0, true, 6, [], 500)
    },
    'com-002': {
        etiqueta: 'C2',
        label:    'Centro Comercial',
        fabrica:  (id) => new Comercial(8000, id, 'Centro Comercial', 200, 25, 0, true, 20, [], 2000)
    },
    'ind-001': {
        etiqueta: 'I1',
        label:    'Fábrica',
        fabrica:  (id) => new Industrial(5000, id, 'Fábrica', 150, 20, 15, true, 15, [], 'fabrica', 800)
    },
    'ind-002': {
        etiqueta: 'I2',
        label:    'Granja',
        fabrica:  (id) => new Industrial(3000, id, 'Granja', 100, 0, 10, true, 8, [], 'granja', 50)
    },
    'serv-001': {
        etiqueta: 'S1',
        label:    'Estación de Policía',
        fabrica:  (id) => new Servicio(4000, id, 'Estación de Policía', 120, 15, 0, true, 'policia', 10, 5)
    },
    'serv-002': {
        etiqueta: 'S2',
        label:    'Estación de Bomberos',
        fabrica:  (id) => new Servicio(4000, id, 'Estación de Bomberos', 120, 15, 0, true, 'bomberos', 10, 5)
    },
    'serv-003': {
        etiqueta: 'S3',
        label:    'Hospital',
        fabrica:  (id) => new Servicio(6000, id, 'Hospital', 200, 20, 10, true, 'hospital', 10, 7)
    },
    'util-001': {
        etiqueta: 'U1',
        label:    'Planta Eléctrica',
        fabrica:  (id) => new PlantasDeUtilidad(10000, id, 'Planta Eléctrica', 300, 0, 0, true, 'electrica', 200)
    },
    'util-002': {
        etiqueta: 'U2',
        label:    'Planta de Agua',
        fabrica:  (id) => new PlantasDeUtilidad(8000, id, 'Planta de Agua', 250, 20, 0, true, 'agua', 150)
    },
    'parque-001': {
        etiqueta: 'P1',
        label:    'Parque',
        fabrica:  () => new Parques(1500, 5)
    },
    'via-001': {
        etiqueta: 'r',
        label:    'Vía',
        fabrica:  () => new Vias(100)
    }
};
 
/* ================================================================
   ESTADO DEL MÓDULO
================================================================ */
let modoConstructivo     = false;
let modoDemolicion       = false;        // NEW: modo demolición activo
let edificioSeleccionado = null;         // config del edificio elegido en el sidebar
let itemActivoEl         = null;         // <li> resaltado en el sidebar
let edificioSeleccionadoAntes = null;    // guardado antes de entrar en demolición
let itemActivoElAntes = null;             // guardado antes de entrar en demolición
 
/* ================================================================
   UTILIDAD: id único para cada edificio construido
================================================================ */
function generarId() {
    return 'edif-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
}
 
/* ================================================================
   NOTIFICACIÓN en pantalla (sin alert)
================================================================ */
function mostrarNotificacion(mensaje, tipo = 'info') {
    let notif = document.getElementById('notif-construccion');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notif-construccion';
        notif.style.cssText = [
            'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
            'background:#0a1628', 'border:1px solid #2e7a94', 'color:#a8dff0',
            'padding:10px 20px', 'border-radius:6px', 'font-size:0.82rem',
            'z-index:9999', 'pointer-events:none', 'transition:opacity 0.3s',
            'white-space:nowrap', 'box-shadow:0 4px 16px rgba(0,0,0,0.6)'
        ].join(';');
        document.body.appendChild(notif);
    }
    notif.style.borderColor = tipo === 'error' ? '#e05555' : '#2e7a94';
    notif.style.color       = tipo === 'error' ? '#f08080' : '#a8dff0';
    notif.textContent = mensaje;
    notif.style.opacity = '1';
    clearTimeout(notif._timeout);
    notif._timeout = setTimeout(() => { notif.style.opacity = '0'; }, 2800);
}
 
/* ================================================================
   MODAL DE INFORMACIÓN DEL EDIFICIO
================================================================ */
function mostrarInfoEdificio(construccion) {
    const previo = document.getElementById('modal-info-edificio');
    if (previo) previo.remove();
 
    const info = typeof construccion.getInformacion === 'function'
        ? construccion.getInformacion()
        : { nombre: construccion.constructor.name, costo: construccion.costo };
 
    const LABELS = {
        nombre:                    'Nombre',
        costo:                     'Costo ($)',
        costoMantenimiento:        'Mantenimiento/turno ($)',
        consumoElectricidad:       'Consumo eléctrico (u/t)',
        consumoAgua:               'Consumo agua (u/t)',
        consumoComida:             'Consumo comida/turno',
        consumoComidaPorResidente: 'Comida por residente/turno',
        consumoComidaPorEmpleado:  'Comida por empleado/turno',
        esActivo:                  'Activo',
        capacidad:                 'Capacidad',
        ocupacion:                 'Ocupación actual',
        tieneCapacidadDisponible:  'Tiene espacio',
        empleo:                    'Empleos totales',
        empleadosActuales:         'Empleados actuales',
        ingresoPorTurno:           'Producción/turno',
        tipoDeProduccion:          'Tipo de producción',
        produccionPorTurno:        'Producción/turno',
        tipoDeUtilidad:            'Tipo de utilidad',
        tipoDeServicio:            'Tipo servicio',
        felicidadAportada:         '😊 Felicidad aportada',
        radio:                     'Radio influencia (celdas)'
    };
 
    const filas = Object.entries(info)
        .filter(([clave]) => clave !== 'id' && !clave.startsWith('consumoActual'))
        .map(([clave, valor]) => {
            const label  = LABELS[clave] || clave;
            const valStr = typeof valor === 'boolean' ? (valor ? 'Sí' : 'No') : valor;
            return `<tr>
                <td style="color:#4a9fb5;padding:5px 14px 5px 0;white-space:nowrap;font-size:0.78rem">${label}</td>
                <td style="color:#a8dff0;padding:5px 0;font-size:0.82rem">${valStr}</td>
            </tr>`;
        }).join('');
 
    const modal = document.createElement('div');
    modal.id = 'modal-info-edificio';
    modal.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
        'background:#0a1628', 'border:1px solid #2e7a94', 'border-radius:10px',
        'padding:24px 28px', 'z-index:10000', 'min-width:280px', 'max-width:420px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.75)', 'color:#a8dff0',
        'font-family:Segoe UI,system-ui,sans-serif'
    ].join(';');
 
    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:1rem;color:#a8dff0;margin:0">${info.nombre ?? 'Edificio'}</h3>
            <button id="modal-cerrar" style="background:none;border:none;color:#4a9fb5;
                font-size:1.2rem;cursor:pointer;line-height:1;padding:0">✕</button>
        </div>
        <table style="border-collapse:collapse;width:100%">${filas}</table>
    `;
 
    document.body.appendChild(modal);
    document.getElementById('modal-cerrar').addEventListener('click', () => modal.remove());
 
    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarFuera(e) {
            if (!modal.contains(e.target)) {
                modal.remove();
                document.removeEventListener('click', cerrarFuera);
            }
        });
    }, 100);
}
 
/* ================================================================
   CURSOR DEL VIEWPORT
================================================================ */

/**
 * Cambia el cursor del viewport, del iso-grid y de todos los cubos del grid.
 * iso-grid es el elemento que recibe los eventos reales (pointer-events: all),
 * por eso es el que hay que actualizar para que el cursor sea visible.
 * @param {'crosshair'|'not-allowed'|''} cursor
 */
function aplicarCursorModo(cursor) {
    const vp = document.getElementById('viewport');
    if (vp) vp.style.cursor = cursor;
    const grid = document.getElementById('iso-grid');
    if (grid) grid.style.cursor = cursor;
    document.querySelectorAll('.iso-cube').forEach(el => el.style.cursor = cursor);
}

/* ================================================================
   SELECCIÓN DE EDIFICIO EN EL SIDEBAR
================================================================ */
function seleccionarEdificio(li) {
    if (itemActivoEl) itemActivoEl.classList.remove('build-item--activo');
    const config = EDIFICIOS_CONFIG[li.dataset.id];
    if (!config) return;
    edificioSeleccionado = config;
    itemActivoEl = li;
    li.classList.add('build-item--activo');
    aplicarCursorModo('crosshair');
    mostrarNotificacion(`Modo construcción: ${config.label} — haz click en una celda`);
}
 
function deseleccionarEdificio() {
    if (itemActivoEl) itemActivoEl.classList.remove('build-item--activo');
    edificioSeleccionado = null;
    itemActivoEl = null;
    // Solo resetear cursor si no estamos en modo demolición
    if (!modoDemolicion) aplicarCursorModo('');
}

/* ================================================================
   FUNCIONES DE DEMOLICIÓN — NEW
================================================================ */
function activarModoDemolicion() {
    // Guardar el edificio que estaba seleccionado antes de demolición
    edificioSeleccionadoAntes = edificioSeleccionado;
    itemActivoElAntes = itemActivoEl;
    
    modoDemolicion = true;
    // Si entramos en demolición, desactivar construcción
    modoConstructivo = false;
    deseleccionarEdificio();
    aplicarCursorModo('not-allowed');
    mostrarNotificacion('Modo demolición activado — haz click en un edificio para demoler');
}

function desactivarModoDemolicion() {
    modoDemolicion = false;
    // Solo resetear cursor si no hay edificio seleccionado para construir
    if (!edificioSeleccionado) aplicarCursorModo('');
}

/**
 * Muestra modal de confirmación de demolición.
 * @param {object} construccion - Edificio a demoler
 * @param {number} col - Columna del edificio
 * @param {number} row - Fila del edificio
 */
function mostrarConfirmacionDemolicion(construccion, col, row) {
    const previo = document.getElementById('modal-confirmar-demolicion');
    if (previo) previo.remove();

    const info = typeof construccion.getInformacion === 'function'
        ? construccion.getInformacion()
        : { nombre: construccion.constructor.name, costo: construccion.costo };

    // Detectar si hay ciudadanos afectados
    let mensajeCiudadanos = '';
    if (Array.isArray(construccion.residentes)) {
        const num = construccion.residentes.length;
        if (num > 0) {
            mensajeCiudadanos = `<p style="color:#f08080;margin-top:8px">⚠️ Hay ${num} ciudadano(s) viviendo aquí. Quedarán sin hogar.</p>`;
        }
    }
    if (Array.isArray(construccion.empleados)) {
        const num = construccion.empleados.length;
        if (num > 0) {
            mensajeCiudadanos += `<p style="color:#f08080;margin-top:8px">⚠️ Hay ${num} ciudadano(s) empleado(s) aquí. Quedarán sin trabajo.</p>`;
        }
    }

    const reembolso = Math.floor(info.costo * 0.5);
    const textoReembolso = `Recibirás $${reembolso} (50% del costo)`;

    const modal = document.createElement('div');
    modal.id = 'modal-confirmar-demolicion';
    modal.style.cssText = [
        'position:fixed', 'top:50%', 'left:50%', 'transform:translate(-50%,-50%)',
        'background:#0a1628', 'border:2px solid #e05555', 'border-radius:10px',
        'padding:24px 28px', 'z-index:10000', 'min-width:320px', 'max-width:450px',
        'box-shadow:0 8px 32px rgba(0,0,0,0.9)', 'color:#a8dff0',
        'font-family:Segoe UI,system-ui,sans-serif'
    ].join(';');

    modal.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h3 style="font-size:1rem;color:#f08080;margin:0">🗑️ ¿DEMOLER ${info.nombre.toUpperCase()}?</h3>
            <button id="modal-demolicion-cerrar" style="background:none;border:none;color:#4a9fb5;
                font-size:1.2rem;cursor:pointer;line-height:1;padding:0">✕</button>
        </div>
        <div style="background:#1a2a38;padding:12px;border-radius:6px;margin-bottom:16px">
            <p style="margin:0;font-size:0.9rem">Ubicación: (${col}, ${row})</p>
            <p style="margin:8px 0 0 0;font-size:0.9rem;color:#2e7a94">${textoReembolso}</p>
        </div>
        ${mensajeCiudadanos}
        <div style="display:flex;gap:8px;margin-top:16px">
            <button id="modal-demolicion-confirmar" style="flex:1;padding:10px;background:#e05555;
                border:none;color:#fff;cursor:pointer;border-radius:6px;font-weight:bold">
                ✔ CONFIRMAR DEMOLICIÓN
            </button>
            <button id="modal-demolicion-cancelar" style="flex:1;padding:10px;background:#2a3a48;
                border:1px solid #2e7a94;color:#a8dff0;cursor:pointer;border-radius:6px">
                ✕ CANCELAR
            </button>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('modal-demolicion-cerrar').addEventListener('click', () => modal.remove());
    document.getElementById('modal-demolicion-cancelar').addEventListener('click', () => modal.remove());
    document.getElementById('modal-demolicion-confirmar').addEventListener('click', () => {
        ejecutarDemolicion(construccion, col, row);
        modal.remove();
    });

    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarAlClickFuera(e) {
            if (!modal.contains(e.target) && e.target !== modal) {
                modal.remove();
                document.removeEventListener('click', cerrarAlClickFuera);
            }
        });
    }, 100);
}

/**
 * Ejecuta la demolición: elimina el edificio, devuelve dinero, actualiza el mapa.
 * @param {object} construccion - Edificio a demoler
 * @param {number} col - Columna del edificio
 * @param {number} row - Fila del edificio
 */
function ejecutarDemolicion(construccion, col, row) {
    const juego = window.juego;
    const gridRenderer = window.gridRenderer;

    if (!juego || !juego.ciudad || !gridRenderer) return;

    const ciudad = juego.ciudad;
    const reembolso = Math.floor(construccion.costo * 0.5);

    // 1. Eliminar ciudadanos afectados
    if (Array.isArray(construccion.residentes)) {
        construccion.residentes.forEach(ciudadano => {
            ciudadano.residencia = null;
        });
    }
    if (Array.isArray(construccion.empleados)) {
        construccion.empleados.forEach(ciudadano => {
            ciudadano.empleo = null;
        });
    }

    // 2. Demoler en la ciudad (ya devuelve el 50% del dinero)
    const exito = ciudad.demoler(construccion);
    if (!exito) {
        mostrarNotificacion('⚠ No se pudo demoler el edificio', 'error');
        return;
    }

    // 3. Limpiar celda en el mapa
    ciudad.mapa.eliminarElemento(col, row);

    // 4. Actualizar el grid visual
    gridRenderer._actualizarCubo(col, row);

    // 5. Limpiar del registro local
    _mapaEdificios.delete(`${col},${row}`);

    // 6. Persistir
    juego.guardarPartida();

    // 7. Actualizar HUD para que se vea inmediatamente
    actualizarRecursos();

    mostrarNotificacion(`✔ Demolido. Recuperaste $${reembolso}`);
    // Nota: NO desactivamos el modo, el usuario lo hace con el botón
}

 
/* ================================================================
   REGISTRO LOCAL DE EDIFICIOS POR COORDENADA
   Map en memoria: "col,row" → instancia del edificio.
   No depende de toJSON/fromJSON, vive durante la sesión.
================================================================ */
const _mapaEdificios = new Map();
 
function registrarEdificio(col, row, edificio) {
    _mapaEdificios.set(`${col},${row}`, edificio);
}
 
function buscarEdificioPorCoordenada(col, row) {
    return _mapaEdificios.get(`${col},${row}`) ?? null;
}
 
/**
 * Reconstruye el Map local leyendo ciudad.mapa.matriz y ciudad.construcciones.
 * Necesario al cargar partida porque el Map vive solo en memoria.
 * Estrategia: recorre la matriz, por cada celda no vacía busca una construcción
 * del mismo tipo que aún no haya sido asignada a una coordenada.
 */
function reconstruirMapaDesdePartida(ciudad) {
    _mapaEdificios.clear();
    if (!ciudad || !ciudad.mapa || !ciudad.construcciones) return;

    const matriz = ciudad.mapa.matriz;

    // PASO 1: usar _coordX/_coordY guardados en cada construcción (cubre TODOS los tipos)
    const sinCoordenadas = [];
    for (const construccion of ciudad.construcciones) {
        const col = construccion._coordX;
        const row = construccion._coordY;
        if (col !== undefined && row !== undefined) {
            _mapaEdificios.set(`${col},${row}`, construccion);
        } else {
            sinCoordenadas.push(construccion);
        }
    }

    // PASO 2: fallback para partidas muy antiguas sin coordenadas guardadas
    if (sinCoordenadas.length === 0) return;

    const usados = new Set();
    for (let row = 0; row < ciudad.mapa.alto; row++) {
        for (let col = 0; col < ciudad.mapa.ancho; col++) {
            if (_mapaEdificios.has(`${col},${row}`)) continue;

            const etiqueta = matriz[row] && matriz[row][col];
            if (!etiqueta || etiqueta === 'g') continue;

            const cfg = Object.values(EDIFICIOS_CONFIG).find(c => c.etiqueta === etiqueta);
            if (!cfg) continue;

            // Vias y Parques no tienen .nombre, buscar por nombre de clase
            const claseEsperada = etiqueta === 'r' ? 'Vias' : etiqueta === 'P1' ? 'Parques' : null;

            let idx;
            if (claseEsperada) {
                idx = sinCoordenadas.findIndex((c, i) =>
                    !usados.has(i) && c.constructor.name === claseEsperada
                );
            } else {
                idx = sinCoordenadas.findIndex((c, i) =>
                    !usados.has(i) && c.nombre === cfg.label
                );
            }

            if (idx !== -1) {
                usados.add(idx);
                _mapaEdificios.set(`${col},${row}`, sinCoordenadas[idx]);
            }
        }
    }
}
 
/* ================================================================
   LÓGICA PRINCIPAL: CLICK EN CELDA DEL GRID
================================================================ */
function manejarClickCelda(e) {
    const { col, row, etiqueta } = e.detail;
    const juego        = window.juego;
    const gridRenderer = window.gridRenderer;
 
    if (!juego || !juego.ciudad || !gridRenderer) return;
 
    const ciudad = juego.ciudad;
 
    /* -- MODO DEMOLICIÓN → detectar celda ocupada -- */
    if (modoDemolicion) {
        if (etiqueta === 'g') {
            mostrarNotificacion('⚠ No hay nada que demoler ahí', 'error');
            return;
        }
        // Buscar construcción en esa coordenada
        const construccion = buscarEdificioPorCoordenada(col, row);
        if (construccion) {
            mostrarConfirmacionDemolicion(construccion, col, row);
        } else {
            mostrarNotificacion('⚠ No se encontró el edificio', 'error');
        }
        return;
    }

    /* -- Celda OCUPADA → mostrar información (NO si estamos en modo ruta) -- */
    if (etiqueta !== 'g') {
        // No mostrar información si estamos seleccionando puntos de ruta
        if (window.estaModoRutaActivo && window.estaModoRutaActivo()) {
            return;
        }
        const construccion = buscarEdificioPorCoordenada(col, row);
        if (construccion) {
            mostrarInfoEdificio(construccion);
        } else {
            mostrarNotificacion(`Celda (${col},${row}): ${etiqueta}`);
        }
        return;
    }
 
    /* -- Celda VACÍA sin modo activo → ignorar -- */
    if (!modoConstructivo || !edificioSeleccionado) return;
 
    /* -- Validaciones ANTES de construir para evitar estados inconsistentes -- */
    const esVia = edificioSeleccionado.etiqueta === 'r';
 
    // 1. Validar vía adyacente (solo para edificios, no para vías mismas)
    if (!esVia && !ciudad.mapa.tieneViaAdyacente(col, row)) {
        mostrarNotificacion('⚠ Necesitas una vía adyacente para construir aquí', 'error');
        return;
    }
 
    // 2. Validar celda vacía
    if (!ciudad.mapa.celdaVacia(col, row)) {
        mostrarNotificacion('⚠ Esa celda ya está ocupada', 'error');
        return;
    }
 
    // 3. Crear instancia y validar dinero antes de ejecutar
    const nuevoEdificio = edificioSeleccionado.fabrica(generarId());
 
    if (ciudad.recursos.dinero < nuevoEdificio.costo) {
        mostrarNotificacion(`⚠ Dinero insuficiente para ${edificioSeleccionado.label}`, 'error');
        return;
    }
 
    // 4. Construir — en este punto todas las validaciones pasaron
    const exito = ciudad.construir(nuevoEdificio, col, row, edificioSeleccionado.etiqueta);
 
    if (!exito) {
        // No debería llegar aquí, pero por seguridad
        mostrarNotificacion('⚠ No se pudo construir', 'error');
        return;
    }
 
    // 5. Registrar en el mapa local para recuperarlo al hacer click
    registrarEdificio(col, row, nuevoEdificio);
 
    // 6. Repintar el cubo en el grid
    gridRenderer._actualizarCubo(col, row);
 
    // 7. Persistir
    juego.guardarPartida();
 
    mostrarNotificacion(`✔ ${edificioSeleccionado.label} construido en (${col}, ${row})`);
}
 
/* ================================================================
   INIT
================================================================ */
document.addEventListener('DOMContentLoaded', function () {
 
    const sidebar  = document.getElementById('sidebar');
    const closeBtn = document.getElementById('sidebarClose');
    const tabBtn   = document.getElementById('sidebarTab');
    const demolirBtn = document.getElementById('sidebarDemolir');
 
    /* ---- Abrir / cerrar sidebar → activa / desactiva modo construcción ---- */
    function abrirSidebar() {
        sidebar.dataset.open = 'true';
        // modoConstructivo = true SOLO si no estamos en modo demolición
        modoConstructivo = !modoDemolicion;
        document.body.classList.add('sidebar-construccion-abierto');
        modoConstructivo = true;
        desactivarModoDemolicion();
        if (demolirBtn) demolirBtn.classList.remove('demoler-activo');
    }
 
    function cerrarSidebar() {
        sidebar.dataset.open = 'false';
        modoConstructivo = false;  // Menú cerrado = no construir
        modoDemolicion = false;
        // Limpiar los datos guardados de demolición
        edificioSeleccionadoAntes = null;
        itemActivoElAntes = null;
        document.body.classList.remove('sidebar-construccion-abierto');
        modoConstructivo = false;
        desactivarModoDemolicion();
        deseleccionarEdificio();
        if (demolirBtn) demolirBtn.classList.remove('demoler-activo');
    }
 
    closeBtn.addEventListener('click', cerrarSidebar);
    tabBtn.addEventListener('click',   abrirSidebar);

    /* ---- En móvil el header actúa como toggle ---- */
    const sidebarHeader = sidebar.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', function (e) {
            if (window.innerWidth >= 768) return;
            if (e.target.closest('button')) return;
            if (sidebar.dataset.open === 'true') {
                cerrarSidebar();
            } else {
                abrirSidebar();
            }
        });
    }

    /* ---- Botón de demoler ---- */
    if (demolirBtn) {
        demolirBtn.addEventListener('click', function () {
            if (modoDemolicion) {
                // DESACTIVAR demolición → restaura construcción si el menú está abierto
                desactivarModoDemolicion();
                demolirBtn.classList.remove('demoler-activo');
                mostrarNotificacion('Modo demolición desactivado');
            } else {
                // ACTIVAR demolición → desactiva construcción
                activarModoDemolicion();
                demolirBtn.classList.add('demoler-activo');
                // Asegurar que el menú está abierto
                sidebar.dataset.open = 'true';
                document.body.classList.add('sidebar-construccion-abierto');
                modoConstructivo = false;
                deseleccionarEdificio();
            }
        });
    }
 
    // Estado inicial según data-open del HTML
    // Menú abierto → modo construcción habilitado
    // Menú cerrado → sin modo activo
    // En tablet (768-1024px) el sidebar siempre está visualmente abierto → forzar modo constructivo
    const esTablet = window.innerWidth >= 768 && window.innerWidth <= 1024;
    if (esTablet) {
        sidebar.dataset.open = 'true';
        modoConstructivo = true;
        document.body.classList.add('sidebar-construccion-abierto');
    } else {
        modoConstructivo = sidebar.dataset.open === 'true' && !modoDemolicion;
    }
 
    /* ---- ESC cierra el sidebar (no en tablet donde siempre está visible) ---- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const esTabletAhora = window.innerWidth >= 768 && window.innerWidth <= 1024;
            if (!esTabletAhora) {
                cerrarSidebar();
            }
            desactivarModoDemolicion();
            if (demolirBtn) demolirBtn.classList.remove('demoler-activo');
        }
    });
 
    /* ---- Acordeón de categorías ---- */
    document.querySelectorAll('.cat-header').forEach(function (btn) {
        btn.addEventListener('click', function () {
            // En landscape móvil y tablet no hay acordeón — todos los ítems visibles.
            const esLandscapeMovil = window.matchMedia(
                '(orientation: landscape) and (max-height: 500px)'
            ).matches;
            const esTablet = window.matchMedia(
                '(min-width: 768px) and (max-width: 1024px)'
            ).matches;
            if (esLandscapeMovil || esTablet) return;

            const cat = btn.closest('.category');
            cat.dataset.open = cat.dataset.open === 'true' ? 'false' : 'true';
        });
    });

    /* ---- En landscape y tablet forzar TODAS las categorías abiertas ---- */
    function forzarCategoriasEnLandscape() {
        const esLandscapeMovil = window.matchMedia(
            '(orientation: landscape) and (max-height: 500px)'
        ).matches;
        const esTablet = window.matchMedia(
            '(min-width: 768px) and (max-width: 1024px)'
        ).matches;
        if (!esLandscapeMovil && !esTablet) return;
        document.querySelectorAll('.category').forEach(function (cat) {
            cat.dataset.open = 'true';
        });
    }

    // Ejecutar al inicio
    forzarCategoriasEnLandscape();

    // Y al cambiar orientación
    window.addEventListener('orientationchange', function () {
        setTimeout(forzarCategoriasEnLandscape, 100);
    });
    window.matchMedia('(orientation: landscape) and (max-height: 500px)')
        .addEventListener('change', function () {
            setTimeout(forzarCategoriasEnLandscape, 100);
        });
 
    /* ---- Selección de edificio en el sidebar ---- */
    document.querySelectorAll('.build-item').forEach(function (li) {
        li.addEventListener('click', function () {
            seleccionarEdificio(li);
            modoConstructivo = true;
            modoDemolicion = false;
            // Limpiar los datos guardados de demolición
            edificioSeleccionadoAntes = null;
            itemActivoElAntes = null;
            desactivarModoDemolicion();
            if (demolirBtn) demolirBtn.classList.remove('demoler-activo');
        });
    });
 
    /* ---- Escuchar clicks del grid desde document para no depender del orden de carga ---- */
    document.addEventListener('celda-click', manejarClickCelda);
 
    /* ---- Reconstruir el Map local si hay partida cargada ---- */
    // grid.js también usa DOMContentLoaded, usamos un pequeño delay para
    // asegurarnos de que window.juego ya esté asignado.
    setTimeout(() => {
        if (window.juego && window.juego.ciudad) {
            reconstruirMapaDesdePartida(window.juego.ciudad);
        }
    }, 200);
 
});
 
/* ================================================================
   PANEL DE RECURSOS — actualización en tiempo real
   Se refresca cada segundo leyendo window.juego directamente.
================================================================ */
function formatearDinero(n) {
    return '$' + Math.floor(n).toLocaleString('es-CO');
}
 
function actualizarRecursos() {
    const juego = window.juego;
    if (!juego || !juego.ciudad) return;
 
    const r   = juego.ciudad.recursos;
    const fel = juego.gestorCiudadanos
        ? Math.round(juego.gestorCiudadanos.calcularFelicidadPromedio())
        : 0;
 
    // Dinero
    const dineroEl = document.getElementById('val-dinero');
    const recDinero = document.getElementById('rec-dinero');
    if (dineroEl) {
        dineroEl.textContent = formatearDinero(r.dinero);
    }
    if (recDinero) {
        recDinero.classList.remove('recurso-item--ok', 'recurso-item--warn', 'recurso-item--alert');
        if (r.dinero >= 10000)      recDinero.classList.add('recurso-item--ok');
        else if (r.dinero >= 1000)  recDinero.classList.add('recurso-item--warn');
        else                         recDinero.classList.add('recurso-item--alert');
    }
 
    // Electricidad
    const electrEl = document.getElementById('val-electricidad');
    if (electrEl) electrEl.textContent = Math.floor(r.electricidad);
 
    // Agua
    const aguaEl = document.getElementById('val-agua');
    if (aguaEl) aguaEl.textContent = Math.floor(r.agua);
 
    // Comida
    const comidaEl = document.getElementById('val-comida');
    if (comidaEl) comidaEl.textContent = Math.floor(r.comida);
 
    // Felicidad
    const felEl = document.getElementById('val-felicidad');
    if (felEl) felEl.textContent = fel + '%';
}
 
// Arrancar el intervalo de actualización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Primer render con pequeño delay para que window.juego esté asignado
    setTimeout(actualizarRecursos, 300);
    // Luego actualizar cada segundo
    setInterval(actualizarRecursos, 1000);
});