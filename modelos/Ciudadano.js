/**
 * Modelo de ciudadano dentro de la simulacion.
 *
 * Un ciudadano puede tener:
 * - vivienda (residencia)
 * - empleo
 * - servicios cercanos que afectan su felicidad
 */
export default class Ciudadano {
    /**
     * Crea una instancia de ciudadano.
     * @param {number|string|null} [id=null] Identificador unico del ciudadano.
     * @param {number} [felicidad=100] Nivel inicial de felicidad (0 a 100 esperado).
     * @param {object|null} [residencia=null] Referencia al edificio residencial asignado.
     * @param {object|null} [empleo=null] Referencia al edificio laboral asignado.
     */
    constructor(id = null, felicidad = 100, residencia = null, empleo = null) {
        this.id = id;
        this.felicidad = felicidad;
        this.residencia = residencia;
        this.empleo = empleo;
        this.serviciosCercanos = [];
    }

    /**
     * Asigna una vivienda al ciudadano.
     *
     * Nota de comportamiento actual:
     * - Retorna `false` si no se recibe edificio.
     * - Si la asignacion es valida, actualiza `this.residencia`.
     * @param {object|null} edificioResidencial Edificio residencial a asignar.
     * @returns {boolean|undefined} `false` si la entrada es invalida.
     */
    asignarVivienda(edificioResidencial) {
        if (!edificioResidencial) return false;
        this.residencia = edificioResidencial;
    }

    /**
     * Asigna empleo al ciudadano.
     *
     * Nota de comportamiento actual:
     * - Retorna `false` si no se recibe edificio.
     * - Si la asignacion es valida, actualiza `this.empleo`.
     * @param {object|null} edificioLaboral Edificio comercial o industrial a asignar.
     * @returns {boolean|undefined} `false` si la entrada es invalida.
     */
    asignarEmpleo(edificioLaboral) {
        if (!edificioLaboral) return false;
        this.empleo = edificioLaboral;
    }

    /**
     * Calcula y actualiza la felicidad del ciudadano segun reglas de negocio.
     *
     * Reglas:
     * - Tener vivienda: +20, no tener: -20
     * - Tener empleo: +15, no tener: -15
     * - Servicios cercanos: suma de `servicio.felicidad`
     * - Resultado final acotado al rango [0, 100]
     *
     * @returns {number} Nuevo valor de felicidad calculado.
     */
    calcularFelicidad() {
        let positivos = 0;
        let negativos = 0;

        if (this.tieneVivienda()) {
            positivos += 20;
        } else {
            negativos += 20;
        }

        if (this.tieneEmpleo()) {
            positivos += 15;
        } else {
            negativos += 15;
        }

        // sumar el valor de cada servicio cercano (parques, hospitales, policía, etc.)
        positivos += this._valorServicios();

        let total = positivos - negativos;
        // acotar entre 0 y 100
        total = Math.max(0, Math.min(100, total));
        this.felicidad = total;
        return total;
    }

    /**
     * Indica si el ciudadano tiene vivienda asignada.
     * @returns {boolean} `true` si `residencia` no es `null`.
     */
    tieneVivienda() {
        return this.residencia !== null;
    }

    /**
     * Indica si el ciudadano tiene empleo asignado.
     * @returns {boolean} `true` si `empleo` no es `null`.
     */
    tieneEmpleo() {
        return this.empleo !== null;
    }

    /**
     * Suma el aporte de felicidad de todos los servicios cercanos.
     *
     * Cada elemento de `serviciosCercanos` puede exponer la propiedad
     * `felicidad`. Si no existe, se toma como 0.
     * @private
     * @returns {number} Suma total de felicidad aportada por servicios.
     */
    _valorServicios() {
        if (!Array.isArray(this.serviciosCercanos)) return 0;
        return this.serviciosCercanos.reduce((acc, servicio) => {
            return acc + (servicio.felicidad || 0);
        }, 0);
    }

    toJSON() {
        return {
            id: this.id,
            felicidad: this.felicidad,
            residencia: this.residencia, // Asumir que residencia tiene id o algo serializable
            empleo: this.empleo,
            serviciosCercanos: this.serviciosCercanos
        };
    }

    static fromJSON(json) {
        const ciudadano = new Ciudadano(json.id, json.felicidad, json.residencia, json.empleo);
        ciudadano.serviciosCercanos = json.serviciosCercanos;
        return ciudadano;
    }
}