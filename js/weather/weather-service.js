/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Central Meteorológica e Alertas — Serviço de Dados e Integração Oficial
 */

import { WEATHER_CONFIG } from './weather-config.js';

export class WeatherService {
  constructor() {
    this.config = WEATHER_CONFIG;
    this.cacheKey = 'dc_pf_weather_consolidated_v4';
    this.alertsCacheKey = 'dc_pf_weather_alerts_v4';
    this.lastFetchTime = null;

    // Purge old schemas from localStorage
    try {
      localStorage.removeItem('dc_pf_weather_consolidated_v1');
      localStorage.removeItem('dc_pf_weather_consolidated_v2');
      localStorage.removeItem('dc_pf_weather_consolidated_v3');
      localStorage.removeItem('dc_pf_weather_alerts_v1');
      localStorage.removeItem('dc_pf_weather_alerts_v2');
      localStorage.removeItem('dc_pf_weather_alerts_v3');
    } catch (e) {
      // Ignore
    }

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
    const urls = [
      this.config.endpoints.inmetForecast,
      this.config.endpoints.inmetForecastDirect
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const res = await this.fetchWithTimeout(url, {}, 8000);
        if (!res.ok) continue;
        const json = await res.json();
        const pfData = json[this.config.city.ibgeCode] || json['4314100'];
        if (pfData) {
          this.sourcesStatus.inmet.status = 'online';
          this.sourcesStatus.inmet.lastSuccess = new Date().toISOString();
          return { success: true, data: pfData, source: 'INMET' };
        }
      } catch (err) {
        // Try next fallback URL
      }
    }

    console.warn('[WeatherService] INMET Previsão indisponível em todas as rotas.');
    this.sourcesStatus.inmet.status = 'indisponivel';
    return { success: false, error: 'INMET indisponível' };
  }

  /**
   * Fetch Active Official Warnings from INMET Structured API
   */
  async fetchInmetAlerts() {
    const urls = [
      this.config.endpoints.inmetAlerts,
      this.config.endpoints.inmetAlertsDirect
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const res = await this.fetchWithTimeout(url, {}, 8000);
        if (!res.ok) continue;
        const json = await res.json();
        const hoje = Array.isArray(json.hoje) ? json.hoje : [];
        const futuro = Array.isArray(json.futuro) ? json.futuro : [];
        const allAlerts = [...hoje, ...futuro];

        const now = new Date();

        // Filter: Level 1 - MUST affect Rio Grande do Sul (RS) & NOT be expired
        const rsAlerts = allAlerts.filter(a => {
          if (a.encerrado === true) return false;

          // Check expiration
          if (a.fim) {
            const fimDate = new Date(a.fim.replace(' ', 'T'));
            if (!isNaN(fimDate.getTime()) && fimDate < now) {
              return false; // Expired alert
            }
          }

          const estados = String(a.estados || '');
          const municipios = String(a.municipios || '');
          const geocodes = String(a.geocodes || '');

          // Strict RS filter: Must explicitly cover Rio Grande do Sul
          const hasRsState = estados.includes('Rio Grande do Sul') || estados.includes('RS');
          const hasRsMun = municipios.includes('- RS') || municipios.includes('(43');
          const hasRsGeocode = geocodes.split(',').some(g => g.trim().startsWith('43'));

          return hasRsState || hasRsMun || hasRsGeocode;
        });

        this.sourcesStatus.inmetAlerts.status = 'online';
        this.sourcesStatus.inmetAlerts.lastSuccess = new Date().toISOString();
        return { success: true, alerts: rsAlerts, totalInmet: allAlerts.length };
      } catch (err) {
        // Try next fallback URL
      }
    }

    console.warn('[WeatherService] INMET Alertas indisponível em todas as rotas.');
    this.sourcesStatus.inmetAlerts.status = 'indisponivel';
    return { success: false, error: 'INMET Alertas indisponível', alerts: [] };
  }

  /**
   * Fetch Open-Meteo High Resolution Telemetry (Passo Fundo Coordinates)
   */
  async fetchTelemetryData() {
    try {
      const res = await this.fetchWithTimeout(this.config.endpoints.openMeteoTelemetry, {}, 8000);
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
    const urls = [
      this.config.endpoints.cptecForecastXml,
      this.config.endpoints.cptecForecastXmlDirect
    ].filter(Boolean);

    for (const url of urls) {
      try {
        const res = await this.fetchWithTimeout(url, {}, 7000);
        if (!res.ok) continue;
        const text = await res.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, 'text/xml');
        const previsoes = xmlDoc.getElementsByTagName('previsao');
        if (previsoes.length === 0) continue;

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
        // Try next fallback URL
      }
    }

    console.warn('[WeatherService] CPTEC XML indisponível em todas as rotas.');
    this.sourcesStatus.cptec.status = 'indisponivel';
    return { success: false, error: 'CPTEC indisponível', data: [] };
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

    // 5. Process Active Official Alerts with Priority for Passo Fundo (IBGE 4314100)
    const formatAlertDate = (dStr) => {
      if (!dStr) return 'Em vigor';
      try {
        const d = new Date(dStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) return dStr;
        const dataFmt = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaFmt = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        return `${dataFmt} às ${horaFmt}`;
      } catch (e) {
        return dStr;
      }
    };

    const formattedAlerts = alertsData.map((a, idx) => {
      let severityClass = 'warning';
      const sev = (a.severidade || '').toLowerCase();
      if (sev.includes('grande perigo') || sev.includes('vermelho')) {
        severityClass = 'danger';
      } else if (sev.includes('perigo') || sev.includes('laranja')) {
        severityClass = 'orange';
      } else if (sev.includes('potencial') || sev.includes('amarelo') || sev.includes('atenção')) {
        severityClass = 'yellow';
      }

      // Check direct inclusion of Passo Fundo (IBGE 4314100)
      const geocodes = String(a.geocodes || '');
      const municipios = String(a.municipios || '');
      const mesorregioes = String(a.mesorregioes || '');

      const isPassoFundo = geocodes.includes('4314100') ||
                           municipios.includes('Passo Fundo') ||
                           municipios.includes('4314100');

      // Contextualized Area Description (strictly Passo Fundo — RS or Rio Grande do Sul)
      const areaText = isPassoFundo ? 'Passo Fundo — RS' : 'Rio Grande do Sul';

      // Parse and clean risks & instructions
      let risksText = 'Acompanhe as orientações oficiais de segurança da Defesa Civil.';
      if (Array.isArray(a.riscos) && a.riscos.length > 0) {
        risksText = a.riscos.map(r => String(r).trim()).filter(r => r.length > 0).join(' ');
      } else if (typeof a.riscos === 'string' && a.riscos.trim()) {
        risksText = a.riscos.trim();
      }

      let instructionsText = 'Consulte as orientações oficiais de segurança da Defesa Civil (Emergência 199 / 193).';
      if (Array.isArray(a.instrucoes) && a.instrucoes.length > 0) {
        instructionsText = a.instrucoes.map(i => String(i).trim()).filter(i => i.length > 0).join(' ');
      } else if (typeof a.instrucoes === 'string' && a.instrucoes.trim()) {
        instructionsText = a.instrucoes.trim();
      }

      return {
        id: a.id || `inmet_alert_${idx}`,
        id_aviso: a.id_aviso,
        title: a.descricao || 'Aviso Meteorológico Oficial',
        event: a.descricao || 'Condição Adversa',
        severity: a.severidade || 'Perigo Potencial',
        severityClass,
        color: a.aviso_cor || (severityClass === 'danger' ? '#dc2626' : severityClass === 'orange' ? '#f97316' : '#eab308'),
        isPassoFundo,
        start: formatAlertDate(a.inicio),
        end: formatAlertDate(a.fim),
        startRaw: a.inicio,
        endRaw: a.fim,
        area: areaText,
        risks: risksText,
        instructions: instructionsText,
        recommendations: instructionsText,
        source: 'Instituto Nacional de Meteorologia — INMET',
        url: 'https://portal.inmet.gov.br/',
        updatedAt: new Date().toISOString()
      };
    });

    // Sort: Passo Fundo alerts first, then by severity priority
    const severityWeight = { danger: 4, orange: 3, yellow: 2, warning: 1 };
    formattedAlerts.sort((a, b) => {
      if (a.isPassoFundo && !b.isPassoFundo) return -1;
      if (!a.isPassoFundo && b.isPassoFundo) return 1;
      const weightA = severityWeight[a.severityClass] || 0;
      const weightB = severityWeight[b.severityClass] || 0;
      return weightB - weightA;
    });

    const passoFundoAlerts = formattedAlerts.filter(a => a.isPassoFundo);
    const regionalAlerts = formattedAlerts.filter(a => !a.isPassoFundo);

    // 6. Calculate Operational Status (Portal Defesa Civil)
    // 🟢 NORMAL | 🟡 ATENÇÃO | 🟠 ALERTA | 🔴 ALERTA SEVERO
    let operationalStatus = {
      level: 'NORMAL',
      color: '#16a34a',
      badgeClass: 'status-normal',
      title: 'Condição Meteorológica Estável',
      subtitle: 'Sem avisos oficiais severos vigentes para Passo Fundo/RS.',
      explanation: 'Classificação operacional baseada nas informações oficiais disponíveis — não substitui alertas emitidos pelos órgãos oficiais.'
    };

    const hasDangerPF = passoFundoAlerts.some(a => a.severityClass === 'danger');
    const hasOrangePF = passoFundoAlerts.some(a => a.severityClass === 'orange');
    const hasYellowPF = passoFundoAlerts.some(a => a.severityClass === 'yellow');
    const totalRainNext24h = forecast5Days[0]?.precipSum || 0;
    const maxWindSpeed = current.windGust || current.windSpeed || 0;

    if (hasDangerPF || totalRainNext24h >= 80 || maxWindSpeed >= 80) {
      operationalStatus = {
        level: 'ALERTA SEVERO',
        color: '#dc2626',
        badgeClass: 'status-danger',
        title: 'Alerta Meteorológico Severo (Passo Fundo)',
        subtitle: 'Aviso oficial de Grande Perigo emitido pelo INMET para o município.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis — não substitui alertas emitidos pelos órgãos oficiais.'
      };
    } else if (hasOrangePF || totalRainNext24h >= 40 || maxWindSpeed >= 60) {
      operationalStatus = {
        level: 'ALERTA',
        color: '#f97316',
        badgeClass: 'status-alert',
        title: 'Alerta Meteorológico Vigente (Passo Fundo)',
        subtitle: 'Aviso oficial de tempestade ou chuva intensa para o município.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis — não substitui alertas emitidos pelos órgãos oficiais.'
      };
    } else if (hasYellowPF || totalRainNext24h >= 15 || maxWindSpeed >= 40) {
      operationalStatus = {
        level: 'ATENÇÃO',
        color: '#eab308',
        badgeClass: 'status-warning',
        title: 'Estado de Atenção Meteorológica (Passo Fundo)',
        subtitle: 'Aviso oficial de perigo potencial emitido pelo INMET para o município.',
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis — não substitui alertas emitidos pelos órgãos oficiais.'
      };
    } else if (regionalAlerts.length > 0) {
      operationalStatus = {
        level: 'NORMAL',
        color: '#16a34a',
        badgeClass: 'status-normal',
        title: 'Sem Alertas Diretos para Passo Fundo',
        subtitle: `${regionalAlerts.length} aviso(s) regional(is) vigente(s) em outras áreas do RS sob monitoramento.`,
        explanation: 'Classificação operacional baseada nas informações oficiais disponíveis — não substitui alertas emitidos pelos órgãos oficiais.'
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
          { source: 'Defesa Civil RS', status: (hasOrangePF || hasDangerPF || regionalAlerts.length > 0) ? 'Alerta estadual de instabilidade' : 'Monitoramento contínuo' },
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
