/**
 * Vercel Serverless Function - Proxy CPTEC/INPE XML -> JSON
 * Endpoint: /api/weather/cptec?cityId=3825
 */

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { cityId = '3825' } = req.query;

  try {
    const cptecUrl = `http://servicos.cptec.inpe.br/XML/cidade/7dias/${cityId}/previsao.xml`;
    const response = await fetch(cptecUrl, {
      headers: {
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Falha na consulta ao CPTEC: HTTP ${response.status}`
      });
    }

    const xmlText = await response.text();

    // Extração com Regex leve e segura compatível com Node.js serverless sem dependências pesadas
    const extractTag = (xml, tag) => {
      const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
      return match ? match[1].trim() : '';
    };

    const cityName = extractTag(xmlText, 'nome') || 'Passo Fundo';
    const cityUf = extractTag(xmlText, 'uf') || 'RS';
    const updatedAt = extractTag(xmlText, 'atualizacao') || '';

    const previsaoRegex = /<previsao>([\s\S]*?)<\/previsao>/g;
    const forecasts = [];
    let match;

    while ((match = previsaoRegex.exec(xmlText)) !== null && forecasts.length < 5) {
      const pXml = match[1];
      const dia = extractTag(pXml, 'dia');
      const tempo = extractTag(pXml, 'tempo');
      const maxima = parseFloat(extractTag(pXml, 'maxima') || '0');
      const minima = parseFloat(extractTag(pXml, 'minima') || '0');
      const iuv = parseFloat(extractTag(pXml, 'iuv') || '0');

      forecasts.push({
        date: dia,
        conditionCode: tempo,
        minTemp: minima,
        maxTemp: maxima,
        iuv: iuv
      });
    }

    return res.status(200).json({
      success: true,
      city: cityName,
      uf: cityUf,
      updatedAt,
      forecasts
    });
  } catch (error) {
    console.error('[API CPTEC] Erro:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao consultar CPTEC/INPE'
    });
  }
};
