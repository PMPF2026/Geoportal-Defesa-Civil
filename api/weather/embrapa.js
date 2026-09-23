/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Proxy Serverless Vercel: Estação Meteorológica Embrapa Trigo (OMM 83914)
 * 
 * Fonte Oficial: Embrapa Trigo / Laboratório de Agrometeorologia
 * Endpoint: https://www.cnpt.embrapa.br/pesquisa/agromet/app/principal/relatorioMet.php
 * Tipo de Dado: Dados meteorológicos diários (consolidação diária agroclimática)
 */

let memoryCache = {
  data: null,
  timestamp: 0,
  key: ''
};

export default async function handler(req, res) {
  // 1. Headers de CORS e Cache HTTP Edge
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=900, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Determinação de Ano e Mês (Horário de Brasília UTC-3)
  const now = new Date();
  const brDate = new Date(now.getTime() - 3 * 3600 * 1000);
  const ano = req.query.ano || String(brDate.getFullYear());
  const mes = req.query.mes ? String(req.query.mes).padStart(2, '0') : String(brDate.getMonth() + 1).padStart(2, '0');
  const cacheKey = `${ano}_${mes}`;

  // 3. Verificação de Cache em Memória (TTL 15 min = 900.000 ms)
  const nowMs = Date.now();
  if (memoryCache.data && memoryCache.key === cacheKey && (nowMs - memoryCache.timestamp < 900000)) {
    return res.status(200).json({
      success: true,
      cached: true,
      data: memoryCache.data
    });
  }

  // 4. Requisição Server-to-Server com AbortController
  const targetUrl = `https://www.cnpt.embrapa.br/pesquisa/agromet/app/principal/relatorioMet.php?ano=${encodeURIComponent(ano)}&mes=${encodeURIComponent(mes)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erro na Embrapa Trigo: HTTP ${response.status}`);
    }

    const html = await response.text();
    const stationData = parseEmbrapaHtml(html, ano, mes);

    // Salva no cache em memória
    memoryCache = {
      data: stationData,
      timestamp: nowMs,
      key: cacheKey
    };

    return res.status(200).json({
      success: true,
      cached: false,
      data: stationData
    });
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('[Embrapa Proxy] Falha ao consultar Embrapa Trigo:', err.message);

    // Se temos cache anterior, responde com ele mesmo expirado para resiliência
    if (memoryCache.data) {
      return res.status(200).json({
        success: true,
        cached: true,
        stale: true,
        warning: 'Dados provenientes do último cache válido da Embrapa Trigo.',
        data: memoryCache.data
      });
    }

    return res.status(502).json({
      success: false,
      error: 'Não foi possível obter dados da Estação Embrapa Trigo no momento.',
      details: err.message
    });
  }
}

/**
 * Parser cirúrgico da tabela HTML class="fontpq" da Embrapa Trigo
 */
function parseEmbrapaHtml(html, ano, mes) {
  // 1. Extração do bloco da tabela principal
  const tableMatch = html.match(/<TABLE[^>]*class=["']fontpq["'][^>]*>([\s\S]*?)<\/TABLE>/i);
  if (!tableMatch) {
    throw new Error('Tabela agrometeorológica não encontrada no HTML retornado.');
  }

  const tableBody = tableMatch[1];
  const trMatches = tableBody.match(/<TR[^>]*>([\s\S]*?)<\/TR>/gi) || [];

  const dailyRecords = [];
  let monthlyRainAccum = 0;

  for (const tr of trMatches) {
    const tdMatches = tr.match(/<TD[^>]*>([\s\S]*?)<\/TD>/gi);
    if (!tdMatches || tdMatches.length < 11) continue;

    const cells = tdMatches.map(td => {
      return td.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, '').trim();
    });

    const dayStr = cells[0];
    // Valida se a primeira coluna é estritamente um dia do mês (01 a 31)
    if (!/^\d{1,2}$/.test(dayStr)) continue;

    // Descarte explícito de linhas de fechamento
    const firstColLower = dayStr.toLowerCase();
    if (firstColLower.includes('total') || firstColLower.includes('média') || firstColLower.includes('normal')) {
      continue;
    }

    const dayNum = parseInt(dayStr, 10);
    const dayPadded = String(dayNum).padStart(2, '0');
    const dateIso = `${ano}-${mes}-${dayPadded}`;

    // Colunas:
    // 0: Dia, 1: TM, 2: Tm, 3: TMéd, 4: Precip, 5: UR, 6: VelMax (m/s), 7: DirMax, 8: VelMed (m/s), 9: DirMed, 10: Insol (horas)
    const tempMax = parseNum(cells[1]);
    const tempMin = parseNum(cells[2]);
    const tempAvg = parseNum(cells[3]);
    const rain = parseNum(cells[4]);
    const humidity = parseNum(cells[5]);
    
    // Vento em m/s convertido para km/h (m/s * 3.6)
    const windGustMs = parseNum(cells[6]);
    const windGust = windGustMs !== null ? Math.round(windGustMs * 3.6 * 10) / 10 : null;
    const windGustDirection = parseText(cells[7]);
    
    const windSpeedMs = parseNum(cells[8]);
    const windSpeed = windSpeedMs !== null ? Math.round(windSpeedMs * 3.6 * 10) / 10 : null;
    const windDirectionText = parseText(cells[9]);

    const sunshineHours = parseNum(cells[10]);

    if (rain !== null && rain > 0) {
      monthlyRainAccum += rain;
    }

    dailyRecords.push({
      date: dateIso,
      day: dayNum,
      dateFormatted: `${dayPadded}/${mes}/${ano}`,
      tempMax,
      tempMin,
      tempAvg,
      rain,
      humidity,
      windSpeed,
      windDirectionText,
      windGust,
      windGustDirection,
      sunshineHours
    });
  }

  // Identificação do registro mais recente com dados
  let latest = null;
  let lastConsolidated = null;

  if (dailyRecords.length > 0) {
    // Registro mais recente é a última linha diária disponível
    latest = dailyRecords[dailyRecords.length - 1];

    // Busca o registro mais recente que possua dados consolidados de temperatura média
    for (let i = dailyRecords.length - 1; i >= 0; i--) {
      if (dailyRecords[i].tempAvg !== null || dailyRecords[i].tempMax !== null) {
        lastConsolidated = dailyRecords[i];
        break;
      }
    }
  }

  if (!lastConsolidated && latest) {
    lastConsolidated = latest;
  }

  // Prepara o objeto normalizado compatível com o modelo de estação do GeoPortal
  const activeRecord = latest || {};
  const activeDate = activeRecord.dateFormatted || `${mes}/${ano}`;

  return {
    id: 'EMBRAPA-TRIGO',
    deviceId: 83914,
    code: '83914',
    name: 'Estação Meteorológica Embrapa Trigo',
    shortName: 'Embrapa Trigo',
    subName: 'Laboratório de Agrometeorologia',
    source: 'EMBRAPA_TRIGO',
    sourceLabel: 'Embrapa Trigo — Laboratório de Agrometeorologia',
    dataType: 'Dados meteorológicos diários',
    type: 'Pesquisa / Agrometeorológica',
    status: 'updated',
    isOnline: true,
    lat: -28.262778,
    lon: -52.406667,
    altitude: 684,
    municipality: 'Passo Fundo / RS',
    location: 'BR-285, Km 294, Passo Fundo/RS',
    utm_x: 362022.22,
    utm_y: 6872885.69,
    observationDate: activeDate,
    lastUpdateText: activeDate,
    metrics: {
      temperature: activeRecord.tempAvg != null ? activeRecord.tempAvg : (lastConsolidated ? lastConsolidated.tempAvg : null),
      tempMin: activeRecord.tempMin != null ? activeRecord.tempMin : (lastConsolidated ? lastConsolidated.tempMin : null),
      tempMax: activeRecord.tempMax != null ? activeRecord.tempMax : (lastConsolidated ? lastConsolidated.tempMax : null),
      rain: activeRecord.rain,
      rainAccumMonthly: Math.round(monthlyRainAccum * 10) / 10,
      humidity: activeRecord.humidity != null ? activeRecord.humidity : (lastConsolidated ? lastConsolidated.humidity : null),
      windSpeed: activeRecord.windSpeed != null ? activeRecord.windSpeed : (lastConsolidated ? lastConsolidated.windSpeed : null),
      windDirectionText: activeRecord.windDirectionText || (lastConsolidated ? lastConsolidated.windDirectionText : null),
      windGust: activeRecord.windGust != null ? activeRecord.windGust : (lastConsolidated ? lastConsolidated.windGust : null),
      windGustDirection: activeRecord.windGustDirection || (lastConsolidated ? lastConsolidated.windGustDirection : null),
      sunshineHours: activeRecord.sunshineHours != null ? activeRecord.sunshineHours : (lastConsolidated ? lastConsolidated.sunshineHours : null),
      riverLevel: null,
      pressure: null
    },
    latestRecord: activeRecord,
    lastConsolidatedRecord: lastConsolidated,
    dailyRecords: dailyRecords,
    totalRecords: dailyRecords.length,
    monthlyRainAccum: Math.round(monthlyRainAccum * 10) / 10
  };
}

function parseNum(val) {
  if (!val) return null;
  const clean = val.replace(/,/g, '.').trim();
  if (!clean || clean === '-' || clean === '--') return null;
  const num = parseFloat(clean);
  return isNaN(num) ? null : num;
}

function parseText(val) {
  if (!val) return null;
  const clean = val.trim();
  if (!clean || clean === '-' || clean === '--') return null;
  return clean;
}
