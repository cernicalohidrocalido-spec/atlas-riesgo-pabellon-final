/**
 * Cloudflare Worker — Proxy CORS para INEGI DENUE
 * Atlas de Riesgos · Pabellón de Arteaga · IMBIO 2025
 *
 * DESPLIEGUE GRATUITO (1 vez, ~2 minutos):
 * 1. Ve a https://workers.cloudflare.com/ y crea una cuenta gratuita
 * 2. Crea un nuevo Worker → pega este código → Deploy
 * 3. Copia la URL del worker (ej: atlas-denue.tu-usuario.workers.dev)
 * 4. En src/constants.ts, establece:
 *    export const DENUE_PROXY = 'https://atlas-denue.tu-usuario.workers.dev';
 */

const INEGI_BASE = 'https://www.inegi.org.mx/app/api/denue/v1/consulta';
const TOKEN = '6bce26ed-3908-48e5-ad4a-d11bbb70ba36';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const tipo = url.searchParams.get('tipo') || 'area';  // 'area' | 'radio'
    const actividad = url.searchParams.get('actividad') || '';
    const lat  = url.searchParams.get('lat') || '';
    const lng  = url.searchParams.get('lng') || '';
    const radio = url.searchParams.get('radio') || '1500';
    const mun  = url.searchParams.get('municipio') || '006';

    let inegiUrl;
    if (tipo === 'radio' && lat && lng) {
      inegiUrl = `${INEGI_BASE}/BuscarRadio/${lng},${lat}/${radio}/${encodeURIComponent(actividad)}/0/${TOKEN}`;
    } else {
      inegiUrl = `${INEGI_BASE}/BuscarAreaAct/01/${mun}/0/0/0/0/0/0/0/${encodeURIComponent(actividad)}/1/100/0/${TOKEN}`;
    }

    try {
      const resp = await fetch(inegiUrl);
      const data = await resp.text();
      return new Response(data, {
        status: resp.status,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
};
