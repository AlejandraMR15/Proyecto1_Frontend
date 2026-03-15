const TIPOS_RECOLECTABLES = new Set(['dinero', 'electricidad', 'agua', 'felicidad']);

function normalizarTipo(tipo = '') {
    const t = String(tipo).trim().toLowerCase();
    if (t === 'electrica') return 'electricidad';
    if (t === 'money') return 'dinero';
    if (t === 'happy' || t === 'happiness') return 'felicidad';
    return t;
}

function crearPendientesVacios() {
    return {
        dinero: 0,
        electricidad: 0,
        agua: 0,
        felicidad: 0,
    };
}

export default class RecoleccionBurbujas {
    constructor(juego) {
        this.juego = juego;
        this.pendientes = crearPendientesVacios();
        this.bonoFelicidad = 0;
        this.maxBonoFelicidad = 100;

        this._toastEl = null;
        this._toastTimeout = null;
        this._escuchaClick = this._manejarClickGlobal.bind(this);
        document.addEventListener('click', this._escuchaClick, true);

        this._inicializarInterfaz();
        this._emitirPendientes();
    }

    destruir() {
        document.removeEventListener('click', this._escuchaClick, true);
    }

    registrarProduccion(tipo, cantidad) {
        const tipoNormalizado = normalizarTipo(tipo);
        const cantidadNumerica = Number(cantidad);

        if (!TIPOS_RECOLECTABLES.has(tipoNormalizado)) return;
        if (!Number.isFinite(cantidadNumerica) || cantidadNumerica <= 0) return;

        this.pendientes[tipoNormalizado] += cantidadNumerica;
        this._emitirPendientes();
    }

    registrarProduccionLote(lote = {}) {
        Object.entries(lote).forEach(([tipo, cantidad]) => {
            this.registrarProduccion(tipo, cantidad);
        });
    }

    recolectarTipo(tipo) {
        const tipoNormalizado = normalizarTipo(tipo);
        if (!TIPOS_RECOLECTABLES.has(tipoNormalizado)) return 0;

        const cantidad = this.pendientes[tipoNormalizado] ?? 0;
        if (cantidad <= 0) {
            this._mostrarToast(`No hay ${tipoNormalizado} por recolectar`, true);
            return 0;
        }

        this.pendientes[tipoNormalizado] = 0;
        this._aplicarRecoleccion(tipoNormalizado, cantidad);
        this._emitirPendientes();

        const mensaje = `Recolectaste ${this._fmt(cantidad)} de ${tipoNormalizado}`;
        this._mostrarToast(mensaje);

        if (typeof window.refrescarHUD === 'function') {
            window.refrescarHUD();
        }

        return cantidad;
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

    _aplicarRecoleccion(tipo, cantidad) {
        const ciudad = this.juego?.ciudad;
        const recursos = ciudad?.recursos;

        if (tipo === 'felicidad') {
            this.bonoFelicidad = Math.min(this.maxBonoFelicidad, this.bonoFelicidad + cantidad);
            return;
        }

        if (!recursos) return;

        if (tipo === 'dinero') {
            recursos.dinero += cantidad;
            return;
        }

        if (tipo === 'electricidad') {
            recursos.actualizarElectricidad(cantidad);
            return;
        }

        if (tipo === 'agua') {
            recursos.actualizarAgua(cantidad);
        }
    }

    _inicializarInterfaz() {
        this._toastEl = document.getElementById('recoleccion-burbujas-toast');
        if (!this._toastEl) {
            console.warn('[RecoleccionBurbujas] No se encontro #recoleccion-burbujas-toast en index.html');
        }
    }

    _manejarClickGlobal(evento) {
        const burbuja = evento.target.closest('[data-burbuja-tipo]');
        if (!burbuja) return;

        const tipo = normalizarTipo(burbuja.dataset.burbujaTipo);
        const cantidad = this.recolectarTipo(tipo);
        if (cantidad <= 0) return;

        evento.preventDefault();
        evento.stopPropagation();
    }

    _emitirPendientes() {
        document.dispatchEvent(new CustomEvent('recoleccion-burbujas:pendientes-actualizados', {
            detail: {
                pendientes: this.obtenerPendientes(),
                bonoFelicidad: this.bonoFelicidad,
            },
        }));
    }

    _mostrarToast(texto, warning = false) {
        if (!this._toastEl) return;
        this._toastEl.textContent = texto;
        this._toastEl.classList.toggle('recoleccion-burbujas-toast--warning', warning);
        this._toastEl.dataset.visible = 'true';

        clearTimeout(this._toastTimeout);
        this._toastTimeout = setTimeout(() => {
            if (this._toastEl) {
                this._toastEl.dataset.visible = 'false';
            }
        }, 2000);
    }

    _fmt(numero) {
        return Math.round(numero).toLocaleString('es-CO');
    }
}

window.recolectorBurbujas = window.recolectorBurbujas || null;
