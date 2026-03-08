import SistemaTurnos from "./SistemaTurnos.js";
import { EstadoDeJuego } from "./EstadoDeJuego.js";
import { ESTADOS } from "./estados.js";
import GestorCiudadano from "./GestorCiudadanos.js";
import Ciudad from "../modelos/ciudad.js";
import Puntuacion from "./Puntuacion.js";
import StorageManager from "../acceso_datos/StorageManager.js";
import Ciudadano from "../modelos/Ciudadano.js";

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
        this.sistemaDeTurnos = new SistemaTurnos(10000);
        this.administrarPuntaje = new Puntuacion();
        this.StorageManager = new StorageManager();
        this.estadoDeJuego = new EstadoDeJuego();
        this.gestorCiudadanos = new GestorCiudadano();
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
        this.estadoJuego.cambiarEstado(ESTADOS.JUGANDO);
        this.sistemaTurnos.iniciar(() => this.ejecutarTurno());
        console.log("Juego iniciado");
    }

    /**
     * Pausa el juego si está jugando.
     */
    pausarJuego() {
        if (this.estadoJuego.estaJugando()) {
            this.estadoJuego.cambiarEstado(ESTADOS.PAUSA);
            this.sistemaTurnos.detener();
            console.log("Juego en pausa");
        }
    }

    reanudarJuego() {
        if (this.estadoJuego.estaEnPausa()) {
            this.estadoJuego.cambiarEstado(ESTADOS.JUGANDO);
            this.sistemaTurnos.iniciar(() => this.ejecutarTurno());
            console.log("Juego reanudado");
        }
    }

    ejecutarTurno() {
        if (!this.estadoDeJuego.estaJugando()) return;
        this.numeroTurno++;
        console.log("Turno:", this.numeroTurno);
        if (this.ciudad) {
            // Procesar turno en la ciudad
            this.ciudad.procesarTurno(this.gestorCiudadanos.ciudadanos);
            // Obtener edificios residenciales y laborales para crecimiento poblacional
            const edificiosResidenciales = this.ciudad.construcciones.filter(c => c instanceof Residencial);
            const edificiosLaborales = {
                comerciales: this.ciudad.construcciones.filter(c => c instanceof Comercial),
                industriales: this.ciudad.construcciones.filter(c => c instanceof Industrial)
            };
            // Procesar crecimiento poblacional
            this.gestorCiudadanos.procesarCrecimientoPoblacional(edificiosResidenciales, edificiosLaborales);
        }
        let puntaje = 0;
        if (this.administrarPuntaje) {
            // Asumir que calcular toma la ciudad y quizás ciudadanos
            puntaje = this.administrarPuntaje.calcular({
                poblacion: this.gestorCiudadanos.calcularTotalCiudadanos(),
                felicidad: this.gestorCiudadanos.calcularFelicidadPromedio(),
                dinero: this.ciudad ? this.ciudad.recursos.dinero : 0
            });
        }
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
        this.sistemaDeTurnos.cambiarDuracion(duracionTurno);
        return this.ciudad;
    }

    /** Carga una Ciudad serializada y la asigna. */
    cargarCiudad(json) {
        this.ciudad = Ciudad.fromJSON(json);
        return this.ciudad;
    }

    guardarPartida() {
        if (!this.ciudad) {
            console.error("No hay ciudad para guardar");
            return;
        }
        const data = {
            ciudad: this.ciudad.toJSON(),
            numeroTurno: this.numeroTurno,
            ciudadanos: this.gestorCiudadanos.ciudadanos.map(c => c.toJSON())
        };
        this.StorageManager.guardar('partida', data);
        console.log("Partida guardada");
    }

    cargarPartida() {
        const data = this.StorageManager.cargar('partida');
        if (!data) {
            console.error("No hay partida guardada");
            return;
        }
        this.ciudad = Ciudad.fromJSON(data.ciudad);
        this.numeroTurno = data.numeroTurno;
        this.gestorCiudadanos.ciudadanos = data.ciudadanos.map(c => Ciudadano.fromJSON(c));
        console.log("Partida cargada");
    }

}