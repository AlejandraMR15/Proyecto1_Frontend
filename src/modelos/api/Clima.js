export default class Clima {
    /**
     * Encapsula los datos climáticos obtenidos de la API.
     * @param {number} [temperatura=0]
     * @param {string} [condicionClimatica='']
     * @param {number} [humedad=0]
     * @param {number} [velocidadViento=0]
     */
    constructor(temperatura = 0, condicionClimatica = '', humedad = 0, velocidadViento = 0) {
        this.temperatura = temperatura;
        this.condicionClimatica = condicionClimatica;
        this.humedad = humedad;
        this.velocidadViento = velocidadViento;
    }
}
