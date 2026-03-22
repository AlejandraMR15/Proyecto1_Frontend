import RankingEntry from "../modelos/RankingEntry.js";

/**
 * Clase que gestiona el ranking de ciudades basado en puntuaciones.
 * Almacena entradas ordenadas por puntaje descendente.
 */
export default class Ranking {
    /**
     * Crea una instancia del ranking.
     */
    constructor() {
        this.entradas = [];
    }

    /**
     * Agrega una nueva entrada al ranking y lo reordena.
     * @param {object} datosCiudad - Datos de la ciudad para la entrada.
     * @param {string} datosCiudad.nombreCiudad - Nombre de la ciudad.
     * @param {string} datosCiudad.alcalde - Nombre del alcalde.
     * @param {number} datosCiudad.puntuacion - Puntuación obtenida.
     * @param {number} datosCiudad.poblacion - Población de la ciudad.
     * @param {number} datosCiudad.felicidad - Felicidad promedio.
     * @param {number} datosCiudad.turno - Número de turno alcanzado.
     */
    agregarEntrada(datosCiudad) {
        const nuevaEntrada = new RankingEntry(
            datosCiudad.nombreCiudad,
            datosCiudad.alcalde,
            datosCiudad.puntuacion,
            datosCiudad.poblacion,
            datosCiudad.felicidad,
            datosCiudad.turno,
            datosCiudad.fecha ? new Date(datosCiudad.fecha) : new Date()
        );

        this.entradas.push(nuevaEntrada);
        this.ordenarPorPuntaje();
    }

    /**
     * Ordena las entradas por puntaje en orden descendente.
     */
    ordenarPorPuntaje() {
        this.entradas.sort((a, b) => b.puntuacion - a.puntuacion);
    }

    /**
     * Obtiene las top N entradas del ranking.
     * @param {number} [n=10] - Número de entradas a obtener.
     * @returns {RankingEntry[]} Array con las entradas top.
     */
    obtenerTop(n = 10) {
        return this.entradas.slice(0, n);
    }

    /**
     * Reinicia el ranking, eliminando todas las entradas.
     */
    reiniciar() {
        this.entradas = [];
    }

    /**
     * Obtiene todas las entradas serializadas como JSON.
     * @returns {object[]} Array de objetos JSON de las entradas.
     */
    getEntradas() {
        return this.entradas.map(e => e.toJSON());
    }
}