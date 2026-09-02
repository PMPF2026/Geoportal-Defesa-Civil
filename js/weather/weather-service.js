/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Serviço Meteorológico e Hidrométrico (Arquitetura Simplificada v2)
 * Pilares: 1. Open-Meteo (Tempo & Previsão) | 2. Defesa Civil RS (DCRS-00016 & Alertas)
 */

import { WeatherConfig } from './weather-config.js';

export class WeatherService {
  constructor() {
    this.config = WeatherConfig;
    this.cacheKey = WeatherConfig.cacheKey;
    this.cacheTTL = WeatherConfig.cacheTTL;
  }

  /**
   * Obtém dados consolidados das 2 fontes com isolamento total de falhas.
   * @param {boolean} forceRefresh - Força revalidação ignorando cache local
   */
  async getConsolidatedData(forceRefresh = false) {
    // 1. Verificar cache local válido
    if (!forceRefresh) {
      const cached = this.loadFromCache();
      if (cached) {
        return { ...cached, fromCache: true };
      }
    }

    // 2. Consulta paralela e isolada das 2 fontes oficiais
    const [openMeteoRes, dcRsRes] = await Promise.allSettled([
      this.fetchOpenMeteo(),
      this.fetchDefesaCivilRs()
    ]);

    const weather = openMeteoRes.status === 'fulfilled' ? openMeteoRes.value : { available: false, error: openMeteoRes.reason?.message };
    const hydro = dcRsRes.status === 'fulfilled' ? dcRsRes.value : { available: false, error: dcRsRes.reason?.message };

    const consolidated = {
      timestamp: new Date().toISOString(),
      location: this.config.location,
      station: this.config.station,
      weather,
      hydro,
      fromCache: false
    };

    // 3. Salvar em cache caso pelo menos uma fonte esteja disponível
    if (weather.available || hydro.available) {
      this.saveToCache(consolidated);
    }

    return consolidated;
  }

  /**
   * Pilar 1: Consulta Open-Meteo (Previsão 5 dias + Tempo Atual in-situ)
   */
  async fetchOpenMeteo() {
    const { latitude, longitude, timezone } = this.config.location;
    const url = `${this.config.endpoints.openMeteo}?latitude=${latitude}&longitude=${longitude}` +
      `&current=temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,sunrise,sunset` +
      `&timezone=${encodeURIComponent(timezone)}&forecast_days=5`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        throw new Error(`Open-Meteo HTTP ${resp.status}`);
      }

      const raw = await resp.json();
      return this.parseOpenMeteo(raw);
    } catch (err) {
      clearTimeout(timeout);
      console.warn('[WeatherService] Open-Meteo indisponível:', err.message);
      return { available: false, error: err.message };
    }
  }

  /**
   * Normaliza dados do Open-Meteo
   */
  parseOpenMeteo(raw) {
    const cur = raw.current || {};
    const daily = raw.daily || {};
    const curCode = cur.weather_code ?? 0;
    const curInfo = this.getWeatherCodeInfo(curCode);

    // Formatar 5 dias de previsão
    const forecastDays = [];
    const times = daily.time || [];
    for (let i = 0; i < times.length; i++) {
      const code = daily.weather_code ? daily.weather_code[i] : 0;
      const info = this.getWeatherCodeInfo(code);
      const dateParts = times[i].split('-'); // YYYY-MM-DD
      const dateObj = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
      
      const weekday = i === 0 ? 'Hoje' : (i === 1 ? 'Amanhã' : dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''));
      const formattedDate = `${dateParts[2]}/${dateParts[1]}`;

      forecastDays.push({
        date: times[i],
        formattedDate,
        weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1),
        tempMin: daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[i]) : '--',
        tempMax: daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[i]) : '--',
        rainMm: daily.precipitation_sum ? Number(daily.precipitation_sum[i]).toFixed(1) : '0.0',
        rainProb: daily.precipitation_probability_max ? Math.round(daily.precipitation_probability_max[i]) : 0,
        condition: info.label,
        icon: info.icon,
        color: info.color
      });
    }

    const deg = cur.wind_direction_10m ?? null;
    let windCardinal = 'N/D';
    if (deg !== null && !isNaN(deg)) {
      const cards = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      windCardinal = cards[Math.round(deg / 22.5) % 16] || 'N/D';
    }

    return {
      available: true,
      current: {
        temperature: cur.temperature_2m !== undefined ? Math.round(cur.temperature_2m * 10) / 10 : null,
        feelsLike: cur.apparent_temperature !== undefined ? Math.round(cur.apparent_temperature * 10) / 10 : null,
        humidity: cur.relative_humidity_2m ?? null,
        pressure: cur.surface_pressure !== undefined ? Math.round(cur.surface_pressure) : null,
        windSpeed: cur.wind_speed_10m !== undefined ? Math.round(cur.wind_speed_10m * 10) / 10 : null,
        windGust: cur.wind_gusts_10m !== undefined ? Math.round(cur.wind_gusts_10m * 10) / 10 : null,
        windDirection: deg,
        windCardinal,
        condition: curInfo.label,
        icon: curInfo.icon,
        color: curInfo.color
      },
      forecast: forecastDays,
      updatedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  }

  /**
   * Pilar 2: Consulta Defesa Civil RS (Estação DCRS-00016 Passo Fundo)
   */
  async fetchDefesaCivilRs() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const resp = await fetch(this.config.endpoints.defesaCivilRs, { signal: controller.signal });
      clearTimeout(timeout);

      if (!resp.ok) {
        throw new Error(`Defesa Civil RS HTTP ${resp.status}`);
      }

      const resJson = await resp.json();
      if (!resJson || resJson.available === false || !resJson.data) {
        throw new Error(resJson.error || 'Dados indisponíveis no servidor estadual');
      }

      const d = resJson.data;
      const st = resJson.station || {};

      // Formatar timestamp
      let formattedTime = 'Recentemente';
      if (resJson.observedAt) {
        const obsDate = new Date(resJson.observedAt);
        if (!isNaN(obsDate.getTime())) {
          formattedTime = obsDate.toLocaleTimeString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            hour: '2-digit',
            minute: '2-digit'
          }) + ' (' + obsDate.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit'
          }) + ')';
        }
      }

      // Interpretar tendência do Rio Passo Fundo
      let trendText = 'Estável';
      let trendIcon = 'lucide-minus';
      let trendColor = '#38bdf8';
      const trendVal = d.riverTrend;
      if (trendVal !== null && trendVal !== undefined) {
        if (trendVal > 0.005) {
          trendText = `Subindo (+${(trendVal * 100).toFixed(1)} cm/h)`;
          trendIcon = 'lucide-trending-up';
          trendColor = '#f59e0b';
        } else if (trendVal < -0.005) {
          trendText = `Descendo (${(trendVal * 100).toFixed(1)} cm/h)`;
          trendIcon = 'lucide-trending-down';
          trendColor = '#10b981';
        }
      }

      return {
        available: true,
        station: {
          code: st.id || 'DCRS-00016',
          name: st.name || 'Passo Fundo',
          basin: st.basin || 'RS - Rio Passo Fundo',
          status: st.status || 'operational',
          latitude: st.latitude ?? -28.2470,
          longitude: st.longitude ?? -52.3713
        },
        observedAtFormatted: formattedTime,
        data: {
          riverLevel: d.riverLevel !== null && d.riverLevel !== undefined ? Number(d.riverLevel).toFixed(2) : null,
          riverTrendText: trendText,
          riverTrendIcon: trendIcon,
          riverTrendColor: trendColor,
          rain1h: d.rain1h !== null && d.rain1h !== undefined ? Number(d.rain1h).toFixed(1) : '0.0',
          rain24h: d.rain24h !== null && d.rain24h !== undefined ? Number(d.rain24h).toFixed(1) : '0.0',
          rain7d: d.rain7d !== null && d.rain7d !== undefined ? Number(d.rain7d).toFixed(1) : '0.0',
          temperature: d.temperature !== null && d.temperature !== undefined ? Number(d.temperature).toFixed(1) : null,
          humidity: d.humidity !== null && d.humidity !== undefined ? Math.round(d.humidity) : null,
          windSpeed: d.windSpeed !== null && d.windSpeed !== undefined ? Number(d.windSpeed).toFixed(1) : null,
          windGust: d.windGust !== null && d.windGust !== undefined ? Number(d.windGust).toFixed(1) : null
        }
      };
    } catch (err) {
      clearTimeout(timeout);
      console.warn('[WeatherService] Defesa Civil RS indisponível:', err.message);
      return { available: false, error: err.message };
    }
  }

  /**
   * Mapeamento dos códigos WMO do Open-Meteo
   */
  getWeatherCodeInfo(code) {
    const table = {
      0: { label: 'Céu Limpo', icon: 'lucide-sun', color: '#fbbf24' },
      1: { label: 'Predomínio de Sol', icon: 'lucide-sun-medium', color: '#facc15' },
      2: { label: 'Parcialmente Nublado', icon: 'lucide-cloud-sun', color: '#38bdf8' },
      3: { label: 'Nublado', icon: 'lucide-cloud', color: '#94a3b8' },
      45: { label: 'Nevoeiro / Névoa', icon: 'lucide-cloud-fog', color: '#94a3b8' },
      48: { label: 'Nevoeiro com Geada', icon: 'lucide-cloud-fog', color: '#cbd5e1' },
      51: { label: 'Garoa Leve', icon: 'lucide-cloud-drizzle', color: '#60a5fa' },
      53: { label: 'Garoa Moderada', icon: 'lucide-cloud-drizzle', color: '#3b82f6' },
      55: { label: 'Garoa Intensa', icon: 'lucide-cloud-rain', color: '#2563eb' },
      61: { label: 'Chuva Fraca', icon: 'lucide-cloud-rain', color: '#60a5fa' },
      63: { label: 'Chuva Moderada', icon: 'lucide-cloud-rain', color: '#3b82f6' },
      65: { label: 'Chuva Forte', icon: 'lucide-cloud-rain-wind', color: '#1d4ed8' },
      71: { label: 'Queda de Neve Fraca', icon: 'lucide-snowflake', color: '#e0f2fe' },
      73: { label: 'Queda de Neve', icon: 'lucide-snowflake', color: '#bae6fd' },
      75: { label: 'Neve Intensa', icon: 'lucide-snowflake', color: '#7dd3fc' },
      80: { label: 'Pancadas de Chuva', icon: 'lucide-cloud-drizzle', color: '#38bdf8' },
      81: { label: 'Pancadas Moderadas', icon: 'lucide-cloud-rain', color: '#0284c7' },
      82: { label: 'Pancadas Violentas', icon: 'lucide-cloud-lightning', color: '#e11d48' },
      95: { label: 'Trovoada', icon: 'lucide-cloud-lightning', color: '#eab308' },
      96: { label: 'Trovoada com Granizo Leve', icon: 'lucide-cloud-lightning', color: '#f97316' },
      99: { label: 'Trovoada com Granizo Forte', icon: 'lucide-cloud-lightning', color: '#ef4444' }
    };
    return table[code] || { label: 'Instável', icon: 'lucide-cloud', color: '#94a3b8' };
  }

  /**
   * Salva no LocalStorage
   */
  saveToCache(data) {
    try {
      const payload = { savedAt: Date.now(), data };
      localStorage.setItem(this.cacheKey, JSON.stringify(payload));
      // Sincronizar chave legada para compatibilidade de relatórios se necessário
      localStorage.setItem('dc_pf_weather_consolidated_v1', JSON.stringify({
        current: {
          temperature: data.weather?.current?.temperature ?? data.hydro?.data?.temperature ?? null,
          conditionLabel: data.weather?.current?.condition ?? 'Condições Normais',
          humidity: data.weather?.current?.humidity ?? data.hydro?.data?.humidity ?? null,
          windSpeed: data.weather?.current?.windSpeed ?? data.hydro?.data?.windSpeed ?? null,
          windCardinal: data.weather?.current?.windCardinal ?? 'N/D',
          precipitation24h: data.hydro?.data?.rain24h ?? null
        },
        forecast5Days: (data.weather?.forecast || []).map(f => ({
          day: f.weekday,
          condition: f.condition,
          tempMin: f.tempMin,
          tempMax: f.tempMax,
          rainMm: f.rainMm
        }))
      }));
    } catch (e) {
      console.warn('[WeatherService] Falha ao gravar cache:', e);
    }
  }

  /**
   * Lê do LocalStorage com validação de TTL
   */
  loadFromCache() {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.savedAt || !parsed.data) return null;
      const age = Date.now() - parsed.savedAt;
      if (age < this.cacheTTL) {
        return parsed.data;
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
