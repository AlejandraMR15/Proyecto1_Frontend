import Mapa from './Mapa.js';
import Recursos from './recursos.js';
import Residencial from './construccion/tiposEdificios/residencial.js';
import Comercial from './construccion/tiposEdificios/comercial.js';
import Industrial from './construccion/tiposEdificios/industrial.js';
import PlantasDeUtilidad from './construccion/tiposEdificios/plantasUtilidad.js';
import Servicio from './construccion/tiposEdificios/servicio.js';
import Parques from './construccion/parques.js';
import Vias from './construccion/vias.js';

export default class Ciudad {
    /**
     * Crea una ciudad con su mapa, recursos y estado inicial.
     * @param {string} nombre
     * @param {string} alcalde
     * @param {number} [ancho=15]
     * @param {number} [alto=15]
     * @param {object|null} [coordenadas=null]
     * @param {number} [dineroInicial=50000]
     * @param {number} [electricidadInicial=0]
     * @param {number} [aguaInicial=0]
     * @param {number} [comidaInicial=0]
     */
    constructor(nombre, alcalde, ancho = 15, alto = 15, coordenadas = null,
                dineroInicial = 50000, electricidadInicial = 0, aguaInicial = 0, comidaInicial = 0) {
        this.nombre = nombre;
        this.alcalde = alcalde;
        this.recursos = new Recursos(dineroInicial, electricidadInicial, aguaInicial, comidaInicial);
        this.construcciones = [];
        this.mapa = new Mapa(ancho, alto); // Agregar mapa visual
        this.coordenadas = coordenadas;
    }

    /**
     * Intenta agregar una construcción a la ciudad.
     * Valida presupuesto (a través del propio método ejecutar de Construccion),
     * registra el objeto en la lista interna Y lo coloca en el mapa visual.
     *
     * @param {Construccion} construccion - Instancia ya creada (Edificio, Vias, Parques…)
     * @param {number} [x]               - Columna del mapa donde se coloca (requerido para sincronizar el grid).
     * @param {number} [y]               - Fila del mapa donde se coloca (requerido para sincronizar el grid).
     * @param {string} [etiqueta]        - Etiqueta a mostrar en el mapa (ej. 'R1', 'C1', 'r').
     *                                     Si no se provee se usa el nombre de la clase.
     * @returns {boolean} true si se construyó con éxito, false si no hay fondos.
     */
    construir(construccion, x, y, etiqueta) {
        const resultado = construccion.ejecutar(this);
        if (resultado && x !== undefined && y !== undefined) {
            const etiquetaMapa = etiqueta || construccion.constructor.name;
            this.mapa.agregarElemento(x, y, etiquetaMapa);
        }
        return resultado;
    }

    /**
     * Elimina una construcción de la lista por su id (Edificio) o por referencia directa.
     * Devuelve el 50% del costo original al jugador como reembolso.
     * @param {string|number} idConstruccion  - id del edificio (o índice en el array para Vías/Parques)
     * @returns {boolean} true si se encontró y demolió, false si no existe.
     */
    demoler(idConstruccion) {
        const index = this.construcciones.findIndex(c => c.id === idConstruccion);
        if (index === -1) return false;

        const construccion = this.construcciones[index];
        // Reembolso del 50% del costo original
        this.recursos.dinero += Math.floor(construccion.costo * 0.5);
        this.construcciones.splice(index, 1);
        return true;
    }

    /**
     * Retorna el objeto Recursos de la ciudad.
     * @returns {Recursos}
     */
    obtenerRecursos() {
        return this.recursos;
    }

    /**
     * Obtiene la lista de edificios residenciales de la ciudad.
     *
     * Se considera residencial todo edificio con capacidad de residentes.
     * @returns {Array<object>} Edificios residenciales.
     */
    obtenerEdificiosResidenciales() {
        return this.construcciones.filter(construccion => {
            return typeof construccion.capacidad === 'number'
                && Array.isArray(construccion.residentes)
                && typeof construccion.añadirResidentes === 'function';
        });
    }

    /**
     * Obtiene la lista de edificios laborales de la ciudad.
     *
     * Se considera laboral todo edificio que permite añadir empleados.
     * @returns {Array<object>} Edificios laborales.
     */
    obtenerEdificiosLaborales() {
        return this.construcciones.filter(construccion => {
            return typeof construccion.añadirEmpleado === 'function'
                && Array.isArray(construccion.empleados)
                && (typeof construccion.empleo === 'number' || typeof construccion.empleos === 'number');
        });
    }

    /**
     * Calcula la suma de felicidad aportada por servicios de ciudad activos.
     *
     * Reglas:
     * - Se considera todo edificio con propiedad numérica `felicidad`.
     * - Si el edificio tiene `esActivo`, solo suma cuando está activo.
     * @returns {number} Suma total de felicidad aportada por servicios.
     */
    obtenerValorServicios() {
        return this.construcciones
            .filter(construccion => {
                const tieneFelicidad = typeof construccion.felicidad === 'number';
                const activo = typeof construccion.esActivo === 'undefined' || construccion.esActivo;
                return tieneFelicidad && activo;
            })
            .reduce((acumulado, construccion) => acumulado + construccion.felicidad, 0);
    }

    /**
     * Crea un índice de construcciones por id para resolver referencias rápidas.
     * Incluye claves en formato original y string para soportar ids numéricos/texto.
     * @returns {Map<string|number, object>} Mapa id -> instancia de construcción.
     */
    crearIndiceConstruccionesPorId() {
        const indice = new Map();
        for (const construccion of this.construcciones) {
            if (!construccion || construccion.id === null || construccion.id === undefined) continue;
            indice.set(construccion.id, construccion);
            indice.set(String(construccion.id), construccion);
        }
        return indice;
    }

    /**
     * Recalcula ocupación de edificios a partir de las referencias actuales en ciudadanos.
     * @param {Array<object>} ciudadanos
     */
    sincronizarOcupacionDesdeCiudadanos(ciudadanos = []) {
        // Reinicia contadores para reconstruirlos desde la relación ciudadano -> edificio.
        for (const construccion of this.construcciones) {
            if (Array.isArray(construccion.residentes)) construccion.residentes = [];
            if (Array.isArray(construccion.empleados)) construccion.empleados = [];
        }

        for (const ciudadano of ciudadanos) {
            if (ciudadano.residencia && typeof ciudadano.residencia.añadirResidentes === 'function') {
                ciudadano.residencia.añadirResidentes(ciudadano);
            }
            if (ciudadano.empleo && typeof ciudadano.empleo.añadirEmpleado === 'function') {
                ciudadano.empleo.añadirEmpleado(ciudadano);
            }
        }
    }

    /**
     * Ejecuta un ciclo de turno completo:
     * 1. Primero las plantas de utilidad producen recursos.
     * 2. Luego cada construcción aplica sus consumos y producción.
     * @param {Ciudadano[]} [ciudadanos=[]]  - Array con todos los ciudadanos de la ciudad.
     */
    procesarTurno(ciudadanos = []) {
        // Paso 1: plantas primero para que la electricidad esté disponible
        const plantas = this.construcciones.filter(c => c instanceof PlantasDeUtilidad);
        for (const planta of plantas) {
            planta.procesarTurno(this.recursos);
        }

        // Paso 2: resto de edificios (excepto plantas ya procesadas)
        const otrosEdificios = this.construcciones.filter(c => !(c instanceof PlantasDeUtilidad));
        for (const edificio of otrosEdificios) {
            if (typeof edificio.procesarTurno === 'function') {
                edificio.procesarTurno(this.recursos);
            }
        }
    }

    toJSON() {
        return {
            nombre: this.nombre,
            alcalde: this.alcalde,
            recursos: this.recursos,
            construcciones: this.construcciones.map(c => c.toJSON ? c.toJSON() : c),
            mapa: this.mapa.toJSON ? this.mapa.toJSON() : this.mapa,
            coordenadas: this.coordenadas
        };
    }

    static fromJSON(json) {
        const ciudad = new Ciudad(
            json.nombre,
            json.alcalde,
            json.mapa ? json.mapa.ancho : 15,
            json.mapa ? json.mapa.alto  : 15,
            json.coordenadas
        );

        // Restaurar recursos con sus valores reales (no crear nuevos por defecto)
        if (json.recursos) {
            ciudad.recursos.dinero       = json.recursos.dinero       ?? 50000;
            ciudad.recursos.electricidad = json.recursos.electricidad ?? 0;
            ciudad.recursos.agua         = json.recursos.agua         ?? 0;
            ciudad.recursos.comida       = json.recursos.comida       ?? 0;
        }

        // Restaurar la matriz del mapa si existe
        if (json.mapa && json.mapa.matriz) {
            ciudad.mapa.matriz = json.mapa.matriz;
        }

        // Reconstruir construcciones como instancias tipadas (factory)
        ciudad.construcciones = (json.construcciones || []).map(c => {
            return Ciudad._reconstruirConstruccion(c);
        }).filter(Boolean); // Eliminar nulls si algún tipo es desconocido

        return ciudad;
    }

    /**
     * Factory privado: lee el campo `tipo` del objeto serializado y crea
     * la instancia correcta de la subclase de Construccion correspondiente.
     * Esto es necesario para que instanceof funcione correctamente después
     * de cargar una partida guardada.
     *
     * @param {object} c - Objeto plano serializado de una construcción.
     * @returns {Construccion|null} Instancia tipada, o null si el tipo es desconocido.
     */
    static _reconstruirConstruccion(c) {
        if (!c || !c.tipo) return null;

        switch (c.tipo) {
            case 'Residencial':
                return new Residencial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.capacidad, []
                );
            case 'Comercial':
                return new Comercial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.empleo, [], c.ingresoPorTurno
                );
            case 'Industrial':
                return new Industrial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.empleo, [], c.tipoDeProduccion, c.produccion
                );
            case 'PlantasDeUtilidad':
                return new PlantasDeUtilidad(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.tipoDeUtilidad, c.produccionPorTurno
                );
            case 'Servicio':
                return new Servicio(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.tipoDeServicio, c.felicidad, c.radio
                );
            case 'Parques':
                return new Parques(c.costo, c.felicidad);
            case 'Vias':
                return new Vias(c.costo);
            default:
                console.warn(`Ciudad.fromJSON: tipo de construcción desconocido "${c.tipo}", se omite.`);
                return null;
        }
    }
}