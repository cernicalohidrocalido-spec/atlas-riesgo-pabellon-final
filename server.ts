import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Proxy para INEGI DENUE
  app.get("/api/inegi/denue", async (req, res) => {
    const { cat, token } = req.query;
    try {
      const url = `https://www.inegi.org.mx/app/api/denue/v1/consulta/BuscarAreaAct/01/006/0/0/0/0/0/0/0/${cat}/1/100/0/${token}`;
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error fetching INEGI data" });
    }
  });

  // Proxy para Google Geocoding
  app.get("/api/google/geocode", async (req, res) => {
    const { address, latlng, key } = req.query;
    let url = "https://maps.googleapis.com/maps/api/geocode/json?";
    if (address) url += `address=${encodeURIComponent(address as string)}&`;
    if (latlng) url += `latlng=${latlng}&`;
    url += `key=${key}&components=country:MX`;
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Error fetching Google Geocoding data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
