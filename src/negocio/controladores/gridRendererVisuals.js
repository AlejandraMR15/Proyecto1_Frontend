const PALETAS = {
    g: { top: '#7ecfe6', left: '#4baec8', right: '#2d8aaa' },
    r: { top: '#909090', left: '#686868', right: '#484848' },
    P1: { top: '#2e8b2e', left: '#1e6b1e', right: '#104e10' },
    R1: { top: '#f5e6c8', left: '#d4be98', right: '#b09870' },
    R2: { top: '#c8956a', left: '#a87040', right: '#845020' },
    C1: { top: '#f4a0b8', left: '#d87090', right: '#b84870' },
    C2: { top: '#ff8c00', left: '#cc6a00', right: '#994800' },
    I1: { top: '#505050', left: '#383838', right: '#202020' },
    I2: { top: '#8b5e3c', left: '#6b4020', right: '#4a2808' },
    S1: { top: '#1a3a7a', left: '#102860', right: '#081840' },
    S2: { top: '#e02020', left: '#b00808', right: '#800000' },
    S3: { top: '#f0f0f0', left: '#d0d0d0', right: '#b0b0b0' },
    U1: { top: '#f5e020', left: '#c8b000', right: '#9a8000' },
    U2: { top: '#40a8e0', left: '#2080c0', right: '#0858a0' },
};

/**
 * @param {string} etiqueta
 * @returns {{ top: string, left: string, right: string }}
 */
export function coloresPorEtiqueta(etiqueta) {
    return PALETAS[etiqueta] ?? PALETAS.g;
}

/**
 * @param {string} etiqueta
 * @returns {boolean}
 */
export function esEdificio(etiqueta) {
    return !['g', 'r', 'P1'].includes(etiqueta);
}

/**
 * Construye SVG de la celda segun tipo y dimensiones.
 * @param {{ TW: number, TH: number, TD: number, colorTop: string, colorLeft: string, colorRight: string, etiqueta?: string }} cfg
 * @returns {SVGElement}
 */
export function crearSVGCelda(cfg) {
    const { TW, TH, TD, colorTop, colorLeft, colorRight, etiqueta = 'g' } = cfg;
    return esEdificio(etiqueta)
        ? crearSVGEdificio(TW, TH, colorTop, colorLeft, colorRight)
        : crearSVGPlano(TW, TH, TD, colorTop);
}

function crearSVGPlano(TW, TH, TD, colorTop) {
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

    const esTerreno = colorTop === '#7ecfe6';
    const colorBottom = esTerreno ? '#6bbf3e' : colorTop;
    const strokeB = esTerreno ? '#4a8c22' : darken(colorTop);

    const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    p.setAttribute('points', pts([A2, G, F, E]));
    p.setAttribute('fill', colorBottom);
    p.setAttribute('fill-opacity', '1');
    p.setAttribute('stroke', strokeB);
    p.setAttribute('stroke-width', '0.6');
    p.setAttribute('stroke-opacity', '0.5');
    p.setAttribute('stroke-linejoin', 'round');
    p.classList.add('poly-bottom');
    svg.appendChild(p);

    return svg;
}

function crearSVGEdificio(TW, TH, colorTop, colorLeft, colorRight) {
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

    const stroke = darken(colorRight);

    const mkPoly = (points, fill, cls) => {
        const p = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        p.setAttribute('points', pts(points));
        p.setAttribute('fill', fill);
        p.setAttribute('stroke', stroke);
        p.setAttribute('stroke-width', '1');
        p.setAttribute('stroke-linejoin', 'round');
        p.classList.add(cls);
        return p;
    };

    svg.appendChild(mkPoly([Dt, Ct, Cb, Db], colorLeft, 'poly-left'));
    svg.appendChild(mkPoly([Ct, Bt, Bb, Cb], colorRight, 'poly-right'));
    svg.appendChild(mkPoly([At, Bt, Ct, Dt], colorTop, 'poly-top'));

    return svg;
}

function darken(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const factor = 0.55;
    const rr = Math.round(r * factor).toString(16).padStart(2, '0');
    const gg = Math.round(g * factor).toString(16).padStart(2, '0');
    const bb = Math.round(b * factor).toString(16).padStart(2, '0');
    return `#${rr}${gg}${bb}`;
}
