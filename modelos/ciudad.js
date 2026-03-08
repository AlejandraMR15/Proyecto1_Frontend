class Ciudad {
    constructor(nombre, alcalde) {
        this.nombre = nombre;
        this.alcalde = alcalde;
        this.recursos = new Recursos();
        this.construcciones = [];
    }

    /**
     * Intenta agregar una construcción a la ciudad.
     * Valida presupuesto (a través del propio método ejecutar de Construccion)
     * y registra el objecto en la lista interna.
     * @param {Construccion} construccion  - Instancia ya creada (Edificio, Vias, Parques…)
     * @returns {boolean} true si se construyó con éxito, false si no hay fondos.
     */
    construir(construccion) {
        return construccion.ejecutar(this);
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
     * Ejecuta un ciclo de turno completo:
     * 1. Primero las plantas de utilidad producen recursos.
     * 2. Luego cada construcción aplica sus consumos y producción.
     * 3. Los parques y servicios aplican felicidad a los ciudadanos (si se provee array).
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

        // Paso 3: efectos de felicidad sobre ciudadanos
        if (ciudadanos.length > 0) {
            const parques = this.construcciones.filter(c => c instanceof Parques);
            for (const parque of parques) {
                parque.aplicarFelicidad(ciudadanos);
            }

            const servicios = this.construcciones.filter(c => c instanceof Servicio);
            for (const servicio of servicios) {
                servicio.aplicarFelicidad(ciudadanos);
            }
        }
    }

    toJSON() {
        return {
            nombre: this.nombre,
            alcalde: this.alcalde,
            recursos: this.recursos,
            construcciones: this.construcciones.map(c => c.toJSON ? c.toJSON() : c)
        };
    }

    static fromJSON(json) {
        const ciudad = new Ciudad(json.nombre, json.alcalde);
        ciudad.recursos = json.recursos;
        ciudad.construcciones = json.construcciones.map(c => {
            // Aquí necesitaríamos lógica para recrear las instancias correctas
            // Por simplicidad, asumir que son objetos planos
            return c;
        });
        return ciudad;
    }
}