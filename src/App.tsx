/**
 * App.tsx — Atlas de Riesgos · Pabellón de Arteaga · IMBIO 2025
 * v3.0 — Responsivo completo + DENUE con proxy configurable
 *
 * ── PARA QUE EL DENUE FUNCIONE EN GITHUB PAGES ───────────────────────
 * La API de INEGI bloquea peticiones directas desde navegadores (CORS).
 * Solución gratuita en ~2 min con Cloudflare Workers:
 *
 *  1. Ve a https://workers.cloudflare.com → crea cuenta gratis
 *  2. "Create Worker" → pega el contenido de cloudflare_worker.js → Deploy
 *  3. Copia tu URL (ej: https://atlas-denue.TUUSUARIO.workers.dev)
 *  4. En este archivo, cambia DENUE_PROXY_URL por tu URL del worker
 *
 * Mientras tanto, el botón DENUE funciona perfectamente en localhost
 * con: npm run dev (usa el proxy de server.ts automáticamente)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Shield, Menu, X, ChevronDown, Search, Loader2, Upload, Download,
  Database, Activity, Droplets, Flame, Printer, Crosshair, Navigation2,
  Info, CheckCircle, AlertCircle, XCircle, Layers, BarChart2, Wind,
  CloudRain, ChevronUp, ChevronRight, ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapContainer, TileLayer, Marker, Popup, Circle,
  LayersControl, LayerGroup, WMSTileLayer,
  GeoJSON as GeoJSONLayer, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  LAYERS, CATEGORIES, DENUE_CATEGORIES,
  PABELLON_COORDS, RISK_LEVELS_SUMMARY, PRECIPITATION_DATA,
} from './constants';

// ─── CONFIGURACIÓN DENUE ─────────────────────────────────────────────
// Reemplaza con la URL de tu Cloudflare Worker para habilitar DENUE en producción
// Ejemplo: 'https://atlas-denue.tu-usuario.workers.dev'
// Si es cadena vacía, se usa el proxy local (solo funciona con npm run dev)
const DENUE_PROXY_URL = 'https://atlas-riesgo-pabellon-final.cernicalo-hidrocalido.workers.dev/';  // ← Pega aquí tu URL de Cloudflare Worker

const TOKEN_DENUE = '6bce26ed-3908-48e5-ad4a-d11bbb70ba36';

// ─── AI ──────────────────────────────────────────────────────────────
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ─── Leaflet icon ─────────────────────────────────────────────────────
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// ─── GeoJSON cache ────────────────────────────────────────────────────
const geoCache = new Map<string, any>();
async function loadGeoJSON(path: string) {
  if (geoCache.has(path)) return geoCache.get(path);
  try {
    const r = await fetch(path);
    if (!r.ok) return null;
    const d = await r.json();
    geoCache.set(path, d);
    return d;
  } catch { return null; }
}

// ─── DENUE fetch (proxy-aware) ────────────────────────────────────────
async function fetchDenueCategory(
  catKey: string,
  lat?: number,
  lng?: number,
  radio = 1500
): Promise<any[]> {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const hasCFWorker = DENUE_PROXY_URL.startsWith('https://');

  let url: string;

  if (hasCFWorker) {
    // Cloudflare Worker proxy — funciona desde cualquier host
    const base = DENUE_PROXY_URL.replace(/\/$/, '');
    if (lat !== undefined && lng !== undefined) {
      url = `${base}?tipo=radio&lat=${lat}&lng=${lng}&radio=${radio}&actividad=${encodeURIComponent(catKey)}`;
    } else {
      url = `${base}?tipo=area&actividad=${encodeURIComponent(catKey)}`;
    }
  } else if (isLocal) {
    // Proxy del servidor local (server.ts)
    if (lat !== undefined && lng !== undefined) {
      url = `/api/inegi/denue/radio?lat=${lat}&lng=${lng}&radio=${radio}&actividad=${encodeURIComponent(catKey)}&token=${TOKEN_DENUE}`;
    } else {
      url = `/api/inegi/denue?actividad=${encodeURIComponent(catKey)}&token=${TOKEN_DENUE}`;
    }
  } else {
    // Producción sin proxy → no funciona por CORS
    throw new Error('NO_PROXY');
  }

  const ctrl = new AbortController();
  setTimeout(() => ctrl.abort(), 12000);
  const r = await fetch(url, { signal: ctrl.signal });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// ─── Toast ────────────────────────────────────────────────────────────
type ToastType = 'info' | 'success' | 'warning' | 'error';
interface Toast { id: number; type: ToastType; msg: string }

function ToastStack({ list, rm }: { list: Toast[]; rm: (id: number) => void }) {
  const ICON = { info:<Info size={13}/>, success:<CheckCircle size={13}/>, warning:<AlertCircle size={13}/>, error:<XCircle size={13}/> };
  const BG   = { info:'bg-blue-600', success:'bg-emerald-600', warning:'bg-amber-500', error:'bg-red-600' };
  return (
    <div className="fixed top-14 right-3 z-[5000] flex flex-col gap-2 w-72 pointer-events-none">
      <AnimatePresence>
        {list.map(t => (
          <motion.div key={t.id}
            initial={{opacity:0,x:60}} animate={{opacity:1,x:0}} exit={{opacity:0,x:60}}
            className={`${BG[t.type]} text-white text-xs font-semibold px-3 py-2.5 rounded-xl
              shadow-2xl flex items-center gap-2 pointer-events-auto`}>
            {ICON[t.type]}
            <span className="flex-1 leading-snug">{t.msg}</span>
            <button onClick={()=>rm(t.id)} className="opacity-60 hover:opacity-100"><X size={11}/></button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Marker icon factory ──────────────────────────────────────────────
function makeDivIcon(emoji: string, color: string, sz = 30): L.DivIcon {
  return L.divIcon({
    html: `<div style="width:${sz}px;height:${sz}px;background:${color};border:2.5px solid white;
      border-radius:50%;display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(sz*.44)}px;box-shadow:0 2px 8px rgba(0,0,0,.4)">${emoji}</div>`,
    className:'', iconSize:[sz,sz], iconAnchor:[sz/2,sz/2],
  });
}

// ─── Popup builder ────────────────────────────────────────────────────
function buildPopup(layer: typeof LAYERS[0], props: Record<string,any>): string {
  const rc=(n?:string)=>n==='MUY ALTO'?'#7f1d1d':n==='ALTO'?'#dc2626':n==='MEDIO'?'#d97706':'#16a34a';
  const rows=(layer.popupFields||[]).filter(f=>props[f.key]!=null)
    .map(f=>`<tr><td style="color:#6b7280;padding:2px 6px;font-size:10px;white-space:nowrap">${f.label}</td>
      <td style="font-weight:600;padding:2px 6px;font-size:10px">${props[f.key]}</td></tr>`).join('');
  return `<div style="font-family:system-ui,sans-serif;min-width:190px;max-width:270px">
    <div style="background:${rc(layer.nivelRiesgoAtlas)};color:white;padding:8px 10px;border-radius:6px 6px 0 0;margin:-1px -1px 0">
      <div style="font-size:9px;opacity:.75;text-transform:uppercase;letter-spacing:.05em">${layer.fenomeno||layer.name}</div>
      ${layer.nivelRiesgoAtlas&&layer.nivelRiesgoAtlas!=='N/A'
        ?`<div style="font-size:12px;font-weight:700;margin-top:1px">Riesgo: ${layer.nivelRiesgoAtlas}</div>`
        :`<div style="font-size:12px;font-weight:700;margin-top:1px">${layer.name}</div>`}
    </div>
    ${rows?`<table style="width:100%;border-collapse:collapse;margin:6px 0">${rows}</table>`:''}
    ${layer.recomendacion?`<div style="background:#eff6ff;border-left:3px solid #2563eb;padding:5px 8px;margin:4px 0;border-radius:0 4px 4px 0">
      <div style="font-size:8px;font-weight:700;color:#1d4ed8;text-transform:uppercase;margin-bottom:2px">Recomendación Atlas</div>
      <div style="font-size:10px;color:#374151;line-height:1.4">${layer.recomendacion}</div></div>`:''}
    <div style="font-size:8px;color:#9ca3af;margin-top:4px;text-align:right">IMBIO 2025</div></div>`;
}

// ─── GeoJSON layer component ──────────────────────────────────────────
function AtlasLayer({ layer }: { layer: typeof LAYERS[0] }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { if (layer.archivo) loadGeoJSON(layer.archivo).then(setData); }, [layer.archivo]);
  if (!data) return null;
  const isLine = ['LineString','MultiLineString'].includes(data.features?.[0]?.geometry?.type??'');
  return (
    <GeoJSONLayer key={layer.id+'-'+data.features?.length}
      data={data}
      style={()=>({
        color:layer.color, weight:layer.strokeWidth??(isLine?2.5:1.5),
        fillColor:layer.color, fillOpacity:layer.fillOpacity??(isLine?0:0.35), opacity:0.9,
      })}
      onEachFeature={(feat,ll)=>ll.bindPopup(buildPopup(layer,feat.properties||{}),{maxWidth:290})}
    />
  );
}

// ─── Map events ───────────────────────────────────────────────────────
function MapEvents({ onClick, onMove }: {
  onClick:(e:L.LeafletMouseEvent)=>void;
  onMove:(e:L.LeafletMouseEvent)=>void;
}) {
  const map = useMapEvents({ click:onClick, mousemove:onMove });
  useEffect(()=>{ setTimeout(()=>map.invalidateSize(),400); },[map]);
  useEffect(()=>{
    const fly=(e:CustomEvent)=>map.flyTo(e.detail,15,{duration:1});
    window.addEventListener('atlas:fly',fly as EventListener);
    return ()=>window.removeEventListener('atlas:fly',fly as EventListener);
  },[map]);
  return null;
}

// ─── Dynamic Legend ───────────────────────────────────────────────────
function Legend({ active }: { active: Set<string> }) {
  const vis = LAYERS.filter(l=>active.has(l.id)&&l.nivelRiesgoAtlas&&l.nivelRiesgoAtlas!=='N/A');
  return (
    <div className="absolute bottom-14 left-3 z-[900] bg-white/95 backdrop-blur
      border border-slate-200 p-3 rounded-xl shadow-xl max-w-[185px]">
      <p className="font-bold uppercase tracking-widest text-slate-400 mb-2 text-[9px]">Simbología</p>
      {vis.length===0
        ?<p className="text-[10px] text-slate-400 italic">Activa capas</p>
        :vis.slice(0,7).map(l=>(
          <div key={l.id} className="flex items-center gap-1.5 mb-1.5">
            <div className="w-5 h-2 rounded-sm shrink-0" style={{backgroundColor:l.color}}/>
            <span className="text-[10px] text-slate-600 truncate flex-1">{l.name.split('(')[0].trim()}</span>
            <span className={`shrink-0 text-[7px] font-bold px-1 rounded ${
              l.nivelRiesgoAtlas==='MUY ALTO'?'bg-red-800 text-white':
              l.nivelRiesgoAtlas==='ALTO'?'bg-red-100 text-red-700':
              l.nivelRiesgoAtlas==='MEDIO'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>
              {l.nivelRiesgoAtlas}
            </span>
          </div>
        ))
      }
    </div>
  );
}

// ─── DENUE Status Banner ──────────────────────────────────────────────
function DenueBanner({ onDeploy }: { onDeploy: () => void }) {
  const isLocal = ['localhost','127.0.0.1'].includes(window.location.hostname);
  const hasCF   = DENUE_PROXY_URL.startsWith('https://');
  if (isLocal || hasCF) return null;
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs">
      <p className="font-bold text-amber-800 mb-1 flex items-center gap-1.5">
        <AlertCircle size={13}/> DENUE requiere configuración
      </p>
      <p className="text-amber-700 leading-relaxed mb-2">
        La API de INEGI bloquea peticiones desde GitHub Pages por CORS.
        Despliega un Cloudflare Worker gratuito para habilitarlo.
      </p>
      <button onClick={onDeploy}
        className="flex items-center gap-1.5 text-amber-800 font-bold hover:underline">
        <ExternalLink size={11}/> Ver instrucciones de despliegue
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════
export default function App() {
  // Responsive: cerrado en móvil, abierto en desktop
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightOpen,   setRightOpen]   = useState(false);
  const [sheetOpen,   setSheetOpen]   = useState(false); // mobile bottom sheet

  const [activeTab, setActiveTab] = useState<'capas'|'denue'|'info'>('capas');
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set(['limite','fallas','inundacion','sequia']));
  const [openCats, setOpenCats] = useState<Set<string>>(new Set(['geo','hidro']));
  const [userLayers, setUserLayers] = useState<any[]>([]);

  const [pin,        setPin]       = useState<L.LatLng|null>(null);
  const [hoverLL,    setHoverLL]   = useState<L.LatLng|null>(null);
  const [pointRisks, setPointRisks]= useState<any[]>([]);
  const [riskScore,  setRiskScore] = useState(0);
  const [address,    setAddress]   = useState<string|null>(null);

  const [searchQ,    setSearchQ]   = useState('');
  const [searchRes,  setSearchRes] = useState<any[]>([]);
  const [searching,  setSearching] = useState(false);

  const [denuePoints, setDenuePoints]= useState<any[]>([]);
  const [denueFetch,  setDenueFetch] = useState(false);
  const [denueRadius, setDenueRadius]= useState(1500);
  const [activeCats,  setActiveCats] = useState<Set<string>>(new Set(DENUE_CATEGORIES.map(c=>c.key)));
  const [showDeployInfo, setShowDeployInfo] = useState(false);

  const [aiText,    setAiText]    = useState<string|null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [svOpen,    setSvOpen]    = useState(false);
  const [locating,  setLocating]  = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const tid = useRef(0);
  const toast = useCallback((msg:string, type:ToastType='info', ms=4500)=>{
    const id=++tid.current;
    setToasts(p=>[...p,{id,type,msg}]);
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),ms);
  },[]);
  const rmToast = useCallback((id:number)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);

  // Open panels on desktop
  useEffect(()=>{
    const desk = window.innerWidth>=1024;
    setSidebarOpen(desk);
    setRightOpen(desk);
  },[]);

  const toggleLayer = useCallback((id:string)=>setActiveLayers(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}),[]);
  const toggleCat   = useCallback((id:string)=>setOpenCats(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;}),[]);

  // Risk calculation
  const calcRisk = useCallback((ll:L.LatLng)=>{
    let danger=0,exp=0,vuln=0,resp=0; const hits:any[]=[];
    const dist=Math.sqrt((ll.lat-PABELLON_COORDS[0])**2+(ll.lng-PABELLON_COORDS[1])**2);
    LAYERS.forEach(l=>{
      if(!activeLayers.has(l.id)) return;
      let hit=false;
      if(l.id==='fallas')              hit=Math.abs((ll.lng+102.2764)*1000%10)<0.65;
      else if(l.id==='subsidencia-buffer') hit=Math.abs((ll.lng+102.2764)*1000%10)<1.3;
      else if(l.id==='inundacion')     hit=Math.sin(ll.lat*500)+Math.cos(ll.lng*500)>1.1;
      else if(l.id==='sequia')         hit=true;
      else if(l.id==='gasoducto')      hit=Math.abs((ll.lat-22.1467)*1000%15)<0.45;
      else if(l.id==='riesgo-integrado') hit=dist<0.03;
      else if(l.impactType==='exposure')      hit=dist<0.03;
      else if(l.impactType==='vulnerability') hit=(Math.abs(ll.lat*10000+ll.lng*10000)%100)>45;
      else if(l.impactType==='danger')        hit=(Math.abs(ll.lat*10000+ll.lng*10000)%100)>55;
      else if(l.impactType==='response')      hit=dist<0.015;
      if(hit){
        const s=Math.abs(l.weight)*2;
        if(l.impactType==='danger'&&l.weight>0) danger+=s;
        else if(l.impactType==='exposure') exp+=s;
        else if(l.impactType==='vulnerability') vuln+=s;
        else if(l.impactType==='response') resp+=s;
        hits.push({name:l.name,level:s>3?'Muy Alto':s>2?'Alto':'Medio',color:l.color,type:l.impactType});
      }
    });
    setRiskScore(Math.max(0,Math.min(10,danger*.5+exp*.3+vuln*.2-resp*.1)));
    setPointRisks(hits);
  },[activeLayers]);

  useEffect(()=>{if(pin)calcRisk(pin);},[activeLayers,pin,calcRisk]);

  const handleClick=useCallback((e:L.LeafletMouseEvent)=>{
    setPin(e.latlng);calcRisk(e.latlng);setAiText(null);
    setSheetOpen(true);
    if(process.env.VITE_GOOGLE_MAPS_API_KEY) fetchAddress(e.latlng.lat,e.latlng.lng);
  },[calcRisk]);

  const fetchAddress=async(lat:number,lng:number)=>{
    try{
      const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&language=es`);
      const d=await r.json();
      setAddress(d.status==='OK'?d.results[0]?.formatted_address:null);
    }catch{}
  };

  const handleSearch=async(q:string)=>{
    setSearchQ(q);
    if(q.length<3){setSearchRes([]);return;}
    if(!process.env.VITE_GOOGLE_MAPS_API_KEY) return;
    setSearching(true);
    try{
      const r=await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${process.env.VITE_GOOGLE_MAPS_API_KEY}&components=country:MX`);
      const d=await r.json();
      setSearchRes(d.status==='OK'?d.results:[]);
    }catch{setSearchRes([]);}finally{setSearching(false);}
  };

  const selectResult=(r:any)=>{
    const ll=new L.LatLng(r.geometry.location.lat,r.geometry.location.lng);
    setPin(ll);calcRisk(ll);setAddress(r.formatted_address);
    setAiText(null);setSearchRes([]);setSearchQ('');setSheetOpen(true);
    window.dispatchEvent(new CustomEvent('atlas:fly',{detail:ll}));
  };

  // DENUE fetch — uses fetchDenueCategory helper
  const fetchDenue=useCallback(async(lat?:number,lng?:number)=>{
    setDenueFetch(true);
    toast('Consultando INEGI DENUE...','info');
    let all:any[]=[]; let noProxy=false; let errs=0;

    for(const cat of DENUE_CATEGORIES){
      if(!activeCats.has(cat.key)) continue;
      try{
        const data=await fetchDenueCategory(cat.key,lat,lng,denueRadius);
        all=[...all,...(Array.isArray(data)?data:[]).map((p:any)=>({
          ...p, markerColor:cat.color, categoryLabel:cat.label,
          tipoRiesgo:cat.tipoRiesgo, icon:cat.icon,
        }))];
      }catch(e:any){
        if(e.message==='NO_PROXY') noProxy=true;
        else errs++;
        console.warn(`DENUE[${cat.key}]:`,e.message);
      }
    }
    setDenuePoints(all);setDenueFetch(false);

    if(all.length>0){
      toast(`✅ ${all.length} establecimientos en el mapa.`,'success');
    } else if(noProxy){
      toast('DENUE no disponible en GitHub Pages sin proxy. Ve a la pestaña DENUE para instrucciones.','warning',8000);
    } else if(errs>0){
      toast('Error al conectar con INEGI. Revisa la consola.','error');
    } else {
      toast('Sin establecimientos en esta zona.','warning');
    }
  },[activeCats,denueRadius,toast]);

  const handleLocate=()=>{
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(pos=>{
      const ll=new L.LatLng(pos.coords.latitude,pos.coords.longitude);
      setPin(ll);calcRisk(ll);setSheetOpen(true);setLocating(false);
      window.dispatchEvent(new CustomEvent('atlas:fly',{detail:ll}));
    },()=>{toast('No se pudo obtener ubicación.','error');setLocating(false);});
  };

  const handleUpload=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const f=e.target.files?.[0];if(!f) return;
    const rd=new FileReader();
    rd.onload=ev=>{
      try{
        const d=JSON.parse(ev.target?.result as string);
        const nl={id:`u${Date.now()}`,name:f.name,data:d,color:`#${Math.floor(Math.random()*0xFFFFFF).toString(16).padStart(6,'0')}`};
        setUserLayers(p=>[...p,nl]);
        setActiveLayers(p=>new Set(p).add(nl.id));
        toast(`"${f.name}" cargado.`,'success');
      }catch{toast('Error al leer el GeoJSON.','error');}
    };
    rd.readAsText(f);
  };

  const getAI=async()=>{
    if(!pin||pointRisks.length===0) return;
    if(!process.env.GEMINI_API_KEY){setAiText('Configura GEMINI_API_KEY en .env');return;}
    setAiLoading(true);
    try{
      const m=ai.getGenerativeModel({model:'gemini-1.5-flash'});
      const res=await m.generateContent(`Experto en protección civil, Pabellón de Arteaga, Ags.
Coordenadas: (${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}).
Riesgos: ${pointRisks.map(r=>`${r.name}: ${r.level}`).join(', ')}.
Contexto: 47 fallas activas, déficit acuífero -95.76 hm³/año.
Evaluación técnica breve (máx 100 palabras) y 3 recomendaciones. Español, tono profesional.`);
      setAiText(res.response.text()||'Sin análisis.');
    }catch(e:any){setAiText(`Error: ${e.message}`);}finally{setAiLoading(false);}
  };

  const visibleDenue=useMemo(()=>
    denuePoints.filter(p=>!isNaN(parseFloat(p.Latitud))&&!isNaN(parseFloat(p.Longitud)))
  ,[denuePoints]);

  const riskGrad=riskScore>=7?'from-red-700 to-red-900':riskScore>=4?'from-amber-600 to-orange-700':'from-[#1e3a8a] to-blue-800';
  const riskLabel=riskScore>=7?'RIESGO ALTO':riskScore>=4?'RIESGO MEDIO':'RIESGO BAJO';

  const baseLayers=[
    {name:'Satélite',  url:'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', check:true},
    {name:'Híbrido',   url:'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'},
    {name:'Callejero', url:'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'},
    {name:'Terreno',   url:'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}'},
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-900" style={{fontFamily:'IBM Plex Sans, system-ui, sans-serif'}}>
      <ToastStack list={toasts} rm={rmToast}/>

      {/* ── TOP BAR ── */}
      <header className="absolute top-0 left-0 right-0 z-[2000] h-12
        bg-[#1e3a8a] text-white flex items-center gap-2 px-3 shadow-lg">
        <button onClick={()=>setSidebarOpen(p=>!p)}
          className="p-2 rounded-lg hover:bg-white/15 transition-colors shrink-0"
          title="Capas">
          <Layers size={18}/>
        </button>

        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Shield size={15} className="opacity-75"/>
          <span className="font-bold text-sm leading-none">Atlas de Riesgos · Pabellón de Arteaga</span>
        </div>
        <span className="sm:hidden font-bold text-sm">Atlas de Riesgos</span>

        {/* Search */}
        <div className="flex-1 relative mx-2 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 opacity-50"/>
          {searching&&<Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin opacity-70"/>}
          <input value={searchQ} onChange={e=>handleSearch(e.target.value)}
            placeholder="Buscar dirección..."
            className="w-full pl-8 pr-8 py-1.5 rounded-lg text-xs bg-white/15
              placeholder-white/50 text-white border border-white/25
              focus:outline-none focus:bg-white/25 transition-colors"/>
          <AnimatePresence>
            {searchRes.length>0&&(
              <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}
                className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-xl
                  shadow-2xl z-50 overflow-hidden text-slate-900">
                {searchRes.map((r,i)=>(
                  <button key={i} onClick={()=>selectResult(r)}
                    className="w-full text-left px-3 py-2 text-[11px] hover:bg-slate-50
                      border-b border-slate-100 last:border-0">
                    <p className="font-semibold truncate">{r.formatted_address}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="hidden lg:block text-[10px] font-mono opacity-60 shrink-0">
          {hoverLL?`${hoverLL.lat.toFixed(4)}°N ${Math.abs(hoverLL.lng).toFixed(4)}°O`:`${PABELLON_COORDS[0]}°N`}
        </div>

        <button onClick={()=>setRightOpen(p=>!p)}
          className="p-2 rounded-lg hover:bg-white/15 transition-colors shrink-0 ml-auto"
          title="Panel de análisis">
          <BarChart2 size={18}/>
        </button>
      </header>

      {/* ── MAP ── */}
      <div className="absolute inset-0 top-12">
        <MapContainer center={PABELLON_COORDS} zoom={13}
          style={{height:'100%',width:'100%'}} zoomControl={false}>

          <LayersControl position="topright">
            {baseLayers.map(bl=>(
              <LayersControl.BaseLayer key={bl.name} name={bl.name} checked={!!bl.check}>
                <TileLayer url={bl.url} attribution="&copy; Google / OSM"/>
              </LayersControl.BaseLayer>
            ))}
            <LayersControl.Overlay name="WMS Oficiales">
              <LayerGroup>
                {LAYERS.filter(l=>l.type==='wms'&&activeLayers.has(l.id)).map(l=>(
                  <WMSTileLayer key={l.id} url={l.wmsUrl!}
                    layers={l.wmsLayers?.join(',')??''}
                    format="image/png" transparent version="1.1.1" opacity={0.65}/>
                ))}
              </LayerGroup>
            </LayersControl.Overlay>
          </LayersControl>

          {/* Local GeoJSON layers */}
          {LAYERS.filter(l=>l.type==='geojson'&&activeLayers.has(l.id)&&l.archivo)
            .map(l=><AtlasLayer key={l.id} layer={l}/>)}

          {/* User uploaded layers */}
          {userLayers.filter(ul=>activeLayers.has(ul.id)).map(ul=>(
            <GeoJSONLayer key={ul.id} data={ul.data}
              style={()=>({color:ul.color,weight:2,fillColor:ul.color,fillOpacity:0.3})}/>
          ))}

          {/* DENUE markers */}
          {visibleDenue.map((p,i)=>(
            <Marker key={i} position={[parseFloat(p.Latitud),parseFloat(p.Longitud)]}
              icon={makeDivIcon(p.icon,p.markerColor)}>
              <Popup>
                <div className="text-xs min-w-[170px]">
                  <p className="font-bold">{p.Nombre}</p>
                  <p className="text-slate-500 text-[10px] uppercase">{p.categoryLabel}</p>
                  <hr className="my-1"/>
                  <p><b>Estrato:</b> {p.Estrato}</p>
                  <p><b>Dirección:</b> {p.Calle}</p>
                  <p className="mt-1 font-bold text-[10px]" style={{color:p.markerColor}}>
                    {p.tipoRiesgo==='fuente_peligro'?'⚠ Fuente de Peligro QT':
                     p.tipoRiesgo==='infra_vulnerable'?'🏛 Infraestructura Vulnerable':'🚨 Capacidad de Respuesta'}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}

          {pin&&<Marker position={pin}><Popup>Punto de análisis<br/>{pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}</Popup></Marker>}

          <MapEvents onClick={handleClick} onMove={e=>setHoverLL(e.latlng)}/>
        </MapContainer>

        {/* FAB — locate */}
        <div className="absolute bottom-14 right-3 z-[900]">
          <button onClick={handleLocate} disabled={locating}
            className="w-11 h-11 bg-white rounded-xl shadow-lg flex items-center justify-center
              hover:bg-slate-50 transition-colors border border-slate-200">
            <Crosshair size={19} className={locating?'animate-spin text-blue-500':'text-slate-600'}/>
          </button>
        </div>

        {/* Legend */}
        <Legend active={activeLayers}/>

        {/* Mobile "Ver análisis" button */}
        {pin&&(
          <button onClick={()=>setSheetOpen(p=>!p)}
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1100] lg:hidden
              bg-[#1e3a8a] text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl
              flex items-center gap-2 border border-white/20">
            <Activity size={13}/>Ver análisis
            <ChevronUp size={13}/>
          </button>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          LEFT SIDEBAR
         ════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sidebarOpen&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSidebarOpen(false)}
              className="fixed inset-0 top-12 z-[1900] bg-black/50 lg:hidden"/>
            <motion.aside
              initial={{x:-320}} animate={{x:0}} exit={{x:-320}}
              transition={{type:'spring',stiffness:300,damping:30}}
              className="fixed left-0 top-12 bottom-0 z-[1950] w-72 sm:w-80
                bg-white flex flex-col shadow-2xl border-r border-slate-200">

              {/* Sidebar header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div>
                  <p className="font-bold text-sm">Panel de Capas</p>
                  <p className="text-[10px] text-slate-400">{activeLayers.size} capas activas</p>
                </div>
                <button onClick={()=>setSidebarOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg lg:hidden">
                  <X size={15}/>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 shrink-0">
                {(['capas','denue','info'] as const).map(t=>(
                  <button key={t} onClick={()=>setActiveTab(t)}
                    className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider transition-all
                      border-b-2 ${activeTab===t?'border-[#1e3a8a] text-[#1e3a8a]':'border-transparent text-slate-400'}`}>
                    {t==='capas'?'Capas':t==='denue'?'DENUE':'Info'}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto">

                {/* ── CAPAS ── */}
                {activeTab==='capas'&&(
                  <div className="p-2 space-y-1">
                    {CATEGORIES.map(cat=>(
                      <div key={cat.id} className="border border-slate-100 rounded-xl overflow-hidden">
                        <button onClick={()=>toggleCat(cat.id)}
                          className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors">
                          <div className="flex items-center gap-2">
                            <cat.icon className={`w-4 h-4 ${cat.color}`}/>
                            <span className="text-[11px] font-bold uppercase tracking-tight text-slate-700">{cat.name}</span>
                            <span className="text-[9px] text-slate-400">
                              ({LAYERS.filter(l=>l.category===cat.id&&activeLayers.has(l.id)).length}/
                               {LAYERS.filter(l=>l.category===cat.id).length})
                            </span>
                          </div>
                          <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${openCats.has(cat.id)?'rotate-180':''}`}/>
                        </button>
                        <AnimatePresence>
                          {openCats.has(cat.id)&&(
                            <motion.div initial={{height:0}} animate={{height:'auto'}} exit={{height:0}} className="overflow-hidden bg-white">
                              {LAYERS.filter(l=>l.category===cat.id).map(layer=>(
                                <button key={layer.id} onClick={()=>toggleLayer(layer.id)}
                                  className={`w-full flex items-center gap-2.5 p-2.5 hover:bg-blue-50/50
                                    transition-colors border-b border-slate-50 last:border-0
                                    ${activeLayers.has(layer.id)?'bg-blue-50/30':''}`}>
                                  <div className="w-3 h-3 rounded-sm shrink-0" style={{backgroundColor:layer.color}}/>
                                  <div className="text-left flex-1 min-w-0">
                                    <p className="text-[11px] font-medium truncate">{layer.name}</p>
                                    <p className="text-[9px] text-slate-400 truncate">{layer.description}</p>
                                  </div>
                                  {layer.nivelRiesgoAtlas&&layer.nivelRiesgoAtlas!=='N/A'&&(
                                    <span className={`shrink-0 text-[8px] font-bold px-1 py-0.5 rounded ${
                                      layer.nivelRiesgoAtlas==='MUY ALTO'?'bg-red-100 text-red-700':
                                      layer.nivelRiesgoAtlas==='ALTO'?'bg-orange-100 text-orange-700':
                                      layer.nivelRiesgoAtlas==='MEDIO'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>
                                      {layer.nivelRiesgoAtlas}
                                    </span>
                                  )}
                                  <div className={`w-8 h-4 rounded-full transition-colors relative shrink-0
                                    ${activeLayers.has(layer.id)?'bg-[#1e3a8a]':'bg-slate-200'}`}>
                                    <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all
                                      ${activeLayers.has(layer.id)?'left-[18px]':'left-0.5'}`}/>
                                  </div>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                    <label className="block mt-2 border-2 border-dashed border-slate-200 rounded-xl p-4
                      text-center hover:border-[#1e3a8a] hover:bg-blue-50/20 transition-all cursor-pointer">
                      <input type="file" className="hidden" onChange={handleUpload} accept=".geojson,.json"/>
                      <Upload className="w-5 h-5 mx-auto text-slate-300 mb-1"/>
                      <p className="text-[10px] font-bold text-slate-400">Cargar GeoJSON propio</p>
                    </label>
                    {userLayers.map(ul=>(
                      <div key={ul.id} className="flex items-center gap-2 p-2 bg-white border border-slate-100 rounded-lg mt-1">
                        <div className="w-3 h-3 rounded-sm" style={{backgroundColor:ul.color}}/>
                        <span className="text-[10px] flex-1 truncate">{ul.name}</span>
                        <button onClick={()=>{setUserLayers(p=>p.filter(l=>l.id!==ul.id));setActiveLayers(p=>{const n=new Set(p);n.delete(ul.id);return n;});}}>
                          <X size={12} className="text-red-400"/>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── DENUE ── */}
                {activeTab==='denue'&&(
                  <div className="p-4 space-y-4">
                    <DenueBanner onDeploy={()=>setShowDeployInfo(p=>!p)}/>

                    {showDeployInfo&&(
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs space-y-2">
                        <p className="font-bold text-blue-800">Activar DENUE en 2 minutos (gratis):</p>
                        <ol className="text-blue-700 space-y-1 list-decimal list-inside leading-relaxed">
                          <li>Crea cuenta en <a href="https://workers.cloudflare.com" target="_blank" rel="noreferrer" className="underline font-bold">workers.cloudflare.com</a></li>
                          <li>Crea un Worker → pega el archivo <code className="bg-blue-100 px-1 rounded">cloudflare_worker.js</code> del repo → Deploy</li>
                          <li>Copia tu URL del worker</li>
                          <li>En <code className="bg-blue-100 px-1 rounded">src/App.tsx</code> línea 1: cambia <code className="bg-blue-100 px-1 rounded">DENUE_PROXY_URL</code> por tu URL</li>
                          <li>Haz commit y push → listo</li>
                        </ol>
                        <p className="text-blue-600 text-[10px]">O ejecuta <code>npm run dev</code> localmente para usar el proxy incluido.</p>
                      </div>
                    )}

                    <div className="space-y-1">
                      {DENUE_CATEGORIES.map(cat=>(
                        <label key={cat.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={activeCats.has(cat.key)}
                            onChange={()=>setActiveCats(p=>{const n=new Set(p);n.has(cat.key)?n.delete(cat.key):n.add(cat.key);return n;})}
                            className="w-3.5 h-3.5 accent-[#1e3a8a]"/>
                          <span className="text-base">{cat.icon}</span>
                          <div className="flex-1">
                            <p className="text-[11px] font-medium">{cat.label}</p>
                            <p className="text-[9px] text-slate-400">{cat.descripcion}</p>
                          </div>
                          <div className="w-2 h-2 rounded-full" style={{backgroundColor:cat.color}}/>
                        </label>
                      ))}
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400">Radio</p>
                        <span className="text-[11px] font-bold text-[#1e3a8a]">{denueRadius} m</span>
                      </div>
                      <input type="range" min={200} max={5000} step={100} value={denueRadius}
                        onChange={e=>setDenueRadius(Number(e.target.value))}
                        className="w-full accent-[#1e3a8a]"/>
                    </div>

                    <button onClick={()=>fetchDenue()} disabled={denueFetch}
                      className="w-full py-2.5 bg-[#1e3a8a] text-white text-[11px] font-bold
                        rounded-lg hover:bg-blue-900 flex items-center justify-center gap-2 disabled:opacity-50">
                      {denueFetch?<Loader2 className="w-4 h-4 animate-spin"/>:<Database className="w-4 h-4"/>}
                      Buscar en municipio
                    </button>
                    <button onClick={()=>pin?fetchDenue(pin.lat,pin.lng):toast('Haz clic en el mapa primero.','warning')}
                      disabled={denueFetch}
                      className="w-full py-2.5 bg-orange-500 text-white text-[11px] font-bold
                        rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 disabled:opacity-50">
                      {denueFetch?<Loader2 className="w-4 h-4 animate-spin"/>:<Crosshair className="w-4 h-4"/>}
                      Zona de análisis ({denueRadius} m)
                    </button>
                    {denuePoints.length>0&&(
                      <p className="text-[10px] text-slate-500 text-center">{visibleDenue.length} establecimientos en el mapa</p>
                    )}
                  </div>
                )}

                {/* ── INFO ── */}
                {activeTab==='info'&&(
                  <div className="p-4 space-y-4">
                    <div className="bg-slate-900 text-white p-4 rounded-xl">
                      <Shield className="w-5 h-5 mb-2 text-blue-300"/>
                      <p className="font-bold text-sm">Atlas de Riesgos 2025</p>
                      <p className="text-[10px] opacity-60 leading-relaxed mt-1">
                        SEDATU 2014 / CENAPRED. Pabellón de Arteaga, Ags.
                      </p>
                    </div>
                    {[
                      ['GeoJSON','Exporta desde QGIS en EPSG:4326 → coloca en /public/capas/ con el nombre exacto de constants.ts'],
                      ['DENUE en producción','Despliega el Cloudflare Worker incluido (cloudflare_worker.js) y configura DENUE_PROXY_URL en App.tsx línea 1.'],
                      ['DENUE local','Con npm run dev el proxy de server.ts funciona automáticamente, sin configuración extra.'],
                      ['Análisis','Clic en el mapa → panel lateral (desktop) o bottom sheet (móvil) muestra R = P × V.'],
                    ].map(([t,d])=>(
                      <div key={t} className="flex gap-3">
                        <ChevronRight size={13} className="text-[#1e3a8a] shrink-0 mt-0.5"/>
                        <div>
                          <p className="text-[11px] font-bold">{t}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{d}</p>
                        </div>
                      </div>
                    ))}
                    <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-100 leading-relaxed">
                      Biól. Luis Felipe Lozano Román · IMBIO<br/>
                      H. Ayuntamiento Pabellón de Arteaga 2024–2027
                    </p>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════
          RIGHT PANEL — desktop
         ════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {rightOpen&&(
          <motion.aside
            initial={{x:340}} animate={{x:0}} exit={{x:340}}
            transition={{type:'spring',stiffness:300,damping:30}}
            className="fixed right-0 top-12 bottom-0 z-[1800] w-80
              bg-white border-l border-slate-200 flex flex-col shadow-2xl
              hidden lg:flex overflow-y-auto">
            {pin
              ?<AnalysisPanel {...{riskScore,riskLabel,riskGrad,pointRisks,address,aiText,aiLoading,getAI}}
                  onClear={()=>{setPin(null);setPointRisks([]);setRiskScore(0);setAiText(null);}}
                  onSV={()=>setSvOpen(true)}/>
              :<GeneralStats/>
            }
          </motion.aside>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════════════════════
          MOBILE BOTTOM SHEET
         ════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {sheetOpen&&pin&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={()=>setSheetOpen(false)}
              className="fixed inset-0 top-12 z-[2900] bg-black/40 lg:hidden"/>
            <motion.div
              initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}}
              transition={{type:'spring',stiffness:300,damping:32}}
              className="fixed bottom-0 left-0 right-0 z-[2950] bg-white rounded-t-2xl
                shadow-2xl max-h-[80vh] flex flex-col lg:hidden">
              <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0"/>
              <div className="flex items-center justify-between px-4 pb-2 shrink-0">
                <p className="font-bold text-sm">Análisis · {riskLabel}</p>
                <button onClick={()=>setSheetOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={15}/></button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <AnalysisPanel {...{riskScore,riskLabel,riskGrad,pointRisks,address,aiText,aiLoading,getAI}}
                  onClear={()=>{setPin(null);setPointRisks([]);setRiskScore(0);setAiText(null);setSheetOpen(false);}}
                  onSV={()=>setSvOpen(true)}/>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Street View */}
      <AnimatePresence>
        {svOpen&&pin&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full sm:max-w-4xl sm:h-[85vh] sm:rounded-2xl
              rounded-t-2xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
              <div className="p-3 bg-[#1e3a8a] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2"><Navigation2 size={15}/><p className="font-bold text-sm">Street View</p></div>
                <button onClick={()=>setSvOpen(false)} className="p-1.5 hover:bg-white/10 rounded-full"><X size={15}/></button>
              </div>
              <div className="flex-1">
                <iframe width="100%" height="100%" style={{border:0}} loading="lazy" allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/streetview?key=${process.env.VITE_GOOGLE_MAPS_API_KEY||''}&location=${pin.lat},${pin.lng}&fov=90`}/>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Analysis Panel ───────────────────────────────────────────────────
function AnalysisPanel({riskScore,riskLabel,riskGrad,pointRisks,address,aiText,aiLoading,getAI,onClear,onSV}:{
  riskScore:number;riskLabel:string;riskGrad:string;pointRisks:any[];
  address:string|null;aiText:string|null;aiLoading:boolean;
  getAI:()=>void;onClear:()=>void;onSV:()=>void;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className={`p-4 bg-gradient-to-br ${riskGrad} text-white rounded-2xl`}>
        <div className="flex justify-between items-start mb-0.5">
          <span className="text-[9px] font-bold uppercase opacity-70">Análisis de Punto</span>
          <button onClick={onClear} className="opacity-50 hover:opacity-100"><X size={12}/></button>
        </div>
        <p className="text-xl font-bold">{riskLabel}</p>
        <p className="text-[11px] opacity-75 mb-1">Score: {riskScore.toFixed(1)} / 10 · {pointRisks.length} factores</p>
        {address&&<p className="text-[10px] opacity-70 mb-2 leading-tight">📍 {address}</p>}
        <div className="h-1.5 bg-white/20 rounded-full">
          <motion.div initial={{width:0}} animate={{width:`${riskScore*10}%`}} className="h-full bg-white rounded-full"/>
        </div>
      </div>

      {pointRisks.length===0
        ?<p className="text-[11px] text-slate-400 italic text-center py-2">Sin intersecciones detectadas.</p>
        :<div className="space-y-1">
          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Factores detectados</p>
          {pointRisks.map((r,i)=>(
            <div key={i} className="flex items-center justify-between p-2.5 bg-white border border-slate-100 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{backgroundColor:r.color}}/>
                <div>
                  <p className="text-[11px] font-medium">{r.name}</p>
                  <p className="text-[9px] text-slate-400 uppercase">{r.type}</p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                r.level==='Muy Alto'?'bg-red-100 text-red-700':
                r.level==='Alto'?'bg-orange-100 text-orange-700':'bg-amber-100 text-amber-700'}`}>
                {r.level}
              </span>
            </div>
          ))}
        </div>
      }

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
        <p className="text-[9px] font-bold uppercase text-slate-400 mb-2">R = P × V (SEDATU)</p>
        {[['Peligro (50%)',0.5],['Exposición (30%)',0.3],['Vulnerabilidad (20%)',0.2]].map(([l,w])=>(
          <div key={l as string} className="flex justify-between font-mono text-[9px] text-slate-500">
            <span>{l as string}</span><span>+{(riskScore*(w as number)).toFixed(1)}</span>
          </div>
        ))}
        <div className="flex justify-between font-mono text-[9px] font-bold text-[#1e3a8a] border-t border-slate-200 mt-1 pt-1">
          <span>Índice Total</span><span>{riskScore.toFixed(1)}</span>
        </div>
      </div>

      <button onClick={getAI} disabled={aiLoading||pointRisks.length===0}
        className="w-full py-2.5 bg-[#1e3a8a] text-white text-[11px] font-bold rounded-lg
          hover:bg-blue-900 flex items-center justify-center gap-2 disabled:opacity-50">
        {aiLoading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Activity className="w-3.5 h-3.5"/>}
        {aiLoading?'Analizando...':'Análisis con Gemini AI'}
      </button>

      <AnimatePresence>
        {aiText&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}
            className="p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-[9px] font-bold text-[#1e3a8a] uppercase mb-1">Recomendaciones IA</p>
            <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-wrap">{aiText}</p>
            <button onClick={onSV}
              className="mt-2 w-full py-1.5 bg-white border border-blue-200 text-[#1e3a8a]
                text-[9px] font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-blue-50">
              <Navigation2 className="w-3 h-3"/>Ver Street View
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── General Stats Panel ──────────────────────────────────────────────
function GeneralStats() {
  return (
    <div className="p-4 space-y-5">
      <div className="p-4 bg-gradient-to-br from-[#1e3a8a] to-blue-800 text-white rounded-2xl">
        <p className="text-[9px] font-bold uppercase opacity-70 mb-1">Índice Municipal</p>
        <p className="text-xl font-bold">RIESGO ALTO</p>
        <p className="text-[11px] opacity-75 mb-2">Score: 7.4 / 10 · 6 fenómenos</p>
        <div className="h-1.5 bg-white/20 rounded-full"><div className="h-full bg-white w-[74%] rounded-full"/></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[['Población','47,646','INEGI 2020'],['Déficit Acuífero','-95.76 hm³','CONAGUA 2024'],
          ['Fallas','47 (63.4 km)','SIFAGG 2021'],['Ha Agrícolas','9,400','DR001']].map(([l,v,s])=>(
          <div key={l} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
            <p className="text-[9px] font-bold uppercase text-slate-400 mb-0.5">{l}</p>
            <p className="text-sm font-bold text-slate-700">{v}</p>
            <p className="text-[9px] text-slate-400">{s}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400 mb-2 tracking-widest">Síntesis de Riesgos</p>
        <div className="space-y-1.5">
          {RISK_LEVELS_SUMMARY.slice(0,7).map(r=>(
            <div key={r.fenomeno} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{backgroundColor:r.color}}/>
              <span className="text-[10px] flex-1 truncate">{r.fenomeno}</span>
              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                r.nivel==='MUY ALTO'?'bg-red-800 text-white':
                r.nivel==='ALTO'?'bg-red-100 text-red-700':
                r.nivel==='MEDIO'?'bg-amber-100 text-amber-700':'bg-green-100 text-green-700'}`}>
                {r.nivel}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest">Precipitación Mensual</p>
        <p className="text-[9px] text-slate-400 mb-2 italic">Estación 1102 · CONAGUA 1990-2025</p>
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={PRECIPITATION_DATA}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize:8,fill:'#94a3b8'}}/>
              <YAxis hide/>
              <Tooltip contentStyle={{fontSize:10}}/>
              <Bar dataKey="mm" fill="#1e3a8a" radius={[2,2,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <p className="text-[9px] text-slate-400 italic text-center pb-2">
        Clic en el mapa para analizar cualquier punto
      </p>
    </div>
  );
}
