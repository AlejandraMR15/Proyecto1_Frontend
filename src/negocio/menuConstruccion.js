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
let edificioSeleccionado = null;   // config del edificio elegido en el sidebar
let itemActivoEl         = null;   // <li> resaltado en el sidebar

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
        esActivo:                  'Activo',
        capacidad:                 'Capacidad',
        ocupacion:                 'Ocupación actual',
        tieneCapacidadDisponible:  'Tiene espacio',
        consumoActualElectricidad: 'Consumo elec. actual',
        consumoActualAgua:         'Consumo agua actual',
        empleo:                    'Empleos totales',
        empleadosActuales:         'Empleados actuales',
        ingresoPorTurno:           'Ingreso/turno ($)',
        tipoDeProduccion:          'Tipo producción',
        produccionPorTurno:        'Producción/turno',
        tipoDeUtilidad:            'Tipo utilidad',
        tipoDeServicio:            'Tipo servicio',
        felicidadAportada:         'Felicidad aportada',
        radio:                     'Radio influencia (celdas)'
    };

    const filas = Object.entries(info)
        .filter(([clave]) => clave !== 'id')
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
   SELECCIÓN DE EDIFICIO EN EL SIDEBAR
================================================================ */
function seleccionarEdificio(li) {
    if (itemActivoEl) itemActivoEl.classList.remove('build-item--activo');
    const config = EDIFICIOS_CONFIG[li.dataset.id];
    if (!config) return;
    edificioSeleccionado = config;
    itemActivoEl = li;
    li.classList.add('build-item--activo');
    mostrarNotificacion(`Modo construcción: ${config.label} — haz click en una celda`);
}

function deseleccionarEdificio() {
    if (itemActivoEl) itemActivoEl.classList.remove('build-item--activo');
    edificioSeleccionado = null;
    itemActivoEl = null;
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

    const matriz       = ciudad.mapa.matriz;
    const construcciones = [...ciudad.construcciones]; // copia para marcar usados
    const usados       = new Set();

    for (let row = 0; row < ciudad.mapa.alto; row++) {
        for (let col = 0; col < ciudad.mapa.ancho; col++) {
            const etiqueta = matriz[row] && matriz[row][col];
            if (!etiqueta || etiqueta === 'g' || etiqueta === 'r') continue;

            // Buscar la config que corresponde a esta etiqueta
            const cfg = Object.values(EDIFICIOS_CONFIG).find(c => c.etiqueta === etiqueta);
            if (!cfg) continue;

            // Buscar la primera construcción con ese nombre que no esté usada
            const idx = construcciones.findIndex((c, i) =>
                !usados.has(i) && c.nombre === cfg.label
            );
            if (idx !== -1) {
                usados.add(idx);
                _mapaEdificios.set(`${col},${row}`, construcciones[idx]);
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

    /* -- Celda OCUPADA → mostrar información -- */
    if (etiqueta !== 'g') {
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

    /* ---- Abrir / cerrar sidebar → activa / desactiva modo construcción ---- */
    function abrirSidebar() {
        sidebar.dataset.open = 'true';
        modoConstructivo = true;
    }

    function cerrarSidebar() {
        sidebar.dataset.open = 'false';
        modoConstructivo = false;
        deseleccionarEdificio();
    }

    closeBtn.addEventListener('click', cerrarSidebar);
    tabBtn.addEventListener('click',   abrirSidebar);

    // Estado inicial según data-open del HTML
    modoConstructivo = sidebar.dataset.open === 'true';

    /* ---- ESC cierra el sidebar ---- */
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') cerrarSidebar();
    });

    /* ---- Acordeón de categorías ---- */
    document.querySelectorAll('.cat-header').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const cat = btn.closest('.category');
            cat.dataset.open = cat.dataset.open === 'true' ? 'false' : 'true';
        });
    });

    /* ---- Selección de edificio en el sidebar ---- */
    document.querySelectorAll('.build-item').forEach(function (li) {
        li.addEventListener('click', function () {
            seleccionarEdificio(li);
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