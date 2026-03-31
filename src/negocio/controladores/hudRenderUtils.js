/**
 * Utilidades de render para el HUD.
 */

/**
 * Formatea un numero con separadores de miles.
 * @param {number} n
 * @returns {string}
 */
export function fmt(n) {
    if (n === undefined || n === null) return '0';
    return Math.round(n).toLocaleString('es-CO');
}

/**
 * Aplica texto y clases visuales de recurso segun su valor.
 * @param {string} contenedorId
 * @param {HTMLElement|null} el
 * @param {string} texto
 */
export function actualizarRecursoVisual(contenedorId, el, texto) {
    if (!el) return;
    el.textContent = texto;

    const contenedor = document.getElementById(contenedorId);
    if (!contenedor) return;

    const num = parseFloat(texto.replace(/[^0-9\-]/g, ''));
    contenedor.classList.toggle('negativo', num < 0);

    if (contenedorId === 'hud-dinero') {
        el.classList.remove('dinero-verde', 'dinero-amarillo', 'dinero-rojo');
        if (num >= 10000) el.classList.add('dinero-verde');
        else if (num < 5000) el.classList.add('dinero-amarillo');
        if (num < 1000) el.classList.add('dinero-rojo');
    }
}

/**
 * Renderiza el desglose de puntuacion en el panel.
 * @param {object} d
 * @param {{
 *  elDsgPoblacion: HTMLElement|null,
 *  elDsgFelicidad: HTMLElement|null,
 *  elDsgDinero: HTMLElement|null,
 *  elDsgEdificios: HTMLElement|null,
 *  elDsgElectricidad: HTMLElement|null,
 *  elDsgAgua: HTMLElement|null,
 *  elDsgSubtotal: HTMLElement|null,
 *  elDsgTotalBonif: HTMLElement|null,
 *  elDsgTotalPenal: HTMLElement|null,
 *  elDsgBonifLista: HTMLElement|null,
 *  elDsgPenalLista: HTMLElement|null,
 *  elDsgTotal: HTMLElement|null
 * }} refs
 */
export function actualizarDesgloseDOM(d, refs) {
    if (!refs.elDsgTotal) return;

    const fmtPts = (n) => (n >= 0 ? '+' : '') + Math.round(n).toLocaleString('es-CO');

    if (refs.elDsgPoblacion) refs.elDsgPoblacion.textContent = fmtPts(d.puntosPoblacion);
    if (refs.elDsgFelicidad) refs.elDsgFelicidad.textContent = fmtPts(d.puntosFelicidad);
    if (refs.elDsgDinero) refs.elDsgDinero.textContent = fmtPts(d.puntosDinero);
    if (refs.elDsgEdificios) refs.elDsgEdificios.textContent = fmtPts(d.puntosEdificios);
    if (refs.elDsgElectricidad) refs.elDsgElectricidad.textContent = fmtPts(d.puntosElectricidad);
    if (refs.elDsgAgua) refs.elDsgAgua.textContent = fmtPts(d.puntosAgua);
    if (refs.elDsgSubtotal) refs.elDsgSubtotal.textContent = fmtPts(d.subtotal);

    if (refs.elDsgTotalBonif) refs.elDsgTotalBonif.textContent = '+' + d.totalBonificaciones.toLocaleString('es-CO');
    if (refs.elDsgTotalPenal) refs.elDsgTotalPenal.textContent = '-' + d.totalPenalizaciones.toLocaleString('es-CO');

    if (refs.elDsgBonifLista) {
        const bonifs = [];
        if (d.bonificaciones.empleadosTodos > 0) bonifs.push('✓ +500 Todos empleados');
        if (d.bonificaciones.felicidadAlta > 0) bonifs.push('✓ +300 Felicidad > 80');
        if (d.bonificaciones.recursosPositivos > 0) bonifs.push('✓ +200 Recursos positivos');
        if (d.bonificaciones.poblacionGrande > 0) bonifs.push('✓ +1000 Más de 1.000 hab.');
        refs.elDsgBonifLista.innerHTML = bonifs.length
            ? bonifs.map((t) => `<div class="desglose-item-bonif">${t}</div>`).join('')
            : '<div class="desglose-sin-items">Sin bonificaciones</div>';
    }

    if (refs.elDsgPenalLista) {
        const penals = [];
        if (d.penalizaciones.dineroNegativo > 0) penals.push('✗ -500 Dinero negativo');
        if (d.penalizaciones.electricidadNegativa > 0) penals.push('✗ -300 Sin electricidad');
        if (d.penalizaciones.aguaNegativa > 0) penals.push('✗ -300 Sin agua');
        if (d.penalizaciones.felicidadBaja > 0) penals.push('✗ -400 Felicidad < 40');
        if (d.penalizaciones.desempleados > 0) penals.push(`✗ -${d.penalizaciones.desempleados} Desempleados`);
        refs.elDsgPenalLista.innerHTML = penals.length
            ? penals.map((t) => `<div class="desglose-item-penal">${t}</div>`).join('')
            : '<div class="desglose-sin-items">Sin penalizaciones</div>';
    }

    refs.elDsgTotal.textContent = d.puntuacionFinal.toLocaleString('es-CO');
}

/**
 * Actualiza tooltips de recursos usando window.estadisticasRecursos.
 */
export function actualizarTooltipsRecursosDOM() {
    if (!window.estadisticasRecursos) {
        window.estadisticasRecursos = {
            produccion: { dinero: 0, electricidad: 0, agua: 0, comida: 0 },
            consumo: { dinero: 0, electricidad: 0, agua: 0, comida: 0 },
            actual: { dinero: 0, electricidad: 0, agua: 0, comida: 0 },
        };
    }

    const stats = window.estadisticasRecursos;
    const recursos = [
        ['tooltip-dinero', 'dinero', ''],
        ['tooltip-electricidad', 'electricidad', ' u'],
        ['tooltip-agua', 'agua', ' u'],
    ];

    recursos.forEach(([tooltipId, tipo, sufijo]) => {
        const tooltip = document.getElementById(tooltipId);
        if (!tooltip) return;

        let produccion = stats.produccion[tipo] || 0;
        let consumo = stats.consumo[tipo] || 0;
        if (tipo === 'agua') {
            produccion = Math.round(produccion * 100) / 100;
            consumo = Math.round(consumo * 100) / 100;
        }

        const balance = produccion - consumo;
        const prodText = produccion > 0 ? `+${produccion}` : `${produccion}`;
        const consText = consumo > 0 ? `-${consumo}` : `${consumo}`;
        const balText = balance > 0 ? `+${balance}` : `${balance}`;

        const prodSpan = tooltip.querySelector('.tooltip-prod');
        const consSpan = tooltip.querySelector('.tooltip-cons');
        const balSpan = tooltip.querySelector('.tooltip-balance-val');

        if (prodSpan) prodSpan.textContent = prodText + sufijo;
        if (consSpan) consSpan.textContent = consText + sufijo;
        if (balSpan) {
            balSpan.textContent = balText + sufijo;
            balSpan.classList.remove('tooltip-balance-pos', 'tooltip-balance-neg', 'tooltip-balance-neu');
            if (balance > 0) balSpan.classList.add('tooltip-balance-pos');
            else if (balance < 0) balSpan.classList.add('tooltip-balance-neg');
            else balSpan.classList.add('tooltip-balance-neu');
        }
    });
}
