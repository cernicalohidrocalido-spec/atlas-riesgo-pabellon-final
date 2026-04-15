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
    name: 'Hidrografía INEGI', 
    category: 'hidro', 
    icon: Droplets, 
    description: 'Corrientes y cuerpos de agua', 
    color: '#0ea5e9', 
    type: 'wms',
    wmsLayers: ['Corrientes_de_agua', 'Cuerpos_de_agua', 'presas'],
    weight: 1.2,
    impactType: 'danger'
  },
  { 
    id: 'cuerpos-agua', 
    name: 'Cuerpos de agua', 
    category: 'hidro', 
    icon: Droplets, 
    description: 'Presas y bordos municipales', 
    color: '#0369a1', 
    type: 'geojson',
    archivo: 'capas/Cuerpo_agua_lite.geojson',
    weight: 1.4,
    impactType: 'danger'
  },
  { 
    id: 'inund', 
    name: 'Zonas inundables locales', 
    category: 'hidro', 
    icon: Waves, 
    description: 'CONAGUA / PC Municipal', 
    color: '#3b82f6', 
    type: 'local',
    weight: 1.8,
    impactType: 'danger'
  },

  // Geológicos
  { 
    id: 'fallas', 
    name: 'Grietas y fallas 2024', 
    category: 'geo', 
    icon: AlertTriangle, 
    description: 'Levantamiento propio 2024', 
    color: '#b91c1c', 
    type: 'geojson',
    archivo: 'capas/fallas_2024_lite.geojson',
    weight: 2.0,
    impactType: 'danger'
  },
  { 
    id: 'inegi-topo', 
    name: 'Curvas de nivel', 
    category: 'geo', 
    icon: Mountain, 
    description: 'Relieve oficial INEGI', 
    color: '#d97706', 
    type: 'wms',
    wmsLayers: ['curvas_nivel'],
    weight: 0.8,
    impactType: 'danger'
  },

  // Antrópicos
  { 
    id: 'gasoducto', 
    name: 'Gasoducto', 
    category: 'antro', 
    icon: Zap, 
    description: 'Infraestructura de gas natural', 
    color: '#f59e0b', 
    type: 'geojson',
    archivo: 'capas/Gasoducto.geojson',
    weight: 1.5,
    impactType: 'danger'
  },
  { 
    id: 'accidentes', 
    name: 'Accidentes de tránsito', 
    category: 'antro', 
    icon: Car, 
    description: 'Historial de puntos de conflicto', 
    color: '#f43f5e', 
    type: 'geojson',
    archivo: 'capas/accidentestransito.json',
    weight: 1.1,
    impactType: 'danger'
  },

  // Exposición
  { 
    id: 'predios-fallas', 
    name: 'Predios en zona de falla', 
    category: 'expo', 
    icon: Home, 
    description: 'Viviendas expuestas en área urbana', 
    color: '#dc2626', 
    type: 'geojson',
    archivo: 'capas/prediosfallas.json',
    weight: 1.6,
    impactType: 'exposure'
  },
  { 
    id: 'denue', 
    name: 'Directorio de negocios DENUE', 
    category: 'expo', 
    icon: ShoppingBag, 
    description: 'Establecimientos económicos', 
    color: '#a78bfa', 
    type: 'geojson',
    archivo: 'capas/inegi_denue.json',
    weight: 0.9,
    impactType: 'exposure'
  },

  // Vulnerabilidad
  { 
    id: 'cnb-veg', 
    name: 'Colonias urbanas', 
    category: 'vuln', 
    icon: Home, 
    description: 'Traza urbana y marginación', 
    color: '#22c55e', 
    type: 'geojson',
    archivo: 'capas/colonias.json',
    weight: 1.3,
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
