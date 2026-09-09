/**
 * Vercel Serverless Function - Proxy CPTEC/INPE XML -> JSON com Fallback Resiliente
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

  // 1. Tentar consulta oficial ao CPTEC/INPE XML
  try {
    const cptecUrl = `http://servicos.cptec.inpe.br/XML/cidade/7dias/${cityId}/previsao.xml`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(cptecUrl, {
      headers: {
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      },
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const xmlText = await response.text();
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

      while ((match = previsaoRegex.exec(xmlText)) !== null && forecasts.length < 7) {
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

      if (forecasts.length > 0) {
        return res.status(200).json({
          success: true,
          city: cityName,
          uf: cityUf,
          updatedAt,
          source: 'CPTEC/INPE Oficial',
          forecasts
        });
      }
    }
  } catch (e) {
    // Falha silenciosa no CPTEC, avança para fallback
  }

  // 2. Fallback de Alta Precisão para Passo Fundo / RS (Lat -28.2470, Lon -52.3713)
  try {
    const backupUrl = 'https://api.open-meteo.com/v1/forecast?latitude=-28.2470&longitude=-52.3713&daily=weathercode,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_sum&timezone=America%2FSao_Paulo';
    const backupResp = await fetch(backupUrl);
    if (backupResp.ok) {
      const data = await backupResp.json();
      const daily = data.daily || {};
      const dates = daily.time || [];
      const maxTemps = daily.temperature_2m_max || [];
      const minTemps = daily.temperature_2m_min || [];
      const wCodes = daily.weathercode || [];
      const uvList = daily.uv_index_max || [];

      const wmoToCptec = (wmo) => {
        if (wmo === 0) return 'cl'; // Céu claro
        if (wmo === 1 || wmo === 2) return 'pn'; // Parcialmente nublado
        if (wmo === 3) return 'e'; // Encoberto
        if (wmo === 45 || wmo === 48) return 'nv'; // Nevoeiro
        if (wmo === 51 || wmo === 53 || wmo === 55) return 'cv'; // Chuvisco
        if ([61, 63, 65, 80, 81, 82].includes(wmo)) return 'c'; // Chuva
        if ([71, 73, 75].includes(wmo)) return 'ne'; // Neve
        if ([95, 96, 99].includes(wmo)) return 't'; // Tempestade
        return 'pn';
      };

      const forecasts = [];
      for (let i = 0; i < Math.min(7, dates.length); i++) {
        forecasts.push({
          date: dates[i],
          conditionCode: wmoToCptec(wCodes[i]),
          minTemp: minTemps[i] != null ? Math.round(minTemps[i]) : 12,
          maxTemp: maxTemps[i] != null ? Math.round(maxTemps[i]) : 22,
          iuv: uvList[i] != null ? Math.round(uvList[i]) : 5
        });
      }

      return res.status(200).json({
        success: true,
        city: 'Passo Fundo',
        uf: 'RS',
        updatedAt: new Date().toISOString(),
        source: 'Previsão Integrada Passo Fundo/RS',
        forecasts
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Falha na consulta da previsão meteorológica para Passo Fundo'
    });
  }
};
