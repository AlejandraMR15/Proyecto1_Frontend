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
        
        // Array de objetos {turno, dinero, electricidad, agua, comida, timestamp}
        this.registros = [];
        
        // Elementos del DOM
        this.panelEl = null;
        this.btnEl = null;
        this.tablaEl = null;
        this.estaAbierto = false;
    }

    /**
     * Inicializa los event listeners del panel de historial.
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

        // Click en botón para abrir/cerrar
        this.btnEl.addEventListener('click', () => this.toggle());

        // Click fuera del panel para cerrar
        document.addEventListener('click', (e) => {
            if (e.target !== this.btnEl && 
                !this.panelEl.contains(e.target) && 
                this.estaAbierto) {
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

        // Limpiar tabla
        this.tablaEl.innerHTML = '';

        if (this.registros.length === 0) {
            const fila = document.createElement('tr');
            fila.className = 'historial-fila-vacia';
            fila.innerHTML = '<td colspan="5">Sin historial aún</td>';
            this.tablaEl.appendChild(fila);
            return;
        }

        // Agregar encabezado solo si no existe
        if (this.tablaEl.querySelector('thead') === null) {
            const thead = document.createElement('thead');
            thead.innerHTML = `
                <tr class="historial-encabezado">
                    <th>Turno</th>
                    <th>💰 Dinero</th>
                    <th>⚡ Electricidad</th>
                    <th>💧 Agua</th>
                    <th>🍎 Comida</th>
                </tr>
            `;
            this.tablaEl.appendChild(thead);
        }

        // Crear tbody si no existe
        let tbody = this.tablaEl.querySelector('tbody');
        if (!tbody) {
            tbody = document.createElement('tbody');
            this.tablaEl.appendChild(tbody);
        }

        // Limpiar tbody
        tbody.innerHTML = '';

        // Agregar filas de registros
        this.registros.forEach((reg, idx) => {
            const fila = document.createElement('tr');
            fila.className = idx === 0 ? 'historial-fila-actual' : 'historial-fila';
            
            fila.innerHTML = `
                <td class="historial-turno">T${reg.turno}</td>
                <td class="historial-dinero">${this._formatearDinero(reg.dinero)}</td>
                <td class="historial-electricidad">${reg.electricidad}</td>
                <td class="historial-agua">${reg.agua}</td>
                <td class="historial-comida">${reg.comida}</td>
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
}

// Singleton global
export const historialRecursos = new HistorialRecursos();

export default HistorialRecursos;
