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
 
import ApiClima from '../../acceso_datos/API/ApiClima.js';
import ApiNoticias from '../../acceso_datos/API/ApiNoticias.js';
import StorageManager from '../../acceso_datos/StorageManager.js';
 
/* ================================================================
   CONSTANTES
================================================================ */
 
/** Claves de localStorage usadas por menú y juego */
const CLAVE_PARTIDA = 'partida';
const CLAVE_CONFIG_NUEVA = 'config-nueva-partida';
const storageManager = new StorageManager();
 
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

/**
 * Traduce descripciones de clima (OpenWeather) de inglés a español.
 * @param {string} condicion
 * @returns {string}
 */
function traducirCondicionClimatica(condicion = '') {
  const lower = condicion.toLowerCase().trim();
  if (!lower) return '';

  const traduccionesExactas = {
    'clear sky': 'cielo despejado',
    'few clouds': 'pocas nubes',
    'scattered clouds': 'nubes dispersas',
    'broken clouds': 'nubes fragmentadas',
    'overcast clouds': 'cielo nublado',
    'light rain': 'lluvia ligera',
    'moderate rain': 'lluvia moderada',
    'heavy intensity rain': 'lluvia intensa',
    'very heavy rain': 'lluvia muy intensa',
    'extreme rain': 'lluvia extrema',
    'light snow': 'nieve ligera',
    'heavy snow': 'nieve intensa',
    'mist': 'neblina',
    'fog': 'niebla',
    'haze': 'calina',
    'smoke': 'humo',
    'dust': 'polvo',
    'sand': 'arena',
    'ash': 'ceniza volcanica',
    'squall': 'turbonada',
    'tornado': 'tornado'
  };

  if (traduccionesExactas[lower]) {
    return traduccionesExactas[lower];
  }

  const traduccionesPorClave = [
    { clave: 'thunderstorm', texto: 'tormenta electrica' },
    { clave: 'drizzle', texto: 'llovizna' },
    { clave: 'rain', texto: 'lluvia' },
    { clave: 'snow', texto: 'nieve' },
    { clave: 'mist', texto: 'neblina' },
    { clave: 'fog', texto: 'niebla' },
    { clave: 'haze', texto: 'calina' },
    { clave: 'smoke', texto: 'humo' },
    { clave: 'dust', texto: 'polvo' },
    { clave: 'sand', texto: 'arena' },
    { clave: 'ash', texto: 'ceniza volcanica' },
    { clave: 'squall', texto: 'turbonada' },
    { clave: 'tornado', texto: 'tornado' },
    { clave: 'clear', texto: 'despejado' },
    { clave: 'cloud', texto: 'nublado' }
  ];

  const entrada = traduccionesPorClave.find(({ clave }) => lower.includes(clave));
  return entrada ? entrada.texto : condicion;
}

/**
 * Lee una clave JSON de localStorage de forma segura.
 * @param {string} clave
 * @returns {object|null}
 */
function leerJSONLocalStorage(clave) {
  try {
    return storageManager.cargar(clave);
  } catch {
    return null;
  }
}

/**
 * Devuelve la ciudad geográfica seleccionada por el jugador.
 * Prioriza partida guardada y usa config nueva como respaldo.
 * @returns {string|null}
 */
function obtenerCiudadClimaSeleccionada() {
  const partida = leerJSONLocalStorage(CLAVE_PARTIDA);
  const ciudadPartida = partida?.ciudad?.coordenadas?.nombre;
  if (typeof ciudadPartida === 'string' && ciudadPartida.trim()) {
    return ciudadPartida.trim();
  }

  const configNueva = leerJSONLocalStorage(CLAVE_CONFIG_NUEVA);
  const ciudadConfig = configNueva?.regionNombre;
  if (typeof ciudadConfig === 'string' && ciudadConfig.trim()) {
    return ciudadConfig.trim();
  }

  return null;
}
 
/* ================================================================
   MÓDULO CLIMA
================================================================ */
 
const clima = (function () {
 
  /** Instancia de la API */
  let api = null;
 
  /** Datos más recientes del clima */
  let datosActuales = null;

  /** Ciudad usada en la última consulta */
  let ciudadConsulta = null;
 
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
 
    // Actualizar clima cada 30 minutos (1800000ms = 30*60*1000)
    setInterval(() => {
      cargarClima();
      console.log('[WidgetsInfo] Clima actualizado automáticamente');
    }, 1800000);
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
      ciudadConsulta = obtenerCiudadClimaSeleccionada();
      if (!ciudadConsulta) {
        throw new Error('No hay ciudad geográfica seleccionada para consultar el clima.');
      }

      api = new ApiClima();
      datosActuales = await api.obtenerInformacion(ciudadConsulta);
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
    const condicion = capitalizar(traducirCondicionClimatica(datos.condicionClimatica)) || '--';
    const humedad   = datos.humedad     !== null ? datos.humedad + '%'      : '--';
    const viento    = datos.velocidadViento !== null
      ? datos.velocidadViento.toFixed(1) + ' m/s'
      : '--';

    infoboxBody.innerHTML = '';

    const template = document.getElementById('template-clima-fila');
    if (!template) return;

    // Crear fila: CIUDAD
    const fila1 = template.content.cloneNode(true);
    fila1.querySelector('.clima-fila-label').textContent = 'CIUDAD';
    fila1.querySelector('.clima-fila-valor').textContent = (ciudadConsulta || '--').toUpperCase();
    infoboxBody.appendChild(fila1);

    // Crear fila: CONDICIÓN
    const fila2 = template.content.cloneNode(true);
    fila2.querySelector('.clima-fila-label').textContent = 'CONDICIÓN';
    fila2.querySelector('.clima-fila-valor').textContent = icono + ' ' + condicion;
    infoboxBody.appendChild(fila2);

    // Crear fila: TEMPERATURA
    const fila3 = template.content.cloneNode(true);
    fila3.querySelector('.clima-fila-label').textContent = 'TEMPERATURA';
    const valorTemp = fila3.querySelector('.clima-fila-valor');
    valorTemp.textContent = temp;
    valorTemp.classList.add('destacado');
    infoboxBody.appendChild(fila3);

    // Crear fila: HUMEDAD
    const fila4 = template.content.cloneNode(true);
    fila4.querySelector('.clima-fila-label').textContent = 'HUMEDAD';
    fila4.querySelector('.clima-fila-valor').textContent = humedad;
    infoboxBody.appendChild(fila4);

    // Crear fila: VIENTO
    const fila5 = template.content.cloneNode(true);
    fila5.querySelector('.clima-fila-label').textContent = 'VIENTO';
    fila5.querySelector('.clima-fila-valor').textContent = viento;
    infoboxBody.appendChild(fila5);
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
 
    // Actualizar noticias cada 2 horas (7200000ms = 2*60*60*1000)
    setInterval(() => {
      cargarNoticias();
      console.log('[WidgetsInfo] Noticias actualizadas automáticamente');
    }, 7200000);
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
    document.body.classList.add('panel-noticias-abierto');
    const container = document.getElementById('widgets-container');
    const climaInfobox = document.getElementById('clima-infobox');
    if (container) container.classList.add('panel-noticias-abierto');
    if (climaInfobox) climaInfobox.classList.add('panel-noticias-abierto');
    if (!cargado) cargarNoticias();
  }
 
  /** Cierra el panel */
  function cerrar() {
    abierto = false;
    panelEl.dataset.open = 'false';
    document.body.classList.remove('panel-noticias-abierto');
    const container = document.getElementById('widgets-container');
    const climaInfobox = document.getElementById('clima-infobox');
    if (container) container.classList.remove('panel-noticias-abierto');
    if (climaInfobox) climaInfobox.classList.remove('panel-noticias-abierto');
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
 
    const template = document.getElementById('template-noticia-item');
    if (!template) return;

    bodyEl.innerHTML = '';

    lista.forEach(function (noticia) {
      const clone = template.content.cloneNode(true);
      const link = clone.querySelector('a');
      const titulo = clone.querySelector('.noticia-titulo');
      const desc = clone.querySelector('.noticia-desc');

      if (link) link.href = noticia.enlaceNoticia || '#';
      if (titulo) titulo.textContent = noticia.titulo;
      if (desc) {
        if (noticia.descripcionBreve) {
          desc.textContent = noticia.descripcionBreve;
          desc.style.display = 'block';
        }
      }

      // Si hay imagen, agregarla dinámicamente al inicio
      if (noticia.imagenUrl) {
        const img = document.createElement('img');
        img.className = 'noticia-img';
        img.src = noticia.imagenUrl;
        img.alt = '';
        img.loading = 'lazy';
        clone.querySelector('a').insertBefore(img, clone.querySelector('a').firstChild);
      }

      bodyEl.appendChild(clone);
    });
  }

  /** Muestra un mensaje de error en el panel */
  function renderizarError() {
    if (bodyEl) {
      bodyEl.innerHTML =
        '<div class="noticias-error">⚠ No se pudieron cargar<br>las noticias.<br><br>Intenta más tarde o verifica<br>tu conexión a internet.</div>';
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