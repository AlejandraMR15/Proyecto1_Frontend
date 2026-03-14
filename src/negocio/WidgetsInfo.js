/**
 * CIUDAD VIRTUAL — widgetsInfo.js
 *
 * Gestiona los widgets flotantes de Clima y Noticias:
 *  - Botón clima: muestra temperatura + ícono; al hacer click abre un info-box
 *    con los datos completos del clima (similar a la info-box de construcciones).
 *  - Botón noticias: abre/cierra el panel lateral de noticias (similar al
 *    panel de construcción, pero anclado a la derecha).
 *
 * Depende de:
 *  - ApiClima   → src/acceso_datos/API/ApiClima.js
 *  - ApiNoticias → src/acceso_datos/API/ApiNoticias.js
 *  - DOM insertado en index.html (widgets-container, clima-infobox, noticias-panel)
 */
 
import ApiClima    from '../acceso_datos/API/ApiClima.js';
import ApiNoticias from '../acceso_datos/API/ApiNoticias.js';
 
/* ================================================================
   CONSTANTES
================================================================ */
 
/** Ciudad por defecto para la consulta del clima */
const CIUDAD_CLIMA = 'Manizales';
 
/** País por defecto para la consulta de noticias */
const PAIS_NOTICIAS = 'co';
 
/**
 * Mapa de condición climática (descripción en inglés de OpenWeather)
 * a emoji representativo. Se hace match parcial (includes).
 */
const ICONOS_CLIMA = [
  { clave: 'thunderstorm',  icono: '⛈️' },
  { clave: 'drizzle',       icono: '🌦️' },
  { clave: 'rain',          icono: '🌧️' },
  { clave: 'snow',          icono: '❄️' },
  { clave: 'mist',          icono: '🌫️' },
  { clave: 'fog',           icono: '🌫️' },
  { clave: 'haze',          icono: '🌫️' },
  { clave: 'smoke',         icono: '🌫️' },
  { clave: 'dust',          icono: '🌫️' },
  { clave: 'sand',          icono: '🌫️' },
  { clave: 'ash',           icono: '🌫️' },
  { clave: 'squall',        icono: '💨' },
  { clave: 'tornado',       icono: '🌪️' },
  { clave: 'clear',         icono: '☀️' },
  { clave: 'few clouds',    icono: '🌤️' },
  { clave: 'scattered',     icono: '⛅' },
  { clave: 'broken',        icono: '🌥️' },
  { clave: 'overcast',      icono: '☁️' },
  { clave: 'clouds',        icono: '☁️' },
];
 
/* ================================================================
   UTILIDADES
================================================================ */
 
/**
 * Devuelve el emoji que mejor describe la condición climática dada.
 * @param {string} condicion - descripción del clima (ej: "light rain")
 * @returns {string} emoji
 */
function obtenerIconoClima(condicion = '') {
  const lower = condicion.toLowerCase();
  const entrada = ICONOS_CLIMA.find(({ clave }) => lower.includes(clave));
  return entrada ? entrada.icono : '🌡️';
}
 
/**
 * Capitaliza la primera letra de un texto.
 * @param {string} texto
 * @returns {string}
 */
function capitalizar(texto = '') {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
 
/* ================================================================
   MÓDULO CLIMA
================================================================ */
 
const clima = (function () {
 
  /** Instancia de la API */
  let api = null;
 
  /** Datos más recientes del clima */
  let datosActuales = null;
 
  /* ---- Referencias al DOM ---- */
  let btnEl        = null;
  let iconoEl      = null;
  let tempEl       = null;
  let infoboxEl    = null;
  let infoboxBody  = null;
 
  /* ---- Estado del info-box ---- */
  let abierto = false;
 
  /** Inicializa referencias y eventos */
  function init() {
    btnEl       = document.getElementById('widget-clima-btn');
    iconoEl     = document.getElementById('widget-clima-icono');
    tempEl      = document.getElementById('widget-clima-temp');
    infoboxEl   = document.getElementById('clima-infobox');
    infoboxBody = document.getElementById('clima-infobox-body');
 
    if (!btnEl || !infoboxEl) return;
 
    btnEl.addEventListener('click', toggleInfobox);
 
    // Cargar datos iniciales
    cargarClima();
  }
 
  /** Alterna visibilidad del info-box */
  function toggleInfobox() {
    if (abierto) {
      cerrar();
    } else {
      abrir();
    }
  }
 
  /** Abre el info-box */
  function abrir() {
    abierto = true;
    infoboxEl.dataset.visible = 'true';
  }
 
  /** Cierra el info-box */
  function cerrar() {
    abierto = false;
    infoboxEl.dataset.visible = 'false';
  }
 
  /** Consulta la API y actualiza el botón y el info-box */
  async function cargarClima() {
    try {
      api = new ApiClima();
      datosActuales = await api.obtenerInformacion(CIUDAD_CLIMA);
      renderizarBoton(datosActuales);
      renderizarInfobox(datosActuales);
    } catch (err) {
      console.warn('[WidgetsInfo] Error al cargar clima:', err);
      renderizarError();
    }
  }
 
  /** Actualiza el ícono y la temperatura en el botón flotante */
  function renderizarBoton(datos) {
    if (!iconoEl || !tempEl) return;
    const icono = obtenerIconoClima(datos.condicionClimatica);
    const temp  = datos.temperatura !== null
      ? Math.round(datos.temperatura) + '°C'
      : '--°C';
 
    iconoEl.textContent = icono;
    tempEl.textContent  = temp;
  }
 
  /** Rellena el cuerpo del info-box con todas las filas de datos */
  function renderizarInfobox(datos) {
    if (!infoboxBody) return;
 
    const icono     = obtenerIconoClima(datos.condicionClimatica);
    const temp      = datos.temperatura !== null ? Math.round(datos.temperatura) + '°C' : '--';
    const condicion = capitalizar(datos.condicionClimatica) || '--';
    const humedad   = datos.humedad     !== null ? datos.humedad + '%'      : '--';
    const viento    = datos.velocidadViento !== null
      ? datos.velocidadViento.toFixed(1) + ' m/s'
      : '--';
 
    infoboxBody.innerHTML = `
      <div class="clima-fila">
        <span class="clima-fila-label">CIUDAD</span>
        <span class="clima-fila-valor">${CIUDAD_CLIMA.toUpperCase()}</span>
      </div>
      <div class="clima-fila">
        <span class="clima-fila-label">CONDICIÓN</span>
        <span class="clima-fila-valor">${icono} ${condicion}</span>
      </div>
      <div class="clima-fila">
        <span class="clima-fila-label">TEMPERATURA</span>
        <span class="clima-fila-valor destacado">${temp}</span>
      </div>
      <div class="clima-fila">
        <span class="clima-fila-label">HUMEDAD</span>
        <span class="clima-fila-valor">${humedad}</span>
      </div>
      <div class="clima-fila">
        <span class="clima-fila-label">VIENTO</span>
        <span class="clima-fila-valor">${viento}</span>
      </div>
    `;
  }
 
  /** Muestra un mensaje de error en el info-box y en el botón */
  function renderizarError() {
    if (tempEl)      tempEl.textContent  = '--°C';
    if (iconoEl)     iconoEl.textContent = '❓';
    if (infoboxBody) infoboxBody.innerHTML =
      '<div class="clima-loading">⚠ No se pudo cargar el clima.<br>Verifica la clave API.</div>';
  }
 
  return { init };
 
})();
 
/* ================================================================
   MÓDULO NOTICIAS
================================================================ */
 
const noticias = (function () {
 
  /** Instancia de la API */
  let api = null;
 
  /* ---- Referencias al DOM ---- */
  let btnEl     = null;
  let panelEl   = null;
  let bodyEl    = null;
 
  /* ---- Estado ---- */
  let abierto       = false;
  let cargado       = false;
 
  /** Inicializa referencias y eventos */
  function init() {
    btnEl    = document.getElementById('widget-noticias-btn');
    panelEl  = document.getElementById('noticias-panel');
    bodyEl   = document.getElementById('noticias-panel-body');
 
    if (!btnEl || !panelEl) return;
 
    btnEl.addEventListener('click', togglePanel);
 
    // ESC también cierra el panel de noticias
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && abierto) cerrar();
    });
  }
 
  /** Alterna visibilidad del panel lateral */
  function togglePanel() {
    if (abierto) {
      cerrar();
    } else {
      abrir();
    }
  }
 
  /** Abre el panel; carga noticias la primera vez */
  function abrir() {
    abierto = true;
    panelEl.dataset.open = 'true';
    const container = document.getElementById('widgets-container');
    if (container) container.classList.add('panel-noticias-abierto');
    if (!cargado) cargarNoticias();
  }
 
  /** Cierra el panel */
  function cerrar() {
    abierto = false;
    panelEl.dataset.open = 'false';
    const container = document.getElementById('widgets-container');
    if (container) container.classList.remove('panel-noticias-abierto');
  }
 
  /** Consulta la API y renderiza las tarjetas */
  async function cargarNoticias() {
    try {
      api = new ApiNoticias();
      const resultado = await api.obtenerInformacion(PAIS_NOTICIAS);
      cargado = true;
      renderizarNoticias(resultado.noticias);
    } catch (err) {
      console.warn('[WidgetsInfo] Error al cargar noticias:', err);
      renderizarError();
    }
  }
 
  /** Construye las tarjetas de noticias en el panel */
  function renderizarNoticias(lista = []) {
    if (!bodyEl) return;
 
    if (!lista.length) {
      bodyEl.innerHTML = '<div class="noticias-loading">Sin noticias disponibles.</div>';
      return;
    }
 
    bodyEl.innerHTML = lista.map(function (noticia) {
      const imgHtml = noticia.imagenUrl
        ? `<img class="noticia-img" src="${noticia.imagenUrl}" alt="" loading="lazy">`
        : '';
 
      const descHtml = noticia.descripcionBreve
        ? `<p class="noticia-desc">${noticia.descripcionBreve}</p>`
        : '';
 
      const href = noticia.enlaceNoticia || '#';
 
      return `
        <a class="noticia-item" href="${href}" target="_blank" rel="noopener noreferrer">
          ${imgHtml}
          <p class="noticia-titulo">${noticia.titulo}</p>
          ${descHtml}
          <span class="noticia-leer">▶ LEER MÁS</span>
        </a>
      `;
    }).join('');
  }
 
  /** Muestra un mensaje de error en el panel */
  function renderizarError() {
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="noticias-error">⚠ No se pudieron cargar<br>las noticias.<br><br>Verifica la clave API.</div>';
    }
  }
 
  return { init };
 
})();
 
/* ================================================================
   INIT GLOBAL
================================================================ */
document.addEventListener('DOMContentLoaded', function () {
  clima.init();
  noticias.init();
});