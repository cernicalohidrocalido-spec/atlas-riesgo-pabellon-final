import { 
  Droplets, 
  Mountain, 
  Factory, 
  Target, 
  AlertTriangle, 
  ShieldCheck,
  Waves,
  Flame,
  Wind,
  Zap,
  Phone,
  Hospital,
  Home,
  MapPin,
  Car,
  ShoppingBag,
  Map as MapIcon
} from 'lucide-react';

export interface LayerDef {
  id: string;
  name: string;
  category: 'hidro' | 'geo' | 'antro' | 'expo' | 'vuln' | 'resp';
  icon: any;
  description: string;
  color: string;
  type: 'wms' | 'geojson' | 'local';
  archivo?: string;
  wmsUrl?: string;
  wmsLayers?: string[];
  weight: number; // Importance in the risk formula (0-2)
  impactType: 'danger' | 'exposure' | 'vulnerability' | 'response';
  fillOpacity?: number;
  radius?: number;
}

export const CATEGORIES = [
  { id: 'hidro', name: 'Hidrometeorológicos', icon: Waves, color: 'text-blue-500' },
  { id: 'geo', name: 'Geológicos', icon: Mountain, color: 'text-amber-700' },
  { id: 'antro', name: 'Antrópicos', icon: Factory, color: 'text-slate-600' },
  { id: 'expo', name: 'Exposición', icon: Target, color: 'text-red-500' },
  { id: 'vuln', name: 'Vulnerabilidad', icon: AlertTriangle, color: 'text-orange-500' },
  { id: 'resp', name: 'Capacidad de Respuesta', icon: ShieldCheck, color: 'text-green-600' },
];

export const LAYERS: LayerDef[] = [
  // Base
  { 
    id: 'limite', 
    name: 'Límite municipal', 
    category: 'hidro', 
    icon: MapIcon, 
    description: 'Límite oficial del municipio', 
    color: '#1d4ed8', 
    type: 'geojson',
    archivo: 'capas/LimitePabellon.geojson',
    weight: 0,
    impactType: 'exposure'
  },
  // Hidrometeorológicos
  { 
    id: 'inegi-hid', 
    name: 'Red Hidrográfica (INEGI)', 
    category: 'hidro', 
    icon: Droplets, 
    description: 'Corrientes y cuerpos de agua oficiales', 
    color: '#0ea5e9', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:RH00_250_P'],
    weight: 1.2,
    impactType: 'danger'
  },
  { 
    id: 'conagua-inund', 
    name: 'Zonas de Inundación (CENAPRED)', 
    category: 'hidro', 
    icon: Waves, 
    description: 'Zonas históricas de inundación', 
    color: '#1d4ed8', 
    type: 'wms',
    wmsUrl: 'https://www.atlasnacionalderiesgos.gob.mx/geoserver/wms',
    wmsLayers: ['anr:Inundaciones_historicas'],
    weight: 1.8,
    impactType: 'danger'
  },
  { 
    id: 'conagua-acuiferos', 
    name: 'Acuíferos (CONAGUA)', 
    category: 'hidro', 
    icon: Droplets, 
    description: 'Disponibilidad de agua subterránea', 
    color: '#0891b2', 
    type: 'wms',
    wmsUrl: 'https://sigagis.conagua.gob.mx/geoserver/wms',
    wmsLayers: ['conagua:Acuiferos'],
    weight: 1.0,
    impactType: 'danger'
  },
  { 
    id: 'cuerpos-agua', 
    name: 'Presas y Bordos', 
    category: 'hidro', 
    icon: Droplets, 
    description: 'Infraestructura hidráulica municipal', 
    color: '#0369a1', 
    type: 'geojson',
    archivo: 'capas/Cuerpo_agua_lite.geojson',
    weight: 1.4,
    impactType: 'danger'
  },

  // Geológicos
  { 
    id: 'fallas', 
    name: 'Fallas y Fracturas 2024', 
    category: 'geo', 
    icon: AlertTriangle, 
    description: 'Levantamiento geológico municipal', 
    color: '#b91c1c', 
    type: 'geojson',
    archivo: 'capas/fallas_2024_lite.geojson',
    weight: 2.0,
    impactType: 'danger'
  },
  { 
    id: 'inegi-geo', 
    name: 'Geología (INEGI)', 
    category: 'geo', 
    icon: Mountain, 
    description: 'Unidades geológicas y litología', 
    color: '#78350f', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:geologia'],
    weight: 1.0,
    impactType: 'danger'
  },
  { 
    id: 'inegi-topo', 
    name: 'Relieve (Curvas de Nivel)', 
    category: 'geo', 
    icon: Mountain, 
    description: 'Topografía digital INEGI', 
    color: '#d97706', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:curvas_nivel'],
    weight: 0.8,
    impactType: 'danger'
  },
  { 
    id: 'cenapred-sismos', 
    name: 'Peligro Sísmico (CENAPRED)', 
    category: 'geo', 
    icon: AlertTriangle, 
    description: 'Regionalización sísmica nacional', 
    color: '#991b1b', 
    type: 'wms',
    wmsUrl: 'https://www.atlasnacionalderiesgos.gob.mx/geoserver/wms',
    wmsLayers: ['anr:Sismicidad'],
    weight: 1.5,
    impactType: 'danger'
  },

  // Antrópicos
  { 
    id: 'gasoducto', 
    name: 'Gasoducto de Alta Presión', 
    category: 'antro', 
    icon: Zap, 
    description: 'Infraestructura energética crítica', 
    color: '#f59e0b', 
    type: 'geojson',
    archivo: 'capas/Gasoducto.geojson',
    weight: 1.7,
    impactType: 'danger'
  },
  { 
    id: 'inegi-vias', 
    name: 'Red Ferroviaria', 
    category: 'antro', 
    icon: Car, 
    description: 'Transporte de materiales peligrosos', 
    color: '#475569', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:red_ferroviaria'],
    weight: 1.3,
    impactType: 'danger'
  },

  // Exposición
  { 
    id: 'inegi-manzanas', 
    name: 'Traza Urbana (Manzanas)', 
    category: 'expo', 
    icon: Home, 
    description: 'Áreas habitacionales consolidadas', 
    color: '#94a3b8', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:m_manzana'],
    weight: 1.0,
    impactType: 'exposure'
  },
  { 
    id: 'denue-riesgo', 
    name: 'Establecimientos de Riesgo', 
    category: 'expo', 
    icon: Factory, 
    description: 'Gasolineras y plantas industriales', 
    color: '#ef4444', 
    type: 'local',
    weight: 1.5,
    impactType: 'exposure'
  },

  // Vulnerabilidad
  { 
    id: 'inegi-pob', 
    name: 'Densidad de Población', 
    category: 'vuln', 
    icon: Home, 
    description: 'Censo de Población y Vivienda', 
    color: '#8b5cf6', 
    type: 'wms',
    wmsUrl: 'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers: ['Sitio_Inegi:poblacion_total'],
    weight: 1.4,
    impactType: 'vulnerability'
  },

  // Capacidad de Respuesta
  { 
    id: 'hosp', 
    name: 'Hospitales y clínicas', 
    category: 'resp', 
    icon: Hospital, 
    description: 'Unidades médicas ISEA/IMSS', 
    color: '#dc2626', 
    type: 'local',
    weight: 1.5,
    impactType: 'response'
  },
  { 
    id: 'ref', 
    name: 'Refugios temporales', 
    category: 'resp', 
    icon: Home, 
    description: 'Puntos de evacuación activos', 
    color: '#16a34a', 
    type: 'local',
    weight: 1.8,
    impactType: 'response'
  },
  { 
    id: 'pozo', 
    name: 'Pozos de agua', 
    category: 'resp', 
    icon: Droplets, 
    description: 'Abasto de emergencia CAPAMA', 
    color: '#0ea5e9', 
    type: 'local',
    weight: 1.0,
    impactType: 'response'
  },
];
