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

module.exports = async function handler(req, res) {
  // Configuração rigorosa de cabeçalhos CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const apiKey = process.env.PLUGFIELD_API_KEY || '';
  const { action = 'devices', deviceId, begin, end, page = '1' } = req.query;

  const now = Date.now();

  try {
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

      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch(`${BASE_URL}/device?page=${page}`, {
        headers,
        method: 'GET'
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /device: HTTP ${response.status}`,
          statusCode: response.status
        });
      }

      const rawJson = await response.json();
      const rawStations = Array.isArray(rawJson) ? rawJson : (rawJson.data || []);

      // Filtra e normaliza apenas as 16 estações habilitadas de Passo Fundo
      const filteredStations = rawStations
        .filter(st => {
          const idNum = parseInt(st.id || st.deviceId || 0, 10);
          return ENABLED_DEVICE_IDS.includes(idNum);
        })
        .map(st => {
          const idNum = parseInt(st.id || st.deviceId || 0, 10);
          return {
            id: idNum,
            deviceId: idNum,
            name: STATION_NAMES_MAP[idNum] || st.name || st.deviceName || `Estação ${idNum}`,
            latitude: st.latitude != null ? parseFloat(st.latitude) : null,
            longitude: st.longitude != null ? parseFloat(st.longitude) : null,
            sensors: st.sensors || [],
            dashboard: st.dashboard || {},
            timestamp: st.timestamp || (st.dashboard ? st.dashboard.timestamp : null)
          };
        });

      const resultPayload = {
        totalStations: filteredStations.length,
        stations: filteredStations,
        updatedAt: new Date().toISOString()
      };

      // Atualiza cache
      cacheStore.devices.data = resultPayload;
      cacheStore.devices.timestamp = now;

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

      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const response = await fetch(`${BASE_URL}/device/${devIdNum}`, {
        headers,
        method: 'GET'
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /device/${devIdNum}: HTTP ${response.status}`,
          statusCode: response.status
        });
      }

      const raw = await response.json();
      const payload = {
        id: devIdNum,
        deviceId: devIdNum,
        name: STATION_NAMES_MAP[devIdNum] || raw.name || `Estação ${devIdNum}`,
        latitude: raw.latitude != null ? parseFloat(raw.latitude) : null,
        longitude: raw.longitude != null ? parseFloat(raw.longitude) : null,
        sensors: raw.sensors || [],
        dashboard: raw.dashboard || {},
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

      const headers = {
        'Accept': 'application/json',
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      };
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const url = `${BASE_URL}/data/daily?device=${devIdNum}&begin=${encodeURIComponent(begin)}&end=${encodeURIComponent(end)}`;
      const response = await fetch(url, {
        headers,
        method: 'GET'
      });

      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: `Erro ao consultar /data/daily: HTTP ${response.status}`,
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
          localDate: item.localDate || item.date,
          temp: item.temp != null ? parseFloat(item.temp) : null,
          tempMin: item.tempMin != null ? parseFloat(item.tempMin) : null,
          tempMax: item.tempMax != null ? parseFloat(item.tempMax) : null,
          rainAccum: item.rainAccum != null ? parseFloat(item.rainAccum) : (item.rain != null ? parseFloat(item.rain) : 0),
          wind: item.wind != null ? parseFloat(item.wind) : null,
          windBurst: item.windBurst != null ? parseFloat(item.windBurst) : (item.winbMax != null ? parseFloat(item.winbMax) : null),
          pressure: item.pressure != null ? parseFloat(item.pressure) : null,
          levelAdditional: item.levelAdditional != null && item.levelAdditional !== '' ? parseFloat(item.levelAdditional) : null,
          humidity: item.humidity != null ? parseFloat(item.humidity) : null,
          radiation: item.radiation != null ? parseFloat(item.radiation) : null,
          evapo: item.evapo != null ? parseFloat(item.evapo) : null
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
