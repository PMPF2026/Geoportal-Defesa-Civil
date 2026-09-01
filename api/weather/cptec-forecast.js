// Vercel Serverless Function: CPTEC / INPE Forecast (Passo Fundo - 3757)
// Proxies https://servicos.cptec.inpe.br/XML/cidade/3757/previsao.xml to bypass browser CORS

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=1800');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://servicos.cptec.inpe.br/XML/cidade/3757/previsao.xml', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portal-Defesa-Civil-Passo-Fundo'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).send('<cidade><erro>Falha CPTEC</erro></cidade>');
    }

    const xml = await response.text();
    return res.status(200).send(xml);
  } catch (error) {
    console.error('[API cptec-forecast] Error fetching from CPTEC:', error.message);
    return res.status(502).send('<cidade><erro>Indisponível</erro></cidade>');
  }
}
