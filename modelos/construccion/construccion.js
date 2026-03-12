/**
 * Clase base para todas las construcciones de la ciudad.
 *
 * Responsabilidades:
 *  - Guardar el costo de construcción.
 *  - Validar si la ciudad tiene dinero suficiente (puedeConstruirse).
 *  - Ejecutar la construcción: descontar dinero + registrar en ciudad.construcciones (ejecutar).
 *  - Proveer la fábrica estática instanciar() que crea el objeto correcto
 *    leyendo los datos del JSON ya cargado, con valores DINÁMICOS en 0 / [].
 */
class Construccion {
    constructor(costo) {
        this.costo = costo;
    }

    puedeConstruirse(ciudad) {
        return ciudad.recursos.dinero >= this.costo;
    }

    /**
     * Intenta construir en la ciudad.
     * Si hay dinero suficiente: descuenta el costo y registra el objeto.
     * @param {Ciudad} ciudad
     * @returns {boolean} true si se construyó, false si no hay fondos.
     */
    ejecutar(ciudad) {
        if (this.puedeConstruirse(ciudad)) {
            ciudad.recursos.dinero -= this.costo;
            ciudad.construcciones.push(this);
            return true;
        }
        return false;
    }

    /* ============================================================
       MAPA INTERNO: data-id del menú → JSON + índice + etiqueta lógica
       La etiqueta es la que usa Mapa.matriz y GridRenderer para
       identificar y pintar el cubo con el color correcto.
    ============================================================ */
    static _MAPA_EDIFICIOS = {
        'res-001':    { json: 'residencial',     indice: 0, etiqueta: 'R1' },
        'res-002':    { json: 'residencial',     indice: 1, etiqueta: 'R2' },
        'com-001':    { json: 'comercial',       indice: 0, etiqueta: 'C1' },
        'com-002':    { json: 'comercial',       indice: 1, etiqueta: 'C2' },
        'ind-001':    { json: 'industrial',      indice: 0, etiqueta: 'I1' },
        'ind-002':    { json: 'industrial',      indice: 1, etiqueta: 'I2' },
        'serv-001':   { json: 'servicio',        indice: 0, etiqueta: 'S1' },
        'serv-002':   { json: 'servicio',        indice: 1, etiqueta: 'S2' },
        'serv-003':   { json: 'servicio',        indice: 2, etiqueta: 'S3' },
        'util-001':   { json: 'plantasUtilidad', indice: 0, etiqueta: 'U1' },
        'util-002':   { json: 'plantasUtilidad', indice: 1, etiqueta: 'U2' },
        'parque-001': { json: 'parques',         indice: 0, etiqueta: 'P1' },
        'via-001':    { json: 'vias',            indice: 0, etiqueta: 'r'  },
    };

    /**
     * Devuelve la configuración (json, indice, etiqueta) para un menuId dado.
     * Útil para que grid.js obtenga la etiqueta sin duplicar el mapa.
     * @param {string} menuId
     * @returns {{ json: string, indice: number, etiqueta: string } | null}
     */
    static obtenerConfig(menuId) {
        return Construccion._MAPA_EDIFICIOS[menuId] ?? null;
    }

    /* ============================================================
       INSTANCIAR — Fábrica estática
       Crea la instancia correcta con valores FIJOS del JSON
       (costo, nombre, capacidad, empleo, etc.) y valores DINÁMICOS
       en 0 / [] (residentes, empleados) para que el sistema de
       turnos los vaya llenando durante la partida.

       @param {string} menuId          - data-id del item del menú (ej: 'res-001')
       @param {number} col             - columna en el mapa (para el id único)
       @param {number} row             - fila en el mapa (para el id único)
       @param {object} datosEdificios  - cache de JSONs ya cargados por grid.js
       @returns {Construccion|null}    - instancia creada, o null si menuId no existe
    ============================================================ */
    static instanciar(menuId, col, row, datosEdificios) {
        const config = Construccion._MAPA_EDIFICIOS[menuId];
        if (!config) return null;

        const d   = datosEdificios[config.json]?.[config.indice];
        if (!d) return null;

        // Id único que identifica al edificio en el mapa: tipo + posición
        const uid = `${d.id ?? menuId}_${col}_${row}`;

        switch (config.json) {

            case 'residencial':
                // residentes: [] → se irán asignando ciudadanos por turno
                return new Residencial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento,
                    d.consumoElectricidad,
                    d.consumoAgua,
                    d.esActivo,
                    d.capacidad,
                    []              // residentes vacíos al construir
                );

            case 'comercial':
                // empleados: [] → se irán asignando ciudadanos por turno
                return new Comercial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento,
                    d.consumoElectricidad,
                    d.esActivo,
                    d.empleo,
                    [],             // empleados vacíos al construir
                    d.ingresoPorTurno
                );

            case 'industrial':
                // empleados: [] → se irán asignando ciudadanos por turno
                return new Industrial(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento,
                    d.consumoElectricidad,
                    d.consumoAgua ?? 0,
                    d.esActivo,
                    d.empleo,
                    [],             // empleados vacíos al construir
                    d.montonDeProduccion
                );

            case 'servicio':
                return new Servicio(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento,
                    d.esActivo,
                    d.tipoDeServicio,
                    d.felicidad
                );

            case 'plantasUtilidad':
                return new PlantasDeUtilidad(
                    d.costo, uid, d.nombre,
                    d.costoMantenimiento,
                    d.esActivo,
                    d.tipoDeUtilidad,
                    d.produccionPorTurno
                );

            case 'parques':
                // Parques no tienen id ni nombre en el JSON actual
                return new Parques(d.costo, d.felicidad);

            case 'vias':
                return new Vias(d.costo);

            default:
                return null;
        }
    }
}