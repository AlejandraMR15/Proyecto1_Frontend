const ETIQUETAS_NOMBRE = {
    g: 'Terreno vacío',
    r: 'Vía',
    P1: 'Parque',
    R1: 'Residencial Básico',
    R2: 'Residencial Avanzado',
    C1: 'Comercio Básico',
    C2: 'Comercio Avanzado',
    I1: 'Industrial Básico',
    I2: 'Industrial Avanzado',
    S1: 'Servicio Básico',
    S2: 'Servicio Medio',
    S3: 'Servicio Avanzado',
    U1: 'Planta de Utilidad Básica',
    U2: 'Planta de Utilidad Avanzada',
};

/**
 * Traduce una etiqueta de celda a nombre legible.
 * @param {string} etiqueta
 * @returns {string}
 */
export function nombreEtiquetaPorCodigo(etiqueta) {
    return ETIQUETAS_NOMBRE[etiqueta] ?? etiqueta;
}
