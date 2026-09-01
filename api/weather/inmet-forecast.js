// Vercel Serverless Function: INMET Municipal Forecast (Passo Fundo - 4314100)
// Proxies https://apiprevmet3.inmet.gov.br/previsao/4314100 to bypass browser CORS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://apiprevmet3.inmet.gov.br/previsao/4314100', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portal-Defesa-Civil-Passo-Fundo',
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: INMET API responded with status 
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('[API inmet-forecast] Error fetching from INMET:', error.message);
    return res.status(502).json({
      error: 'Falha ao obter previsão oficial do INMET',
      details: error.message
    });
  }
}
