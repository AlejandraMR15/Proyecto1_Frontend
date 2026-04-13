/**
 * CIUDAD VIRTUAL — historialRecursos.js
 *
 * Controlador de UI para el historial de recursos.
 *
 * Responsabilidades:
 *  - Mostrar/ocultar el panel desplegable
 *  - Renderizar tabla del historial
 *  - Delegar persistencia y negocio a HistorialRecursosLogica
 */

import HistorialRecursosLogica from '../logica/HistorialRecursosLogica.js';

class HistorialRecursos {
    constructor() {
        this.logica = new HistorialRecursosLogica();
        
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
        this.logica.cargarDelStorage();

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
        this.logica.registrarRecursos(numeroTurno, dinero, electricidad, agua, comida);

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

        const registros = this.logica.registros;

        if (registros.length === 0) {
            const fila = document.createElement('tr');
            fila.className = 'historial-fila-vacia';
            fila.innerHTML = '<td colspan="5">📊 Sin historial aún</td>';
            tbody.appendChild(fila);
            return;
        }

        // Agregar filas de registros
        registros.forEach((reg, idx) => {
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
        this.logica.limpiar();
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
        return this.logica.obtenerUltimos(cantidad);
    }
}

// Singleton global
export const historialRecursos = new HistorialRecursos();

/**
 * Reinicia el historial de recursos de la partida activa.
 * Punto unico para transiciones de partida (nueva/importada).
 */
export function reiniciarHistorialRecursos() {
    historialRecursos.limpiar();
}

export default HistorialRecursos;
