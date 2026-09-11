/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Rota Serverless Segura - Proxy Plugfield Core API
 * Endpoints suportados:
 *  - /api/weather/plugfield?action=devices
 *  - /api/weather/plugfield?action=device&deviceId=4283
 *  - /api/weather/plugfield?action=daily&deviceId=4283&begin=DD/MM/AAAA&end=DD/MM/AAAA
 */

const BASE_URL = 'https://prod-api.plugfield.com.br';

// Cache Serverless em memória (TTL: 6 minutos = 360.000 ms)
const cacheStore = {
  devices: { data: null, timestamp: 0 },
  deviceDetails: {}, // { [deviceId]: { data, timestamp } }
  daily: {}          // { [`${deviceId}_${begin}_${end}`]: { data, timestamp } }
};

const CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutos

// Lista oficial dos 16 deviceIds habilitados para o projeto Passo Fundo
const ENABLED_DEVICE_IDS = [
  4283,  // Transbrasiliana
  4253,  // Capinzal
  4798,  // Sede Independência
  4416,  // São Roque
  3009,  // Avena
  4931,  // Pulador
  4965,  // Quinto Giongo (Victor Issler)
  4678,  // Fredolino Chimango (Centro)
  2856,  // Fazenda Bugre
  4712,  // Bela Vista
  4713,  // Bom Recreio
  4714,  // Lobo da Costa (Entre Rios)
  4717,  // Camponesa
  4431,  // Avenida Brasil (Largo da Literatura)
  10994, // 2000 - ATITUS
  2041   // Veneza
];

const STATION_NAMES_MAP = {
  4283: 'Transbrasiliana',
  4253: 'Capinzal',
  4798: 'Sede Independência',
  4416: 'São Roque',
  3009: 'Avena',
  4931: 'Pulador',
  4965: 'Quinto Giongo (Victor Issler)',
  4678: 'Fredolino Chimango (Centro)',
  2856: 'Fazenda Bugre',
  4712: 'Bela Vista',
  4713: 'Bom Recreio',
  4714: 'Lobo da Costa (Entre Rios)',
  4717: 'Camponesa',
  4431: 'Avenida Brasil (Largo da Literatura)',
  10994: '2000 - ATITUS',
  2041: 'Veneza'
};

const STATION_TERRITORIAL_MAP = {
  4283: 'Urbana / Perimetral',
  4253: 'Rural / Bacia Hidrográfica',
  4798: 'Urbana / Administrativa',
  4416: 'Rural / Setor Leste',
  3009: 'Rural / Agrícola',
  4931: 'Rural / Bacia Hidrográfica',
  4965: 'Urbana / Victor Issler',
  4678: 'Urbana / Centro',
  2856: 'Rural / Bacia Hidrográfica',
  4712: 'Urbana / Bela Vista',
  4713: 'Rural / Setor Norte',
  4714: 'Rural / Bacia Hidrográfica',
  4717: 'Urbana / Camponesa',
  4431: 'Urbana / Eixo Central',
  10994: 'Universitária / Campus Atitus',
  2041: 'Urbana / Vila Veneza'
};

// Cache de access_token obtido via autenticação oficial (não expira segundo a especificação Plugfield)
let sessionAccessToken = null;

function getPlugfieldCredentials() {
  const apiKey = (
    process.env.PLUGFIELD_API_KEY ||
    process.env.PLUGFIELD_KEY ||
    process.env.PLUGFIELD_APIKEY ||
    process.env.PLUGFIELD_TOKEN ||
    process.env.PLUGFIELD_ACCESS_TOKEN ||
    process.env.API_KEY ||
    process.env.X_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  let accessToken = (
    process.env.PLUGFIELD_ACCESS_TOKEN ||
    process.env.PLUGFIELD_TOKEN ||
    process.env.ACCESS_TOKEN ||
    sessionAccessToken ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  const username = (process.env.PLUGFIELD_USERNAME || process.env.PLUGFIELD_USER || process.env.PLUGFIELD_EMAIL || '').trim();
  const password = (process.env.PLUGFIELD_PASSWORD || process.env.PLUGFIELD_PASS || '').trim();

  return { apiKey, accessToken, username, password };
}

/**
 * Constrói os cabeçalhos de autenticação oficiais da Plugfield com suporte flexível a x-api-key e Authorization
 */
async function buildAuthHeaders() {
  const creds = getPlugfieldCredentials();
  let { apiKey, accessToken, username, password } = creds;

  // Se o access_token não foi fornecido diretamente mas existem credenciais de login no ambiente, realiza o login oficial
  if (!accessToken && apiKey && username && password) {
    try {
      const loginResp = await fetch(`${BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({ username, password })
      });

      if (loginResp.ok) {
        const loginData = await loginResp.json();
        if (loginData && loginData.access_token) {
          sessionAccessToken = loginData.access_token;
          accessToken = sessionAccessToken;
        }
      } else {
        console.warn('[Plugfield Proxy] Falha na autenticação POST /login: HTTP', loginResp.status);
      }
    } catch (e) {
      console.warn('[Plugfield Proxy] Erro ao autenticar em POST /login:', e.message);
    }
  }

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  if (accessToken) {
    headers['Authorization'] = accessToken;
    headers['authorization'] = accessToken;
  }

  return { headers, apiKey, accessToken };
}

/**
 * Executa requisições à Plugfield testando variações de cabeçalho em caso de 401 ou 403
 */
async function fetchPlugfieldWithFallback(url, initialHeaders, apiKey) {
  let response = await fetch(url, { headers: initialHeaders, method: 'GET' });
  if (response.ok) return response;

  // Se retornou 401 ou 403:
  if ((response.status === 401 || response.status === 403) && apiKey) {
    // Tentativa A: Se não tinha Authorization, tenta com Authorization: apiKey
    if (!initialHeaders['Authorization']) {
      const authKeyHeaders = {
        ...initialHeaders,
        'Authorization': apiKey,
        'authorization': apiKey
      };
      const respA = await fetch(url, { headers: authKeyHeaders, method: 'GET' });
      if (respA.ok) return respA;

      // Tentativa B: Authorization: Bearer <apiKey>
      const bearerHeaders = {
        ...initialHeaders,
        'Authorization': `Bearer ${apiKey}`,
        'authorization': `Bearer ${apiKey}`
      };
      const respB = await fetch(url, { headers: bearerHeaders, method: 'GET' });
      if (respB.ok) return respB;
    } else {
      // Tentativa C: Se tinha Authorization e falhou, tenta SOMENTE com x-api-key
      const onlyKeyHeaders = { ...initialHeaders };
      delete onlyKeyHeaders['Authorization'];
      delete onlyKeyHeaders['authorization'];
      const respC = await fetch(url, { headers: onlyKeyHeaders, method: 'GET' });
      if (respC.ok) return respC;
    }
  }

  return response;
}

module.exports = async function handler(req, res) {
  // Configuração rigorosa de cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { action = 'devices', deviceId, begin, end, page = '1' } = req.query;
  const now = Date.now();

  try {
    const { headers, apiKey, accessToken } = await buildAuthHeaders();

    // 0. AÇÃO DE DIAGNÓSTICO: status
    if (action === 'status' || action === 'diag') {
      const creds = getPlugfieldCredentials();
      return res.status(200).json({
        success: true,
        status: 'online',
        hasApiKey: !!creds.apiKey,
        apiKeyLength: creds.apiKey ? creds.apiKey.length : 0,
        hasAccessToken: !!creds.accessToken,
        hasLoginCredentials: !!(creds.username && creds.password),
        configuredEnvKeys: Object.keys(process.env).filter(k => k.toUpperCase().includes('PLUG') || k.toUpperCase().includes('API')),
        timestamp: new Date().toISOString()
      });
    }

    // 1. AÇÃO: Listar todas as estações (/device?page=1)
    if (action === 'devices') {
      if (cacheStore.devices.data && (now - cacheStore.devices.timestamp < CACHE_TTL_MS)) {
        return res.status(200).json({
          success: true,
          cached: true,
          source: 'cache_server',
          data: cacheStore.devices.data
        });
      }

      const response = await fetchPlugfieldWithFallback(`${BASE_URL}/device?page=${page}`, headers, apiKey);

      if (!response.ok) {
        let details = null;
        try {
          const txt = await response.text();
          details = txt ? txt.slice(0, 300) : null;
        } catch {}
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /device: HTTP ${response.status}`,
          details,
          statusCode: response.status,
          hasApiKeyConfigured: !!apiKey
        });
      }

      const rawJson = await response.json();
      // Especificação OpenAPI 3.0 Plugfield: lista retornada na chave "deviceList"
      const rawStations = Array.isArray(rawJson)
        ? rawJson
        : (rawJson.deviceList || rawJson.data || rawJson.devices || []);

      // Filtra e normaliza apenas as 16 estações habilitadas de Passo Fundo
      const filteredStations = rawStations
        .filter(st => {
          const idNum = parseInt(st.id || st.deviceId || 0, 10);
          return ENABLED_DEVICE_IDS.includes(idNum);
        })
        .map(st => {
          const idNum = parseInt(st.id || st.deviceId || 0, 10);
          const dash = st.dashboard || {};
          return {
            id: idNum,
            deviceId: idNum,
            name: STATION_NAMES_MAP[idNum] || st.name || st.deviceName || `Estação ${idNum}`,
            type: STATION_TERRITORIAL_MAP[idNum] || 'Estação Meteorológica',
            latitude: st.latitude != null && st.latitude !== '' ? parseFloat(st.latitude) : null,
            longitude: st.longitude != null && st.longitude !== '' ? parseFloat(st.longitude) : null,
            altitude: st.altitude != null && st.altitude !== '' ? parseFloat(st.altitude) : null,
            sensors: st.sensorList || st.sensors || [],
            dashboard: dash,
            lastUpdateTimestamp: st.lastUpdateTimestamp || dash.lastUpdateTimestamp || (dash.timestamp ? parseInt(dash.timestamp, 10) : null)
          };
        });

      const resultPayload = {
        totalStations: filteredStations.length,
        stations: filteredStations,
        updatedAt: new Date().toISOString()
      };

      // Atualiza cache somente se houver estações válidas
      if (filteredStations.length > 0) {
        cacheStore.devices.data = resultPayload;
        cacheStore.devices.timestamp = now;
      }

      return res.status(200).json({
        success: true,
        cached: false,
        source: 'plugfield_api',
        data: resultPayload
      });
    }

    // 2. AÇÃO: Obter detalhes de estação individual (/device/{deviceId})
    if (action === 'device') {
      const devIdNum = parseInt(deviceId, 10);
      if (!devIdNum || !ENABLED_DEVICE_IDS.includes(devIdNum)) {
        return res.status(400).json({
          success: false,
          error: `deviceId '${deviceId}' inválido ou não habilitado para Passo Fundo.`
        });
      }

      const cacheKey = devIdNum;
      if (cacheStore.deviceDetails[cacheKey] && (now - cacheStore.deviceDetails[cacheKey].timestamp < CACHE_TTL_MS)) {
        return res.status(200).json({
          success: true,
          cached: true,
          source: 'cache_server',
          data: cacheStore.deviceDetails[cacheKey].data
        });
      }

      const response = await fetchPlugfieldWithFallback(`${BASE_URL}/device/${devIdNum}`, headers, apiKey);

      if (!response.ok) {
        let details = null;
        try {
          const txt = await response.text();
          details = txt ? txt.slice(0, 300) : null;
        } catch {}
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /device/${devIdNum}: HTTP ${response.status}`,
          details,
          statusCode: response.status
        });
      }

      const raw = await response.json();
      const dash = raw.dashboard || {};
      const payload = {
        id: devIdNum,
        deviceId: devIdNum,
        name: STATION_NAMES_MAP[devIdNum] || raw.name || `Estação ${devIdNum}`,
        type: STATION_TERRITORIAL_MAP[devIdNum] || 'Estação Meteorológica',
        latitude: raw.latitude != null && raw.latitude !== '' ? parseFloat(raw.latitude) : null,
        longitude: raw.longitude != null && raw.longitude !== '' ? parseFloat(raw.longitude) : null,
        altitude: raw.altitude != null && raw.altitude !== '' ? parseFloat(raw.altitude) : null,
        sensors: raw.sensorList || raw.sensors || [],
        dashboard: dash,
        lastUpdateTimestamp: raw.lastUpdateTimestamp || dash.lastUpdateTimestamp || (dash.timestamp ? parseInt(dash.timestamp, 10) : null),
        updatedAt: new Date().toISOString()
      };

      cacheStore.deviceDetails[cacheKey] = {
        data: payload,
        timestamp: now
      };

      return res.status(200).json({
        success: true,
        cached: false,
        source: 'plugfield_api',
        data: payload
      });
    }

    // 3. AÇÃO: Histórico diário dos últimos 5 dias (/data/daily)
    if (action === 'daily') {
      const devIdNum = parseInt(deviceId, 10);
      if (!devIdNum || !ENABLED_DEVICE_IDS.includes(devIdNum)) {
        return res.status(400).json({
          success: false,
          error: `deviceId '${deviceId}' inválido ou não habilitado para Passo Fundo.`
        });
      }

      if (!begin || !end) {
        return res.status(400).json({
          success: false,
          error: 'Parâmetros begin e end (formato DD/MM/AAAA) são obrigatórios para action=daily.'
        });
      }

      const cacheKey = `${devIdNum}_${begin}_${end}`;
      if (cacheStore.daily[cacheKey] && (now - cacheStore.daily[cacheKey].timestamp < CACHE_TTL_MS)) {
        return res.status(200).json({
          success: true,
          cached: true,
          source: 'cache_server',
          data: cacheStore.daily[cacheKey].data
        });
      }

      const url = `${BASE_URL}/data/daily?device=${devIdNum}&begin=${encodeURIComponent(begin)}&end=${encodeURIComponent(end)}`;
      const response = await fetchPlugfieldWithFallback(url, headers, apiKey);

      if (!response.ok) {
        let details = null;
        try {
          const txt = await response.text();
          details = txt ? txt.slice(0, 300) : null;
        } catch {}
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /data/daily: HTTP ${response.status}`,
          details,
          statusCode: response.status
        });
      }

      const rawData = await response.json();
      const dailyList = Array.isArray(rawData) ? rawData : (rawData.data || []);

      const payload = {
        deviceId: devIdNum,
        stationName: STATION_NAMES_MAP[devIdNum] || `Estação ${devIdNum}`,
        period: { begin, end },
        days: dailyList.map(item => ({
          localDate: item.localDate || item.date || null,
          temp: item.temp != null && item.temp !== '' ? parseFloat(item.temp) : null,
          tempMin: item.tempMin != null && item.tempMin !== '' ? parseFloat(item.tempMin) : null,
          tempMax: item.tempMax != null && item.tempMax !== '' ? parseFloat(item.tempMax) : null,
          rainAccum: item.rainAccum != null && item.rainAccum !== '' ? parseFloat(item.rainAccum) : (item.rain != null && item.rain !== '' ? parseFloat(item.rain) : 0),
          wind: item.wind != null && item.wind !== '' ? parseFloat(item.wind) : null,
          windBurst: item.windBurst != null && item.windBurst !== '' ? parseFloat(item.windBurst) : (item.winbMax != null && item.winbMax !== '' ? parseFloat(item.winbMax) : null),
          pressure: item.pressure != null && item.pressure !== '' ? parseFloat(item.pressure) : null,
          levelAdditional: item.levelAdditional != null && item.levelAdditional !== '' ? parseFloat(item.levelAdditional) : null,
          humidity: item.humidity != null && item.humidity !== '' ? parseFloat(item.humidity) : null,
          radiation: item.radiation != null && item.radiation !== '' ? parseFloat(item.radiation) : null,
          evapo: item.evapo != null && item.evapo !== '' ? parseFloat(item.evapo) : null
        })),
        updatedAt: new Date().toISOString()
      };

      cacheStore.daily[cacheKey] = {
        data: payload,
        timestamp: now
      };

      return res.status(200).json({
        success: true,
        cached: false,
        source: 'plugfield_api',
        data: payload
      });
    }

    return res.status(400).json({
      success: false,
      error: `Ação desconhecida: '${action}'. Ações válidas: devices, device, daily.`
    });

  } catch (err) {
    console.error('[API Plugfield Proxy] Erro:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno no servidor proxy Plugfield'
    });
  }
};
