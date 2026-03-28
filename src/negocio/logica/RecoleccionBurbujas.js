const TIPOS_RECOLECTABLES = new Set(['dinero', 'electricidad', 'agua', 'felicidad']);

function crearPendientesVacios() {
    return {
        dinero: 0,
        electricidad: 0,
        agua: 0,
        felicidad: 0,
    };
}

export default class RecoleccionBurbujas {
    /**
     * @param {object} juego - Instancia del juego
     * @param {HTMLElement|null} [toastEl=null] - Elemento del DOM para mostrar notificaciones
     */
    constructor(juego, toastEl = null) {
        this.juego = juego;
        this.pendientes = crearPendientesVacios();
        this.bonoFelicidad = 0;
        this.maxBonoFelicidad = 100;

        this._toastEl = toastEl;
        this._toastTimeout = null;

        this._emitirPendientes();
    }

    registrarProduccion(tipo, cantidad) {
        const cantidadNumerica = Number(cantidad);

        if (!TIPOS_RECOLECTABLES.has(tipo)) return;
        if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) return;

        this.pendientes[tipo] += cantidadNumerica;
        this._emitirPendientes();
    }

    registrarProduccionLote(lote = {}) {
        Object.entries(lote).forEach(([tipo, cantidad]) => {
            this.registrarProduccion(tipo, cantidad);
        });
    }

    obtenerPendientes() {
        return { ...this.pendientes };
    }

    obtenerBonoFelicidad() {
        return this.bonoFelicidad;
    }

    toJSON() {
        return {
            pendientes: this.obtenerPendientes(),
            bonoFelicidad: this.bonoFelicidad,
        };
    }

    cargarDesdeJSON(json = null) {
        if (!json || typeof json !== 'object') return;

        const pendientes = json.pendientes && typeof json.pendientes === 'object'
            ? json.pendientes
            : null;

        this.pendientes = crearPendientesVacios();
        if (pendientes) {
            for (const [tipo, cantidad] of Object.entries(pendientes)) {
                this.registrarProduccion(tipo, cantidad);
            }
        }

        const bono = Number(json.bonoFelicidad);
        if (Number.isFinite(bono) && bono >= 0) {
            this.bonoFelicidad = Math.min(this.maxBonoFelicidad, bono);
        }

        this._emitirPendientes();
    }

    _emitirPendientes() {
        document.dispatchEvent(new CustomEvent('recoleccion-burbujas:pendientes-actualizados', {
            detail: {
                pendientes: this.obtenerPendientes(),
                bonoFelicidad: this.bonoFelicidad,
            },
        }));
    }
}
