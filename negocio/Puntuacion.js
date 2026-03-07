export default class Puntuacion {

    calcular(datosCiudad) {
        let puntaje = 0;

        puntaje += datosCiudad.poblacion * 10;
        puntaje += datosCiudad.felicidad * 5;
        puntaje += datosCiudad.dinero || 0;

        return this.aplicarBonificaciones(puntaje);
    }

    aplicarBonificaciones(puntaje) {
        if (puntaje > 10000) {
            puntaje *= 1.1;
        }
        return puntaje;
    }

    aplicarPenalizaciones(puntaje, penalizacion = 0) {
        return puntaje - penalizacion;
    }
}