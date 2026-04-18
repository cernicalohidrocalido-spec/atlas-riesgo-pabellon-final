# Atlas de Riesgos — Pabellón de Arteaga · IMBIO 2025
## Dashboard de Inteligencia Territorial

Visor cartográfico web del Atlas Municipal elaborado conforme a **SEDATU 2014** y metodología **CENAPRED**. Stack: React + TypeScript + Leaflet + Vite.

---

## Code Review — Problemas encontrados y mejoras aplicadas

| # | Área | Problema Original | Solución Aplicada |
|---|------|-------------------|-------------------|
| 1 | GeoJSON | Polígonos hardcodeados, no se cargaban archivos reales | `fetch()` + caché + componente `AtlasGeoJSONLayer` |
| 2 | DENUE | Sin `try/catch` estructurado; fallos silenciados | try/catch por categoría + sistema de Toasts visuales |
| 3 | DENUE | Solo búsqueda por municipio, sin filtro por zona | Nuevo modo `BuscarRadio` con radio configurable por slider |
| 4 | DENUE | Marcadores `<Circle>` sin diferenciación | Íconos SVG: `fuente_peligro` vs `infra_vulnerable` vs `respuesta` |
| 5 | Popups | Sin información técnica del Atlas | Popups inteligentes: fenómeno + nivel de riesgo + recomendación SEDATU |
| 6 | Categorías | No seguía taxonomía SEDATU | 6 categorías: Base / Geológicos / Hidrometeorológicos / QT / SE / Vuln-Riesgo |
| 7 | Simbología | Leyenda estática | `DynamicLegend` sincronizada con las capas activas |
| 8 | Fórmula riesgo | Seeds pseudoaleatorias arbitrarias | Calibrada con datos reales: fallas, sequía, inundación (CENAPRED) |
| 9 | UX | Sin feedback de estado en DENUE | Toasts: `info / success / warning / error` con auto-dismiss |
| 10 | constants.ts | Capas del Atlas mezcladas con datos mock | Separación limpia: LayerDef estructural vs datos estadísticos reales |

---

## Dónde colocar tus archivos GeoJSON de QGIS

```
/public/capas/
  LimitePabellon.geojson
  fallas_2024.geojson              ← SIFAGG (SOP Aguascalientes 2021)
  fallas_buffer20m.geojson         ← Buffer 20m generado en QGIS
  susceptibilidad_laderas.geojson
  inundacion_historica.geojson     ← ANR CENAPRED
  sequia_zonificacion.geojson
  temperatura_extrema.geojson
  cuerpos_agua.geojson
  gasoducto.geojson
  corredor_matpel_carr45.geojson   ← Buffer 500m sobre Carretera 45
  instalaciones_riesgo_fijo.geojson
  riesgo_incendio.geojson
  residuos_sdf.geojson
  plantas_tratamiento.geojson
  calidad_agua_pozos.geojson
  vulnerabilidad_social.geojson    ← por AGEB, Censo 2020
  vulnerabilidad_vivienda.geojson
  riesgo_integrado.geojson         ← mapa síntesis P x V
  unidades_salud.geojson
  refugios_evacuacion.geojson
  pozos_capapa.geojson
  escuelas.geojson
```

**Configuración de exportación en QGIS:**
- Formato: GeoJSON
- CRS: EPSG:4326 (WGS84)
- Codificación: UTF-8

**Generar buffer de fallas (20 m):**
`Vector → Herramientas de geoproceso → Buffer → Distancia: 20 m`

**Generar corredor MATPEL (500 m sobre Carr. 45):**
`Vector → Herramientas de geoproceso → Buffer → Distancia: 500 m`

Para que los popups inteligentes funcionen, cada GeoJSON debe incluir los campos definidos en `popupFields` de su `LayerDef` en `constants.ts`.

---

## Variables de entorno (.env)

```env
VITE_GOOGLE_MAPS_API_KEY=tu_key
GEMINI_API_KEY=tu_key
VITE_OPENWEATHER_API_KEY=tu_key
VITE_DENUE_TOKEN=6bce26ed-3908-48e5-ad4a-d11bbb70ba36
```

## Desarrollo

```bash
npm install
cp .env.example .env
npm run dev      # localhost:5000
npm run build    # /dist
```

## Nota CORS en GitHub Pages

La API DENUE bloquea peticiones directas desde el navegador. El servidor proxy (`server.ts`) resuelve esto localmente. Para producción, despliega en Render/Railway/Fly.io en lugar de GitHub Pages estático.

---

IMBIO · H. Ayuntamiento de Pabellón de Arteaga · Gestión 2024-2027
Fuentes: SEDATU 2014, CENAPRED 2021, CONAGUA 2024, INEGI 2020, SIFAGG (SOP Ags 2021)
