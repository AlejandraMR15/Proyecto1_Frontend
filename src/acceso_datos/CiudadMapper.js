import Ciudad from '../modelos/ciudad.js';
import Residencial from '../modelos/construccion/tiposEdificios/residencial.js';
import Comercial from '../modelos/construccion/tiposEdificios/comercial.js';
import Industrial from '../modelos/construccion/tiposEdificios/industrial.js';
import PlantasDeUtilidad from '../modelos/construccion/tiposEdificios/plantasUtilidad.js';
import Servicio from '../modelos/construccion/tiposEdificios/servicio.js';
import Parques from '../modelos/construccion/parques.js';
import Vias from '../modelos/construccion/vias.js';

export default class CiudadMapper {
    static fromJSON(json) {
        const ciudad = new Ciudad(
            json.nombre,
            json.alcalde,
            json.mapa ? json.mapa.ancho : 15,
            json.mapa ? json.mapa.alto  : 15,
            json.coordenadas,
            50000, // dineroInicial - será sobrescrito abajo
            0, // electricidadInicial - será sobrescrito abajo
            0, // aguaInicial - será sobrescrito abajo
            0, // comidaInicial - será sobrescrito abajo
            json.ciudadId // Preservar el ciudadId original al cargar
        );

        // Restaurar recursos con sus valores reales (no crear nuevos por defecto)
        if (json.recursos) {
            ciudad.recursos.dinero       = json.recursos.dinero       ?? 50000;
            ciudad.recursos.electricidad = json.recursos.electricidad ?? 0;
            ciudad.recursos.agua         = json.recursos.agua         ?? 0;
            ciudad.recursos.comida       = json.recursos.comida       ?? 0;
        }

        // Restaurar la matriz del mapa si existe
        if (json.mapa && json.mapa.matriz) {
            ciudad.mapa.matriz = json.mapa.matriz;
        }

        // Reconstruir construcciones como instancias tipadas (factory)
        ciudad.construcciones = (json.construcciones || []).map(c => {
            const instancia = CiudadMapper._reconstruirConstruccion(c);
            if (instancia && c._coordX !== undefined && c._coordY !== undefined) {
                instancia._coordX = c._coordX;
                instancia._coordY = c._coordY;
            }
            return instancia;
        }).filter(Boolean);

        // Recuperar coordenadas desde la matriz del mapa para edificios que no las tienen.
        // Esto garantiza que funcionen las burbujas visuales incluso con partidas guardadas
        // antes del fix de coordenadas, o cuando toJSON no las incluyó por algún motivo.
        if (ciudad.mapa && Array.isArray(ciudad.mapa.matriz)) {
            // Etiquetas que corresponden a edificios (no vías ni terreno vacío ni parques)
            const ETIQUETAS_EDIFICIO = new Set(['R1','R2','C1','C2','I1','I2','S1','S2','S3','U1','U2','P1']);
            // Construir un mapa de etiqueta -> lista de construcciones sin coordenadas de ese tipo
            const sinCoords = {};
            for (const inst of ciudad.construcciones) {
                if (inst._coordX === undefined || inst._coordY === undefined) {
                    const tipo = inst.constructor.name;
                    if (!sinCoords[tipo]) sinCoords[tipo] = [];
                    sinCoords[tipo].push(inst);
                }
            }
            // Mapeo de etiqueta del mapa -> nombre de clase de construcción
            const etiquetaAClase = {
                'R1': 'Residencial', 'R2': 'Residencial',
                'C1': 'Comercial',   'C2': 'Comercial',
                'I1': 'Industrial',  'I2': 'Industrial',
                'S1': 'Servicio',    'S2': 'Servicio',    'S3': 'Servicio',
                'U1': 'PlantasDeUtilidad', 'U2': 'PlantasDeUtilidad',
                'P1': 'Parques'
            };
            // Recorrer la matriz fila por fila, columna por columna
            for (let row = 0; row < ciudad.mapa.alto; row++) {
                for (let col = 0; col < ciudad.mapa.ancho; col++) {
                    const etiqueta = ciudad.mapa.matriz[row]?.[col];
                    if (!etiqueta || !ETIQUETAS_EDIFICIO.has(etiqueta)) continue;
                    const clase = etiquetaAClase[etiqueta];
                    if (!clase || !sinCoords[clase] || sinCoords[clase].length === 0) continue;
                    // Asignar coordenadas al primer edificio de ese tipo sin coordenadas
                    const inst = sinCoords[clase].shift();
                    inst._coordX = col;
                    inst._coordY = row;
                }
            }
        }

        return ciudad;
    }

    static _reconstruirConstruccion(c) {
        if (!c || !c.tipo) return null;

        switch (c.tipo) {
            case 'Residencial':
                return new Residencial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.capacidad, []
                );
            case 'Comercial':
                return new Comercial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.empleo, [], c.ingresoPorTurno
                );
            case 'Industrial':
                return new Industrial(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.empleo, [], c.tipoDeProduccion, c.produccion
                );
            case 'PlantasDeUtilidad':
                return new PlantasDeUtilidad(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.tipoDeUtilidad, c.produccionPorTurno
                );
            case 'Servicio':
                return new Servicio(
                    c.costo, c.id, c.nombre, c.costoMantenimiento,
                    c.consumoElectricidad, c.consumoAgua, c.esActivo,
                    c.tipoDeServicio, c.felicidad, c.radio
                );
            case 'Parques':
                return new Parques(c.costo, c.felicidad, c.costoMantenimiento ?? 0);
            case 'Vias':
                return new Vias(c.costo, c.costoMantenimiento ?? 0);
            default:
                return null;
        }
    }
}
