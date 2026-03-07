import RankingEntry from "../modelos/RankingEntry.js";

export default class Ranking {
    constructor() {
        this.entradas = [];
    }

    agregarEntrada(datosCiudad) {
        const nuevaEntrada = new RankingEntry(
            datosCiudad.nombreCiudad,
            datosCiudad.alcalde,
            datosCiudad.puntuacion,
            datosCiudad.poblacion,
            datosCiudad.felicidad,
            datosCiudad.turno
        );

        this.entradas.push(nuevaEntrada);
        this.ordenarPorPuntaje();
    }

    ordenarPorPuntaje() {
        this.entradas.sort((a, b) => b.puntuacion - a.puntuacion);
    }

    obtenerTop(n = 10) {
        return this.entradas.slice(0, n);
    }

    reiniciar() {
        this.entradas = [];
    }

    getEntradas() {
        return this.entradas.map(e => e.toJSON());
    }
}