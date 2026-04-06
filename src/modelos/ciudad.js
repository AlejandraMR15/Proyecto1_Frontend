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
     * Construye parámetros de consulta para el endpoint de noticias.
     * @returns {{q:string, language:string, pageSize:number, apiKey:string}}
     */
    crearParametrosConsulta() {
        return {
            q: this.paisConsulta,
            language: 'es',
            pageSize: ApiNoticias.CANTIDAD_NOTICIAS,
            apiKey: this.apiKey
        };
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
                } else if (etiqueta === 'r') {
                    construccion = new Vias(100, 0);
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

    static fromJSON(json) {
        const ciudad = new Ciudad(
            json.nombre,
            json.alcalde,
            json.mapa ? json.mapa.ancho : 15,
            json.mapa ? json.mapa.alto  : 15,
            json.coordenadas,
            50000, // dineroInicial - será sobrescrito abajo
            0, // electricidadInicial - será sobrescrito abajo
            0, // aguaInicial - será sobrescrito abajo
            0, // comidaInicial - será sobrescrito abajo
            json.ciudadId // Preservar el ciudadId original al cargar
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
            const instancia = Ciudad._reconstruirConstruccion(c);
            if (instancia && c._coordX !== undefined && c._coordY !== undefined) {
                instancia._coordX = c._coordX;
                instancia._coordY = c._coordY;
            }
            return instancia;
        }).filter(Boolean);

        // Recuperar coordenadas desde la matriz del mapa para edificios que no las tienen.
        // Esto garantiza que funcionen las burbujas visuales incluso con partidas guardadas
        // antes del fix de coordenadas, o cuando toJSON no las incluyó por algún motivo.
        if (ciudad.mapa && Array.isArray(ciudad.mapa.matriz)) {
            // Etiquetas que corresponden a edificios (no vías ni terreno vacío ni parques)
            const ETIQUETAS_EDIFICIO = new Set(['R1','R2','C1','C2','I1','I2','S1','S2','S3','U1','U2','P1']);
            // Construir un mapa de etiqueta -> lista de construcciones sin coordenadas de ese tipo
            const sinCoords = {};
            for (const inst of ciudad.construcciones) {
                if (inst._coordX === undefined || inst._coordY === undefined) {
                    const tipo = inst.constructor.name;
                    if (!sinCoords[tipo]) sinCoords[tipo] = [];
                    sinCoords[tipo].push(inst);
                }
            }
            // Mapeo de etiqueta del mapa -> nombre de clase de construcción
            const etiquetaAClase = {
                'R1': 'Residencial', 'R2': 'Residencial',
                'C1': 'Comercial',   'C2': 'Comercial',
                'I1': 'Industrial',  'I2': 'Industrial',
                'S1': 'Servicio',    'S2': 'Servicio',    'S3': 'Servicio',
                'U1': 'PlantasDeUtilidad', 'U2': 'PlantasDeUtilidad',
                'P1': 'Parques'
            };
            // Recorrer la matriz fila por fila, columna por columna
            for (let row = 0; row < ciudad.mapa.alto; row++) {
                for (let col = 0; col < ciudad.mapa.ancho; col++) {
                    const etiqueta = ciudad.mapa.matriz[row]?.[col];
                    if (!etiqueta || !ETIQUETAS_EDIFICIO.has(etiqueta)) continue;
                    const clase = etiquetaAClase[etiqueta];
                    if (!clase || !sinCoords[clase] || sinCoords[clase].length === 0) continue;
                    // Asignar coordenadas al primer edificio de ese tipo sin coordenadas
                    const inst = sinCoords[clase].shift();
                    inst._coordX = col;
                    inst._coordY = row;
                }
            }
        }

        return ciudad;
    }

    /**
     * Calcula recursos iniciales basándose en los edificios del mapa cargado.
     * 
     * Fases:
     * 1. Producción de plantas de utilidad (electricidad, agua)
     * 2. Producción de otros edificios (dinero, comida)
     * 3. Consumos de todos los edificios
     * 
     * @returns {void}
     */
    calcularRecursosIniciales() {
        const produccionPendiente = {
            dinero: 0,
            electricidad: 0,
            agua: 0,
            comida: 0,
        };

        // FASE 1: Producción de plantas de utilidad (electricidad, agua)
        const plantas = this.construcciones.filter(c => c instanceof PlantasDeUtilidad);
        for (const planta of plantas) {
            if (typeof planta.procesarProduccion === 'function') {
                const produccion = planta.procesarProduccion(this.recursos);
                this._acumularProduccionPendiente(produccionPendiente, produccion);
            }
        }

        // Aplicar producción de plantas
        if (produccionPendiente.electricidad > 0) {
            this.recursos.actualizarElectricidad(produccionPendiente.electricidad);
        }
        if (produccionPendiente.agua > 0) {
            this.recursos.actualizarAgua(produccionPendiente.agua);
        }

        // Reset para siguiente fase
        produccionPendiente.dinero = 0;
        produccionPendiente.electricidad = 0;
        produccionPendiente.agua = 0;
        produccionPendiente.comida = 0;

        // FASE 2: Producción de otros edificios (dinero, comida)
        const otrosEdificios = this.construcciones.filter(c => !(c instanceof PlantasDeUtilidad));
        for (const edificio of otrosEdificios) {
            if (typeof edificio.procesarProduccion === 'function') {
                const produccion = edificio.procesarProduccion(this.recursos);
                this._acumularProduccionPendiente(produccionPendiente, produccion);
            }
        }

        // Aplicar producción de otros edificios
        if (produccionPendiente.dinero > 0) {
            this.recursos.dinero += produccionPendiente.dinero;
        }
        if (produccionPendiente.comida > 0) {
            this.recursos.actualizarComida(produccionPendiente.comida);
        }

        // FASE 3: Consumos de todos los edificios (mantenimiento, electricidad, agua, comida)
        for (const edificio of this.construcciones) {
            if (typeof edificio.procesarConsumo === 'function') {
                edificio.procesarConsumo(this.recursos);
            }
        }
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
                return new Parques(c.costo, c.felicidad, c.costoMantenimiento ?? 0);
            case 'Vias':
                return new Vias(c.costo, c.costoMantenimiento ?? 0);
            default:
                console.warn(`Ciudad.fromJSON: tipo de construcción desconocido "${c.tipo}", se omite.`);
                return null;
        }
    }
}