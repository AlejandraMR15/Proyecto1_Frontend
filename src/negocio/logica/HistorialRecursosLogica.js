/**
 * CIUDAD VIRTUAL — HistorialRecursosLogica.js
 *
 * Lógica de negocio y persistencia del historial de recursos.
 */

import StorageManager from '../../acceso_datos/StorageManager.js';

export default class HistorialRecursosLogica {
    constructor() {
        this.MAX_REGISTROS = 20;
        this.STORAGE_KEY = 'historial-recursos-ciudad';
        this.storageManager = new StorageManager();
        this.registros = [];
    }

    /**
     * Registra el estado actual de recursos (llamado al final de cada turno).
     * @param {number} numeroTurno - numero del turno actual
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

        this.registros.unshift(registro);

        if (this.registros.length > this.MAX_REGISTROS) {
            this.registros.pop();
        }

        this.guardarAlStorage();
    }

    /**
     * Limpia el historial completamente.
     */
    limpiar() {
        this.registros = [];
        try {
            this.storageManager.eliminar(this.STORAGE_KEY);
        } catch (err) {
            console.warn('[HistorialRecursos] Error limpiando localStorage:', err);
        }
    }

    /**
     * Obtiene los ultimos N registros.
     * @param {number} cantidad
     * @returns {Array}
     */
    obtenerUltimos(cantidad = 20) {
        return this.registros.slice(0, cantidad);
    }

    /**
     * Carga el historial desde localStorage.
     */
    cargarDelStorage() {
        try {
            const datos = this.storageManager.cargar(this.STORAGE_KEY);
            if (datos) {
                this.registros = datos;
                if (this.registros.length > this.MAX_REGISTROS) {
                    this.registros = this.registros.slice(0, this.MAX_REGISTROS);
                    this.guardarAlStorage();
                }
            }
        } catch (err) {
            console.warn('[HistorialRecursos] Error cargando desde localStorage:', err);
            this.registros = [];
        }
    }

    /**
     * Guarda el historial en localStorage.
     */
    guardarAlStorage() {
        try {
            this.storageManager.guardar(this.STORAGE_KEY, this.registros);
        } catch (err) {
            console.warn('[HistorialRecursos] Error guardando en localStorage:', err);
        }
    }
}
