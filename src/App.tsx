/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  Map as MapIcon, 
  AlertTriangle, 
  Shield, 
  Info, 
  Layers, 
  Bell, 
  Menu, 
  X, 
  Phone, 
  ChevronRight,
  Activity,
  Droplets,
  Flame,
  Wind,
  Upload,
  Download,
  Printer,
  Crosshair,
  Maximize,
  Database,
  Github,
  ChevronDown,
  MapPin,
  CloudRain,
  Thermometer,
  Eye,
  Navigation2,
  Search,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Circle, LayersControl, LayerGroup, WMSTileLayer, useMapEvents, Polyline, Polygon } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { LAYERS, CATEGORIES, LayerDef } from './constants';

// Initialize Gemini
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fix for Leaflet default icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Mock Data for Charts
const RISKS_DISTRIBUTION = [
  { name: 'Inundación', value: 28, color: '#3b82f6' },
  { name: 'Incendio', value: 22, color: '#ef4444' },
  { name: 'Heladas', value: 20, color: '#8b5cf6' },
  { name: 'Erosión', value: 15, color: '#f97316' },
  { name: 'Sequía', value: 10, color: '#d97706' },
  { name: 'Sismos', value: 5, color: '#0f766e' },
];

const PRECIPITATION_DATA = [
  { month: 'Ene', mm: 5 }, { month: 'Feb', mm: 6 }, { month: 'Mar', mm: 7 },
  { month: 'Abr', mm: 12 }, { month: 'May', mm: 22 }, { month: 'Jun', mm: 65 },
  { month: 'Jul', mm: 82 }, { month: 'Ago', mm: 75 }, { month: 'Sep', mm: 50 },
  { month: 'Oct', mm: 20 }, { month: 'Nov', mm: 8 }, { month: 'Dic', mm: 5 },
];

const PABELLON_COORDS: [number, number] = [22.1467, -102.2764];

// --- Components ---

function MapEvents({ onClick, onMouseMove }: { onClick: (e: L.LeafletMouseEvent) => void, onMouseMove?: (e: L.LeafletMouseEvent) => void }) {
  const map = useMapEvents({
    click: onClick,
    mousemove: onMouseMove,
    load: () => console.log("Leaflet: Map Loaded"),
    error: (e) => console.error("Leaflet Error:", e)
  });

  // Este efecto obliga al mapa a recalcular su tamaño al iniciar
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 500);
  }, [map]);

  // Listener para eventos de vuelo del mapa
  useEffect(() => {
    const handleFlyTo = (e: any) => {
      map.flyTo(e.detail, 17);
    };
    window.addEventListener('map-fly-to', handleFlyTo);
    return () => window.removeEventListener('map-fly-to', handleFlyTo);
  }, [map]);

  return null;
}

export default function App() {
  console.log("Atlas de Riesgo: App Mounting");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'capas' | 'mias' | 'alertas' | 'github'>('capas');
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['limite', 'inegi-hid', 'conagua-inund']));
  const [analysisPoint, setAnalysisPoint] = useState<L.LatLng | null>(null);
  const [hoverCoords, setHoverCoords] = useState<L.LatLng | null>(null);
  const [pointRisks, setPointRisks] = useState<any[]>([]);
  const [riskScore, setRiskScore] = useState<number>(0);
  const [userLayers, setUserLayers] = useState<any[]>([]);
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set(['hidro']));
  const [weatherAlerts, setWeatherAlerts] = useState<any[]>([]);
  const [currentWeather, setCurrentWeather] = useState<any>(null);
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [inegiPoints, setInegiPoints] = useState<any[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showStreetView, setShowStreetView] = useState(false);
  const [approxAddress, setApproxAddress] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Función para obtener dirección aproximada desde Google Geocoding
  const fetchAddress = async (lat: number, lng: number) => {
    const KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD8FAEWMfXQwJLlqKKmJjnQuMyhJeG1sKA';
    const isStatic = window.location.hostname.includes('github.io');
    
    try {
      const url = isStatic 
        ? `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${KEY}&components=country:MX`
        : `/api/google/geocode?latlng=${lat},${lng}&key=${KEY}`;
        
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        setApproxAddress(data.results[0].formatted_address);
        setApiError(null);
      } else if (data.status === 'REQUEST_DENIED' || data.status === 'OVER_QUERY_LIMIT') {
        setApiError(`Google API: ${data.status}. ${data.error_message || 'Verifica las restricciones de tu API Key.'}`);
        setApproxAddress(null);
      } else {
        setApproxAddress("Dirección no encontrada");
      }
    } catch (err: any) {
      console.error("Error fetching address:", err);
      setApiError(`Error de conexión: ${err.message}`);
      setApproxAddress(null);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD8FAEWMfXQwJLlqKKmJjnQuMyhJeG1sKA';
    const isStatic = window.location.hostname.includes('github.io');
    setIsSearching(true);
    
    try {
      const url = isStatic
        ? `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${KEY}&components=country:MX`
        : `/api/google/geocode?address=${encodeURIComponent(query)}&key=${KEY}`;

      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK') {
        setSearchResults(data.results);
        setApiError(null);
      } else if (data.status === 'REQUEST_DENIED') {
        setApiError("Google API: Acceso denegado. Verifica tu API Key.");
      } else if (data.status === 'ZERO_RESULTS') {
        setSearchResults([]);
      }
    } catch (err: any) {
      console.error("Error searching address:", err);
      setApiError(`Error al buscar: ${err.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: any) => {
    const { lat, lng } = result.geometry.location;
    const latlng = new L.LatLng(lat, lng);
    setAnalysisPoint(latlng);
    calculateRiskAtPoint(latlng);
    setApproxAddress(result.formatted_address);
    setAiAnalysis(null);
    setSearchResults([]);
    setSearchQuery('');
    
    // Necesitamos acceder a la instancia del mapa para hacer flyTo
    // Usaremos un evento personalizado o buscaremos la forma de dispararlo
    window.dispatchEvent(new CustomEvent('map-fly-to', { detail: latlng }));
  };

  // Función para cargar puntos críticos desde INEGI DENUE
  const fetchInegiData = async () => {
    const TOKEN = "6bce26ed-3908-48e5-ad4a-d11bbb70ba36";
    const isStatic = window.location.hostname.includes('github.io');
    
    // Categorías críticas para el atlas de riesgo
    const categorias = [
      { key: "gasolinera", color: "#ef4444", label: "Gasolinera" },
      { key: "hospital", color: "#3b82f6", label: "Hospital/Clínica" },
      { key: "escuela", color: "#10b981", label: "Escuela/Refugio" },
      { key: "industria", color: "#f59e0b", label: "Industria" }
    ];
    let todosLosPuntos: any[] = [];

    for (const cat of categorias) {
      try {
        const url = isStatic
          ? `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarAreaAct/01/006/0/0/0/0/0/0/0/${cat.key}/1/100/0/${TOKEN}`
          : `/api/inegi/denue?cat=${cat.key}&token=${TOKEN}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (Array.isArray(data)) {
          const puntosConColor = data.map(p => ({ 
            ...p, 
            markerColor: cat.color,
            categoryLabel: cat.label
          }));
          todosLosPuntos = [...todosLosPuntos, ...puntosConColor];
        }
      } catch (err) {
        console.error(`Error buscando ${cat.key} en INEGI`, err);
        // Solo mostramos error si no estamos en GitHub Pages (donde CORS es esperado)
        if (!isStatic) setApiError("Error al conectar con el servidor proxy de INEGI");
      }
    }
    setInegiPoints(todosLosPuntos);
  };

  // Llamar a la función al cargar la app
  useEffect(() => {
    fetchInegiData();
  }, []);

  // Fetch Weather Data
  useEffect(() => {
    const fetchWeather = async () => {
      const apiKey = (import.meta as any).env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey) return;

      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${PABELLON_COORDS[0]}&lon=${PABELLON_COORDS[1]}&appid=${apiKey}&units=metric&lang=es`
        );
        const data = await response.json();
        setCurrentWeather(data);

        // Simulate alerts if weather is bad
        const alerts = [];
        if (data.weather[0].main === 'Rain' || data.main.temp > 35) {
          alerts.push({
            id: 1,
            type: 'warning',
            title: 'Alerta Meteorológica',
            desc: `Condiciones de ${data.weather[0].description} detectadas.`,
            time: 'Ahora'
          });
        }

        // Add a "CENAPRED" style alert
        alerts.push({
          id: 2,
          type: 'info',
          title: 'Monitoreo CENAPRED',
          desc: 'Semáforo de alerta volcánica: AMARILLO FASE 2. Sin afectaciones directas en la región.',
          time: 'Actualizado'
        });

        setWeatherAlerts(alerts);
      } catch (err) {
        console.error("Error fetching weather", err);
      }
    };

    fetchWeather();
  }, []);

  const toggleLayer = (id: string) => {
    const next = new Set(activeLayers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setActiveLayers(next);
  };

  const toggleCategory = (id: string) => {
    const next = new Set(openCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpenCategories(next);
  };

  const calculateRiskAtPoint = useCallback((latlng: L.LatLng) => {
    let danger = 0;
    let exposure = 0;
    let vulnerability = 0;
    let response = 0;
    const detectedRisks: any[] = [];

    // Deterministic Simulation based on coordinates
    // We use higher multipliers to make it more sensitive to small movements
    const latSeed = Math.abs(latlng.lat * 10000) % 100;
    const lngSeed = Math.abs(latlng.lng * 10000) % 100;
    const combinedSeed = (latSeed + lngSeed) / 200; // 0 to 1
    
    const distToCenter = Math.sqrt(Math.pow(latlng.lat - PABELLON_COORDS[0], 2) + Math.pow(latlng.lng - PABELLON_COORDS[1], 2));
    
    LAYERS.forEach(layer => {
      if (!activeLayers.has(layer.id)) return;

      let isIntersecting = false;
      
      // More dynamic simulation logic
      if (layer.id === 'inund') {
        // Simulating a river path or low zones
        isIntersecting = Math.sin(latlng.lat * 500) + Math.cos(latlng.lng * 500) > 1.2;
      } else if (layer.id === 'fallas') {
        // Simulating vertical fault lines
        isIntersecting = Math.abs((latlng.lng + 102.2764) * 1000 % 10) < 0.5;
      } else if (layer.id === 'gasoducto') {
        // Simulating a horizontal pipe
        isIntersecting = Math.abs((latlng.lat - 22.1467) * 1000 % 15) < 0.3;
      } else if (layer.impactType === 'exposure') {
        isIntersecting = distToCenter < 0.025 && combinedSeed > 0.3;
      } else if (layer.impactType === 'vulnerability') {
        isIntersecting = combinedSeed > 0.5;
      } else if (layer.impactType === 'danger') {
        isIntersecting = combinedSeed > 0.6;
      } else if (layer.impactType === 'response') {
        isIntersecting = distToCenter < 0.015;
      }

      if (isIntersecting) {
        const score = layer.weight * 2; 
        
        switch (layer.impactType) {
          case 'danger': danger += score; break;
          case 'exposure': exposure += score; break;
          case 'vulnerability': vulnerability += score; break;
          case 'response': response += score; break;
        }

        detectedRisks.push({
          name: layer.name,
          level: score > 3 ? 'Muy Alto' : score > 2 ? 'Alto' : 'Medio',
          color: layer.color,
          type: layer.impactType
        });
      }
    });

    const totalScore = (danger * 0.5) + (exposure * 0.3) + (vulnerability * 0.2) - (response * 0.1);
    const normalizedScore = Math.max(0, Math.min(10, totalScore));
    
    setRiskScore(normalizedScore);
    setPointRisks(detectedRisks);
  }, [activeLayers]);

  // Re-calculate risk when active layers or analysis point changes
  useEffect(() => {
    if (analysisPoint) {
      calculateRiskAtPoint(analysisPoint);
    }
  }, [activeLayers, analysisPoint, calculateRiskAtPoint]);

  const handleMapClick = useCallback((e: L.LeafletMouseEvent) => {
    setAnalysisPoint(e.latlng);
    calculateRiskAtPoint(e.latlng);
    setAiAnalysis(null);
    fetchAddress(e.latlng.lat, e.latlng.lng);
    if (isAnalysisMode) setIsAnalysisMode(false);
  }, [calculateRiskAtPoint, isAnalysisMode]);

  const handleMouseMove = useCallback((e: L.LeafletMouseEvent) => {
    setHoverCoords(e.latlng);
  }, []);

  const handleLocate = () => {
    setIsLocating(true);
    setAiAnalysis(null);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        const latlng = new L.LatLng(latitude, longitude);
        setAnalysisPoint(latlng);
        calculateRiskAtPoint(latlng);
        fetchAddress(latitude, longitude);
        setIsLocating(false);
      }, (error) => {
        console.error("Error getting location", error);
        setIsLocating(false);
      });
    } else {
      alert("Geolocalización no disponible");
      setIsLocating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        const newLayer = {
          id: `user-${Date.now()}`,
          name: file.name,
          data: data,
          color: '#' + Math.floor(Math.random()*16777215).toString(16)
        };
        setUserLayers([...userLayers, newLayer]);
        setActiveLayers(prev => new Set(prev).add(newLayer.id));
      } catch (err) {
        console.error("Error parsing GeoJSON", err);
      }
    };
    reader.readAsText(file);
  };

  const getAiAnalysis = async () => {
    if (!analysisPoint || pointRisks.length === 0) return;
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
      setAiAnalysis("Error: No se ha configurado la GEMINI_API_KEY. Por favor, añádela en el panel de Secretos.");
      setApiError("Falta GEMINI_API_KEY");
      return;
    }

    setIsAiLoading(true);
    try {
      const prompt = `Eres un experto en protección civil y gestión de riesgos para el municipio de Pabellón de Arteaga, Aguascalientes. 
      Analiza los siguientes riesgos detectados en las coordenadas (${analysisPoint.lat}, ${analysisPoint.lng}):
      ${pointRisks.map(r => `- ${r.name} (Nivel: ${r.level}, Tipo: ${r.type})`).join('\n')}
      
      Proporciona una breve evaluación técnica (máximo 150 palabras) y 3 recomendaciones clave de seguridad para la población en este punto específico. 
      Responde en español con un tono profesional y directo.`;

      const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      setAiAnalysis(text || "No se pudo generar el análisis.");
      setApiError(null);
    } catch (err: any) {
      console.error("Error calling Gemini", err);
      setAiAnalysis(`Error al generar el análisis: ${err.message}`);
      setApiError("Error en Gemini AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#E4E3E0] text-[#141414] font-sans overflow-hidden">
      {/* Error Banner */}
      <AnimatePresence>
        {apiError && (
          <motion.div 
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            exit={{ y: -100 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] bg-red-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 text-xs font-bold"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>{apiError}</span>
            <button onClick={() => setApiError(null)} className="ml-4 hover:opacity-70">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="w-80 bg-white border-r border-[#141414] flex flex-col z-50 shadow-2xl"
          >
            <div className="p-6 border-b border-[#141414] bg-[#1e3a8a] text-white">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded shadow-inner">
                  <Shield className="text-[#1e3a8a] w-6 h-6" />
                </div>
                <div>
                  <h1 className="font-bold text-sm tracking-tight uppercase leading-tight">Atlas Municipal</h1>
                  <p className="text-[10px] opacity-80 uppercase tracking-widest">Pabellón de Arteaga</p>
                </div>
              </div>
            </div>

            <div className="p-4 border-b border-[#141414] bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase text-gray-500">Estado de APIs</span>
                <div className="flex gap-1">
                  <div className={`w-2 h-2 rounded-full ${apiError ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-[9px] text-gray-600">
                  <div className={`w-1.5 h-1.5 rounded-full ${apiError?.includes('Google') ? 'bg-red-400' : 'bg-green-400'}`} />
                  Google Maps
                </div>
                <div className="flex items-center gap-2 text-[9px] text-gray-600">
                  <div className={`w-1.5 h-1.5 rounded-full ${apiError?.includes('INEGI') ? 'bg-red-400' : 'bg-green-400'}`} />
                  INEGI DENUE
                </div>
              </div>
            </div>

            <div className="flex border-b border-[#141414] bg-gray-50">
              {(['capas', 'mias', 'alertas', 'github'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2 ${
                    activeTab === tab 
                      ? 'border-[#1e3a8a] text-[#1e3a8a] bg-white' 
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'capas' ? 'Capas' : tab === 'mias' ? 'Mis Capas' : tab === 'alertas' ? 'Alertas' : 'GitHub'}
                </button>
              ))}
            </div>

            <div className="p-3 border-b border-[#141414] bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Buscar capa o localidad..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-white border border-gray-200 rounded text-[11px] focus:ring-1 focus:ring-[#1e3a8a] outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {activeTab === 'capas' && (
                <div className="p-2 space-y-1">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.id} className="border border-gray-100 rounded-lg overflow-hidden mb-2">
                      <button 
                        onClick={() => toggleCategory(cat.id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          <span className="text-[11px] font-bold uppercase tracking-tight text-gray-700">{cat.name}</span>
                        </div>
                        <ChevronDown className={`w-3 h-3 transition-transform ${openCategories.has(cat.id) ? 'rotate-180' : ''}`} />
                      </button>
                      
                      <AnimatePresence>
                        {openCategories.has(cat.id) && (
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden bg-white"
                          >
                            {LAYERS.filter(l => l.category === cat.id).map(layer => (
                              <button
                                key={layer.id}
                                onClick={() => toggleLayer(layer.id)}
                                className={`w-full flex items-center gap-3 p-3 hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${
                                  activeLayers.has(layer.id) ? 'bg-blue-50/50' : ''
                                }`}
                              >
                                <div 
                                  className="w-3 h-3 rounded-sm shrink-0" 
                                  style={{ backgroundColor: layer.color }}
                                />
                                <div className="text-left flex-1 min-width-0">
                                  <p className="text-[11px] font-medium truncate">{layer.name}</p>
                                  <p className="text-[9px] text-gray-400 truncate">{layer.description}</p>
                                </div>
                                <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0 ${activeLayers.has(layer.id) ? 'bg-[#1e3a8a]' : 'bg-gray-200'}`}>
                                  <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${activeLayers.has(layer.id) ? 'left-4.5' : 'left-0.5'}`} />
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'mias' && (
                <div className="p-4 space-y-4">
                  <label className="block w-full border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#1e3a8a] hover:bg-blue-50 transition-all cursor-pointer group">
                    <input type="file" className="hidden" onChange={handleFileUpload} accept=".geojson,.json" />
                    <Upload className="w-8 h-8 mx-auto text-gray-300 group-hover:text-[#1e3a8a] mb-2" />
                    <p className="text-[11px] font-bold text-gray-500 group-hover:text-[#1e3a8a]">Cargar GeoJSON / KML</p>
                    <p className="text-[9px] text-gray-400 mt-1">Arrastra tu archivo aquí</p>
                  </label>

                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Capas Cargadas</p>
                    {userLayers.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        <Database className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                        <p className="text-[10px] text-gray-400">No hay capas externas</p>
                      </div>
                    ) : (
                      userLayers.map(layer => (
                        <div key={layer.id} className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: layer.color }} />
                            <span className="text-[11px] font-medium truncate">{layer.name}</span>
                          </div>
                          <button 
                            onClick={() => {
                              setUserLayers(userLayers.filter(l => l.id !== layer.id));
                              const next = new Set(activeLayers);
                              next.delete(layer.id);
                              setActiveLayers(next);
                            }}
                            className="p-1 hover:bg-red-50 text-red-400 rounded transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'alertas' && (
                <div className="p-4 space-y-3">
                  {currentWeather && (
                    <div className="p-4 bg-blue-900 text-white rounded-xl shadow-lg mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Clima Actual</span>
                        <CloudRain className="w-4 h-4" />
                      </div>
                      <div className="flex items-end gap-3">
                        <p className="text-3xl font-bold">{Math.round(currentWeather.main.temp)}°C</p>
                        <p className="text-[11px] opacity-80 mb-1 capitalize">{currentWeather.weather[0].description}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2">
                          <Droplets className="w-3 h-3 opacity-50" />
                          <span className="text-[10px]">{currentWeather.main.humidity}% Hum.</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Wind className="w-3 h-3 opacity-50" />
                          <span className="text-[10px]">{currentWeather.wind.speed} m/s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {weatherAlerts.length > 0 ? (
                    weatherAlerts.map((alert, idx) => (
                      <div key={alert.id || idx}>
                        <AlertItem 
                          type={alert.type as 'danger' | 'warning' | 'info'} 
                          title={alert.title} 
                          desc={alert.desc}
                          time={alert.time}
                        />
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <Shield className="w-8 h-8 mx-auto text-green-200 mb-3" />
                      <p className="text-[11px] font-bold text-green-600 uppercase">Sin Alertas Críticas</p>
                      <p className="text-[10px] text-gray-400 mt-1">Monitoreo CENAPRED activo</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'github' && (
                <div className="p-6 space-y-6">
                  <div className="bg-[#141414] text-white p-4 rounded-xl">
                    <Github className="w-8 h-8 mb-3" />
                    <h3 className="font-bold text-sm mb-2">Publicar en GitHub</h3>
                    <p className="text-[10px] opacity-70 leading-relaxed">
                      Sigue los pasos del manual para desplegar tu atlas de riesgo de forma gratuita.
                    </p>
                  </div>
                  <div className="space-y-4">
                    <Step num="01" title="Crear Repositorio" desc="Crea un repo público llamado 'atlas-riesgo-pabellon'." />
                    <Step num="02" title="Subir Capas" desc="Organiza tus .geojson en una carpeta /capas." />
                    <Step num="03" title="Activar Pages" desc="Habilita GitHub Pages en la configuración del repo." />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-[#141414] bg-gray-50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Sistema Activo</span>
                </div>
                <span className="text-[10px] font-mono text-gray-400">v3.0.4</span>
              </div>
              <p className="text-[9px] text-gray-400 italic leading-tight">
                Desarrollado por: Biól. Luis Felipe Lozano Román<br/>
                Inst. Municipal de Biodiversidad y Protección Ambiental
              </p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-[#141414] flex items-center justify-between px-6 z-40">
          <div className="flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Coordenadas</span>
                <span className="text-[11px] font-mono font-bold text-[#1e3a8a]">
                  {analysisPoint ? `${analysisPoint.lat.toFixed(4)}° N ${Math.abs(analysisPoint.lng).toFixed(4)}° O` : '22.1527° N 102.2983° O'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-[11px] font-bold transition-colors">
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 rounded-md text-[11px] font-bold transition-colors shadow-lg shadow-blue-900/20">
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exportar Atlas</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Container */}
          <div className="flex-1 relative">
            <MapContainer 
              center={PABELLON_COORDS} 
              zoom={13} 
              style={{ height: '100%', width: '100%' }}
              zoomControl={false}
            >
              {/* Search Bar */}
              <div className="absolute top-4 left-4 z-[1001] w-80">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {isSearching ? (
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Buscar dirección o lugar..."
                    className="block w-full pl-10 pr-3 py-2.5 bg-white border border-[#141414] rounded-xl text-xs font-medium placeholder-gray-400 shadow-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                  
                  <AnimatePresence>
                    {searchResults.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute mt-2 w-full bg-white border border-[#141414] rounded-xl shadow-2xl overflow-hidden"
                      >
                        {searchResults.map((result, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSelectResult(result)}
                            className="w-full text-left px-4 py-3 text-[11px] hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors"
                          >
                            <p className="font-bold text-gray-800 truncate">{result.formatted_address}</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-tighter">
                              {result.geometry.location.lat.toFixed(4)}, {result.geometry.location.lng.toFixed(4)}
                            </p>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <LayersControl position="topright">
                  <LayersControl.BaseLayer name="OpenStreetMap">
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer checked name="Google Satélite">
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                      attribution='&copy; Google Maps'
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Google Híbrido">
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                      attribution='&copy; Google Maps'
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Google Terreno">
                    <TileLayer
                      url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                      attribution='&copy; Google Maps'
                    />
                  </LayersControl.BaseLayer>

                      <LayersControl.Overlay checked name="Capas de Riesgo">
                        <LayerGroup>
                          {/* WMS Layers from official sources */}
                          {LAYERS.filter(l => l.type === 'wms' && activeLayers.has(l.id)).map(layer => {
                            const isInegi = layer.wmsUrl?.includes('inegi.org.mx');
                            const isConagua = layer.wmsUrl?.includes('conagua.gob.mx');
                            const TOKEN = "6bce26ed-3908-48e5-ad4a-d11bbb70ba36";
                            
                            // INEGI prefiere 1.3.0, CONAGUA/CENAPRED suelen usar 1.1.1
                            const wmsVersion = isInegi ? "1.3.0" : "1.1.1";
                            
                            console.log(`Rendering WMS Layer: ${layer.name} on ${layer.wmsUrl} (Version ${wmsVersion})`);
                            
                            return (
                              <WMSTileLayer
                                key={layer.id}
                                url={layer.wmsUrl || "https://mapas.inegi.org.mx/geoserver/wms"}
                                layers={layer.wmsLayers?.join(',')}
                                format="image/png"
                                transparent={true}
                                version={wmsVersion}
                                opacity={0.7}
                                params={{
                                  uppercase: true,
                                  ...(isInegi ? { token: TOKEN } : {})
                                }}
                              />
                            );
                          })}
                        </LayerGroup>
                      </LayersControl.Overlay>
                </LayersControl>

              {/* Local Risks Visualization */}
              {/* Puntos Críticos de INEGI DENUE */}
              {inegiPoints.map((punto, idx) => (
                <Circle
                  key={`inegi-${idx}`}
                  center={[parseFloat(punto.Latitud), parseFloat(punto.Longitud)]}
                  radius={40}
                  pathOptions={{
                    fillColor: punto.markerColor,
                    color: '#ffffff',
                    weight: 2,
                    fillOpacity: 0.9
                  }}
                >
                  <Popup>
                    <div className="p-2">
                      <h3 className="font-bold text-sm text-blue-900">{punto.Nombre}</h3>
                      <p className="text-[10px] text-gray-600 uppercase mb-1">{punto.Clase}</p>
                      <hr className="my-1"/>
                      <p className="text-[10px]"><b>Personal:</b> {punto.Estrato}</p>
                      <p className="text-[10px]"><b>Calle:</b> {punto.Calle}</p>
                    </div>
                  </Popup>
                </Circle>
              ))}
              {activeLayers.has('inund') && (
                <LayerGroup>
                  <Polygon 
                    positions={[[22.16,-102.34],[22.17,-102.32],[22.15,-102.31],[22.14,-102.33]]}
                    pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.3 }}
                  >
                    <Popup>Zona inundable Arroyo El Rayo</Popup>
                  </Polygon>
                </LayerGroup>
              )}

              {activeLayers.has('ref') && (
                <LayerGroup>
                  <Marker position={[22.152, -102.300]}>
                    <Popup>Refugio: Esc. Primaria Benito Juárez</Popup>
                  </Marker>
                  <Marker position={[22.158, -102.295]}>
                    <Popup>Refugio: Centro Comunitario Progreso</Popup>
                  </Marker>
                </LayerGroup>
              )}

              {analysisPoint && (
                <Marker position={analysisPoint}>
                  <Popup>Punto de Análisis</Popup>
                </Marker>
              )}

              <MapEvents onClick={handleMapClick} onMouseMove={handleMouseMove} />
            </MapContainer>

            {/* Map Controls */}
            <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
              <button 
                onClick={handleLocate}
                disabled={isLocating}
                className={`w-10 h-10 bg-white border border-[#141414] rounded shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors ${isLocating ? 'animate-pulse' : ''}`}
                title="Ubicar mi posición"
              >
                <Crosshair className={`w-5 h-5 ${isLocating ? 'text-blue-500' : ''}`} />
              </button>
              <button 
                onClick={() => setIsAnalysisMode(!isAnalysisMode)}
                className={`w-10 h-10 border border-[#141414] rounded shadow-lg flex items-center justify-center transition-colors ${isAnalysisMode ? 'bg-[#1e3a8a] text-white' : 'bg-white hover:bg-gray-50'}`}
                title="Herramienta de Análisis (Pin)"
              >
                <MapPin className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 bg-white border border-[#141414] rounded shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors">
                <Maximize className="w-5 h-5" />
              </button>
            </div>

            {isAnalysisMode && (
              <div className="absolute top-4 left-16 z-[1000] bg-[#1e3a8a] text-white px-4 py-2 rounded-full text-[11px] font-bold shadow-xl animate-bounce">
                Haz clic en el mapa para analizar el riesgo
              </div>
            )}

            {/* Legend Overlay */}
            <div className="absolute bottom-6 left-6 z-[1000] bg-white/95 backdrop-blur border border-[#141414] p-4 rounded-xl shadow-2xl max-w-[200px]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Simbología</p>
              <div className="space-y-2">
                <LegendItem color="#dc2626" label="Riesgo Muy Alto" />
                <LegendItem color="#f97316" label="Riesgo Alto" />
                <LegendItem color="#f59e0b" label="Riesgo Medio" />
                <LegendItem color="#22c55e" label="Riesgo Bajo" />
              </div>
            </div>
          </div>

          {/* Right Analysis Panel */}
          <aside className="w-[360px] bg-white border-l border-[#141414] flex flex-col overflow-hidden shadow-2xl z-40">
            <div className="p-6 border-b border-[#141414] bg-gray-50">
              <h2 className="font-bold text-sm uppercase tracking-tight">Panel de Análisis</h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">Pabellón de Arteaga · 2024</p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Point Analysis or General Stats */}
              {analysisPoint ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] text-white rounded-2xl shadow-xl shadow-blue-900/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">Análisis de Punto</span>
                      <button onClick={() => setAnalysisPoint(null)} className="text-white/60 hover:text-white">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-3xl font-bold tracking-tight mb-1">
                      {riskScore >= 7 ? 'RIESGO ALTO' : riskScore >= 4 ? 'RIESGO MEDIO' : 'RIESGO BAJO'}
                    </p>
                    <p className="text-[11px] opacity-80 mb-2">Score: {riskScore.toFixed(1)} / 10 · {pointRisks.length} factores detectados</p>
                    {approxAddress && (
                      <div className="flex items-start gap-2 mb-4 opacity-90">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                        <p className="text-[10px] leading-tight">{approxAddress}</p>
                      </div>
                    )}
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${riskScore * 10}%` }}
                        className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Desglose de Amenazas</p>
                    {pointRisks.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-[11px] text-gray-400 italic">No se detectan intersecciones espaciales en este punto.</p>
                      </div>
                    ) : (
                      pointRisks.map((risk, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-lg shadow-sm hover:border-[#1e3a8a] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: risk.color }} />
                            <div>
                              <p className="text-[11px] font-bold leading-none">{risk.name}</p>
                              <p className="text-[9px] text-gray-400 uppercase mt-1">{risk.type}</p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                            risk.level === 'Muy Alto' ? 'bg-red-50 text-red-600 border-red-100' : 
                            risk.level === 'Alto' ? 'bg-orange-50 text-orange-600 border-orange-100' : 
                            'bg-yellow-50 text-yellow-600 border-yellow-100'
                          }`}>
                            {risk.level}
                          </span>
                        </motion.div>
                      ))
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Fórmula Aplicada</p>
                    <div className="space-y-2 font-mono text-[9px] text-gray-500">
                      <div className="flex justify-between"><span>Peligro (50%)</span><span>+{(riskScore * 0.5).toFixed(1)}</span></div>
                      <div className="flex justify-between"><span>Exposición (30%)</span><span>+{(riskScore * 0.3).toFixed(1)}</span></div>
                      <div className="flex justify-between"><span>Vulnerabilidad (20%)</span><span>+{(riskScore * 0.2).toFixed(1)}</span></div>
                      <div className="flex justify-between border-t border-gray-200 pt-1 font-bold text-[#1e3a8a]">
                        <span>Índice Total</span><span>{riskScore.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <button 
                      onClick={getAiAnalysis}
                      disabled={isAiLoading || pointRisks.length === 0}
                      className="w-full py-3 bg-[#1e3a8a] text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-blue-900 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isAiLoading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                      {isAiLoading ? 'Analizando...' : 'Análisis con Gemini AI'}
                    </button>
                    
                    {aiAnalysis && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-blue-50 border border-blue-100 rounded-lg"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Shield className="w-3 h-3 text-[#1e3a8a]" />
                          <span className="text-[10px] font-bold text-[#1e3a8a] uppercase">Recomendaciones IA</span>
                        </div>
                        <p className="text-[10px] text-gray-700 leading-relaxed whitespace-pre-wrap">
                          {aiAnalysis}
                        </p>
                        <button 
                          onClick={() => setShowStreetView(true)}
                          className="mt-3 w-full py-2 bg-white border border-blue-200 text-[#1e3a8a] text-[9px] font-bold uppercase rounded flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors"
                        >
                          <Navigation2 className="w-3 h-3" />
                          Ver en Street View
                        </button>
                      </motion.div>
                    )}

                    <button className="w-full py-3 bg-[#141414] text-white text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-black transition-colors">
                      Generar Reporte de Punto
                    </button>
                  </div>
                </motion.div>
              ) : (
                <>
                  <div className="p-5 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] text-white rounded-2xl shadow-xl shadow-blue-900/20">
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-2">Índice Municipal</p>
                    <p className="text-3xl font-bold tracking-tight mb-1">RIESGO ALTO</p>
                    <p className="text-[11px] opacity-80 mb-4">Score: 6.8 / 10 · Percentil 78° estatal</p>
                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-white w-[68%] rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <SmallStat label="Población" value="41,862" sub="INEGI 2020" />
                    <SmallStat label="Localidades" value="191" sub="238 AGEBs" />
                    <SmallStat label="Precipitación" value="440mm" sub="Anual" />
                    <SmallStat label="Heladas" value="25 días" sub="Promedio" />
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic serif">Distribución de Amenazas</p>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={RISKS_DISTRIBUTION}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={60}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {RISKS_DISTRIBUTION.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic serif">Precipitación Mensual</p>
                    <div className="h-40">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={PRECIPITATION_DATA}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                          <YAxis hide />
                          <Tooltip cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="mm" fill="#1e3a8a" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}} />

      {/* Street View Modal */}
      <AnimatePresence>
        {showStreetView && analysisPoint && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-12"
          >
            <div className="bg-white w-full h-full rounded-2xl overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 bg-[#1e3a8a] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Navigation2 className="w-5 h-5" />
                  <h3 className="font-bold text-sm uppercase tracking-tight">Inspección de Campo (Street View)</h3>
                </div>
                <button onClick={() => setShowStreetView(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex-1 bg-gray-100">
                <iframe 
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  src={`https://www.google.com/maps/embed/v1/streetview?key=${(import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyD8FAEWMfXQwJLlqKKmJjnQuMyhJeG1sKA'}&location=${analysisPoint.lat},${analysisPoint.lng}&heading=210&pitch=10&fov=90`}
                />
              </div>
              <div className="p-4 bg-gray-50 text-[10px] text-gray-500 italic text-center">
                Ubicación aproximada: {analysisPoint.lat.toFixed(6)}, {analysisPoint.lng.toFixed(6)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LegendItem({ color, label }: { color: string, label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
      <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tight">{label}</span>
    </div>
  );
}

function AlertItem({ type, title, desc, time }: { type: 'danger' | 'warning' | 'info', title: string, desc: string, time: string }) {
  const colors = {
    danger: 'border-red-500 bg-red-50 text-red-700',
    warning: 'border-amber-500 bg-amber-50 text-amber-700',
    info: 'border-blue-500 bg-blue-50 text-blue-700'
  };
  return (
    <div className={`p-4 border-l-4 rounded-r-xl shadow-sm ${colors[type]}`}>
      <p className="text-[11px] font-bold uppercase tracking-tight">{title}</p>
      <p className="text-[10px] opacity-80 mt-1 leading-relaxed">{desc}</p>
      <p className="text-[9px] opacity-50 mt-2 font-bold uppercase">{time}</p>
    </div>
  );
}

function Step({ num, title, desc }: { num: string, title: string, desc: string }) {
  return (
    <div className="flex gap-4">
      <span className="text-xl font-bold text-gray-200 italic serif">{num}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-tight">{title}</p>
        <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function SmallStat({ label, value, sub }: { label: string, value: string, sub: string }) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className="text-lg font-bold text-gray-700 leading-none">{value}</p>
      <p className="text-[9px] text-gray-400 mt-1">{sub}</p>
    </div>
  );
}
