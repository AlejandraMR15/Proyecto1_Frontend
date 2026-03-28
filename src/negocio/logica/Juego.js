import SistemaTurnos from "./SistemaTurnos.js";
import { EstadoDeJuego } from "./EstadoDeJuego.js";
import { ESTADOS } from "./estados.js";
import GestorCiudadano from "./GestorCiudadanos.js";
import Ciudad from "../../modelos/ciudad.js";
import Puntuacion from "./Puntuacion.js";
import StorageManager from "../../acceso_datos/StorageManager.js";
import Ciudadano from "../../modelos/Ciudadano.js";
import RecoleccionBurbujas from "./RecoleccionBurbujas.js";
import Mapa from "../../modelos/Mapa.js";
import MapImporter from "../../acceso_datos/MapImporter.js";
import { actualizarOAgregarEnRanking } from "../controladores/RankingUi.js";

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
        this.desglosePuntaje = null;
    }

    /**
     * Inicia el juego si hay una ciudad creada y no está en GAME_OVER.
     */
    iniciarJuego() {
        if (!this.ciudad) {
            console.error("No hay ciudad creada");
            return;
        }
        // Si ya estamos en GAME_OVER (partida cargada con game_over persistido),
        // no arrancar el sistema de turnos.
        if (this.EstadoDeJuego.esGameOver()) {
            console.warn("[Juego] iniciarJuego() ignorado: la partida está en GAME_OVER.");
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
     * Recalcula la puntuación basada en el estado actual de la ciudad.
     * Se usa tanto en ejecutarTurno como al cargar/crear ciudades.
     */
    recalcularPuntaje() {
        let puntaje = 0;
        if (this.administrarPuntaje && this.ciudad) {
            const recursos = this.ciudad.recursos;
            const desempleados = this.gestorCiudadanos.ciudadanos.filter(c => !c.empleo).length;
            const poblacion = this.gestorCiudadanos.calcularTotalCiudadanos();
            const felicidad = this.gestorCiudadanos.calcularFelicidadPromedio();
            
            const datosPuntaje = {
                poblacion,
                felicidad,
                dinero:       recursos.dinero,
                numEdificios: this.ciudad.construcciones.length,
                electricidad: recursos.electricidad,
                agua:         recursos.agua,
                desempleados
            };
            puntaje = this.administrarPuntaje.calcular(datosPuntaje);
            this.desglosePuntaje = this.administrarPuntaje.obtenerDesglose(datosPuntaje);
        }
        this.puntaje = puntaje;
        return puntaje;
    }

    /**
     * Ejecuta la lógica completa de un turno y recalcula el puntaje.
     * Valida que dinero, electricidad y agua no sean negativos.
     */
    ejecutarTurno() {
        if (!this.EstadoDeJuego.estaJugando()) return;
        this.numeroTurno++;
        console.log("Turno:", this.numeroTurno);
        if (this.ciudad) {
            // Guardar estado anterior de recursos antes de procesar el turno
            const recursoAnterior = {
                dinero: this.ciudad.recursos.dinero,
                electricidad: this.ciudad.recursos.electricidad,
                agua: this.ciudad.recursos.agua,
                comida: this.ciudad.recursos.comida
            };

            // Procesar turno en la ciudad
            const produccionPendiente = this.ciudad.procesarTurno(this.gestorCiudadanos.ciudadanos);
            this.recolectorBurbujas.registrarProduccionLote(produccionPendiente);

            // Calcular consumo real de este turno
            const recursoActual = {
                dinero: this.ciudad.recursos.dinero,
                electricidad: this.ciudad.recursos.electricidad,
                agua: this.ciudad.recursos.agua,
                comida: this.ciudad.recursos.comida
            };

            // Guardar estadísticas en variable global para mostrar en HUD
            window.estadisticasRecursos = {
                produccion: {
                    dinero: produccionPendiente.dinero || 0,
                    electricidad: produccionPendiente.electricidad || 0,
                    agua: produccionPendiente.agua || 0,
                    comida: produccionPendiente.comida || 0
                },
                consumo: {
                    dinero: (produccionPendiente.dinero || 0) - (recursoActual.dinero - recursoAnterior.dinero),
                    electricidad: (produccionPendiente.electricidad || 0) - (recursoActual.electricidad - recursoAnterior.electricidad),
                    agua: (produccionPendiente.agua || 0) - (recursoActual.agua - recursoAnterior.agua),
                    comida: (produccionPendiente.comida || 0) - (recursoActual.comida - recursoAnterior.comida)
                },
                actual: recursoActual
            };


            // VALIDACIÓN: Verificar si algún recurso crítico es negativo → GAME OVER
            const recursos = this.ciudad.recursos;
            if (recursos.dinero < 0) {
                console.error("¡GAME OVER! Te has quedado sin dinero.");
                this.finalizarPartida("Sin dinero");
                return;
            }
            if (recursos.electricidad < 0) {
                console.error("¡GAME OVER! Te has quedado sin electricidad.");
                this.finalizarPartida("Sin electricidad");
                return;
            }
            if (recursos.agua < 0) {
                console.error("¡GAME OVER! Te has quedado sin agua.");
                this.finalizarPartida("Sin agua");
                return;
            }

            // Obtener datos agregados de ciudad para población y felicidad
            const edificiosResidenciales = this.ciudad.obtenerEdificiosResidenciales();
            const edificiosLaborales = this.ciudad.obtenerEdificiosLaborales();
            const valorServicios = produccionPendiente.felicidad;  // Usar el valor calculado en ciudad.procesarTurno()
            // Reasignar ciudadanos que perdieron vivienda o empleo
            this.gestorCiudadanos.reasignarCiudadanosSinRecursos(edificiosResidenciales, edificiosLaborales);
            // Recalcular felicidad de toda la población con el estado actual de la ciudad
            this.gestorCiudadanos.recalcularFelicidadCiudadanos(valorServicios, this.ciudad.recursos.comida);
            // Eliminar los ciudadanos infelices
            this.gestorCiudadanos.procesarEliminacionCiudadanosInfelices();
            // Procesar crecimiento poblacional
            this.gestorCiudadanos.procesarCrecimientoPoblacional(edificiosResidenciales, edificiosLaborales, valorServicios);
        }

        this.recalcularPuntaje();
        console.log("Puntaje:", this.puntaje);
    }

    /**
     * Finaliza la partida actual por Game Over.
     * Detiene el sistema de turnos, el movimiento de ciudadanos,
     * cambia el estado a GAME_OVER y muestra modal.
     * @param {string} [razon="Desconocida"] - Razón del game over.
     */
    finalizarPartida(razon = "Desconocida") {
        this.pausarJuego();
        this.EstadoDeJuego.cambiarEstado(ESTADOS.GAME_OVER);
        // Detener también el movimiento visual de ciudadanos
        if (typeof window !== 'undefined' && window.movimientoCiudadanos) {
            window.movimientoCiudadanos.detener();
        }
        console.log(`Partida finalizada: ${razon}`);
        this.guardarPartida();
        
        // Mostrar modal de GAME OVER
        this._mostrarModalGameOver(razon);
    }

    /**
     * Muestra el modal de GAME OVER con la razón.
     * @private
     * @param {string} razon
     */
    _mostrarModalGameOver(razon) {
        const modalGameOver = document.getElementById('modal-game-over');
        if (!modalGameOver) return;

        // Actualizar contenido del modal
        const elRazon = document.getElementById('modal-game-over-razon');
        const elTurno = document.getElementById('modal-game-over-turno');
        const elScore = document.getElementById('modal-game-over-score');

        if (elRazon) {
            const razones = {
                'Sin dinero': '💰 Te has quedado sin dinero',
                'Sin electricidad': '⚡ Te has quedado sin electricidad',
                'Sin agua': '💧 Te has quedado sin agua'
            };
            elRazon.textContent = razones[razon] || razon;
        }
        if (elTurno) elTurno.textContent = this.numeroTurno;
        if (elScore) elScore.textContent = this.puntaje || 0;

        // Mostrar modal
        modalGameOver.dataset.visible = 'true';
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
        this.gestorCiudadanos.ciudad = this.ciudad;
        this.SistemaDeTurnos.cambiarDuracion(duracionTurno);
        actualizarOAgregarEnRanking();
        return this.ciudad;
    }

    /** Carga una Ciudad serializada y la asigna. */
    cargarCiudad(json) {
        this.ciudad = Ciudad.fromJSON(json);
        actualizarOAgregarEnRanking();
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
        this.gestorCiudadanos.ciudad = this.ciudad;
        this.numeroTurno = data.numeroTurno;
        const edificiosPorId = this.ciudad.crearIndiceConstruccionesPorId();
        this.gestorCiudadanos.ciudadanos = (data.ciudadanos || []).map(c => Ciudadano.fromJSON(c, edificiosPorId));
        this.ciudad.sincronizarOcupacionDesdeCiudadanos(this.gestorCiudadanos.ciudadanos);
        this.recolectorBurbujas.cargarDesdeJSON(data.recoleccion);
        // Calcular la puntuación con todos los datos cargados
        this.recalcularPuntaje();
        console.log("Partida cargada");
    }
    /**
     * Crea un mapa desde un archivo TXT seleccionado.
     *
     * Valida:
     * - Estructura del TXT (primera línea: "ANCHO ALTO", siguientes líneas: matriz)
     * - Dimensiones del mapa (15x15 mínimo, 30x30 máximo)
     * - Etiquetas válidas de terreno y construcciones
     *
     * @param {File} archivo Archivo TXT con datos del mapa.
     * @returns {Promise<Mapa>} Promesa que resuelve una instancia de Mapa validada.
     * @throws {Error} Si el archivo no es válido o no cumple validaciones.
     */
    async crearMapaDesdeTXT(archivo) {
        try {
            // Validar y extraer datos del TXT
            const datosValidados = await MapImporter.procesarArchivoTXT(archivo);

            const { ancho, alto, matriz, metadatos } = datosValidados;

            // Crear instancia del mapa con los datos validados
            const nuevoMapa = new Mapa(ancho, alto);
            nuevoMapa.generarMatriz(matriz);

            // Log con información del mapa cargado
            console.log(`[Juego] Mapa cargado exitosamente: ${ancho}x${alto}`);
            if (metadatos.nombre) {
                console.log(`  Ciudad: ${metadatos.nombre}`);
            }
            if (metadatos.alcalde) {
                console.log(`  Alcalde: ${metadatos.alcalde}`);
            }

            return nuevoMapa;

        } catch (error) {
            console.error('[Juego] Error al cargar mapa desde TXT:', error.message);
            throw error;
        }
    }
}