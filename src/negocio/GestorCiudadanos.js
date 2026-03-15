import Ciudadano from '../modelos/Ciudadano.js';

/**
 * Gestiona la poblacion de ciudadanos.
 *
 * Responsabilidades principales:
 * - almacenar ciudadanos
 * - calcular metricas de felicidad y total poblacional
 * - detectar disponibilidad de vivienda y empleo
 * - procesar crecimiento poblacional por turnos
 */
export default class GestorCiudadano {
    /**
     * Crea una instancia del gestor.
     * @param {Array<Ciudadano>} [ciudadanos=[]] Lista inicial de ciudadanos.
     * @param {number} [tasaCrecimiento=3] Maximo de ciudadanos que pueden crearse por turno.
     * Se normaliza al rango [1, 3].
     */
    constructor(ciudadanos = [], tasaCrecimiento = 3) {
        this.ciudadanos = ciudadanos;
        // tasa de crecimiento configurable (valor mínimo 1, máximo 3)
        this.tasaCrecimiento = Math.max(1, Math.min(3, tasaCrecimiento));
    }

    /**
     * Agrega un ciudadano al gestor si la referencia es valida.
     * @param {Ciudadano|object|null} ciudadano Ciudadano a agregar.
     * @returns {void}
     */
    agregarCiudadano(ciudadano) {
        if (ciudadano) {
            this.ciudadanos.push(ciudadano);
        }
    }

    /**
     * Calcula la felicidad promedio de la poblacion actual.
     *
     * Si no hay ciudadanos retorna 0.
     * @returns {number} Promedio de felicidad.
     */
    calcularFelicidadPromedio() {
        if (this.ciudadanos.length === 0) return 0;
        const suma = this.ciudadanos.reduce((total, c) => {
            return total + (c.felicidad || 0);
        }, 0);
        return suma / this.ciudadanos.length;
    }

    /**
     * Recalcula la felicidad de todos los ciudadanos segun el estado actual.
     *
     * Se actualiza el valor de servicios de cada ciudadano y luego
     * se ejecuta `calcularFelicidad()` para evitar acumulaciones por turno.
     *
     * @param {number} [valorServicios=0] Suma de felicidad aportada por servicios activos.
     * @returns {void}
     */
    recalcularFelicidadCiudadanos(valorServicios = 0) {
        this.ciudadanos.forEach(ciudadano => {
            ciudadano.servicios = valorServicios;
            ciudadano.calcularFelicidad();
        });
    }

    /**
     * Obtiene edificios residenciales con capacidad disponible.
     *
     * Criterio: `residentes < capacidad`.
     * Si faltan propiedades se interpretan como 0.
     * @param {Array<object>} edificiosResidenciales Lista de edificios residenciales.
     * @returns {Array<object>} Edificios que aun pueden recibir residentes.
     */
    obtenerViviendaDisponible(edificiosResidenciales) {
        if (!Array.isArray(edificiosResidenciales)) return [];
        return edificiosResidenciales.filter(edificio => {
            const capacidad = edificio.capacidad || 0;
            const residentes = edificio.residentes ? edificio.residentes.length : 0;
            return residentes < capacidad;
        });
    }

    /**
     * Obtiene edificios laborales (comerciales o industriales) con vacantes.
     *
     * Formatos aceptados en `edificiosLaborales`:
     * - arreglo simple de edificios
     * - arreglo que contiene subarreglos
     * - objeto con `{ comerciales, industriales }`
     *
     * Criterio de vacante:
     * - si existe `tieneEmpleoDisponible()`, usa ese metodo
     * - en otro caso, usa `empleos - empleados > 0`
     *
     * @param {Array<object>|{comerciales?: Array<object>, industriales?: Array<object>}|null} edificiosLaborales
     * Contenedor flexible de edificios laborales.
     * @returns {Array<object>} Lista plana de edificios con vacantes.
     */
    obtenerEmpleosDisponibles(edificiosLaborales) {
        if (!edificiosLaborales) return [];
        const lista = this._unificarEdificiosLaborales(edificiosLaborales);

        // filtrar por edificios que reporten vacantes
        return lista.filter(edificio => {
            if (edificio.tieneEmpleoDisponible) {
                return edificio.tieneEmpleoDisponible();
            }
            const empleos = edificio.empleo || 0;
            const empleados = edificio.empleados ? edificio.empleados.length : 0;
            return empleos - empleados > 0;
        });
    }

    /**
     * Procesa el crecimiento poblacional de un turno.
     *
     * Solo crea ciudadanos cuando se cumplen todas las condiciones:
     * - hay vivienda disponible
     * - felicidad promedio mayor a 60
     * - hay empleos disponibles
     *
     * @param {Array<object>} edificiosResidenciales Edificios residenciales del turno.
     * @param {Array<object>|object|null} edificiosLaborales Edificios laborales del turno.
     * @param {number} [valorServicios=0] Suma de felicidad aportada por servicios (parques, hospitales, policía, etc.).
     * @returns {void}
     */
    procesarCrecimientoPoblacional(edificiosResidenciales, edificiosLaborales, valorServicios = 0) {
        if (!this._puedeCrecer(edificiosResidenciales, edificiosLaborales)) {
            return; // no se cumplen condiciones de crecimiento
        }

        const cantidad = this._calcularCiudadanosACrear();
        this._crearYAsignarCiudadanos(cantidad, edificiosResidenciales, edificiosLaborales, valorServicios);
    }

    /**
     * Retorna la cantidad total de ciudadanos registrados.
     * @returns {number} Total de ciudadanos.
     */
    calcularTotalCiudadanos() {
        return this.ciudadanos.length;
    }

    /**
     * Verifica si se cumplen condiciones para permitir crecimiento poblacional.
     *
     * Condiciones:
     * - al menos una vivienda disponible
     * - felicidad promedio > 60
     * - al menos un empleo disponible
     *
     * @private
     * @param {Array<object>} edificiosResidenciales
     * @param {Array<object>|object|null} edificiosLaborales
     * @returns {boolean} `true` si puede crecer; `false` en caso contrario.
     */
    _puedeCrecer(edificiosResidenciales, edificiosLaborales) {
        const viviendaDisponible = this.obtenerViviendaDisponible(edificiosResidenciales).length > 0;
        const felicidadPromedio = this.calcularFelicidadPromedio();
        const empleosDisponibles = this.obtenerEmpleosDisponibles(edificiosLaborales).length > 0;
        
        const felicidadOk = this.ciudadanos.length === 0 || felicidadPromedio > 60;
        return viviendaDisponible && felicidadOk && empleosDisponibles;
    }

    /**
     * Calcula cuantos ciudadanos se crean en el turno actual.
     *
     * El valor es aleatorio en el rango [1, tasaCrecimiento].
     * @private
     * @returns {number} Cantidad de ciudadanos a crear.
     */
    _calcularCiudadanosACrear() {
        const minimo = 1;
        const maximo = this.tasaCrecimiento;
        return Math.floor(Math.random() * (maximo - minimo + 1)) + minimo;
    }

    /**
     * Convierte la entrada flexible de edificios laborales en una lista plana.
     *
     * Soporta:
     * - arreglo simple de edificios
     * - arreglo con subarreglos
     * - objeto con `{ comerciales, industriales }`
     *
     * @private
     * @param {Array<object>|{comerciales?: Array<object>, industriales?: Array<object>}|null} edificiosLaborales
     * @returns {Array<object>} Lista plana de edificios laborales.
     */
    _unificarEdificiosLaborales(edificiosLaborales) {
        if (!edificiosLaborales) return [];

        const lista = [];

        if (Array.isArray(edificiosLaborales)) {
            edificiosLaborales.forEach(item => {
                if (Array.isArray(item)) {
                    lista.push(...item);
                } else {
                    lista.push(item);
                }
            });
            return lista;
        }

        if (typeof edificiosLaborales === 'object') {
            if (Array.isArray(edificiosLaborales.comerciales)) {
                lista.push(...edificiosLaborales.comerciales);
            }
            if (Array.isArray(edificiosLaborales.industriales)) {
                lista.push(...edificiosLaborales.industriales);
            }
        }

        return lista;
    }

    /**
     * Crea nuevos ciudadanos y les asigna vivienda/empleo si hay disponibilidad.
     *
     * Flujo por cada ciudadano:
     * - genera id
     * - intenta asignar primera vivienda libre
     * - intenta asignar primer empleo disponible
     * - actualiza contadores del edificio si existen metodos `añadirResidente`
     *   y `añadirEmpleado`
     * - asigna el valor de servicios (suma de felicidad de parques, hospitales, policía, etc.)
     * - calcula felicidad inicial y lo agrega al gestor
     *
     * @private
     * @param {number} cantidad Numero de ciudadanos a crear.
     * @param {Array<object>} edificiosResidenciales
     * @param {Array<object>|object|null} edificiosLaborales
     * @param {number} [valorServicios=0] Suma de felicidad aportada por servicios.
     * @returns {void}
     */
    _crearYAsignarCiudadanos(cantidad, edificiosResidenciales, edificiosLaborales, valorServicios = 0) {
        for (let i = 0; i < cantidad; i++) {
            const nuevoCiudadano = new Ciudadano(this._generarNuevoId(), 100, null, null, valorServicios);
            
            // obtiene listas de viviendas y empleos disponibles
            const viviendasLibres = this.obtenerViviendaDisponible(edificiosResidenciales);
            const trabajosLibres = this.obtenerEmpleosDisponibles(edificiosLaborales);
            
            // asigna vivienda si hay disponible (primera vivienda de la lista)
            if (viviendasLibres.length > 0) {
                const residencia = viviendasLibres[0];
                nuevoCiudadano.asignarVivienda(residencia);
                residencia.añadirResidentes(nuevoCiudadano);
                
            }
            
            // asigna empleo si hay disponible (primer edificio con vacante)
            if (trabajosLibres.length > 0) {
                const empleo = trabajosLibres[0];
                nuevoCiudadano.asignarEmpleo(empleo);
                empleo.añadirEmpleado(nuevoCiudadano);
            }
            
            // calcula felicidad inicial basada en asignaciones y servicios
            nuevoCiudadano.calcularFelicidad();
            
            // Agrega el nuevo ciudadano al gestor
            this.agregarCiudadano(nuevoCiudadano);
        }
    }

    /**
     * Genera un id incremental para un nuevo ciudadano.
     *
     * Si no hay ciudadanos, empieza en 1.
     * @private
     * @returns {number} Nuevo id unico.
     */
    _generarNuevoId() {
        if (this.ciudadanos.length === 0) return 1;
        const maxId = Math.max(...this.ciudadanos.map(c => c.id || 0));
        return maxId + 1;
    }
}