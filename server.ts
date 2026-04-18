import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // CORS headers para desarrollo local
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: "2.1.0" });
  });

  // Proxy DENUE: búsqueda por área municipal
  app.get("/api/inegi/denue", async (req, res) => {
    const { actividad, municipio = '006', token } = req.query;
    const TOKEN = token || '6bce26ed-3908-48e5-ad4a-d11bbb70ba36';
    const act   = encodeURIComponent(String(actividad || ''));
    const url   = `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarAreaAct/01/${municipio}/0/0/0/0/0/0/0/${act}/1/100/0/${TOKEN}`;
    console.log(`[DENUE área] ${act}`);
    try {
      const r = await fetch(url);
      if (!r.ok) return res.status(r.status).json({ error: `INEGI: ${r.statusText}` });
      res.json(await r.json());
    } catch (e) {
      console.error('[DENUE área] Error:', e);
      res.status(500).json({ error: 'Error al conectar con INEGI DENUE' });
    }
  });

  // Proxy DENUE: búsqueda por radio (lng, lat)
  app.get("/api/inegi/denue/radio", async (req, res) => {
    const { lat, lng, radio = 1500, actividad, token } = req.query;
    const TOKEN = token || '6bce26ed-3908-48e5-ad4a-d11bbb70ba36';
    const act   = encodeURIComponent(String(actividad || ''));
    const url   = `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarRadio/${lng},${lat}/${radio}/${act}/0/${TOKEN}`;
    console.log(`[DENUE radio] ${act} r=${radio}m en (${lat},${lng})`);
    try {
      const r = await fetch(url);
      if (!r.ok) return res.status(r.status).json({ error: `INEGI: ${r.statusText}` });
      res.json(await r.json());
    } catch (e) {
      console.error('[DENUE radio] Error:', e);
      res.status(500).json({ error: 'Error al conectar con INEGI DENUE' });
    }
  });

  // Proxy Google Geocoding
  app.get("/api/google/geocode", async (req, res) => {
    const { address, latlng, key } = req.query;
    let url = "https://maps.googleapis.com/maps/api/geocode/json?";
    if (address) url += `address=${encodeURIComponent(String(address))}&`;
    if (latlng)  url += `latlng=${latlng}&`;
    url += `key=${key}&components=country:MX&language=es`;
    try {
      const r = await fetch(url);
      if (!r.ok) return res.status(r.status).json({ error: `Google: ${r.statusText}` });
      res.json(await r.json());
    } catch (e) {
      res.status(500).json({ error: 'Error Google Geocoding' });
    }
  });

  // Vite dev / static production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🗺  Atlas de Riesgos · servidor en http://localhost:${PORT}`);
    console.log(`   Proxy DENUE activo. INEGI token configurado.`);
  });
}

startServer();
