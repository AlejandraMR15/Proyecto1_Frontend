/**
 * @param {string} etiqueta
 * @returns {boolean}
 */
export function esEdificio(etiqueta) {
    return !['g', 'r', 'P1'].includes(etiqueta);
}

/**
 * Construye SVG de la celda según tipo y dimensiones.
 * Los colores se aplican vía clase CSS iso-colors-{etiqueta}
 * @param {{ TW: number, TH: number, TD: number, etiqueta?: string }} cfg
 * @returns {SVGElement}
 */
export function crearSVGCelda(cfg) {
    const { TW, TH, TD, etiqueta = 'g' } = cfg;
    const svg = esEdificio(etiqueta)
        ? crearSVGEdificio(TW, TH)
        : crearSVGPlano(TW, TH, TD);
    svg.classList.add(`iso-colors-${etiqueta}`);
    return svg;
}

function crearSVGPlano(TW, TH, TD) {
    const W = TW;
    const H = TH;
    const D = TD;

    const A2 = [W / 2, D];
    const E = [0, H / 2 + D];
    const F = [W / 2, H + D];
    const G = [W, H / 2 + D];

    const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H + D);
    svg.setAttribute('viewBox', `0 0 ${W} ${H + D}`);
    svg.classList.add('iso-cube-svg');

    const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    p.setAttribute('points', pts([A2, G, F, E]));
    p.setAttribute('fill-opacity', '1');
    p.setAttribute('stroke-width', '0.6');
    p.setAttribute('stroke-opacity', '0.5');
    p.setAttribute('stroke-linejoin', 'round');
    p.classList.add('poly-bottom');
    svg.appendChild(p);

    return svg;
}

function crearSVGEdificio(TW, TH) {
    const W = TW;
    const H = TH;
    const EH = TH / 2;

    const At = [W / 2, 0];
    const Bt = [W, H / 2];
    const Ct = [W / 2, H];
    const Dt = [0, H / 2];
    const Bb = [W, H / 2 + EH];
    const Cb = [W / 2, H + EH];
    const Db = [0, H / 2 + EH];

    const pts = (arr) => arr.map((p) => p.join(',')).join(' ');

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', W);
    svg.setAttribute('height', H + EH);
    svg.setAttribute('viewBox', `0 0 ${W} ${H + EH}`);
    svg.classList.add('iso-cube-svg');

    const mkPoly = (points, cls) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        p.setAttribute('points', pts(points));
        p.setAttribute('stroke-width', '1');
        p.setAttribute('stroke-linejoin', 'round');
        p.classList.add(cls);
        return p;
    };

    svg.appendChild(mkPoly([Dt, Ct, Cb, Db], 'poly-left'));
    svg.appendChild(mkPoly([Ct, Bt, Bb, Cb], 'poly-right'));
    svg.appendChild(mkPoly([At, Bt, Ct, Dt], 'poly-top'));

    return svg;
}
