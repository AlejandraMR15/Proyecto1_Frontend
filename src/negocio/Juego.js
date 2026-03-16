import SistemaTurnos from "./SistemaTurnos.js";
import { EstadoDeJuego } from "./EstadoDeJuego.js";
import { ESTADOS } from "./estados.js";
import GestorCiudadano from "./GestorCiudadanos.js";
import Ciudad from "../modelos/ciudad.js";
import Puntuacion from "./Puntuacion.js";
import StorageManager from "../acceso_datos/StorageManager.js";
import Ciudadano from "../modelos/Ciudadano.js";
import RecoleccionBurbujas from "./RecoleccionBurbujas.js";

/**
 * Clase principal que gestiona la lógica del juego.
 * Coordina la ciudad, turnos, puntuación, estado y persistencia.
 */
export default class Juego {

    /**
     * Crea una instancia del juego con todos los componentes inicializados.
     */
    constructor() {
        this.ciudad = null;
        this.SistemaDeTurnos = new SistemaTurnos(10000);
        this.administrarPuntaje = new Puntuacion();
        this.StorageManager = new StorageManager();
        this.EstadoDeJuego = new EstadoDeJuego();
        this.gestorCiudadanos = new GestorCiudadano();
        this.recolectorBurbujas = new RecoleccionBurbujas(this);
        this.numeroTurno = 0;
    }

    /**
     * Inicia el juego si hay una ciudad creada.
     */
    iniciarJuego() {
        if (!this.ciudad) {
            console.error("No hay ciudad creada");
            return;
        }
        this.EstadoDeJuego.cambiarEstado(ESTADOS.JUGANDO);
        this.SistemaDeTurnos.iniciar(() => this.ejecutarTurno());
        console.log("Juego iniciado");
    }

    /**
     * Pausa el juego si está jugando.
     */
    pausarJuego() {
        if (this.EstadoDeJuego.estaJugando()) {
            this.EstadoDeJuego.cambiarEstado(ESTADOS.PAUSA);
            this.SistemaDeTurnos.detener();
            console.log("Juego en pausa");
        }
    }

    /**
     * Reanuda el loop de turnos si el juego estaba en pausa.
     */
    reanudarJuego() {
        if (this.EstadoDeJuego.estaEnPausa()) {
            this.EstadoDeJuego.cambiarEstado(ESTADOS.JUGANDO);
            this.SistemaDeTurnos.iniciar(() => this.ejecutarTurno());
            console.log("Juego reanudado");
        }
    }

    /**
     * Ejecuta la lógica completa de un turno y recalcula el puntaje.
     */
    ejecutarTurno() {
        if (!this.EstadoDeJuego.estaJugando()) return;
        this.numeroTurno++;
        console.log("Turno:", this.numeroTurno);
        if (this.ciudad) {
            // Procesar turno en la ciudad
            const produccionPendiente = this.ciudad.procesarTurno(this.gestorCiudadanos.ciudadanos);
            this.recolectorBurbujas.registrarProduccionLote(produccionPendiente);
            // Obtener datos agregados de ciudad para población y felicidad
            const edificiosResidenciales = this.ciudad.obtenerEdificiosResidenciales();
            const edificiosLaborales = this.ciudad.obtenerEdificiosLaborales();
            const valorServicios = this.recolectorBurbujas.obtenerBonoFelicidad();
            // Recalcular felicidad de toda la población con el estado actual de la ciudad
            this.gestorCiudadanos.recalcularFelicidadCiudadanos(valorServicios);
            // Procesar crecimiento poblacional
            this.gestorCiudadanos.procesarCrecimientoPoblacional(edificiosResidenciales, edificiosLaborales, valorServicios);
        }
        let puntaje = 0;
        if (this.administrarPuntaje && this.ciudad) {
            const recursos = this.ciudad.recursos;
            // Contar ciudadanos sin empleo
            const desempleados = this.gestorCiudadanos.ciudadanos.filter(c => !c.empleo).length;
            puntaje = this.administrarPuntaje.calcular({
                poblacion:    this.gestorCiudadanos.calcularTotalCiudadanos(),
                felicidad:    this.gestorCiudadanos.calcularFelicidadPromedio(),
                dinero:       recursos.dinero,
                numEdificios: this.ciudad.construcciones.length,
                electricidad: recursos.electricidad,
                agua:         recursos.agua,
                desempleados
            });
        }
        this.puntaje = puntaje;
        console.log("Puntaje:", puntaje);
    }

    /**
     * Crea una nueva ciudad y la asigna al juego.
     * @param {object} cfg
     * @param {string} cfg.nombre
     * @param {string} cfg.alcalde
     * @param {number} [cfg.ancho=20]
     * @param {number} [cfg.alto=20]
     * @param {object|null} [cfg.coordenadas]
     * @param {number} [cfg.dineroInicial]
     * @param {number} [cfg.electricidadInicial]
     * @param {number} [cfg.aguaInicial]
     * @param {number} [cfg.comidaInicial]
     * @param {number} [cfg.duracionTurno=5000]  ms
     */
    crearCiudad(cfg = {}) {
        const {
            nombre               = 'Mi Ciudad',
            alcalde              = 'Alcalde',
            ancho                = 20,
            alto                 = 20,
            coordenadas          = null,
            dineroInicial        = 50000,
            electricidadInicial  = 0,
            aguaInicial          = 0,
            comidaInicial        = 0,
            duracionTurno        = 5000
        } = cfg;

        this.ciudad = new Ciudad(nombre, alcalde, ancho, alto, coordenadas,
                                 dineroInicial, electricidadInicial, aguaInicial, comidaInicial);
        this.SistemaDeTurnos.cambiarDuracion(duracionTurno);
        return this.ciudad;
    }

    /** Carga una Ciudad serializada y la asigna. */
    cargarCiudad(json) {
        this.ciudad = Ciudad.fromJSON(json);
        return this.ciudad;
    }

    /**
     * Guarda ciudad, turno y ciudadanos en localStorage.
     */
    guardarPartida() {
        if (!this.ciudad) {
            console.error("No hay ciudad para guardar");
            return;
        }
        const data = {
            ciudad: this.ciudad.toJSON(),
            numeroTurno: this.numeroTurno,
            ciudadanos: this.gestorCiudadanos.ciudadanos.map(c => c.toJSON()),
            recoleccion: this.recolectorBurbujas.toJSON()
        };
        this.StorageManager.guardar('partida', data);
        console.log("Partida guardada");
    }

    /**
     * Carga la partida guardada y reconstruye referencias de ocupación.
     */
    cargarPartida() {
        const data = this.StorageManager.cargar('partida');
        if (!data) {
            console.error("No hay partida guardada");
            return;
        }
        this.ciudad = Ciudad.fromJSON(data.ciudad);
        this.numeroTurno = data.numeroTurno;
        const edificiosPorId = this.ciudad.crearIndiceConstruccionesPorId();
        this.gestorCiudadanos.ciudadanos = (data.ciudadanos || []).map(c => Ciudadano.fromJSON(c, edificiosPorId));
        this.ciudad.sincronizarOcupacionDesdeCiudadanos(this.gestorCiudadanos.ciudadanos);
        this.recolectorBurbujas.cargarDesdeJSON(data.recoleccion);
        console.log("Partida cargada");
    }

}