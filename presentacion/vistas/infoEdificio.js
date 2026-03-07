// Etiquetas en español para cada clave retornada por getInformacion()
const ETIQUETAS = {
    id:                          'ID',
    nombre:                      'Nombre',
    costo:                       'Costo de construcción',
    costoMantenimiento:          'Costo de mantenimiento',
    consumoElectricidad:         'Consumo electricidad (base)',
    consumoAgua:                 'Consumo agua (base)',
    consumoActualElectricidad:   'Consumo electricidad (actual)',
    consumoActualAgua:           'Consumo agua (actual)',
    esActivo:                    'Activo',
    capacidad:                   'Capacidad',
    ocupacion:                   'Ocupación actual',
    tieneCapacidadDisponible:    'Tiene espacio disponible',
    empleo:                      'Puestos de trabajo',
    empleadosActuales:           'Empleados actuales',
    ingresoPorTurno:             'Ingreso por turno',
    tipoDeProduccion:            'Tipo de producción',
    produccionPorTurno:          'Producción por turno',
    montonDeProduccion:          'Producción por turno',
    tipoDeUtilidad:              'Tipo de utilidad',
    tipoDeServicio:              'Tipo de servicio',
    felicidadAportada:           'Felicidad aportada',
    radio:                       'Radio de influencia',
    costo_construccion:          'Costo',
    felicidad:                   'Felicidad'
};

/**
 * Recibe cualquier objeto de edificio (Residencial, Comercial, Industrial, etc.),
 * llama a su getInformacion() y muestra los datos en el panel #info-edificio.
 * Si el panel no existe en el DOM, lo crea automáticamente.
 *
 * @param {object} edificio - Instancia de cualquier clase que extienda Edificio o Construccion
 */
function mostrarInfoEdificio(edificio) {
    const info = edificio.getInformacion?.() ?? { nombre: edificio.nombre ?? 'Sin nombre', costo: edificio.costo };

    let panel = document.getElementById('info-edificio');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'info-edificio';
        document.body.appendChild(panel);
    }

    const filas = Object.entries(info)
        .map(([clave, valor]) => {
            const etiqueta = ETIQUETAS[clave] ?? clave;
            const valorFormateado = formatearValor(clave, valor);
            return `<tr><td class="info-clave">${etiqueta}</td><td class="info-valor">${valorFormateado}</td></tr>`;
        })
        .join('');

    panel.innerHTML = `
        <h3 class="info-titulo">${info.nombre ?? 'Edificio'}</h3>
        <table class="info-tabla">
            <tbody>${filas}</tbody>
        </table>
    `;
}

/**
 * Formatea el valor según su tipo para mostrarlo de forma legible.
 */
function formatearValor(clave, valor) {
    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'number') {
        // Valores monetarios
        if (['costo', 'costoMantenimiento', 'ingresoPorTurno', 'montonDeProduccion'].includes(clave)) {
            return `$${valor.toLocaleString()}`;
        }
        return valor.toLocaleString();
    }
    if (valor === null || valor === undefined) return '—';
    return valor;
}
