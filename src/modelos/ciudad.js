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
     * @param {string} [ciudadId=null] - ID único de la ciudad. Si no se proporciona, se genera uno nuevo.
     */
    constructor(nombre, alcalde, ancho = 15, alto = 15, coordenadas = null,
                dineroInicial = 50000, electricidadInicial = 0, aguaInicial = 0, comidaInicial = 0, ciudadId = null) {
        this.nombre = nombre;
        this.alcalde = alcalde;
        this.recursos = new Recursos(dineroInicial, electricidadInicial, aguaInicial, comidaInicial);
        this.construcciones = [];
        this.mapa = new Mapa(ancho, alto); // Agregar mapa visual
        this.coordenadas = coordenadas;
        // ID único para identificar esta instancia de ciudad en el ranking
        this.ciudadId = ciudadId || Ciudad._generarCiudadId();
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
            
            // Guardar coordenadas en el edificio para usar luego en burbujas visuales
            construccion._coordX = x;
            construccion._coordY = y;
        }
        return resultado;
    }

    /**
     * Elimina una construcción de la lista.
     * Devuelve el 50% del costo original al jugador como reembolso.
     * @param {object|string|number} construccionOId  - Objeto construcción u objeto con id
     * @returns {boolean} true si se encontró y demolió, false si no existe.
     */
    demoler(construccionOId) {
        // Si recibimos un objeto construcción directamente, usamos indexOf
        if (typeof construccionOId === 'object' && construccionOId !== null) {
            const index = this.construcciones.indexOf(construccionOId);
            if (index === -1) return false;
            const construccion = this.construcciones[index];
            this.recursos.dinero += Math.floor(construccion.costo * 0.5);
            this.construcciones.splice(index, 1);
            return true;
        }
        
        // Si recibimos un id, buscamos por id (para edificios)
        const index = this.construcciones.findIndex(c => c.id === construccionOId);
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
     * Genera un ID único para la ciudad (timestamp + random).
     * @private
     * @returns {string} ID único
     */
    static _generarCiudadId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 10);
        return `ciudad_${timestamp}_${random}`;
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
     * Puebla la ciudad con construcciones basadas en la matriz del mapa.
     *
     * Lee cada celda de la matriz y crea la construcción correspondiente:
     * - 'R1', 'R2': Residencial
     * - 'C1', 'C2': Comercial
     * - 'I1', 'I2': Industrial
     * - 'S1', 'S2', 'S3': Servicio
     * - 'U1', 'U2': Planta de Utilidad
     * - 'P1': Parque
     * - 'r': Vía
     * - 'g': Terreno vacío (se ignora)
     *
     * @param {Array<Array<string>>} matriz Matriz con etiquetas de construcciones.
     * @returns {void}
     */
    poblarConstruccionesDesdeMatriz(matriz) {
        if (!Array.isArray(matriz) || matriz.length === 0) return;

        let ultimoId = 0;

        for (let y = 0; y < matriz.length; y++) {
            for (let x = 0; x < matriz[y].length; x++) {
                const etiqueta = matriz[y][x];

                // Ignorar terreno vacío
                if (etiqueta === 'g') continue;

                let construccion = null;
                ultimoId++;

                // Mapeo de etiquetas a tipos de construcción
                if (etiqueta === 'r') {
                    construccion = new Vias(100);

                } else if (etiqueta === 'R1') {
                    construccion = new Residencial(1000, ultimoId, 'Casa', 1, 5, 3, true, 4, []);

                } else if (etiqueta === 'R2') {
                    construccion = new Residencial(3000, ultimoId, 'Apartamento', 3, 15, 10, true, 12, []);

                } else if (etiqueta === 'C1') {
                    construccion = new Comercial(2000, ultimoId, 'Tienda', 2, 8, 0, true, 6, [], 500);

                } else if (etiqueta === 'C2') {
                    construccion = new Comercial(8000, ultimoId, 'Centro Comercial', 8, 25, 0, true, 20, [], 2000);

                } else if (etiqueta === 'I1') {
                    construccion = new Industrial(5000, ultimoId, 'Fábrica', 5, 20, 15, true, 15, [], 'fabrica', 800);

                } else if (etiqueta === 'I2') {
                    construccion = new Industrial(3000, ultimoId, 'Granja', 3, 0, 10, true, 8, [], 'granja', 50);

                } else if (etiqueta === 'S1') {
                    construccion = new Servicio(4000, ultimoId, 'Estación de Policía', 4, 15, 0, true, 'policia', 10, 5);

                } else if (etiqueta === 'S2') {
                    construccion = new Servicio(4000, ultimoId, 'Estación de Bomberos', 4, 15, 0, true, 'bomberos', 10, 5);

                } else if (etiqueta === 'S3') {
                    construccion = new Servicio(6000, ultimoId, 'Hospital', 6, 20, 10, true, 'hospital', 10, 7);

                } else if (etiqueta === 'U1') {
                    construccion = new PlantasDeUtilidad(10000, ultimoId, 'Planta Eléctrica', 10, 0, 0, true, 'electrica', 200);

                } else if (etiqueta === 'U2') {
                    construccion = new PlantasDeUtilidad(8000, ultimoId, 'Planta de Agua', 8, 20, 0, true, 'agua', 150);

                } else if (etiqueta === 'P1') {
                    construccion = new Parques(1500, 5, 1);
                }

                // Agregar construcción a la lista y al mapa si fue creada
                if (construccion) {
                    this.construcciones.push(construccion);
                    construccion._coordX = x;
                    construccion._coordY = y;
                    this.mapa.agregarElemento(x, y, etiqueta);
                }
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
            coordenadas: this.coordenadas,
            ciudadId: this.ciudadId
        };
    }





}