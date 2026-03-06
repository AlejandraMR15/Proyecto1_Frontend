export default class RankingEntry {
    constructor(nombreCiudad, alcalde, puntuacion, poblacion, felicidad, turno, fecha = new Date()) {
        this.nombreCiudad = nombreCiudad;
        this.alcalde = alcalde;
        this.puntuacion = puntuacion;
        this.poblacion = poblacion;
        this.felicidad = felicidad;
        this.turno = turno;
        this.fecha = fecha;
    }

    toJSON() {
        return {
            nombreCiudad: this.nombreCiudad,
            alcalde: this.alcalde,
            puntuacion: this.puntuacion,
            poblacion: this.poblacion,
            felicidad: this.felicidad,
            turno: this.turno,
            fecha: this.fecha
        };
    }
}