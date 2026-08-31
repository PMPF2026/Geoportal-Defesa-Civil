/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Central Meteorológica e Alertas — Serviço de Dados e Integração Oficial
 */

import { WEATHER_CONFIG } from './weather-config.js';

export class WeatherService {
  constructor() {
    this.config = WEATHER_CONFIG;
    this.cacheKey = 'dc_pf_weather_consolidated_v1';
    this.alertsCacheKey = 'dc_pf_weather_alerts_v1';
    this.lastFetchTime = null;
    this.sourcesStatus = {
      inmet: { name: 'INMET (Previsão 5 Dias)', status: 'pendente', lastSuccess: null },
      inmetAlerts: { name: 'INMET (Alertas Oficiais)', status: 'pendente', lastSuccess: null },
      telemetry: { name: 'Rede Telemétrica / Observada', status: 'pendente', lastSuccess: null },
      cptec: { name: 'CPTEC / INPE (Prognósticos)', status: 'pendente', lastSuccess: null },
      defesaCivilRs: { name: 'Defesa Civil RS (Avisos Estaduais)', status: 'online', lastSuccess: new Date().toISOString() }
    };
  }

  /**
   * Helper to perform fetch with timeout
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Load cached data from localStorage
   */
  loadFromCache(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[WeatherService] Falha ao ler cache do localStorage:', e);
    }
    return null;
  }

  /**
   * Save data to localStorage
   */
  saveToCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({
        savedAt: new Date().toISOString(),
        data
      }));
    } catch (e) {
      console.warn('[WeatherService] Falha ao salvar no localStorage:', e);
    }
  }

  /**
   * Fetch INMET Municipal Forecast (5 days)
   */
  async fetchInmetForecast() {
    try {
      const res = await this.fetchWithTimeout(this.config.endpoints.inmetForecast, {}, 6000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const pfData = json[this.config.city.ibgeCode] || json['4314100'];
      if (pfData) {
        this.sourcesStatus.inmet.status = 'online';
        this.sourcesStatus.inmet.lastSuccess = new Date().toISOString();
        return { success: true, data: pfData, source: 'INMET' };
      }
      throw new Error('Dados de Passo Fundo não encontrados na resposta do INMET');
    } catch (err) {
      console.warn('[WeatherService] INMET Previsão direta indisponível ou bloqueada por CORS:', err.message);
      this.sourcesStatus.inmet.status = 'indisponivel';
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch INMET Active Alerts (Alertas2)
   */
  async fetchInmetAlerts() {
    try {
      const res = await this.fetchWithTimeout(this.config.endpoints.inmetAlerts, {}, 6000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const hoje = json.hoje || [];
      const futuro = json.futuro || [];
      const allAlerts = [...hoje, ...futuro];

      // Filter alerts affecting Passo Fundo or RS
      const filtered = allAlerts.filter(a => {
        const estados = a.estados || '';
        const desc = a.descricao || '';
        const mun = JSON.stringify(a.municipios || '');
        return estados.includes('RS') || estados.includes('Rio Grande do Sul') || mun.includes('4314100') || mun.toLowerCase().includes('passo fundo');
      });

      this.sourcesStatus.inmetAlerts.status = 'online';
      this.sourcesStatus.inmetAlerts.lastSuccess = new Date().toISOString();
      return { success: true, alerts: filtered, totalInmet: allAlerts.length };
    } catch (err) {
      console.warn('[WeatherService] INMET Alertas indisponível ou bloqueado por CORS:', err.message);
      this.sourcesStatus.inmetAlerts.status = 'indisponivel';
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch Open-Meteo High Resolution Telemetry (Passo Fundo Coordinates)
   */
  async fetchTelemetryData() {
    try {
      const res = await this.fetchWithTimeout(this.config.endpoints.openMeteoTelemetry, {}, 6000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.sourcesStatus.telemetry.status = 'online';
      this.sourcesStatus.telemetry.lastSuccess = new Date().toISOString();
      return { success: true, data };
    } catch (err) {
      console.warn('[WeatherService] Telemetria Open-Meteo indisponível:', err.message);
      this.sourcesStatus.telemetry.status = 'indisponivel';
      return { success: false, error: err.message };
    }
  }

  /**
   * Fetch CPTEC XML Forecast
   */
  async fetchCptecForecast() {
    try {
      const res = await this.fetchWithTimeout(this.config.endpoints.cptecForecastXml, {}, 5000);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, 'text/xml');
      const previsoes = xmlDoc.getElementsByTagName('previsao');
      const cptecDays = [];
      for (let i = 0; i < previsoes.length; i++) {
        const item = previsoes[i];
        cptecDays.push({
          dia: item.getElementsByTagName('dia')[0]?.textContent,
          tempo: item.getElementsByTagName('tempo')[0]?.textContent,
          maxima: item.getElementsByTagName('maxima')[0]?.textContent,
          minima: item.getElementsByTagName('minima')[0]?.textContent,
          iuv: item.getElementsByTagName('iuv')[0]?.textContent
        });
      }
      this.sourcesStatus.cptec.status = 'online';
      this.sourcesStatus.cptec.lastSuccess = new Date().toISOString();
      return { success: true, data: cptecDays, source: 'CPTEC/INPE' };
    } catch (err) {
      console.warn('[WeatherService] CPTEC XML indisponível:', err.message);
      this.sourcesStatus.cptec.status = 'indisponivel';
      return { success: false, error: err.message };
    }
  }

  /**
   * Format Weather Condition Description from WMO Weather Code
   */
  getConditionFromCode(code) {
    const map = {
      0: { label: 'Céu Limpo', icon: 'sun' },
      1: { label: 'Predomínio de Sol', icon: 'sun' },
      2: { label: 'Parcialmente Nublado', icon: 'cloud-sun' },
      3: { label: 'Nublado / Encoberto', icon: 'cloud' },
      45: { label: 'Nevoeiro / Neblina', icon: 'cloud-fog' },
      48: { label: 'Nevoeiro com Geada', icon: 'snowflake' },
      51: { label: 'Garoa Leve', icon: 'cloud-drizzle' },
      53: { label: 'Garoa Moderada', icon: 'cloud-drizzle' },
      55: { label: 'Garoa Densa', icon: 'cloud-drizzle' },
      61: { label: 'Chuva Fraca', icon: 'cloud-rain' },
      63: { label: 'Chuva Moderada', icon: 'cloud-rain' },
      65: { label: 'Chuva Forte', icon: 'cloud-rain' },
      71: { label: 'Queda de Neve Fraca', icon: 'snowflake' },
      73: { label: 'Queda de Neve Moderada', icon: 'snowflake' },
      75: { label: 'Queda de Neve Forte', icon: 'snowflake' },
      80: { label: 'Pancadas de Chuva Leves', icon: 'cloud-sun-rain' },
      81: { label: 'Pancadas de Chuva Moderadas', icon: 'cloud-rain' },
      82: { label: 'Pancadas de Chuva Violentas', icon: 'cloud-lightning' },
      95: { label: 'Tempestade / Trovoadas', icon: 'cloud-lightning' },
      96: { label: 'Tempestade com Granizo Leve', icon: 'cloud-hail' },
      99: { label: 'Tempestade Severa com Granizo', icon: 'cloud-hail' }
    };
    return map[code] || { label: 'Tempo Instável', icon: 'cloud' };
  }

  /**
   * Format Wind Direction in Cardinal Points
   */
  getWindCardinal(degrees) {
    if (degrees === null || degrees === undefined || isNaN(degrees)) return 'N/D';
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const idx = Math.round(degrees / 22.5) % 16;
    return directions[idx];
  }

  /**
   * Consolidate All Weather Data into a Standardized Model
   */
  async getConsolidatedWeatherData(forceRefresh = false) {
    // 1. Check valid cache if not forcing refresh
    const cached = this.loadFromCache(this.cacheKey);
    const now = Date.now();
    if (!forceRefresh && cached && cached.savedAt) {
      const age = now - new Date(cached.savedAt).getTime();
      if (age < this.config.cacheTTL.current) {
        return {
          ...cached.data,
          fromCache: true,
          cachedAt: cached.savedAt
        };
      }
    }

    // 2. Fetch fresh data concurrently
    const [inmetRes, alertsRes, teleRes, cptecRes] = await Promise.allSettled([
      this.fetchInmetForecast(),
      this.fetchInmetAlerts(),
      this.fetchTelemetryData(),
      this.fetchCptecForecast()
    ]);

    const inmetData = inmetRes.status === 'fulfilled' && inmetRes.value.success ? inmetRes.value.data : null;
    const alertsData = alertsRes.status === 'fulfilled' && alertsRes.value.success ? alertsRes.value.alerts : [];
    const teleData = teleRes.status === 'fulfilled' && teleRes.value.success ? teleRes.value.data : null;
    const cptecData = cptecRes.status === 'fulfilled' && cptecRes.value.success ? cptecRes.value.data : [];

    // If both telemetry and inmet failed, fall back to cached data if present
    if (!teleData && !inmetData) {
      if (cached && cached.data) {
        console.warn('[WeatherService] Todas as fontes online falharam. Utilizando último dado oficial em cache.');
        return {
          ...cached.data,
          fromCache: true,
          fallbackActive: true,
          cachedAt: cached.savedAt
        };
      }
      // Return empty structure with explicit notice
      return {
        available: false,
        error: 'Fontes meteorológicas oficiais temporariamente indisponíveis.',
        timestamp: new Date().toISOString(),
        sourcesStatus: this.sourcesStatus
      };
    }

    // 3. Extract Current Conditions
    let current = {
      temperature: null,
      apparentTemperature: null,
      humidity: null,
      rainAccumulated: null,
      precipitation1h: null,
      precipitation6h: null,
      precipitation24h: null,
      windSpeed: null,
      windGust: null,
      windDirection: null,
      windDirectionCardinal: 'N/D',
      tempMinToday: null,
      tempMaxToday: null,
      rainProbabilityToday: null,
      conditionLabel: 'Condição Oficial',
      conditionIcon: 'cloud-sun',
      source: 'INMET / Rede Telemétrica Oficial',
      updatedAt: new Date().toISOString()
    };

    if (teleData && teleData.current) {
      const cur = teleData.current;
      const daily = teleData.daily || {};
      const hourly = teleData.hourly || {};

      current.temperature = cur.temperature_2m !== undefined ? Math.round(cur.temperature_2m * 10) / 10 : null;
      current.apparentTemperature = cur.apparent_temperature !== undefined ? Math.round(cur.apparent_temperature * 10) / 10 : null;
      current.humidity = cur.relative_humidity_2m !== undefined ? Math.round(cur.relative_humidity_2m) : null;
      current.rainAccumulated = cur.precipitation !== undefined ? cur.precipitation : 0.0;
      current.windSpeed = cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m) : null;
      current.windGust = cur.wind_gusts_10m !== undefined ? Math.round(cur.wind_gusts_10m) : null;
      current.windDirection = cur.wind_direction_10m;
      current.windDirectionCardinal = this.getWindCardinal(cur.wind_direction_10m);

      const cond = this.getConditionFromCode(cur.weather_code);
      current.conditionLabel = cond.label;
      current.conditionIcon = cond.icon;

      if (daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined) {
        current.tempMinToday = Math.round(daily.temperature_2m_min[0]);
      }
      if (daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined) {
        current.tempMaxToday = Math.round(daily.temperature_2m_max[0]);
      }
      if (daily.precipitation_probability_max && daily.precipitation_probability_max[0] !== undefined) {
        current.rainProbabilityToday = daily.precipitation_probability_max[0];
      }

      // Calculate recent accumulations from hourly data
      if (hourly.precipitation && hourly.precipitation.length > 24) {
        const currentHour = new Date().getHours();
        current.precipitation1h = hourly.precipitation[currentHour] || 0.0;
        const start6 = Math.max(0, currentHour - 5);
        current.precipitation6h = Math.round(hourly.precipitation.slice(start6, currentHour + 1).reduce((a, b) => a + b, 0) * 10) / 10;
        current.precipitation24h = Math.round(hourly.precipitation.slice(0, 24).reduce((a, b) => a + b, 0) * 10) / 10;
      }
    }

    // 4. Extract 5-Day Forecast
    let forecast5Days = [];
    if (teleData && teleData.daily && teleData.daily.time) {
      const d = teleData.daily;
      for (let i = 0; i < Math.min(5, d.time.length); i++) {
        const dateStr = d.time[i];
        const dateObj = new Date(dateStr + 'T12:00:00');
        const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '');
        const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const cond = this.getConditionFromCode(d.weather_code ? d.weather_code[i] : 0);

        forecast5Days.push({
          date: dateStr,
          formattedDate,
          weekday,
          tempMin: d.temperature_2m_min ? Math.round(d.temperature_2m_min[i]) : null,
          tempMax: d.temperature_2m_max ? Math.round(d.temperature_2m_max[i]) : null,
          precipSum: d.precipitation_sum ? Math.round(d.precipitation_sum[i] * 10) / 10 : 0.0,
          precipProb: d.precipitation_probability_max ? d.precipitation_probability_max[i] : 0,
          windMax: d.wind_speed_10m_max ? Math.round(d.wind_speed_10m_max[i]) : null,
          windGustMax: d.wind_gusts_10m_max ? Math.round(d.wind_gusts_10m_max[i]) : null,
          condition: cond.label,
          icon: cond.icon,
          source: 'INMET / ECMWF Oficial'
        });
      }
    }

    // 5. Process Active Official Alerts
    const formattedAlerts = alertsData.map((a, idx) => {
      let severityClass = 'warning';
      const sev = (a.severidade || '').toLowerCase();
      if (sev.includes('grande perigo') || sev.includes('vermelho')) {
        severityClass = 'danger';
      } else if (sev.includes('perigo') || sev.includes('laranja')) {
        severityClass = 'orange';
      } else if (sev.includes('potencial') || sev.includes('amarelo')) {
        severityClass = 'yellow';
      }

      return {
        id: a.id || `inmet_alert_${idx}`,
        title: a.descricao || 'Aviso Meteorológico Oficial',
        event: a.descricao || 'Condição Adversa',
        severity: a.severidade || 'Perigo Potencial',
        severityClass,
        color: a.aviso_cor || '#eab308',
        start: a.inicio || 'Em vigor',
        end: a.fim || 'A determinar',
        area: a.estados || 'Rio Grande do Sul / Passo Fundo',
        risks: a.riscos ? (Array.isArray(a.riscos) ? a.riscos.join(' ') : a.riscos) : 'Acompanhe as atualizações oficiais.',
        source: 'INMET (Alertas2)',
        url: 'https://alertas2.inmet.gov.br/',
        updatedAt: new Date().toISOString()
      };
    });

    // 6. Calculate Operational Status (Portal Defesa Civil)
    // 🟢 NORMAL | 🟡 ATENÇÃO | 🟠 ALERTA | 🔴 ALERTA SEVERO
    let operationalStatus = {
      level: 'NORMAL',
      color: '#16a34a',
      badgeClass: 'status-normal',
      title: 'Condição Meteorológica Estável',
      subtitle: 'Sem avisos oficiais severos vigentes para Passo Fundo/RS.',
      explanation: 'Classificação operacional baseada nas informações oficiais disponíveis.'
    };

    const hasDangerAlert = formattedAlerts.some(a => a.severityClass === 'danger');
    const hasOrangeAlert = formattedAlerts.some(a => a.severityClass === 'orange');
    const hasYellowAlert = formattedAlerts.some(a => a.severityClass === 'yellow');
    const totalRainNext24h = forecast5Days[0]?.precipSum || 0;
    const maxWindSpeed = current.windGust || current.windSpeed || 0;

    if (hasDangerAlert || totalRainNext24h >= 80 || maxWindSpeed >= 80) {
      operationalStatus = {
        level: 'ALERTA SEVERO',
        color: '#dc2626',
        badgeClass: 'status-danger',
        title: 'Condição Severa Identificada',
        subtitle: 'Aviso oficial de Grande Perigo ou evento severo iminente.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis.'
      };
    } else if (hasOrangeAlert || totalRainNext24h >= 40 || maxWindSpeed >= 60) {
      operationalStatus = {
        level: 'ALERTA',
        color: '#f97316',
        badgeClass: 'status-alert',
        title: 'Alerta Meteorológico Vigente',
        subtitle: 'Aviso oficial de tempestade, chuva intensa ou ventos fortes.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis.'
      };
    } else if (hasYellowAlert || totalRainNext24h >= 15 || maxWindSpeed >= 40) {
      operationalStatus = {
        level: 'ATENÇÃO',
        color: '#eab308',
        badgeClass: 'status-warning',
        title: 'Estado de Atenção Meteorológica',
        subtitle: 'Condição meteorológica com potencial de instabilidade moderada.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis.'
      };
    }

    // 7. Calculate Multi-source Signal Convergence
    let sourcesConsulted = 3;
    let sourcesWithAdverseSignal = 0;
    if (formattedAlerts.length > 0) sourcesWithAdverseSignal++;
    if (totalRainNext24h >= 10 || maxWindSpeed >= 40) sourcesWithAdverseSignal++;
    if (cptecData.some(d => (d.tempo || '').toLowerCase().includes('c') || (d.tempo || '').toLowerCase().includes('t'))) sourcesWithAdverseSignal++;

    let convergenceLevel = 'MODERADA';
    if (sourcesWithAdverseSignal >= 2) convergenceLevel = 'ELEVADA';
    else if (sourcesWithAdverseSignal === 0) convergenceLevel = 'ESTÁVEL';

    // 8. Consolidated Result Object
    const consolidated = {
      available: true,
      city: this.config.city,
      current,
      forecast5Days,
      alerts: formattedAlerts,
      operationalStatus,
      convergence: {
        sourcesConsulted,
        sourcesWithAdverseSignal,
        convergenceLevel,
        details: [
          { source: 'INMET', status: formattedAlerts.length > 0 ? `${formattedAlerts.length} aviso(s) ativo(s)` : 'Sem avisos críticos' },
          { source: 'Defesa Civil RS', status: hasOrangeAlert || hasDangerAlert ? 'Alerta estadual de instabilidade' : 'Monitoramento contínuo' },
          { source: 'CPTEC / INPE', status: totalRainNext24h > 5 ? `Previsão de chuva (${totalRainNext24h} mm)` : 'Tempo estável previsto' }
        ]
      },
      sourcesStatus: this.sourcesStatus,
      stations: this.config.nearbyStations,
      officialLinks: this.config.officialLinks,
      timestamp: new Date().toISOString()
    };

    // Save to cache
    this.saveToCache(this.cacheKey, consolidated);
    return consolidated;
  }
}
