/**
 * CIUDAD VIRTUAL — ImportadorCiudad.js
 *
 * Acceso a datos para importar una ciudad/partida desde JSON.
 * Soporta:
 *  - Formato exportado de ciudad (cityName, map, buildings, etc.)
 *  - Formato interno de partida (ciudad, numeroTurno, ciudadanos, etc.)
 */

/**
 * Lee un archivo y devuelve su contenido JSON normalizado al formato interno de partida.
 * @param {File} archivo
 * @returns {Promise<object>}
 */
export async function leerPartidaDesdeArchivoJSON(archivo) {
    if (!archivo) {
        throw new Error('No se selecciono ningun archivo.');
    }

    const texto = await leerArchivoComoTexto(archivo);
    let datos;

    try {
        datos = JSON.parse(texto);
    } catch {
        throw new Error('El archivo no contiene un JSON valido.');
    }

    return transformarJSONAPartida(datos);
}

/**
 * Lee un archivo local como texto UTF-8.
 * @param {File} archivo
 * @returns {Promise<string>}
 */
function leerArchivoComoTexto(archivo) {
    return archivo
        .text()
        .catch(() => {
            throw new Error('No se pudo leer el archivo JSON.');
        });
}

/**
 * Normaliza un JSON importado al formato interno de "partida".
 * @param {object} datos
 * @returns {object}
 */
export function transformarJSONAPartida(datos) {
    const yaEsPartidaInterna = datos && typeof datos === 'object' && datos.ciudad && datos.ciudad.mapa;
    if (yaEsPartidaInterna) {
        return {
            ciudad: datos.ciudad,
            numeroTurno: Number(datos.numeroTurno) || 0,
            ciudadanos: Array.isArray(datos.ciudadanos) ? datos.ciudadanos : [],
            recoleccion: datos.recoleccion ?? null,
        };
    }

    const esFormatoExportado = datos && typeof datos === 'object' && datos.cityName && datos.map;
    if (!esFormatoExportado) {
        throw new Error('El archivo no parece un JSON de ciudad valido.');
    }

    return {
        ciudad: {
            nombre: datos.cityName,
            alcalde: datos.mayor,
            recursos: datos.resources || {},
            construcciones: datos.buildings || [],
            mapa: datos.map,
            coordenadas: datos.coordinates || null,
        },
        numeroTurno: Number(datos.turn) || 0,
        ciudadanos: Array.isArray(datos.citizens) ? datos.citizens : [],
        recoleccion: null,
    };
}
