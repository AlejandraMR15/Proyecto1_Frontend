/**
 * CIUDAD VIRTUAL — historialRecursos.js
 *
 * Gestiona el historial de los últimos 20 turnos mostrando recursos:
 * dinero, electricidad, agua y comida.
 *
 * Responsabilidades:
 *  - Registrar el estado de recursos al final de cada turno
 *  - Mantener un historial máximo de 20 entradas
 *  - Mostrar/ocultar el panel desplegable
 *  - Actualizar la UI del historial en tiempo real
 */

class HistorialRecursos {
    constructor() {
        // Máximo de registros guardados
        this.MAX_REGISTROS = 20;
        
        // Clave de localStorage
        this.STORAGE_KEY = 'historial-recursos-ciudad';
        
        // Array de objetos {turno, dinero, electricidad, agua, comida, timestamp}
        this.registros = [];
        
        // Elementos del DOM
        this.panelEl = null;
        this.btnEl = null;
        this.tablaEl = null;
        this.estaAbierto = false;
    }

    /**
     * Inicializa los event listeners del panel de historial y carga datos persistidos.
     * Debe llamarse una sola vez en DOMContentLoaded.
     */
    inicializar() {
        this.btnEl = document.getElementById('btn-historial-recursos');
        this.panelEl = document.getElementById('historial-recursos-panel');
        this.tablaEl = document.getElementById('historial-recursos-tabla');

        if (!this.btnEl || !this.panelEl) {
            console.warn('[HistorialRecursos] Elementos del DOM no encontrados');
            return;
        }

        // Cargar historial desde localStorage
        this._cargarDelStorage();

        // Click en botón para abrir/cerrar (usar stopPropagation para evitar cerrar inmediatamente)
        this.btnEl.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggle();
        });

        // Click fuera del panel para cerrar (verificar que no sea el botón ni su contenido)
        document.addEventListener('click', (e) => {
            // Verificar si el click fue dentro del botón o su contenido
            const clickEnBoton = this.btnEl.contains(e.target);
            
            if (!clickEnBoton && !this.panelEl.contains(e.target) && this.estaAbierto) {
                this.cerrar();
            }
        });

        // Tecla ESC para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.estaAbierto) {
                this.cerrar();
            }
        });
    }

    /**
     * Registra el estado actual de recursos (llamado al final de cada turno).
     * @param {number} numeroTurno - número del turno actual
     * @param {number} dinero
     * @param {number} electricidad
     * @param {number} agua
     * @param {number} comida
     */
    registrarRecursos(numeroTurno, dinero, electricidad, agua, comida) {
        const registro = {
            turno: numeroTurno,
            dinero: Math.floor(dinero),
            electricidad: Math.floor(electricidad),
            agua: Math.floor(agua),
            comida: Math.floor(comida),
            timestamp: new Date().toLocaleTimeString('es-CO')
        };

        // Agregar al inicio (último turno primero)
        this.registros.unshift(registro);

        // Mantener máximo de 20 registros
        if (this.registros.length > this.MAX_REGISTROS) {
            this.registros.pop();
        }

        // Guardar en localStorage
        this._guardarAlStorage();

        // Actualizar tabla si el panel está abierto
        if (this.estaAbierto) {
            this._actualizarTabla();
        }
    }

    /**
     * Abre el panel de historial.
     */
    abrir() {
        if (this.estaAbierto) return;
        this.estaAbierto = true;
        this.panelEl.dataset.visible = 'true';
        this.btnEl.classList.add('historial-activo');
        this._actualizarTabla();
    }

    /**
     * Cierra el panel de historial.
     */
    cerrar() {
        if (!this.estaAbierto) return;
        this.estaAbierto = false;
        this.panelEl.dataset.visible = 'false';
        this.btnEl.classList.remove('historial-activo');
    }

    /**
     * Toggle: abre si está cerrado, cierra si está abierto.
     */
    toggle() {
        if (this.estaAbierto) {
            this.cerrar();
        } else {
            this.abrir();
        }
    }

    /**
     * Actualiza la tabla HTML del historial con los registros actuales.
     * @private
     */
    _actualizarTabla() {
        if (!this.tablaEl) return;

        // Obtener o crear tbody (ya debe existir en el HTML)
        let tbody = this.tablaEl.querySelector('tbody');
        if (!tbody) {
            console.warn('[HistorialRecursos] tbody no encontrado en tabla');
            return;
        }

        // Limpiar tbody
        tbody.innerHTML = '';

        if (this.registros.length === 0) {
            const fila = document.createElement('tr');
            fila.className = 'historial-fila-vacia';
            fila.innerHTML = '<td colspan="5">📊 Sin historial aún</td>';
            tbody.appendChild(fila);
            return;
        }

        // Agregar filas de registros
        this.registros.forEach((reg, idx) => {
            const fila = document.createElement('tr');
            fila.className = idx === 0 ? 'historial-fila-actual' : 'historial-fila';
            
            fila.innerHTML = `
                <td class="historial-turno">${reg.turno}</td>
                <td class="historial-dinero">${this._formatearDinero(reg.dinero)}</td>
                <td class="historial-electricidad">${reg.electricidad.toLocaleString('es-CO')}</td>
                <td class="historial-agua">${reg.agua.toLocaleString('es-CO')}</td>
                <td class="historial-comida">${reg.comida.toLocaleString('es-CO')}</td>
            `;
            
            tbody.appendChild(fila);
        });
    }

    /**
     * Formatea número como dinero.
     * @private
     */
    _formatearDinero(n) {
        return '$' + Math.floor(n).toLocaleString('es-CO');
    }

    /**
     * Limpia el historial completamente (útil para nueva partida).
     */
    limpiar() {
        this.registros = [];
        // Limpiar también del localStorage
        try {
            localStorage.removeItem(this.STORAGE_KEY);
        } catch (err) {
            console.warn('[HistorialRecursos] Error limpiando localStorage:', err);
        }
        if (this.estaAbierto) {
            this._actualizarTabla();
        }
    }

    /**
     * Obtiene los últimos N registros (útil para exportar o analizar).
     * @param {number} cantidad
     * @returns {Array}
     */
    obtenerUltimos(cantidad = 20) {
        return this.registros.slice(0, cantidad);
    }

    /**
     * Guarda el historial en localStorage.
     * @private
     */
    _guardarAlStorage() {
        try {
            const datos = JSON.stringify(this.registros);
            localStorage.setItem(this.STORAGE_KEY, datos);
        } catch (err) {
            console.warn('[HistorialRecursos] Error guardando en localStorage:', err);
        }
    }

    /**
     * Carga el historial desde localStorage.
     * @private
     */
    _cargarDelStorage() {
        try {
            const datos = localStorage.getItem(this.STORAGE_KEY);
            if (datos) {
                this.registros = JSON.parse(datos);
                // Asegurarse de no exceder el máximo
                if (this.registros.length > this.MAX_REGISTROS) {
                    this.registros = this.registros.slice(0, this.MAX_REGISTROS);
                    this._guardarAlStorage(); // Guardar versión limpia
                }
            }
        } catch (err) {
            console.warn('[HistorialRecursos] Error cargando desde localStorage:', err);
            this.registros = [];
        }
    }
}

// Singleton global
export const historialRecursos = new HistorialRecursos();

export default HistorialRecursos;
