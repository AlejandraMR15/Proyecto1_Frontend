/**
 * CIUDAD VIRTUAL — gestorDemolicion.js
 *
 * Gestiona:
 *  - Registro y búsqueda de edificios construidos
 *  - Modo demolición (activar/desactivar)
 *  - Modales de información y confirmación de demolición
 *  - Ejecución de demolición
 *  - Manejo de clicks en demolición
 */

/* ================================================================
   ESTADO DEL MÓDULO
================================================================ */
let modoDemolicion = false;

/* ================================================================
   REGISTRO LOCAL DE EDIFICIOS POR COORDENADA
   Map en memoria: "col,row" → instancia del edificio.
   No depende de toJSON/fromJSON, vive durante la sesión.
================================================================ */
const _mapaEdificios = new Map();

/* ================================================================
   GETTERS
================================================================ */
export function getModoDelimicion() {
    return modoDemolicion;
}

/* ================================================================
   REGISTRO DE EDIFICIOS
================================================================ */
export function registrarEdificio(col, row, edificio) {
    _mapaEdificios.set(`${col},${row}`, edificio);
}

export function buscarEdificioPorCoordenada(col, row) {
    return _mapaEdificios.get(`${col},${row}`) ?? null;
}

/**
 * Reconstruye el Map local leyendo ciudad.mapa.matriz y ciudad.construcciones.
 * Necesario al cargar partida porque el Map vive solo en memoria.
 * Estrategia: recorre la matriz, por cada celda no vacía busca una construcción
 * del mismo tipo que aún no haya sido asignada a una coordenada.
 */
export function reconstruirMapaDesdePartida(ciudad) {
    _mapaEdificios.clear();
    if (!ciudad || !ciudad.mapa || !ciudad.construcciones) return;

    const matriz = ciudad.mapa.matriz;
    const EDIFICIOS_CONFIG = window.CIUDAD_EDIFICIOS_CONFIG || {};

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
   UTILIDAD: Vincula un listener click evitando acumulación
================================================================ */
function setSingleClickListener(elemento, handler) {
    if (!elemento) return;
    if (elemento._singleClickHandler) {
        elemento.removeEventListener('click', elemento._singleClickHandler);
    }
    elemento._singleClickHandler = handler;
    elemento.addEventListener('click', handler);
}

/* ================================================================
   NOTIFICACIÓN en pantalla
================================================================ */
function mostrarNotificacionDemolicion(mensaje, tipo = 'info') {
    const notif = document.getElementById('notif-construccion');
    if (!notif) return;

    notif.classList.toggle('notif-construccion--error', tipo === 'error');
    notif.textContent = mensaje;
    notif.style.display = 'block';
    notif.style.opacity = '1';
    clearTimeout(notif._timeout);
    notif._timeout = setTimeout(() => { notif.style.opacity = '0'; }, 2800);
}

/* ================================================================
   MODAL DE INFORMACIÓN DEL EDIFICIO
================================================================ */
export function mostrarInfoEdificio(construccion, col, row) {
    const modal = document.getElementById('modal-info-edificio');
    if (!modal) return;

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
                <td class="construct-modal-row-label">${label}</td>
                <td class="construct-modal-row-value">${valStr}</td>
            </tr>`;
        }).join('');

    // Actualizar el título y la tabla del modal
    document.getElementById('modal-info-titulo').textContent = info.nombre ?? 'Edificio';
    document.getElementById('modal-info-tabla').innerHTML = filas;
    
    // Mostrar el modal
    modal.style.display = 'block';
    
    // Cerrar al hacer click en la X
    const btnCerrar = document.getElementById('modal-cerrar');
    setSingleClickListener(btnCerrar, () => {
        modal.style.display = 'none';
    });
    
    // Botón de demoler
    const btnDemoler = document.getElementById('modal-info-demoler');
    setSingleClickListener(btnDemoler, () => {
        modal.style.display = 'none';
        mostrarConfirmacionDemolicion(construccion, col, row);
    });

    // Cerrar al hacer click fuera
    const cerrarAlClickFuera = (e) => {
        if (!modal.contains(e.target)) {
            modal.style.display = 'none';
        }
    };
    document.addEventListener('click', cerrarAlClickFuera, true);
}

/* ================================================================
   MODO DEMOLICIÓN
================================================================ */
export function toggleModoDemolicion() {
    if (modoDemolicion) {
        // Desactivar
        modoDemolicion = false;
        aplicarCursorDemolicion('');
        const btnDemolicion = document.getElementById('btnDemolicion');
        if (btnDemolicion) btnDemolicion.classList.remove('demoler-activo');
        mostrarNotificacionDemolicion('Modo demolición desactivado');
    } else {
        // Activar
        modoDemolicion = true;
        aplicarCursorDemolicion('not-allowed');
        const btnDemolicion = document.getElementById('btnDemolicion');
        if (btnDemolicion) btnDemolicion.classList.add('demoler-activo');
        mostrarNotificacionDemolicion('Modo demolición: haz click en un edificio para demoler');
    }
}

export function desactivarModoDemolicion() {
    if (modoDemolicion) {
        modoDemolicion = false;
        aplicarCursorDemolicion('');
        const btnDemolicion = document.getElementById('btnDemolicion');
        if (btnDemolicion) btnDemolicion.classList.remove('demoler-activo');
    }
}

/**
 * Cambia el cursor visual para demolición
 */
function aplicarCursorDemolicion(cursor) {
    const vp = document.getElementById('viewport');
    if (vp) vp.style.cursor = cursor;
    const grid = document.getElementById('iso-grid');
    if (grid) grid.style.cursor = cursor;
    document.querySelectorAll('.iso-cube').forEach(el => el.style.cursor = cursor);
}

/* ================================================================
   MODAL DE CONFIRMACIÓN DE DEMOLICIÓN
================================================================ */
export function mostrarConfirmacionDemolicion(construccion, col, row) {
    const modal = document.getElementById('modal-confirmar-demolicion');
    if (!modal) return;

    const info = typeof construccion.getInformacion === 'function'
        ? construccion.getInformacion()
        : { nombre: construccion.constructor.name, costo: construccion.costo };

    // Detectar si hay ciudadanos afectados
    let mensajeCiudadanos = '';
    if (Array.isArray(construccion.residentes)) {
        const num = construccion.residentes.length;
        if (num > 0) {
            mensajeCiudadanos += `<p class="construct-modal-alerta">⚠️ Hay ${num} ciudadano(s) viviendo aquí. Quedarán sin hogar.</p>`;
        }
    }
    if (Array.isArray(construccion.empleados)) {
        const num = construccion.empleados.length;
        if (num > 0) {
            mensajeCiudadanos += `<p class="construct-modal-alerta">⚠️ Hay ${num} ciudadano(s) empleado(s) aquí. Quedarán sin trabajo.</p>`;
        }
    }

    const reembolso = Math.floor(info.costo * 0.5);
    const textoReembolso = `Recibirás $${reembolso} (50% del costo)`;

    // Actualizar contenido del modal
    document.getElementById('modal-demolicion-titulo').textContent = `🗑️ ¿DEMOLER ${info.nombre.toUpperCase()}?`;
    document.getElementById('modal-demolicion-ubicacion').textContent = `Ubicación: (${col}, ${row})`;
    document.getElementById('modal-demolicion-reembolso').textContent = textoReembolso;
    document.getElementById('modal-demolicion-ciudadanos').innerHTML = mensajeCiudadanos;

    // Mostrar el modal
    modal.style.display = 'block';

    // Usar onclick para evitar acumulación de listeners
    const btnCerrar = document.getElementById('modal-demolicion-cerrar');
    const btnCancelar = document.getElementById('modal-demolicion-cancelar');
    const btnConfirmar = document.getElementById('modal-demolicion-confirmar');

    setSingleClickListener(btnCerrar, () => {
        modal.style.display = 'none';
    });
    setSingleClickListener(btnCancelar, () => {
        modal.style.display = 'none';
    });
    setSingleClickListener(btnConfirmar, () => {
        ejecutarDemolicion(construccion, col, row);
        modal.style.display = 'none';
    });

    // Cerrar al hacer click fuera
    const cerrarAlClickFuera = (e) => {
        if (!modal.contains(e.target)) {
            modal.style.display = 'none';
        }
    };
    document.addEventListener('click', cerrarAlClickFuera, true);
}

/* ================================================================
   EJECUTAR DEMOLICIÓN
================================================================ */
export function ejecutarDemolicion(construccion, col, row) {
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
        mostrarNotificacionDemolicion('⚠ No se pudo demoler el edificio', 'error');
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

    // 7. Actualizar HUD completo (recursos, ciudadanos, viviendas, etc.)
    if (typeof window.refrescarHUD === 'function') {
        window.refrescarHUD();
    }

    mostrarNotificacionDemolicion(`✔ Demolido. Recuperaste $${reembolso}`);
    // Nota: NO desactivamos el modo, el usuario lo hace con el botón
}

/* ================================================================
   MANEJO DE CLICK EN CELDA (MODO DEMOLICIÓN)
================================================================ */
export function manejarClickCeldaDemolicion(e) {
    const { col, row, etiqueta } = e.detail;

    if (etiqueta !== 'g') {
        const construccion = buscarEdificioPorCoordenada(col, row);
        if (construccion) {
            mostrarConfirmacionDemolicion(construccion, col, row);
        } else {
            mostrarNotificacionDemolicion('🗑️ No se encontró el edificio', 'error');
        }
    } else {
        mostrarNotificacionDemolicion('⚠ Esa celda está vacía. Selecciona un edificio para demoler', 'error');
    }
}

/* ================================================================
   INICIALIZACIÓN AL CARGAR PARTIDA
================================================================ */
export function reconstruirMapaDelInitDelayado() {
    setTimeout(() => {
        if (window.juego && window.juego.ciudad) {
            reconstruirMapaDesdePartida(window.juego.ciudad);
        }
    }, 500);
}
