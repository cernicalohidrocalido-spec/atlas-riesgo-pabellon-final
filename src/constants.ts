/**
 * constants.ts — Atlas de Riesgos · Pabellón de Arteaga · IMBIO 2025
 *
 * ════════════════════════════════════════════════════════════════════
 * GUÍA DE CAPAS GEOJSON — DÓNDE COLOCAR TUS ARCHIVOS DE QGIS
 * ════════════════════════════════════════════════════════════════════
 *
 * Coloca todos tus archivos .geojson en la carpeta:  /public/capas/
 *
 * Convenciones de exportación desde QGIS:
 *  • CRS: EPSG:4326 (WGS84)
 *  • Formato: GeoJSON
 *  • Codificación: UTF-8
 *
 * Archivos esperados (el campo `archivo` de cada LayerDef los lista):
 *  /public/capas/LimitePabellon.geojson
 *  /public/capas/fallas_2024.geojson            ← SIFAGG (SOP Ags 2021)
 *  /public/capas/fallas_buffer20m.geojson       ← Buffer 20 m en QGIS
 *  /public/capas/susceptibilidad_laderas.geojson
 *  /public/capas/inundacion_historica.geojson   ← ANR CENAPRED
 *  /public/capas/sequia_zonificacion.geojson
 *  /public/capas/temperatura_extrema.geojson
 *  /public/capas/cuerpos_agua.geojson
 *  /public/capas/gasoducto.geojson
 *  /public/capas/corredor_matpel_carr45.geojson ← Buffer 500 m Carr-45
 *  /public/capas/instalaciones_riesgo_fijo.geojson
 *  /public/capas/riesgo_incendio.geojson
 *  /public/capas/residuos_sdf.geojson
 *  /public/capas/plantas_tratamiento.geojson
 *  /public/capas/calidad_agua_pozos.geojson
 *  /public/capas/vulnerabilidad_social.geojson  ← por AGEB, Censo 2020
 *  /public/capas/vulnerabilidad_vivienda.geojson
 *  /public/capas/riesgo_integrado.geojson       ← mapa síntesis (P×V)
 *  /public/capas/unidades_salud.geojson
 *  /public/capas/refugios_evacuacion.geojson
 *  /public/capas/pozos_capapa.geojson
 *  /public/capas/escuelas.geojson
 * ════════════════════════════════════════════════════════════════════
 */

import {
  Droplets, Mountain, Factory, Target, AlertTriangle, ShieldCheck,
  Waves, Flame, Zap, Hospital, Home, Car, Map as MapIcon,
  Thermometer, CloudRain, Trash2, FlaskConical, Activity,
  Users, TreePine,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────
export type LayerCategory = 'base' | 'geo' | 'hidro' | 'antro_qt' | 'antro_se' | 'vuln_riesgo';
export type ImpactType    = 'danger' | 'exposure' | 'vulnerability' | 'response';
export type LayerType     = 'wms' | 'geojson' | 'local';
export type RiskLevel     = 'MUY ALTO' | 'ALTO' | 'MEDIO' | 'BAJO' | 'MUY BAJO' | 'N/A';

export interface LayerDef {
  id: string;
  name: string;
  category: LayerCategory;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  type: LayerType;
  archivo?: string;          // ruta relativa dentro de /public/
  wmsUrl?: string;
  wmsLayers?: string[];
  weight: number;            // peso en fórmula R = P×V  (0–2; negativo = capacidad)
  impactType: ImpactType;
  fillOpacity?: number;
  strokeWidth?: number;
  nivelRiesgoAtlas?: RiskLevel;
  fenomeno?: string;
  recomendacion?: string;
  popupFields?: { key: string; label: string }[];
}

export interface CategoryDef {
  id: LayerCategory;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

// ─── Categorías SEDATU ────────────────────────────────────────────────
export const CATEGORIES: CategoryDef[] = [
  { id:'base',        name:'Capas Base',                    icon:MapIcon,      color:'text-slate-500',  description:'Límites y cartografía de referencia' },
  { id:'geo',         name:'Peligros Geológicos',           icon:Mountain,     color:'text-amber-700',  description:'Fallas, subsidencia, sismicidad, laderas' },
  { id:'hidro',       name:'Peligros Hidrometeorológicos',  icon:Waves,        color:'text-blue-500',   description:'Inundaciones, sequías, temperaturas extremas' },
  { id:'antro_qt',    name:'Peligros Químico-Tecnológicos', icon:FlaskConical, color:'text-orange-600', description:'MATPEL, gasoductos, incendios industriales' },
  { id:'antro_se',    name:'Peligros Sanitario-Ecológicos', icon:Trash2,       color:'text-lime-700',   description:'Residuos, aguas residuales, contaminación' },
  { id:'vuln_riesgo', name:'Vulnerabilidad y Riesgo',       icon:Target,       color:'text-red-600',    description:'Zonificación integrada multiamenaza' },
];

// ─── Capas del Atlas ─────────────────────────────────────────────────
export const LAYERS: LayerDef[] = [

  /* ── BASE ── */
  { id:'limite', name:'Límite Municipal', category:'base', icon:MapIcon,
    description:'Polígono oficial del municipio', color:'#1d4ed8', type:'geojson',
    archivo:'capas/LimitePabellon.geojson', weight:0, impactType:'exposure',
    strokeWidth:3, fillOpacity:0, nivelRiesgoAtlas:'N/A',
    popupFields:[{key:'NOM_MUN',label:'Municipio'},{key:'CVE_MUN',label:'Clave INEGI'}] },

  { id:'localidades', name:'Localidades (INEGI)', category:'base', icon:Home,
    description:'195 localidades · 2 urbanas · 193 rurales', color:'#64748b',
    type:'wms', wmsUrl:'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers:['Sitio_Inegi:localidades'], weight:0, impactType:'exposure', nivelRiesgoAtlas:'N/A' },

  { id:'red-hidro', name:'Red Hidrográfica (INEGI)', category:'base', icon:Droplets,
    description:'Corrientes superficiales y cuerpos de agua', color:'#0ea5e9',
    type:'wms', wmsUrl:'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers:['Sitio_Inegi:RH00_250_P'], weight:0.8, impactType:'danger', nivelRiesgoAtlas:'N/A' },

  { id:'cuerpos-agua', name:'Presas y Bordos', category:'base', icon:Droplets,
    description:'Infraestructura hidráulica del municipio', color:'#0369a1',
    type:'geojson', archivo:'capas/cuerpos_agua.geojson', weight:1.0, fillOpacity:0.5,
    impactType:'danger', nivelRiesgoAtlas:'N/A',
    popupFields:[{key:'nombre',label:'Nombre'},{key:'tipo',label:'Tipo'},{key:'capacidad_hm3',label:'Capacidad (hm³)'}] },

  /* ── GEOLÓGICOS ── */
  { id:'fallas', name:'Fallas y Grietas (SIFAGG 2024)', category:'geo', icon:AlertTriangle,
    description:'47 estructuras · 63.4 km · Atraviesan la mancha urbana',
    color:'#dc2626', type:'geojson', archivo:'capas/fallas_2024.geojson',
    weight:2.0, strokeWidth:2.5, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Subsidencia y Agrietamiento del Terreno',
    recomendacion:'Prohibir construcción en buffer de 20 m. Monitoreo geotécnico continuo (inclinómetros, nivelación).',
    popupFields:[
      {key:'CLAVE',label:'Clave SIFAGG'},{key:'NOMBRE',label:'Nombre'},
      {key:'LONGITUD_KM',label:'Longitud (km)'},{key:'BLOQUE_HUNDIDO',label:'Bloque Hundido'}] },

  { id:'subsidencia-buffer', name:'Zona de Influencia de Fallas (20 m)', category:'geo', icon:AlertTriangle,
    description:'Buffer de 20 m · 382 inmuebles expuestos estimados',
    color:'#fca5a5', type:'geojson', archivo:'capas/fallas_buffer20m.geojson',
    weight:1.8, fillOpacity:0.25, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Zona de Influencia de Subsidencia',
    recomendacion:'Evaluación estructural obligatoria para todos los inmuebles dentro de este radio.' },

  { id:'geologia', name:'Geología Superficial (INEGI)', category:'geo', icon:Mountain,
    description:'Aluvial 62% · Riolita-Toba 33% · Arenisca 3%', color:'#92400e',
    type:'wms', wmsUrl:'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers:['Sitio_Inegi:geologia'], weight:0.8, impactType:'danger', nivelRiesgoAtlas:'N/A' },

  { id:'sismos', name:'Peligro Sísmico (CENAPRED)', category:'geo', icon:Activity,
    description:'Zona Sísmica A · Muy baja sismicidad tectónica', color:'#7c3aed',
    type:'wms', wmsUrl:'https://www.atlasnacionalderiesgos.gob.mx/geoserver/wms',
    wmsLayers:['anr:Sismicidad'], weight:0.5, impactType:'danger', nivelRiesgoAtlas:'MUY BAJO',
    fenomeno:'Sismicidad Tectónica',
    recomendacion:'Peligro dominante es la subsidencia, no la sismicidad. Priorizar monitoreo geotécnico.' },

  { id:'laderas', name:'Susceptibilidad a Inestabilidad de Laderas', category:'geo', icon:Mountain,
    description:'Susceptibilidad media-alta en 16.32% del territorio (CENAPRED 2021)',
    color:'#d97706', type:'geojson', archivo:'capas/susceptibilidad_laderas.geojson',
    weight:1.0, fillOpacity:0.45, impactType:'danger', nivelRiesgoAtlas:'BAJO',
    fenomeno:'Inestabilidad de Laderas',
    recomendacion:'Controlar desmonte y apertura de caminos rurales sin evaluación geotécnica previa.',
    popupFields:[{key:'susceptibilidad',label:'Susceptibilidad'},{key:'area_ha',label:'Área (ha)'}] },

  /* ── HIDROMETEOROLÓGICOS ── */
  { id:'inundacion', name:'Zonas de Inundación Histórica', category:'hidro', icon:Waves,
    description:'Llanuras fluviales Río San Pedro · 2 puntos críticos CONAGUA · Peligro ALTO',
    color:'#2563eb', type:'geojson', archivo:'capas/inundacion_historica.geojson',
    weight:1.8, fillOpacity:0.35, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Inundación Fluvial y Pluvial',
    recomendacion:'Prohibir asentamientos en llanura de inundación. Ampliar drenaje pluvial para 60 mm/12h.',
    popupFields:[
      {key:'periodo_retorno',label:'Período de Retorno'},{key:'area_ha',label:'Área (ha)'},
      {key:'localidades_afectadas',label:'Localidades Afectadas'}] },

  { id:'sequia', name:'Zonificación de Riesgo por Sequía', category:'hidro', icon:CloudRain,
    description:'Riesgo MUY ALTO · Déficit acuífero: -95.76 hm³/año · 9,400 ha expuestas',
    color:'#b45309', type:'geojson', archivo:'capas/sequia_zonificacion.geojson',
    weight:2.0, fillOpacity:0.40, impactType:'danger', nivelRiesgoAtlas:'MUY ALTO',
    fenomeno:'Sequía Agro-Hídrica (Crisis Hídrica)',
    recomendacion:'Tecnificación urgente del riego DR001. Meta -30% extracción en 10 años (PAC 2025-2040).',
    popupFields:[
      {key:'nivel_sequia',label:'Nivel de Sequía'},{key:'deficit_hm3',label:'Déficit (hm³/año)'},
      {key:'ha_expuestas',label:'Ha Agrícolas Expuestas'}] },

  { id:'acuifero', name:'Acuífero Valle de Aguascalientes (CONAGUA)', category:'hidro', icon:Droplets,
    description:'Acuífero 0101 · Sobreexplotación crónica · Fuente ÚNICA de agua potable',
    color:'#0891b2', type:'wms', wmsUrl:'https://sigagis.conagua.gob.mx/geoserver/wms',
    wmsLayers:['conagua:Acuiferos'], weight:1.6, impactType:'danger', nivelRiesgoAtlas:'MUY ALTO',
    fenomeno:'Sobreexplotación del Acuífero',
    recomendacion:'Plan de Manejo del Acuífero. Reducción del déficit al 50% antes de 2040 (PAC).' },

  { id:'temperatura-calor', name:'Peligro por Ondas de Calor', category:'hidro', icon:Thermometer,
    description:'Máx hist.: 39.5°C · Proyección 2050 RCP 8.5: +25-40 días/año > 35°C (PAC IMBIO)',
    color:'#dc2626', type:'geojson', archivo:'capas/temperatura_extrema.geojson',
    weight:1.2, fillOpacity:0.30, impactType:'danger', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Ondas de Calor / Temperaturas Extremas',
    recomendacion:'Plan Municipal de Calor Extremo. Arbolado urbano (+30% cobertura al 2035, PAC).',
    popupFields:[{key:'tmax_historica',label:'T° Máx Histórica (°C)'},{key:'dias_proy_2050',label:'Días > 35°C en 2050'}] },

  { id:'granizo', name:'Peligro por Granizadas y Tormentas', category:'hidro', icon:CloudRain,
    description:'2 declaratorias de emergencia · Máx 86.5 mm/día (22-jul-1991)',
    color:'#6366f1', type:'wms', wmsUrl:'https://www.atlasnacionalderiesgos.gob.mx/geoserver/wms',
    wmsLayers:['anr:Granizadas'], weight:1.0, impactType:'danger', nivelRiesgoAtlas:'BAJO',
    fenomeno:'Granizadas y Tormentas Severas',
    recomendacion:'Seguros agropecuarios. Mallas antigranizo en horticultura de alto valor.' },

  /* ── QUÍMICO-TECNOLÓGICOS ── */
  { id:'gasoducto', name:'Gasoducto y Ductos de Alta Presión', category:'antro_qt', icon:Zap,
    description:'Infraestructura energética crítica · Riesgo de fuga, incendio y explosión',
    color:'#f59e0b', type:'geojson', archivo:'capas/gasoducto.geojson',
    weight:1.7, strokeWidth:3, impactType:'danger', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Ducto de Sustancias Peligrosas',
    recomendacion:'Restricción de construcción en buffer de 50 m. Señalización y planes HazMat.',
    popupFields:[{key:'operador',label:'Operador'},{key:'producto',label:'Producto'},{key:'presion_psi',label:'Presión (psi)'}] },

  { id:'corredor-matpel', name:'Corredor MATPEL — Carretera Federal 45', category:'antro_qt', icon:Car,
    description:'Buffer 500 m · Riesgo de derrame, nube tóxica y contaminación del acuífero vía fallas',
    color:'#f97316', type:'geojson', archivo:'capas/corredor_matpel_carr45.geojson',
    weight:1.5, fillOpacity:0.25, impactType:'danger', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Transporte de Materiales Peligrosos (MATPEL)',
    recomendacion:'Plan HazMat municipal. Protocolo de contención ante derrame en zona con fallas activas.' },

  { id:'instalaciones-riesgo', name:'Instalaciones de Riesgo Fijo', category:'antro_qt', icon:Factory,
    description:'Parque Industrial · Bodegas de agroquímicos · Gaseras · Amoniaco anhidro',
    color:'#ef4444', type:'geojson', archivo:'capas/instalaciones_riesgo_fijo.geojson',
    weight:1.5, impactType:'danger', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Riesgo Industrial / Almacenamiento MATPEL',
    recomendacion:'Planes de contingencia internos obligatorios. Inventario de sustancias (NOM-018-STPS).',
    popupFields:[{key:'nombre',label:'Nombre'},{key:'actividad',label:'Actividad'},{key:'sustancia_principal',label:'Sustancia Principal'}] },

  { id:'incendio-forestal', name:'Riesgo de Incendio Forestal / Interfaz Urbana', category:'antro_qt', icon:Flame,
    description:'Peligro ALTO · Matorral 13% · Bosque encino 10% · Pasto buffel invasor',
    color:'#b91c1c', type:'geojson', archivo:'capas/riesgo_incendio.geojson',
    weight:1.6, fillOpacity:0.35, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Incendio Forestal / Interfaz Urbano-Forestal',
    recomendacion:'Brechas cortafuego. Manejo de combustibles. Control de pasto buffel. Brigadas CONAFOR.',
    popupFields:[{key:'nivel_riesgo',label:'Nivel de Riesgo'},{key:'tipo_vegetacion',label:'Tipo Vegetación'},{key:'area_ha',label:'Área (ha)'}] },

  { id:'ferroviario', name:'Red Ferroviaria (Riesgo MATPEL)', category:'antro_qt', icon:Car,
    description:'Corredor de transporte de hidrocarburos y químicos industriales',
    color:'#475569', type:'wms', wmsUrl:'https://mapas.inegi.org.mx/geoserver/wms',
    wmsLayers:['Sitio_Inegi:red_ferroviaria'], weight:1.3, impactType:'danger', nivelRiesgoAtlas:'BAJO',
    fenomeno:'Accidente Ferroviario / MATPEL',
    recomendacion:'Protección de cruceros ferroviarios. Coordinación con operadores (Ferromex).' },

  /* ── SANITARIO-ECOLÓGICOS ── */
  { id:'residuos-sdf', name:'Sitio de Disposición Final RSU', category:'antro_se', icon:Trash2,
    description:'Emisiones CH₄ · Riesgo de lixiviados al acuífero vía grietas (Inventario GEI 2022)',
    color:'#65a30d', type:'geojson', archivo:'capas/residuos_sdf.geojson',
    weight:1.2, fillOpacity:0.40, impactType:'danger', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Disposición de RSU / Riesgo de Lixiviados',
    recomendacion:'Evaluar distancia a fallas activas. Impermeabilización. Captación de biogás (CH₄).',
    popupFields:[
      {key:'nombre',label:'Nombre'},{key:'ton_dia',label:'Recepción (ton/día)'},
      {key:'emision_ch4_tco2e',label:'Emisión CH₄ (tCO₂e/año)'},{key:'distancia_falla_m',label:'Distancia a Falla más cercana (m)'}] },

  { id:'aguas-residuales', name:'Plantas de Tratamiento de Aguas Residuales', category:'antro_se', icon:Droplets,
    description:'PTAR municipales e industriales · DBO₅ · Emisiones N₂O (Inventario GEI 2022)',
    color:'#0d9488', type:'geojson', archivo:'capas/plantas_tratamiento.geojson',
    weight:1.0, impactType:'danger', nivelRiesgoAtlas:'BAJO',
    fenomeno:'Aguas Residuales / Contaminación de Cuerpos de Agua',
    recomendacion:'Ampliar tratamiento. Reúso de aguas tratadas para riego (PAC Meta H2).',
    popupFields:[{key:'nombre',label:'Nombre PTAR'},{key:'caudal_ls',label:'Caudal (L/s)'},{key:'dbo5_mgL',label:'DBO₅ (mg/L)'}] },

  { id:'contaminacion-agua', name:'Calidad del Agua Potable (As, F⁻)', category:'antro_se', icon:FlaskConical,
    description:'Arsénico: 0.0126 mg/L (NOM-127: 0.01) · Fluoruro: 2.30 mg/L (NOM-127: 1.5)',
    color:'#9333ea', type:'geojson', archivo:'capas/calidad_agua_pozos.geojson',
    weight:1.5, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Contaminación Natural del Agua Potable',
    recomendacion:'Sistema de remoción de As y F⁻ urgente. Monitoreo semestral (NOM-127-SSA1-2021).',
    popupFields:[
      {key:'id_pozo',label:'ID Pozo'},{key:'arsenico_mgL',label:'Arsénico (mg/L)'},
      {key:'fluoruro_mgL',label:'Fluoruro (mg/L)'},{key:'estado_norma',label:'Estado NOM-127'}] },

  /* ── VULNERABILIDAD Y RIESGO ── */
  { id:'vulnerabilidad-social', name:'Índice de Vulnerabilidad Social', category:'vuln_riesgo', icon:Users,
    description:'28.88% en pobreza · 18.6% sin acceso a salud · Por AGEB (Censo INEGI 2020)',
    color:'#7c3aed', type:'geojson', archivo:'capas/vulnerabilidad_social.geojson',
    weight:1.5, fillOpacity:0.50, impactType:'vulnerability', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Vulnerabilidad Social Multidimensional',
    recomendacion:'Programas focalizados en AGEBs de alta vulnerabilidad dentro de zonas de peligro.',
    popupFields:[
      {key:'CVEGEO',label:'Clave AGEB'},{key:'nivel_vuln',label:'Nivel de Vulnerabilidad'},
      {key:'pct_pobreza',label:'% Pobreza'},{key:'pct_sin_salud',label:'% Sin Acceso a Salud'}] },

  { id:'vulnerabilidad-vivienda', name:'Vulnerabilidad Estructural de Vivienda', category:'vuln_riesgo', icon:Home,
    description:'686 viviendas de adobe (6.37%) · Alta susceptibilidad ante subsidencia',
    color:'#ea580c', type:'geojson', archivo:'capas/vulnerabilidad_vivienda.geojson',
    weight:1.4, fillOpacity:0.45, impactType:'vulnerability', nivelRiesgoAtlas:'MEDIO',
    fenomeno:'Vulnerabilidad Física de la Vivienda',
    recomendacion:'Programa de reforzamiento para viviendas de adobe sobre trazas de falla.',
    popupFields:[{key:'nivel_vuln_fisica',label:'Nivel Vuln. Física'},{key:'n_adobe',label:'No. Viviendas Adobe'}] },

  { id:'riesgo-integrado', name:'Zonificación Integrada de Riesgos', category:'vuln_riesgo', icon:Target,
    description:'Mapa síntesis del Atlas · Multiamenaza P×V · Base del Programa de Desarrollo Urbano',
    color:'#991b1b', type:'geojson', archivo:'capas/riesgo_integrado.geojson',
    weight:2.0, fillOpacity:0.50, impactType:'danger', nivelRiesgoAtlas:'ALTO',
    fenomeno:'Riesgo Integrado Multiamenaza',
    recomendacion:'Zonificación vinculante para el PDU 2025-2030. Prohibición de nuevos asentamientos en zona Muy Alto.',
    popupFields:[
      {key:'nivel_riesgo',label:'Nivel de Riesgo Integrado'},{key:'amenazas_dominantes',label:'Amenazas Dominantes'},
      {key:'poblacion_expuesta',label:'Población Expuesta (est.)'},{key:'ha_expuestas',label:'Área (ha)'}] },

  { id:'hospitales', name:'Unidades de Salud', category:'vuln_riesgo', icon:Hospital,
    description:'13 unidades · IMSS, ISSSTE, SSA · Nota: Hospital Municipal reubicado por fallas (2023)',
    color:'#dc2626', type:'geojson', archivo:'capas/unidades_salud.geojson',
    weight:-1.5, impactType:'response', nivelRiesgoAtlas:'N/A',
    fenomeno:'Infraestructura Sanitaria Estratégica',
    recomendacion:'Verificar distancia a fallas activas. Proteger de inundación. Plan de continuidad operativa.',
    popupFields:[{key:'nombre',label:'Nombre'},{key:'institucion',label:'Institución'},{key:'camas',label:'No. Camas'}] },

  { id:'refugios', name:'Refugios y Puntos de Evacuación', category:'vuln_riesgo', icon:ShieldCheck,
    description:'Puntos de reunión habilitados · Escuelas y centros comunitarios',
    color:'#16a34a', type:'geojson', archivo:'capas/refugios_evacuacion.geojson',
    weight:-1.8, impactType:'response', nivelRiesgoAtlas:'N/A',
    fenomeno:'Infraestructura de Protección Civil',
    recomendacion:'Validar capacidad, accesibilidad y equipamiento mínimo por temporada.',
    popupFields:[{key:'nombre',label:'Nombre'},{key:'capacidad_personas',label:'Capacidad (personas)'},{key:'telefono_contacto',label:'Contacto'}] },

  { id:'pozos-capapa', name:'Pozos de Extracción (CAPAPA)', category:'vuln_riesgo', icon:Droplets,
    description:'Profundidades > 400 m · Vulnerables a contaminación por fallas y MATPEL',
    color:'#0284c7', type:'geojson', archivo:'capas/pozos_capapa.geojson',
    weight:-1.0, impactType:'response', nivelRiesgoAtlas:'N/A',
    fenomeno:'Infraestructura Hídrica Municipal',
    recomendacion:'Monitoreo de calidad semestral. Protección ante contaminación por MATPEL.',
    popupFields:[{key:'id_pozo',label:'ID Pozo'},{key:'profundidad_m',label:'Profundidad (m)'},{key:'gasto_ls',label:'Gasto (L/s)'}] },

  { id:'escuelas', name:'Escuelas (Refugio / Exposición)', category:'vuln_riesgo', icon:Home,
    description:'Infraestructura de doble uso: refugio temporal y elemento expuesto al riesgo',
    color:'#0891b2', type:'geojson', archivo:'capas/escuelas.geojson',
    weight:-0.8, impactType:'response', nivelRiesgoAtlas:'N/A',
    fenomeno:'Infraestructura Educativa',
    recomendacion:'Evaluar daños por subsidencia. Simulacros anuales de evacuación.',
    popupFields:[{key:'nombre',label:'Nombre'},{key:'nivel',label:'Nivel Educativo'},{key:'alumnos',label:'No. Alumnos'}] },
];

// ─── Configuración DENUE ─────────────────────────────────────────────
export const DENUE_CATEGORIES = [
  { key:'gasolinera',                          label:'Gasolineras',          color:'#ef4444', tipoRiesgo:'fuente_peligro'     as const, icon:'⛽', descripcion:'Fuente de riesgo QT' },
  { key:'almacenamiento de productos quimicos',label:'Almacén Químico',      color:'#f97316', tipoRiesgo:'fuente_peligro'     as const, icon:'🧪', descripcion:'MATPEL almacenado' },
  { key:'industria quimica',                   label:'Industria Química',    color:'#dc2626', tipoRiesgo:'fuente_peligro'     as const, icon:'🏭', descripcion:'Riesgo industrial fijo' },
  { key:'hospital',                            label:'Hospitales',           color:'#2563eb', tipoRiesgo:'infra_vulnerable'   as const, icon:'🏥', descripcion:'Infraestructura sanitaria crítica' },
  { key:'escuela primaria',                    label:'Escuelas Primarias',   color:'#0891b2', tipoRiesgo:'infra_vulnerable'   as const, icon:'🏫', descripcion:'Posible refugio de emergencia' },
  { key:'servicios de emergencia',             label:'Servicios Emergencia', color:'#16a34a', tipoRiesgo:'capacidad_respuesta' as const, icon:'🚨', descripcion:'Bomberos, PC, Cruz Roja' },
] as const;

export type DenueCategory = typeof DENUE_CATEGORIES[number];

// ─── Datos del municipio ──────────────────────────────────────────────
export const PABELLON_COORDS: [number, number] = [22.1467, -102.2764];

export const MUNICIPAL_STATS = {
  poblacion:          47646,
  proyeccion2024:     48968,
  superficie_km2:     177.28,
  localidades:        195,
  viviendas:          11470,
  deficit_acuifero:   -95.76,  // hm³/año
  fallas_km:          63.4,
  num_fallas:         47,
  ha_agricolas:       9400,
  pct_pobreza:        28.88,
  pct_sin_salud:      18.6,
  precipitacion_mm:   452.2,
  gei_afolu_pct:      64,
} as const;

export const RISK_LEVELS_SUMMARY = [
  { fenomeno:'Sequía Agro-Hídrica',           nivel:'MUY ALTO', color:'#7f1d1d', score:9.5 },
  { fenomeno:'Subsidencia y Fallas',           nivel:'ALTO',     color:'#dc2626', score:7.8 },
  { fenomeno:'Inundación Fluvial / Pluvial',   nivel:'ALTO',     color:'#1d4ed8', score:7.2 },
  { fenomeno:'Incendio Forestal',              nivel:'ALTO',     color:'#b91c1c', score:7.0 },
  { fenomeno:'Contaminación Agua (As, F⁻)',    nivel:'ALTO',     color:'#7c3aed', score:6.5 },
  { fenomeno:'Riesgo QT / MATPEL',             nivel:'MEDIO',    color:'#f97316', score:5.5 },
  { fenomeno:'Temperaturas Extremas',          nivel:'MEDIO',    color:'#ef4444', score:4.8 },
  { fenomeno:'Sanitario-Ecológico (RSU)',       nivel:'MEDIO',    color:'#65a30d', score:4.2 },
  { fenomeno:'Inestabilidad de Laderas',       nivel:'BAJO',     color:'#d97706', score:3.1 },
  { fenomeno:'Granizadas y Tormentas',         nivel:'BAJO',     color:'#6366f1', score:2.8 },
  { fenomeno:'Sismicidad Tectónica',           nivel:'MUY BAJO', color:'#7c3aed', score:1.2 },
] as const;

export const PRECIPITATION_DATA = [
  { month:'Ene', mm:3.5 },  { month:'Feb', mm:2.4 },  { month:'Mar', mm:1.8 },
  { month:'Abr', mm:1.0 },  { month:'May', mm:2.0 },  { month:'Jun', mm:67.0 },
  { month:'Jul', mm:81.0 }, { month:'Ago', mm:70.0 }, { month:'Sep', mm:61.8 },
  { month:'Oct', mm:49.0 }, { month:'Nov', mm:2.0 },  { month:'Dic', mm:1.7 },
];
// Fuente: CONAGUA, Estación Climatológica 1102, Pabellón de Arteaga (1990–2025)

export const TEMPERATURE_DATA = [
  { month:'Ene', tmax:22.0, tmin:3.5 },  { month:'Feb', tmax:24.0, tmin:5.0 },
  { month:'Mar', tmax:27.0, tmin:7.0 },  { month:'Abr', tmax:30.0, tmin:10.0 },
  { month:'May', tmax:33.0, tmin:13.0 }, { month:'Jun', tmax:31.0, tmin:16.0 },
  { month:'Jul', tmax:27.0, tmin:15.0 }, { month:'Ago', tmax:27.0, tmin:15.0 },
  { month:'Sep', tmax:26.0, tmin:14.0 }, { month:'Oct', tmax:26.0, tmin:11.0 },
  { month:'Nov', tmax:22.0, tmin:6.0 },  { month:'Dic', tmax:20.0, tmin:3.5 },
];
