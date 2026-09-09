/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Serviço Frontend de Integração com a Rede Meteorológica Plugfield (16 Estações)
 */

export const PLUGFIELD_STATIONS_CONFIG = [
  { deviceId: 4283,  name: 'Transbrasiliana',                type: 'Urbana / Perimetral' },
  { deviceId: 4253,  name: 'Capinzal',                       type: 'Rural / Bacia Hidrográfica' },
  { deviceId: 4798,  name: 'Sede Independência',             type: 'Urbana / Administrativa' },
  { deviceId: 4416,  name: 'São Roque',                      type: 'Rural / Setor Leste' },
  { deviceId: 3009,  name: 'Avena',                          type: 'Rural / Agrícola' },
  { deviceId: 4931,  name: 'Pulador',                        type: 'Rural / Bacia Hidrográfica' },
  { deviceId: 4965,  name: 'Quinto Giongo (Victor Issler)',  type: 'Urbana / Bairro Victor Issler' },
  { deviceId: 4678,  name: 'Fredolino Chimango (Centro)',    type: 'Urbana / Centro' },
  { deviceId: 2856,  name: 'Fazenda Bugre',                  type: 'Rural / Bacia Hidrográfica' },
  { deviceId: 4712,  name: 'Bela Vista',                     type: 'Urbana / Bairro Bela Vista' },
  { deviceId: 4713,  name: 'Bom Recreio',                    type: 'Rural / Setor Norte' },
  { deviceId: 4714,  name: 'Lobo da Costa (Entre Rios)',     type: 'Rural / Bacia Hidrográfica' },
  { deviceId: 4717,  name: 'Camponesa',                      type: 'Urbana / Bairro Camponesa' },
  { deviceId: 4431,  name: 'Avenida Brasil (Largo Literatura)', type: 'Urbana / Eixo Central' },
  { deviceId: 10994, name: '2000 - ATITUS',                  type: 'Universitária / Campus Atitus' },
  { deviceId: 2041,  name: 'Veneza',                         type: 'Urbana / Bairro Vila Veneza' }
];

export class PlugfieldService {
  static API_ENDPOINT = '/api/weather/plugfield';
  static CACHE_KEY_PREFIX = 'pf_cache_';
  static CACHE_TTL_MS = 6 * 60 * 1000; // 6 minutos

  /**
   * Obtém a lista e status das 16 estações Plugfield
   */
  static async fetchAllStations() {
    // 1. Tentar ler do cache local
    const cached = this.getLocalCache('all_stations');
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(`${this.API_ENDPOINT}?action=devices`);
      if (!response.ok) {
        throw new Error(`Erro na API Plugfield: HTTP ${response.status}`);
      }

      const resJson = await response.json();
      if (!resJson.success || !resJson.data?.stations) {
        throw new Error('Resposta inválida do servidor Plugfield.');
      }

      const rawStations = resJson.data.stations;
      const normalizedStations = this.mergeAndNormalizeStations(rawStations);

      // Salva no cache
      this.setLocalCache('all_stations', normalizedStations);
      return normalizedStations;
    } catch (err) {
      console.warn('[PlugfieldService] Erro ao consultar estações:', err);
      // Fallback para último cache existente mesmo que expirado
      const fallback = this.getAnyLocalCache('all_stations');
      if (fallback) return fallback;

      // Retorna lista padrão com status 'indisponível'
      return this.getDefaultEmptyStations();
    }
  }

  /**
   * Alias de compatibilidade para fetchAllStations
   */
  static async getAllStations() {
    return this.fetchAllStations();
  }

  /**
   * Retorna do cache local síncrono para inicialização instantânea da interface
   */
  static getCachedStations() {
    return this.getLocalCache('all_stations') || this.getAnyLocalCache('all_stations');
  }

  /**
   * Obtém histórico dos últimos 5 dias normalizado para gráficos e tabelas
   * @param {number} deviceId 
   */
  static async getStationDailyHistory(deviceId) {
    const res = await this.fetchStationDetailsAndHistory(deviceId);
    if (!res || !res.history5Days || !Array.isArray(res.history5Days)) {
      return [];
    }

    return res.history5Days.map(item => {
      const rawDate = item.localDate || item.date || item.day || '';
      let dateLabel = rawDate;
      if (typeof rawDate === 'string' && rawDate.includes('/')) {
        const parts = rawDate.split('/');
        if (parts.length >= 2) dateLabel = `${parts[0]}/${parts[1]}`;
      } else if (typeof rawDate === 'string' && rawDate.includes('-')) {
        const parts = rawDate.split('-');
        if (parts.length >= 3) dateLabel = `${parts[2].slice(0, 2)}/${parts[1]}`;
      }

      const tempAvg = item.temp != null ? parseFloat(item.temp) : (item.tempAvg != null ? parseFloat(item.tempAvg) : null);
      const tempMin = item.tempMin != null ? parseFloat(item.tempMin) : (item.minTemp != null ? parseFloat(item.minTemp) : null);
      const tempMax = item.tempMax != null ? parseFloat(item.tempMax) : (item.maxTemp != null ? parseFloat(item.maxTemp) : null);
      const rain = item.rainAccum != null ? parseFloat(item.rainAccum) : (item.rain != null ? parseFloat(item.rain) : 0);
      const windAvg = item.wind != null ? parseFloat(item.wind) : (item.windAvg != null ? parseFloat(item.windAvg) : null);
      const windMax = item.windBurst != null ? parseFloat(item.windBurst) : (item.winbMax != null ? parseFloat(item.winbMax) : (item.windMax != null ? parseFloat(item.windMax) : null));
      const press = item.pressure != null ? parseFloat(item.pressure) : null;
      const river = item.levelAdditional != null && item.levelAdditional !== '' ? parseFloat(item.levelAdditional) : null;
      const hum = item.humidity != null ? parseFloat(item.humidity) : null;

      return {
        date: dateLabel,
        fullDate: rawDate,
        tempAvg: (tempAvg != null && !isNaN(tempAvg)) ? tempAvg : null,
        tempMin: (tempMin != null && !isNaN(tempMin)) ? tempMin : null,
        tempMax: (tempMax != null && !isNaN(tempMax)) ? tempMax : null,
        rainAccum: (!isNaN(rain) && rain >= 0) ? rain : 0,
        windAvg: (windAvg != null && !isNaN(windAvg)) ? windAvg : null,
        windMax: (windMax != null && !isNaN(windMax)) ? windMax : null,
        pressure: (press != null && !isNaN(press)) ? press : null,
        riverLevel: (river != null && !isNaN(river)) ? river : null,
        humidity: (hum != null && !isNaN(hum)) ? hum : null
      };
    });
  }

  /**
   * Obtém dados detalhados e histórico dos últimos 5 dias de uma estação
   * @param {number} deviceId 
   */
  static async fetchStationDetailsAndHistory(deviceId) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const endStr = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const fiveDaysAgo = new Date(now.getTime() - (5 * 24 * 60 * 60 * 1000));
    const beginStr = `${pad(fiveDaysAgo.getDate())}/${pad(fiveDaysAgo.getMonth() + 1)}/${fiveDaysAgo.getFullYear()}`;

    const cacheKey = `history_${deviceId}_${beginStr}_${endStr}`;
    const cached = this.getLocalCache(cacheKey);
    if (cached) return cached;

    try {
      const [devResp, dailyResp] = await Promise.all([
        fetch(`${this.API_ENDPOINT}?action=device&deviceId=${deviceId}`).catch(() => null),
        fetch(`${this.API_ENDPOINT}?action=daily&deviceId=${deviceId}&begin=${encodeURIComponent(beginStr)}&end=${encodeURIComponent(endStr)}`).catch(() => null)
      ]);

      let devData = null;
      if (devResp && devResp.ok) {
        const j = await devResp.json();
        if (j.success) devData = j.data;
      }

      let dailyDays = [];
      if (dailyResp && dailyResp.ok) {
        const j = await dailyResp.json();
        if (j.success && j.data?.days) dailyDays = j.data.days;
      }

      const result = {
        deviceId,
        device: devData,
        history5Days: dailyDays,
        updatedAt: new Date().toISOString()
      };

      this.setLocalCache(cacheKey, result);
      return result;
    } catch (e) {
      console.warn(`[PlugfieldService] Erro ao buscar histórico da estação ${deviceId}:`, e);
      return {
        deviceId,
        device: null,
        history5Days: [],
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Mescla as 16 estações configuradas com os dados retornados pela API
   */
  static mergeAndNormalizeStations(apiStations) {
    const apiMap = new Map();
    apiStations.forEach(st => apiMap.set(st.deviceId || st.id, st));

    return PLUGFIELD_STATIONS_CONFIG.map(cfg => {
      const apiData = apiMap.get(cfg.deviceId);
      const dash = apiData?.dashboard || {};

      let hasRiverSensor = false;
      let riverLevel = null;
      if (dash.levelAdditional != null && dash.levelAdditional !== '') {
        const val = parseFloat(dash.levelAdditional);
        if (!isNaN(val)) {
          riverLevel = val;
          hasRiverSensor = true;
        }
      }

      // Status temporal de atualização
      let status = 'updated';
      let formattedDate = 'Aguardando sincronização';
      const ts = apiData?.timestamp || dash.timestamp;
      if (ts) {
        try {
          const d = new Date(typeof ts === 'number' ? ts : parseInt(ts, 10));
          const diffMinutes = (Date.now() - d.getTime()) / (1000 * 60);
          if (diffMinutes > 120) {
            status = 'delayed';
          }
          const pad = (n) => String(n).padStart(2, '0');
          formattedDate = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} às ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        } catch {
          status = 'delayed';
        }
      } else if (!apiData) {
        status = 'offline';
      }

      return {
        deviceId: cfg.deviceId,
        name: cfg.name,
        type: cfg.type,
        status: status, // 'updated' | 'delayed' | 'offline'
        latitude: apiData?.latitude != null ? apiData.latitude : null,
        longitude: apiData?.longitude != null ? apiData.longitude : null,
        lastUpdateText: formattedDate,
        timestamp: ts,

        // 1. Temperatura
        temperatura: {
          atual: dash.temp != null ? parseFloat(dash.temp) : null,
          minima: dash.tempMin != null ? parseFloat(dash.tempMin) : null,
          maxima: dash.tempMax != null ? parseFloat(dash.tempMax) : null,
          mediaMensalInfo: 'Média mensal indisponível — série histórica insuficiente.'
        },

        // 2. Precipitação
        chuva: {
          atual: dash.rain != null ? parseFloat(dash.rain) : 0,
          acumuladoDia: dash.rainAccum != null ? parseFloat(dash.rainAccum) : 0,
          acumuladoMes: dash.rainAccumMonthly != null ? parseFloat(dash.rainAccumMonthly) : null
        },

        // 3. Vento
        vento: {
          velocidade: dash.wind != null ? parseFloat(dash.wind) : null,
          rajadaMaxima: dash.winbMax != null ? parseFloat(dash.winbMax) : null,
          direcaoGraus: dash.direction != null ? parseFloat(dash.direction) : null,
          direcaoCardeal: dash.directionString || null
        },

        // 4. Pressão
        pressao: {
          atual: dash.pressure != null ? parseFloat(dash.pressure) : null
        },

        // 5. Nível do Rio (exclusivo levelAdditional)
        rio: {
          disponivel: hasRiverSensor,
          nivelAtual: riverLevel,
          mensagem: hasRiverSensor ? null : 'Dado não disponível para esta estação'
        },

        // Sensores extras
        umidade: dash.humidity != null ? parseFloat(dash.humidity) : null,
        radiacao: dash.radiation != null ? parseFloat(dash.radiation) : null
      };
    });
  }

  static getDefaultEmptyStations() {
    return PLUGFIELD_STATIONS_CONFIG.map(cfg => ({
      deviceId: cfg.deviceId,
      name: cfg.name,
      type: cfg.type,
      status: 'offline',
      latitude: null,
      longitude: null,
      lastUpdateText: 'Conexão em andamento...',
      timestamp: null,
      temperatura: { atual: null, minima: null, maxima: null, mediaMensalInfo: 'Média mensal indisponível — série histórica insuficiente.' },
      chuva: { atual: 0, acumuladoDia: 0, acumuladoMes: null },
      vento: { velocidade: null, rajadaMaxima: null, direcaoGraus: null, direcaoCardeal: null },
      pressao: { atual: null },
      rio: { disponivel: false, nivelAtual: null, mensagem: 'Dado não disponível para esta estação' }
    }));
  }

  static getLocalCache(key) {
    try {
      const raw = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${key}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < this.CACHE_TTL_MS) {
        return parsed.data;
      }
    } catch {
      return null;
    }
    return null;
  }

  static getAnyLocalCache(key) {
    try {
      const raw = localStorage.getItem(`${this.CACHE_KEY_PREFIX}${key}`);
      if (!raw) return null;
      return JSON.parse(raw).data;
    } catch {
      return null;
    }
  }

  static setLocalCache(key, data) {
    try {
      localStorage.setItem(`${this.CACHE_KEY_PREFIX}${key}`, JSON.stringify({
        timestamp: Date.now(),
        data
      }));
    } catch {
      // Ignora erro de cota de storage
    }
  }
}
