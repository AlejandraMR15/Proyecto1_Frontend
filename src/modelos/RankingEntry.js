/**
 * Representa una entrada individual en el ranking de ciudades.
 * Almacena métricas de una ciudad en un momento específico.
 */
export default class RankingEntry {
    /**
     * Crea una entrada de ranking.
     * @param {string} nombreCiudad - Nombre de la ciudad.
     * @param {string} alcalde - Nombre del alcalde.
     * @param {number} puntuacion - Puntuación obtenida.
     * @param {number} poblacion - Población de la ciudad.
     * @param {number} felicidad - Felicidad promedio.
     * @param {number} turno - Número de turno alcanzado.
     * @param {Date} [fecha=new Date()] - Fecha de la entrada.
     * @param {string} [ciudadId] - ID único de la ciudad para evitar duplicados.
     */
    constructor(nombreCiudad, alcalde, puntuacion, poblacion, felicidad, turno, fecha = new Date(), ciudadId = null) {
        this.nombreCiudad = nombreCiudad;
        this.alcalde = alcalde;
        this.puntuacion = puntuacion;
        this.poblacion = poblacion;
        this.felicidad = felicidad;
        this.turno = turno;
        this.fecha = fecha;
        this.ciudadId = ciudadId;
    }

    /**
     * Serializa la entrada a un objeto JSON.
     * @returns {object} Objeto serializable.
     */
    toJSON() {
        return {
            nombreCiudad: this.nombreCiudad,
            alcalde: this.alcalde,
            puntuacion: this.puntuacion,
            poblacion: this.poblacion,
            felicidad: this.felicidad,
            turno: this.turno,
            fecha: this.fecha,
            ciudadId: this.ciudadId
        };
    }
}