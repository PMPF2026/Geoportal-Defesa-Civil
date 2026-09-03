/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interface da Central Meteorológica e Avisos (Defesa Civil RS & CPTEC/INPE)
 */

import { WEATHER_CONFIG } from './weather-config.js';
import { WeatherService } from './weather-service.js';

export class WeatherUI {
  constructor(containerId = 'tab-weather') {
    this.container = document.getElementById(containerId);
    this.currentSubTab = 'drs'; // 'drs' | 'cptec'
    this.currentStationCode = WEATHER_CONFIG.DEFESA_CIVIL_RS.DEFAULT_STATION;
    this.drsData = null;
    this.cptecData = null;
    this.autoRefreshTimer = null;
    this.isLoading = false;
    this.charts = {};

    if (this.container) {
      this.init();
    }
  }

  async init() {
    this.renderSkeleton();
    this.bindEvents();
    await this.refreshAllData();
    this.startAutoRefresh();
  }

  renderSkeleton() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="weather-container">
        <!-- Header & Controles -->
        <div class="weather-header">
          <div class="weather-title-row">
            <div class="weather-main-title">
              <i class="lucide-cloud-sun-rain"></i>
              <span>CENTRAL METEOROLÓGICA & AVISOS</span>
            </div>
            <button class="weather-refresh-btn" id="btn-weather-refresh" title="Atualizar dados meteorológicos">
              <i class="lucide-refresh-cw"></i>
              <span>Atualizar</span>
            </button>
          </div>

          <!-- Sub-Abas -->
          <div class="weather-subtabs">
            <button class="weather-tab-btn active" data-subtab="drs" id="btn-subtab-drs">
              <i class="lucide-activity"></i>
              <span>Monitoramento — Defesa Civil RS</span>
            </button>
            <button class="weather-tab-btn" data-subtab="cptec" id="btn-subtab-cptec">
              <i class="lucide-calendar"></i>
              <span>Previsão 5 Dias — CPTEC/INPE</span>
            </button>
          </div>
        </div>

        <!-- Avisos e Alertas Oficiais -->
        <div class="weather-alerts-box" id="weather-alerts-container">
          <div class="weather-alerts-header">
            <i class="lucide-alert-triangle"></i>
            <span>Avisos e Alertas Oficiais</span>
          </div>
          <div class="weather-alerts-content" id="weather-alerts-content">
            Nenhum aviso oficial disponível para integração automática no momento.
          </div>
        </div>

        <!-- Área Dinâmica das Abas -->
        <div id="weather-subtab-content-drs" class="weather-tab-pane">
          <!-- Estação & Foco -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name" id="drs-station-display-name">
                <i class="lucide-radio"></i>
                <span>Estação Passo Fundo (DCRS-00016)</span>
              </div>
              <div class="weather-station-meta" id="drs-station-display-meta">
                Bacia: RS - Rio Passo Fundo &bull; Lat: -28.247° | Lon: -52.371°
              </div>
            </div>
            <select class="weather-station-select" id="select-drs-station" title="Selecionar Estação de Monitoramento">
              ${WEATHER_CONFIG.DEFESA_CIVIL_RS.STATIONS.map(s => `
                <option value="${s.code}" ${s.code === this.currentStationCode ? 'selected' : ''}>
                  ${s.name} (${s.code})
                </option>
              `).join('')}
            </select>
          </div>

          <!-- Cards de Métricas em Tempo Real -->
          <div class="weather-cards-grid" id="drs-metrics-grid" style="margin-top: 10px;">
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
              <i class="lucide-loader" style="animation: spin 1s linear infinite; font-size: 20px; display: block; margin: 0 auto 8px;"></i>
              Carregando dados oficiais em tempo real da Defesa Civil RS...
            </div>
          </div>

          <!-- Gráficos de Monitoramento -->
          <div class="weather-chart-box" style="margin-top: 10px;">
            <div class="weather-chart-header">
              <span><i class="lucide-bar-chart-2"></i> Chuva Acumulada por Período (mm)</span>
            </div>
            <div class="weather-chart-canvas-wrapper">
              <canvas id="chart-drs-rain"></canvas>
            </div>
          </div>
        </div>

        <div id="weather-subtab-content-cptec" class="weather-tab-pane" style="display: none;">
          <!-- Previsão 5 Dias CPTEC -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name">
                <i class="lucide-map-pin"></i>
                <span>Passo Fundo / RS — Previsão Oficial CPTEC/INPE</span>
              </div>
              <div class="weather-station-meta">
                Modelo Meteorológico Oficial &bull; Hoje + Próximos 4 Dias
              </div>
            </div>
          </div>

          <!-- Cards 5 Dias -->
          <div class="forecast-5days-grid" id="cptec-5days-grid" style="margin-top: 10px;">
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
              <i class="lucide-loader" style="animation: spin 1s linear infinite; font-size: 20px; display: block; margin: 0 auto 8px;"></i>
              Consultando previsão oficial do CPTEC/INPE...
            </div>
          </div>

          <!-- Gráfico de Tendência de Temperatura CPTEC -->
          <div class="weather-chart-box" style="margin-top: 10px;">
            <div class="weather-chart-header">
              <span><i class="lucide-trending-up"></i> Curva de Temperaturas Previstas (°C)</span>
            </div>
            <div class="weather-chart-canvas-wrapper">
              <canvas id="chart-cptec-temps"></canvas>
            </div>
          </div>
        </div>

        <!-- Status & Fontes Oficiais -->
        <div class="weather-footer-sources">
          <div class="weather-status-bar">
            <span id="weather-last-update-text">Última atualização: Carregando...</span>
            <span id="weather-source-badge" style="color: #38bdf8; font-weight: 700;">Fonte: Defesa Civil RS</span>
          </div>
          <div style="line-height: 1.5; margin-top: 4px;">
            <strong>Fontes Oficiais:</strong><br>
            &bull; <a href="https://redehidrometeorologica.defesacivil.rs.gov.br" target="_blank" rel="noopener noreferrer">Defesa Civil do Estado do Rio Grande do Sul — Rede Hidrometeorológica</a><br>
            &bull; <a href="https://www.cptec.inpe.br" target="_blank" rel="noopener noreferrer">CPTEC/INPE — Centro de Previsão de Tempo e Estudos Climáticos</a>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  bindEvents() {
    // Alternância de Sub-Abas
    const btnDrs = document.getElementById('btn-subtab-drs');
    const btnCptec = document.getElementById('btn-subtab-cptec');
    const paneDrs = document.getElementById('weather-subtab-content-drs');
    const paneCptec = document.getElementById('weather-subtab-content-cptec');
    const sourceBadge = document.getElementById('weather-source-badge');

    if (btnDrs && btnCptec) {
      btnDrs.addEventListener('click', () => {
        this.currentSubTab = 'drs';
        btnDrs.classList.add('active');
        btnCptec.classList.remove('active');
        if (paneDrs) paneDrs.style.display = 'block';
        if (paneCptec) paneCptec.style.display = 'none';
        if (sourceBadge) sourceBadge.textContent = 'Fonte: Defesa Civil RS';
        this.renderDrsCharts();
      });

      btnCptec.addEventListener('click', () => {
        this.currentSubTab = 'cptec';
        btnCptec.classList.add('active');
        btnDrs.classList.remove('active');
        if (paneDrs) paneDrs.style.display = 'none';
        if (paneCptec) paneCptec.style.display = 'block';
        if (sourceBadge) sourceBadge.textContent = 'Fonte: CPTEC/INPE';
        this.renderCptecCharts();
      });
    }

    // Seletor de Estações DRS
    const selectStation = document.getElementById('select-drs-station');
    if (selectStation) {
      selectStation.addEventListener('change', async (e) => {
        this.currentStationCode = e.target.value;
        const stationObj = WEATHER_CONFIG.DEFESA_CIVIL_RS.STATIONS.find(s => s.code === this.currentStationCode);
        const nameDisp = document.getElementById('drs-station-display-name');
        const metaDisp = document.getElementById('drs-station-display-meta');
        if (nameDisp && stationObj) {
          nameDisp.innerHTML = `<i class="lucide-radio"></i><span>Estação ${stationObj.name} (${stationObj.code})</span>`;
        }
        if (metaDisp && stationObj) {
          metaDisp.innerHTML = `Bacia: ${stationObj.basin} &bull; Lat: ${stationObj.lat.toFixed(3)}° | Lon: ${stationObj.lon.toFixed(3)}°`;
        }
        await this.loadDefesaCivilRSData();
      });
    }

    // Botão Atualizar
    const btnRefresh = document.getElementById('btn-weather-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');
        await this.refreshAllData();
        setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
      });
    }
  }

  async refreshAllData() {
    this.isLoading = true;
    await Promise.all([
      this.loadDefesaCivilRSData(),
      this.loadCptecData()
    ]);
    this.isLoading = false;
  }

  async loadDefesaCivilRSData() {
    const grid = document.getElementById('drs-metrics-grid');
    const updateText = document.getElementById('weather-last-update-text');

    const data = await WeatherService.fetchDefesaCivilRSTelemetry(this.currentStationCode);
    this.drsData = data;

    if (!data.success) {
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--dc-hazard-red); padding: 14px; border-radius: var(--radius-md); font-size: 12px; color: #fca5a5; text-align: center;">
            <i class="lucide-alert-circle" style="font-size: 20px; display: block; margin: 0 auto 6px;"></i>
            Não foi possível atualizar os dados meteorológicos da Defesa Civil RS no momento.<br>
            <span style="font-size: 11px; opacity: 0.8;">Tente novamente em instantes.</span>
          </div>
        `;
      }
      if (updateText) updateText.textContent = 'Dados sem atualização recente';
      return;
    }

    // Render Metrics Cards
    const fmt = (val, unit, fallback = 'Não disponível') => {
      if (val == null || isNaN(val)) return fallback;
      return `${typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val} <span class="weather-metric-unit">${unit}</span>`;
    };

    const c = data.chuva || {};
    const t = data.temperatura || {};
    const u = data.umidade || {};
    const v = data.vento || {};
    const p = data.pressao || {};
    const s = data.sensacaoTermica || {};
    const r = data.rio || {};

    if (grid) {
      grid.innerHTML = `
        <!-- Card Temperatura -->
        <div class="weather-metric-card accent-temp">
          <div class="weather-metric-header">
            <span>Temperatura</span>
            <i class="lucide-thermometer"></i>
          </div>
          <div class="weather-metric-value">${fmt(t.atual, '°C')}</div>
          <div class="weather-metric-footer">
            ${t.minima != null && t.maxima != null ? `Mín: ${t.minima.toFixed(1)}°C &bull; Máx: ${t.maxima.toFixed(1)}°C` : 'Medição horária contínua'}
          </div>
        </div>

        <!-- Card Umidade -->
        <div class="weather-metric-card accent-humidity">
          <div class="weather-metric-header">
            <span>Umidade do Ar</span>
            <i class="lucide-droplets"></i>
          </div>
          <div class="weather-metric-value">${fmt(u.atual, '%')}</div>
          <div class="weather-metric-footer">
            ${u.atual >= 70 ? 'Umidade elevada' : (u.atual <= 30 ? 'Atenção: baixa umidade' : 'Faixa confortável')}
          </div>
        </div>

        <!-- Card Vento -->
        <div class="weather-metric-card accent-wind">
          <div class="weather-metric-header">
            <span>Vento Médio</span>
            <i class="lucide-wind"></i>
          </div>
          <div class="weather-metric-value">${fmt(v.velocidadeMedia, 'km/h')}</div>
          <div class="weather-metric-footer">
            ${v.velocidadeMaxima != null ? `Rajada: ${v.velocidadeMaxima.toFixed(1)} km/h` : 'Direção monitorada'}
          </div>
        </div>

        <!-- Card Pressão -->
        <div class="weather-metric-card">
          <div class="weather-metric-header">
            <span>Pressão Atmosf.</span>
            <i class="lucide-gauge"></i>
          </div>
          <div class="weather-metric-value">${fmt(p.atual, 'hPa')}</div>
          <div class="weather-metric-footer">
            ${p.tendencia != null ? `Tendência: ${p.tendencia > 0 ? '+Estável' : p.tendencia.toFixed(2)}` : 'Sensor barométrico'}
          </div>
        </div>

        <!-- Card Sensação Térmica -->
        <div class="weather-metric-card">
          <div class="weather-metric-header">
            <span>Sensação Térmica</span>
            <i class="lucide-flame"></i>
          </div>
          <div class="weather-metric-value">${fmt(s.atual, '°C')}</div>
          <div class="weather-metric-footer">Índice bioclimático oficial</div>
        </div>

        <!-- Card Nível do Rio -->
        <div class="weather-metric-card accent-river">
          <div class="weather-metric-header">
            <span>Nível do Rio</span>
            <i class="lucide-waves"></i>
          </div>
          <div class="weather-metric-value">${fmt(r.nivel, 'm')}</div>
          <div class="weather-metric-footer">${r.nome || 'Bacia Hidrográfica'}</div>
        </div>

        <!-- Acumulados de Chuva Detalhados -->
        <div class="rain-breakdown-card accent-rain">
          <div class="rain-breakdown-title">
            <i class="lucide-cloud-rain" style="color:#0284c7;"></i>
            <span>Chuva Acumulada em Tempo Real — ${data.name}</span>
          </div>
          <div class="rain-pills-row">
            <div class="rain-pill">
              <span class="rain-pill-label">15 min</span>
              <div class="rain-pill-val">${c.min15 != null ? c.min15.toFixed(1) : '0.0'} mm</div>
            </div>
            <div class="rain-pill">
              <span class="rain-pill-label">1 hora</span>
              <div class="rain-pill-val">${c.h1 != null ? c.h1.toFixed(1) : '0.0'} mm</div>
            </div>
            <div class="rain-pill">
              <span class="rain-pill-label">3 horas</span>
              <div class="rain-pill-val">${c.h3 != null ? c.h3.toFixed(1) : '0.0'} mm</div>
            </div>
            <div class="rain-pill">
              <span class="rain-pill-label">6 horas</span>
              <div class="rain-pill-val">${c.h6 != null ? c.h6.toFixed(1) : '0.0'} mm</div>
            </div>
            <div class="rain-pill">
              <span class="rain-pill-label">12 horas</span>
              <div class="rain-pill-val">${c.h12 != null ? c.h12.toFixed(1) : '0.0'} mm</div>
            </div>
            <div class="rain-pill">
              <span class="rain-pill-label">24 horas</span>
              <div class="rain-pill-val" style="color: var(--dc-orange-primary);">${c.h24 != null ? c.h24.toFixed(1) : '0.0'} mm</div>
            </div>
          </div>
        </div>
      `;
    }

    if (updateText && data.timestamp) {
      try {
        const d = new Date(data.timestamp);
        const dataStr = d.toLocaleDateString('pt-BR');
        const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        updateText.textContent = `Última atualização: ${dataStr} — ${horaStr}`;
      } catch {
        updateText.textContent = `Última leitura: ${data.timestamp}`;
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderDrsCharts();
  }

  async loadCptecData() {
    const grid = document.getElementById('cptec-5days-grid');
    const data = await WeatherService.fetchCptecForecast(WEATHER_CONFIG.CPTEC.CITY_ID);
    this.cptecData = data;

    if (!data.success || !data.forecasts || data.forecasts.length === 0) {
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--dc-hazard-red); padding: 14px; border-radius: var(--radius-md); font-size: 12px; color: #fca5a5; text-align: center;">
            <i class="lucide-alert-circle" style="font-size: 20px; display: block; margin: 0 auto 6px;"></i>
            Não foi possível carregar a previsão do CPTEC/INPE no momento.<br>
            <span style="font-size: 11px; opacity: 0.8;">Tente novamente em instantes.</span>
          </div>
        `;
      }
      return;
    }

    // Alinhamento exato para 5 dias (Hoje + 4 dias)
    const alignedForecasts = this.align5DaysForecast(data.forecasts);
    this.alignedCptecForecasts = alignedForecasts;

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const pad = (n) => String(n).padStart(2, '0');

    if (grid) {
      grid.innerHTML = alignedForecasts.map((f, idx) => {
        let weekdayLabel = '';
        let dateFormatted = f.date;
        try {
          const parts = f.date.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dObj = new Date(y, m, d);
            weekdayLabel = idx === 0 ? 'Hoje' : weekdays[dObj.getDay()];
            dateFormatted = `${pad(d)}/${pad(m + 1)}`;
          }
        } catch {
          weekdayLabel = idx === 0 ? 'Hoje' : `Dia +${idx}`;
        }

        return `
          <div class="forecast-day-card ${idx === 0 ? 'today' : ''}">
            <span class="forecast-weekday">${weekdayLabel}</span>
            <span class="forecast-date">${dateFormatted}</span>
            <div class="forecast-icon-wrapper" style="color: ${f.color || '#f59e0b'};">
              <i class="lucide-${f.iconName || 'cloud'}"></i>
            </div>
            <div class="forecast-temps">
              <span class="forecast-temp-max" title="Máxima Prevista">▲ ${f.maxTemp}°</span>
              <span class="forecast-temp-min" title="Mínima Prevista">▼ ${f.minTemp}°</span>
            </div>
            <div class="forecast-condition-desc">${f.conditionLabel || 'Parcialmente Nublado'}</div>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderCptecCharts();
  }

  /**
   * Alinha a previsão para exatamente 5 dias iniciando rigorosamente na data local de hoje
   */
  align5DaysForecast(rawForecasts) {
    if (!rawForecasts || rawForecasts.length === 0) return [];

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const todayIndex = rawForecasts.findIndex(f => f.date === todayStr);
    let alignedList = [];

    if (todayIndex !== -1) {
      alignedList = rawForecasts.slice(todayIndex, todayIndex + 5);
    } else {
      const t = this.drsData?.temperatura || {};
      const hist = t.historico?.diaatual || {};
      const minTemp = hist.minima != null ? hist.minima : (t.atual != null ? Math.min(t.atual, 14) : 14);
      const maxTemp = hist.maxima != null ? hist.maxima : (t.atual != null ? Math.max(t.atual, 22.9) : 22.9);

      const todayCard = {
        date: todayStr,
        conditionCode: 'pn',
        conditionLabel: 'Parcialmente Nublado',
        iconName: 'cloud-sun',
        color: '#f59e0b',
        minTemp: Math.round(minTemp),
        maxTemp: Math.round(maxTemp),
        iuv: 0
      };

      alignedList.push(todayCard);

      for (const item of rawForecasts) {
        if (item.date > todayStr && alignedList.length < 5) {
          alignedList.push(item);
        }
      }
    }

    return alignedList.slice(0, 5);
  }

  renderDrsCharts() {
    const canvas = document.getElementById('chart-drs-rain');
    if (!canvas || !window.Chart || !this.drsData?.chuva) return;

    if (this.charts.drsRain) {
      this.charts.drsRain.destroy();
    }

    const c = this.drsData.chuva;
    const ctx = canvas.getContext('2d');

    this.charts.drsRain = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['15 min', '1h', '3h', '6h', '12h', '24h'],
        datasets: [{
          label: 'Chuva Acumulada (mm)',
          data: [c.min15 || 0, c.h1 || 0, c.h3 || 0, c.h6 || 0, c.h12 || 0, c.h24 || 0],
          backgroundColor: [
            'rgba(56, 189, 248, 0.7)',
            'rgba(14, 165, 233, 0.75)',
            'rgba(2, 132, 199, 0.8)',
            'rgba(3, 105, 161, 0.85)',
            'rgba(30, 58, 138, 0.9)',
            'rgba(234, 88, 12, 0.95)'
          ],
          borderColor: '#ffffff',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => `Acumulado: ${item.raw} mm`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 10.5 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.08)' }
          }
        }
      }
    });
  }

  renderCptecCharts() {
    const canvas = document.getElementById('chart-cptec-temps');
    const forecastList = this.alignedCptecForecasts || this.cptecData?.forecasts || [];
    if (!canvas || !window.Chart || forecastList.length === 0) return;

    if (this.charts.cptecTemps) {
      this.charts.cptecTemps.destroy();
    }

    const pad = (n) => String(n).padStart(2, '0');
    const labels = forecastList.map((f, idx) => {
      const parts = f.date.split('-');
      return parts.length === 3 ? `${pad(parts[2])}/${pad(parts[1])}` : f.date;
    });

    const maxTemps = forecastList.map(f => f.maxTemp);
    const minTemps = forecastList.map(f => f.minTemp);

    const ctx = canvas.getContext('2d');
    this.charts.cptecTemps = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Temp. Máxima (°C)',
            data: maxTemps,
            borderColor: '#f87171',
            backgroundColor: 'rgba(248, 113, 113, 0.15)',
            fill: false,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#f87171'
          },
          {
            label: 'Temp. Mínima (°C)',
            data: minTemps,
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            fill: false,
            tension: 0.35,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#60a5fa'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#ffffff', font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.dataset.label}: ${item.raw} °C`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 10.5 } },
            grid: { display: false }
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 10 } },
            grid: { color: 'rgba(255, 255, 255, 0.08)' }
          }
        }
      }
    });
  }

  startAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
    }
    this.autoRefreshTimer = setInterval(() => {
      this.refreshAllData();
    }, WEATHER_CONFIG.REFRESH_INTERVAL_MS);
  }
}
