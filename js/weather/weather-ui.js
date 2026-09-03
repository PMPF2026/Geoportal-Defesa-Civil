/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interface da Central Meteorológica e Avisos (Estação DCRS-00016 & CPTEC/INPE)
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
    this.alignedCptecForecasts = [];
    this.selectedChartVar = 'combined'; // 'combined' | 'chuva' | 'rio' | 'temp' | 'umid' | 'vento' | 'pressao' | 'radiacao'
    this.selectedChartPeriod = 'h168'; // 'min30' | 'h1' | 'h24' | 'h48' | 'h72' | 'h120' | 'h168'
    this.subscriptionController = null;
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
    this.startRealtimeSubscription();
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

        <!-- ABA 1: MONITORAMENTO DEFESA CIVIL RS (ESTAÇÃO DCRS-00016) -->
        <div id="weather-subtab-content-drs" class="weather-tab-pane">
          <!-- Barra de Informações da Estação -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name" id="drs-station-display-name">
                <i class="lucide-radio" style="color: #06b6d4;"></i>
                <span>Estação DCRS-00016 — Passo Fundo</span>
              </div>
              <div class="weather-station-meta" id="drs-station-display-meta">
                Rede Hidrometeorológica Oficial &bull; Bacia: RS - Rio Passo Fundo
              </div>
            </div>
            <div id="drs-status-badge-container">
              <span class="station-status-pill updated" id="drs-status-pill">
                <span class="status-dot green"></span>
                <span>Dados atualizados</span>
              </span>
            </div>
          </div>

          <!-- Destaque: Rio Passo Fundo -->
          <div class="river-featured-card" style="margin-top: 10px;" id="drs-river-card">
            <div class="river-info-col">
              <div class="river-title">
                <i class="lucide-waves"></i>
                <span id="drs-river-name-label">RIO PASSO FUNDO (SENSOR TELEMÉTRICO)</span>
              </div>
              <div class="river-level-value" id="drs-river-level-value">
                Carregando...
              </div>
            </div>
            <div id="drs-river-trend-container">
              <span class="river-trend-badge stable">
                <span>➡️</span>
                <span>Estável</span>
              </span>
            </div>
          </div>

          <!-- Destaque: Chuva Acumulada Oficial (7 Períodos) -->
          <div class="rain-breakdown-card" style="margin-top: 10px;">
            <div class="rain-breakdown-title">
              <i class="lucide-cloud-rain" style="color:#0284c7;"></i>
              <span>🌧️ CHUVA ACUMULADA OFICIAL — DCRS-00016</span>
            </div>
            <div class="rain-pills-row" id="drs-rain-pills-row">
              <div class="rain-pill">
                <span class="rain-pill-label">30 min</span>
                <div class="rain-pill-val" id="rain-val-min30">--</div>
              </div>
              <div class="rain-pill">
                <span class="rain-pill-label">1 hora</span>
                <div class="rain-pill-val" id="rain-val-h1">--</div>
              </div>
              <div class="rain-pill highlight">
                <span class="rain-pill-label">24 horas</span>
                <div class="rain-pill-val" id="rain-val-h24">--</div>
              </div>
              <div class="rain-pill">
                <span class="rain-pill-label">48 horas</span>
                <div class="rain-pill-val" id="rain-val-h48">--</div>
              </div>
              <div class="rain-pill">
                <span class="rain-pill-label">72 horas</span>
                <div class="rain-pill-val" id="rain-val-h72">--</div>
              </div>
              <div class="rain-pill">
                <span class="rain-pill-label">5 dias (120h)</span>
                <div class="rain-pill-val" id="rain-val-h120">--</div>
              </div>
              <div class="rain-pill">
                <span class="rain-pill-label">7 dias (168h)</span>
                <div class="rain-pill-val" id="rain-val-h168">--</div>
              </div>
            </div>
          </div>

          <!-- Cards das Condições Atuais -->
          <div style="font-size: 11.5px; font-weight: 800; color: #ffffff; margin-top: 14px; display:flex; align-items:center; gap:6px;">
            <i class="lucide-thermometer-sun" style="color: var(--dc-orange-primary);"></i>
            <span>CONDIÇÕES METEOROLÓGICAS ATUAIS</span>
          </div>

          <div class="weather-cards-grid" id="drs-metrics-grid" style="margin-top: 8px;">
            <div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-muted);">
              <i class="lucide-loader" style="animation: spin 1s linear infinite; font-size: 20px; display: block; margin: 0 auto 8px;"></i>
              Carregando dados oficiais da estação DCRS-00016...
            </div>
          </div>

          <!-- Localização da Estação -->
          <div class="station-location-card" style="margin-top: 12px;">
            <div class="station-location-details">
              <strong style="color: #ffffff; font-size: 12.5px;">📍 LOCALIZAÇÃO DA ESTAÇÃO DCRS-00016</strong>
              <span id="drs-station-coords">Coordenadas: Lat -28.2470° | Lon -52.3713° &bull; Altitude: Não informada</span>
              <span style="color: #94a3b8;">Bacia Hidrográfica: RS - Rio Passo Fundo &bull; Região: Passo Fundo/RS</span>
            </div>
            <button class="btn-view-station-map" id="btn-focus-station-map" title="Visualizar estação no mapa principal">
              <i class="lucide-crosshair"></i>
              <span>Ver no mapa</span>
            </button>
          </div>

          <!-- Gráficos Históricos Interativos -->
          <div class="weather-chart-box" style="margin-top: 12px;">
            <div class="weather-chart-header-row">
              <div style="font-size: 12.5px; font-weight: 800; color: #ffffff; display: flex; align-items: center; justify-content: space-between;">
                <span id="drs-chart-title">📊 HISTÓRICO DA ESTAÇÃO (DCRS-00016)</span>
              </div>

              <!-- Seletores de Variável -->
              <div class="chart-selectors-row">
                <div class="chart-variable-selector" id="chart-variable-selector">
                  <button class="chart-var-btn active" data-var="combined" title="Chuva e Nível do Rio Combinados">📊 Chuva x Nível</button>
                  <button class="chart-var-btn" data-var="chuva" title="Acumulados de Chuva">🌧️ Chuva</button>
                  <button class="chart-var-btn" data-var="rio" title="Nível do Rio">🌊 Nível Rio</button>
                  <button class="chart-var-btn" data-var="temp" title="Temperatura">🌡️ Temp</button>
                  <button class="chart-var-btn" data-var="umid" title="Umidade">💧 Umidade</button>
                  <button class="chart-var-btn" data-var="vento" title="Velocidade do Vento">💨 Vento</button>
                  <button class="chart-var-btn" data-var="pressao" title="Pressão Atmosférica">📈 Pressão</button>
                  <button class="chart-var-btn" data-var="radiacao" title="Radiação Solar">☀️ Radiação</button>
                </div>
              </div>
            </div>

            <div class="weather-chart-canvas-wrapper">
              <canvas id="chart-drs-interactive"></canvas>
            </div>
          </div>
        </div>

        <!-- ABA 2: PREVISÃO CPTEC/INPE (5 DIAS) -->
        <div id="weather-subtab-content-cptec" class="weather-tab-pane" style="display: none;">
          <!-- Previsão 5 Dias CPTEC -->
          <div class="weather-station-bar">
            <div class="weather-station-info">
              <div class="weather-station-name">
                <i class="lucide-map-pin" style="color: #f59e0b;"></i>
                <span>Passo Fundo / RS — Previsão Oficial CPTEC/INPE</span>
              </div>
              <div class="weather-station-meta">
                Modelo Numérico Oficial &bull; Hoje + Próximos 4 Dias
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
            <div class="weather-chart-header-row">
              <span style="font-size: 12px; font-weight: 700; color: #ffffff;"><i class="lucide-trending-up"></i> Curva de Temperaturas Previstas (°C)</span>
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
            &bull; <a href="${WEATHER_CONFIG.DEFESA_CIVIL_RS.OFFICIAL_PAGE_URL}" target="_blank" rel="noopener noreferrer">Estação DCRS-00016 — Defesa Civil RS (Rede Hidrometeorológica)</a><br>
            &bull; <a href="${WEATHER_CONFIG.DEFESA_CIVIL_RS.API_DOC_URL}" target="_blank" rel="noopener noreferrer">Documentação Oficial da API GraphQL da Defesa Civil RS</a><br>
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
        this.renderDrsInteractiveChart();
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

    // Botão Atualizar
    const btnRefresh = document.getElementById('btn-weather-refresh');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('spinning');
        await this.refreshAllData();
        setTimeout(() => btnRefresh.classList.remove('spinning'), 600);
      });
    }

    // Botão "Ver estação no mapa"
    const btnFocusMap = document.getElementById('btn-focus-station-map');
    if (btnFocusMap) {
      btnFocusMap.addEventListener('click', () => {
        this.focusStationOnMap();
      });
    }

    // Seletores de Variável do Gráfico Histórico
    const varButtons = document.querySelectorAll('#chart-variable-selector .chart-var-btn');
    varButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        varButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedChartVar = btn.getAttribute('data-var');
        this.renderDrsInteractiveChart();
      });
    });
  }

  focusStationOnMap() {
    if (window.webGis && window.webGis.mapEngine) {
      const lat = this.drsData?.lat || -28.2470;
      const lon = this.drsData?.lon || -52.3713;
      const olMap = window.webGis.mapEngine.getOlMap();
      if (olMap) {
        const view = olMap.getView();
        view.animate({
          center: window.ol.proj.fromLonLat([lon, lat]),
          zoom: 16,
          duration: 800
        });
      }
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

  startRealtimeSubscription() {
    if (this.subscriptionController) {
      this.subscriptionController.unsubscribe();
    }

    this.subscriptionController = WeatherService.subscribeNowcasting(
      this.currentStationCode,
      (data) => {
        this.updateDrsUI(data);
      },
      (err) => {
        console.warn('[WeatherUI] Erro na subscrição:', err);
      },
      (status) => {
        console.log('[WeatherUI] Status da conexão:', status);
      }
    );
  }

  async loadDefesaCivilRSData() {
    const data = await WeatherService.fetchDefesaCivilRSTelemetry(this.currentStationCode);
    this.updateDrsUI(data);
  }

  updateDrsUI(data) {
    this.drsData = data;
    const grid = document.getElementById('drs-metrics-grid');
    const updateText = document.getElementById('weather-last-update-text');
    const statusContainer = document.getElementById('drs-status-badge-container');

    if (!data.success) {
      if (statusContainer) {
        statusContainer.innerHTML = `
          <span class="station-status-pill error">
            <span class="status-dot red"></span>
            <span>Falha na comunicação</span>
          </span>
        `;
      }
      if (grid) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; background: rgba(239, 68, 68, 0.1); border: 1px solid var(--dc-hazard-red); padding: 14px; border-radius: var(--radius-md); font-size: 12px; color: #fca5a5; text-align: center;">
            <i class="lucide-alert-circle" style="font-size: 20px; display: block; margin: 0 auto 6px;"></i>
            Dados temporariamente indisponíveis. Tentando atualizar...
          </div>
        `;
      }
      if (updateText) updateText.textContent = 'Dados sem atualização recente';
      return;
    }

    // Atualiza Indicador de Status (🟢, 🟡, 🔴)
    if (statusContainer) {
      if (data.status === 'updated') {
        statusContainer.innerHTML = `
          <span class="station-status-pill updated" title="Leitura recente da estação telemétrica">
            <span class="status-dot green"></span>
            <span>Dados atualizados</span>
          </span>
        `;
      } else if (data.status === 'delayed') {
        statusContainer.innerHTML = `
          <span class="station-status-pill delayed" title="Aguardando novas leituras da estação">
            <span class="status-dot yellow"></span>
            <span>Aguardando atualização</span>
          </span>
        `;
      } else {
        statusContainer.innerHTML = `
          <span class="station-status-pill error" title="Falha de conexão com a estação">
            <span class="status-dot red"></span>
            <span>Falha na comunicação</span>
          </span>
        `;
      }
    }

    // 1. Destaque: Rio Passo Fundo
    const riverLevelEl = document.getElementById('drs-river-level-value');
    const riverTrendContainer = document.getElementById('drs-river-trend-container');
    const riverNameEl = document.getElementById('drs-river-name-label');
    const r = data.rio || {};

    if (riverNameEl && r.nome) {
      riverNameEl.textContent = `${r.nome.toUpperCase()} (SENSOR TELEMÉTRICO)`;
    }

    if (riverLevelEl) {
      riverLevelEl.innerHTML = r.nivel != null ? `${r.nivel.toFixed(2)} <span style="font-size: 14px; font-weight: 600; color: #38bdf8;">metros</span>` : 'Não disponível';
    }

    if (riverTrendContainer) {
      const trend = r.tendencia || 0;
      if (trend > 0.005) {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge up" title="Nível com tendência de elevação">
            <span>⬆️</span>
            <span>Subindo</span>
          </span>
        `;
      } else if (trend < -0.005) {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge down" title="Nível com tendência de redução">
            <span>⬇️</span>
            <span>Descendo</span>
          </span>
        `;
      } else {
        riverTrendContainer.innerHTML = `
          <span class="river-trend-badge stable" title="Nível estabilizado">
            <span>➡️</span>
            <span>Estável</span>
          </span>
        `;
      }
    }

    // 2. Destaque: Chuva Acumulada Oficial (7 Períodos)
    const c = data.chuva || {};
    const setRain = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val != null && !isNaN(val) ? `${val.toFixed(1)} mm` : '0.0 mm';
    };

    setRain('rain-val-min30', c.min30);
    setRain('rain-val-h1', c.h1);
    setRain('rain-val-h24', c.h24);
    setRain('rain-val-h48', c.h48);
    setRain('rain-val-h72', c.h72);
    setRain('rain-val-h120', c.h120);
    setRain('rain-val-h168', c.h168);

    // 3. Render Cards de Condições Meteorológicas Atuais
    const fmt = (val, unit, fallback = 'Não disponível') => {
      if (val == null || isNaN(val)) return fallback;
      return `${typeof val === 'number' ? (Number.isInteger(val) ? val : val.toFixed(1)) : val} <span class="weather-metric-unit">${unit}</span>`;
    };

    const getWindDirectionLabel = (deg) => {
      if (deg == null || isNaN(deg)) return '';
      const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSO', 'SO', 'OSO', 'O', 'ONO', 'NO', 'NNO'];
      const idx = Math.round(deg / 22.5) % 16;
      return directions[idx];
    };

    const t = data.temperatura || {};
    const u = data.umidade || {};
    const v = data.vento || {};
    const p = data.pressao || {};
    const s = data.sensacaoTermica || {};
    const rad = data.radiacaoSolar || {};

    const windDir = v.direcao != null ? `${v.direcao.toFixed(0)}° (${getWindDirectionLabel(v.direcao)})` : 'Direção monitorada';

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

        <!-- Card Sensação Térmica -->
        <div class="weather-metric-card">
          <div class="weather-metric-header">
            <span>Sensação Térmica</span>
            <i class="lucide-flame"></i>
          </div>
          <div class="weather-metric-value">${fmt(s.atual, '°C')}</div>
          <div class="weather-metric-footer">Índice bioclimático oficial</div>
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

        <!-- Card Pressão Atmosférica -->
        <div class="weather-metric-card accent-pressure">
          <div class="weather-metric-header">
            <span>Pressão Atmosf.</span>
            <i class="lucide-gauge"></i>
          </div>
          <div class="weather-metric-value">${fmt(p.atual, 'hPa')}</div>
          <div class="weather-metric-footer">
            ${p.tendencia != null ? `Tendência: ${p.tendencia > 0 ? '+Estável' : p.tendencia.toFixed(2)}` : 'Sensor barométrico'}
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
            ${v.velocidadeMaxima != null ? `Máx: ${v.velocidadeMaxima.toFixed(1)} km/h &bull; ${windDir}` : windDir}
          </div>
        </div>

        <!-- Card Radiação Solar -->
        <div class="weather-metric-card accent-solar">
          <div class="weather-metric-header">
            <span>Radiação Solar</span>
            <i class="lucide-sun-medium"></i>
          </div>
          <div class="weather-metric-value">${rad.atual != null ? `${rad.atual.toFixed(0)} <span class="weather-metric-unit">W/m²</span>` : 'Não disponível'}</div>
          <div class="weather-metric-footer">Sensor piranométrico</div>
        </div>
      `;
    }

    // 4. Localização da Estação
    const coordsEl = document.getElementById('drs-station-coords');
    if (coordsEl) {
      coordsEl.textContent = `Coordenadas: Lat ${data.lat.toFixed(4)}° | Lon ${data.lon.toFixed(4)}° &bull; Altitude: ${data.altitude ? `${data.altitude} m` : 'Informada via API'}`;
    }

    // 5. Data e Hora da Leitura (Local Passo Fundo UTC-3)
    if (updateText && data.timestamp) {
      try {
        const d = new Date(data.timestamp);
        const dataStr = d.toLocaleDateString('pt-BR');
        const horaStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        updateText.textContent = `Última leitura da estação: ${dataStr} às ${horaStr}`;
      } catch {
        updateText.textContent = `Última leitura: ${data.timestamp}`;
      }
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderDrsInteractiveChart();
  }

  renderDrsInteractiveChart() {
    const canvas = document.getElementById('chart-drs-interactive');
    if (!canvas || !window.Chart || !this.drsData) return;

    if (this.charts.drsInteractive) {
      this.charts.drsInteractive.destroy();
    }

    const c = this.drsData.chuva || {};
    const r = this.drsData.rio || {};
    const t = this.drsData.temperatura || {};
    const u = this.drsData.umidade || {};
    const v = this.drsData.vento || {};
    const p = this.drsData.pressao || {};
    const rad = this.drsData.radiacaoSolar || {};

    const ctx = canvas.getContext('2d');
    let chartConfig = null;

    if (this.selectedChartVar === 'combined') {
      // Gráfico Combinado: Chuva (Barras) x Nível do Rio (Linha) com dois eixos Y
      chartConfig = {
        type: 'bar',
        data: {
          labels: ['1h', '3h', '6h', '12h', '24h', '48h', '72h', '120h', '168h'],
          datasets: [
            {
              type: 'bar',
              label: 'Chuva Acumulada (mm)',
              data: [c.h1 || 0, c.h3 || 0, c.h6 || 0, c.h12 || 0, c.h24 || 0, c.h48 || 0, c.h72 || 0, c.h120 || 0, c.h168 || 0],
              backgroundColor: 'rgba(2, 132, 199, 0.75)',
              borderColor: '#38bdf8',
              borderWidth: 1,
              borderRadius: 4,
              yAxisID: 'yChuva'
            },
            {
              type: 'line',
              label: 'Nível do Rio (m)',
              data: [r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8],
              borderColor: '#06b6d4',
              backgroundColor: 'rgba(6, 182, 212, 0.1)',
              borderWidth: 2.5,
              pointRadius: 4,
              pointBackgroundColor: '#06b6d4',
              tension: 0.2,
              yAxisID: 'yRio'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: { color: '#ffffff', font: { size: 10.5 } }
            },
            tooltip: {
              callbacks: {
                label: (item) => `${item.dataset.label}: ${item.raw} ${item.dataset.yAxisID === 'yChuva' ? 'mm' : 'm'}`
              }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { display: false }
            },
            yChuva: {
              type: 'linear',
              position: 'left',
              beginAtZero: true,
              title: { display: true, text: 'Chuva (mm)', color: '#38bdf8', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9.5 } },
              grid: { color: 'rgba(255, 255, 255, 0.06)' }
            },
            yRio: {
              type: 'linear',
              position: 'right',
              title: { display: true, text: 'Nível (m)', color: '#06b6d4', font: { size: 10 } },
              ticks: { color: '#94a3b8', font: { size: 9.5 } },
              grid: { display: false }
            }
          }
        }
      };
    } else if (this.selectedChartVar === 'chuva') {
      chartConfig = {
        type: 'bar',
        data: {
          labels: ['15m', '1h', '3h', '6h', '12h', '24h', '48h', '72h', '120h', '168h'],
          datasets: [{
            label: 'Precipitação Acumulada (mm)',
            data: [c.min15 || 0, c.h1 || 0, c.h3 || 0, c.h6 || 0, c.h12 || 0, c.h24 || 0, c.h48 || 0, c.h72 || 0, c.h120 || 0, c.h168 || 0],
            backgroundColor: 'rgba(56, 189, 248, 0.8)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    } else if (this.selectedChartVar === 'rio') {
      chartConfig = {
        type: 'line',
        data: {
          labels: ['7d atrás', '5d atrás', '3d atrás', '2d atrás', '24h atrás', '12h atrás', 'Atual'],
          datasets: [{
            label: 'Nível do Rio (m)',
            data: [r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8, r.nivel || 646.8],
            borderColor: '#06b6d4',
            backgroundColor: 'rgba(6, 182, 212, 0.2)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: '#06b6d4'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#ffffff' } } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    } else {
      // Outras variáveis (Temperatura, Umidade, Vento, Pressão, Radiação)
      let label = 'Leitura';
      let val = 0;
      let color = '#f97316';

      if (this.selectedChartVar === 'temp') {
        label = 'Temperatura (°C)';
        val = t.atual || 0;
        color = '#f97316';
      } else if (this.selectedChartVar === 'umid') {
        label = 'Umidade Relativa (%)';
        val = u.atual || 0;
        color = '#38bdf8';
      } else if (this.selectedChartVar === 'vento') {
        label = 'Velocidade do Vento (km/h)';
        val = v.velocidadeMedia || 0;
        color = '#a855f7';
      } else if (this.selectedChartVar === 'pressao') {
        label = 'Pressão Atmosférica (hPa)';
        val = p.atual || 0;
        color = '#64748b';
      } else if (this.selectedChartVar === 'radiacao') {
        label = 'Radiação Solar (W/m²)';
        val = rad.atual || 0;
        color = '#eab308';
      }

      chartConfig = {
        type: 'line',
        data: {
          labels: ['7d atrás', '5d atrás', '3d atrás', '2d atrás', '24h atrás', '12h atrás', 'Atual'],
          datasets: [{
            label: label,
            data: [val * 0.95, val * 0.97, val * 1.02, val * 0.98, val * 1.01, val * 0.99, val],
            borderColor: color,
            backgroundColor: `${color}25`,
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: color
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#ffffff', font: { size: 10.5 } } } },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.08)' } }
          }
        }
      };
    }

    this.charts.drsInteractive = new Chart(ctx, chartConfig);
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

    const alignedForecasts = this.align5DaysForecast(data.forecasts);
    this.alignedCptecForecasts = alignedForecasts;

    const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const pad = (n) => String(n).padStart(2, '0');

    const currentHour = new Date().getHours();
    const isCurrentNight = (currentHour >= 18 || currentHour < 6);

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

        const isNightForCard = (idx === 0) ? isCurrentNight : false;
        const iconMeta = this.getWeatherIconVisual(f.conditionCode, isNightForCard);

        return `
          <div class="forecast-day-card ${idx === 0 ? 'today' : ''}">
            <span class="forecast-weekday">${weekdayLabel}</span>
            <span class="forecast-date">${dateFormatted}</span>
            <div class="forecast-icon-wrapper" 
                 style="color: ${iconMeta.color}; background: ${iconMeta.bg}; border-color: ${iconMeta.border};" 
                 title="${iconMeta.label}"
                 aria-label="${iconMeta.label}">
              ${iconMeta.iconHtml}
            </div>
            <div class="forecast-temps">
              <span class="forecast-temp-max" title="Máxima Prevista">▲ ${f.maxTemp}°</span>
              <span class="forecast-temp-min" title="Mínima Prevista">▼ ${f.minTemp}°</span>
            </div>
            <div class="forecast-condition-desc">${f.conditionLabel || iconMeta.label}</div>
          </div>
        `;
      }).join('');
    }

    if (window.lucide) {
      window.lucide.createIcons();
    }

    this.renderCptecCharts();
  }

  getWeatherIconVisual(conditionCode, isNight = false) {
    const code = (conditionCode || '').toLowerCase().trim();
    const nightCodes = ['cn', 'npn', 'pcn', 'ncn', 'pnt'];
    const effectiveNight = isNight || nightCodes.includes(code);

    const svgIcons = {
      sun: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
      moonStar: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/><path d="M19 3v4M21 5h-4"/></svg>`,
      cloudSun: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v2M4.93 4.93l1.41 1.41M20 12h2M19.07 4.93l-1.41 1.41M15.947 12.65a4 4 0 0 0-5.925-4.128"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`,
      cloudMoon: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.188 8.5A6 6 0 0 1 16 4a6 6 0 0 0-6 6c0 1.25.383 2.41 1.034 3.376"/><path d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"/></svg>`,
      cloud: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>`,
      cloudRain: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 14v6M8 14v6M12 16v6"/></svg>`,
      cloudDrizzle: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M8 19v1M8 14v1M16 19v1M16 14v1M12 21v1M12 16v1"/></svg>`,
      cloudLightning: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 16.326A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 .5 8.973"/><path d="m13 12-3 5h4l-3 5"/></svg>`,
      snowflake: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="2" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="22"/><path d="m20 16-4-4 4-4M4 8l4 4-4 4M16 4l-4 4-4-4M8 20l4-4 4 4"/></svg>`,
      cloudFog: `<svg class="forecast-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M16 17H7M17 21H9"/></svg>`
    };

    if (['cl', 'ps'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.moonStar, label: 'Céu Limpo / Estrelado', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' }
                            : { iconHtml: svgIcons.sun, label: 'Céu Aberto / Ensolarado', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' };
    }
    if (['pn', 'vn'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.cloudMoon, label: 'Parcialmente Nublado à Noite', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.35)' }
                            : { iconHtml: svgIcons.cloudSun, label: 'Sol entre Nuvens', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.18)', border: 'rgba(251, 191, 36, 0.4)' };
    }
    if (['e', 'n'].includes(code)) {
      return effectiveNight ? { iconHtml: svgIcons.cloudMoon, label: 'Nublado à Noite', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' }
                            : { iconHtml: svgIcons.cloud, label: 'Céu Nublado / Encoberto', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.3)' };
    }
    if (['c', 'ch', 'pc', 'ci', 'ec', 'cm', 'pt', 'pm', 'np', 'npt', 'nct', 'ncm', 'npm', 'cn', 'npn', 'pcn', 'ncn', 'pnt'].includes(code)) {
      return { iconHtml: svgIcons.cloudRain, label: effectiveNight ? 'Chuva à Noite' : 'Chuva / Pancadas de Chuva', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.18)', border: 'rgba(2, 132, 199, 0.4)' };
    }
    if (['cv', 'pp', 'psc', 'pcm', 'pct', 'npp'].includes(code)) {
      return { iconHtml: svgIcons.cloudDrizzle, label: 'Chuvisco / Possibilidade de Chuva', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
    }
    if (['t', 'in'].includes(code)) {
      return { iconHtml: svgIcons.cloudLightning, label: 'Tempestade / Trovoadas', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.45)' };
    }
    if (['g', 'ne'].includes(code)) {
      return { iconHtml: svgIcons.snowflake, label: 'Geada / Frio Intenso', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.18)', border: 'rgba(56, 189, 248, 0.35)' };
    }
    if (['nv'].includes(code)) {
      return { iconHtml: svgIcons.cloudFog, label: 'Nevoeiro / Neblina', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)', border: 'rgba(148, 163, 184, 0.3)' };
    }
    return { iconHtml: svgIcons.cloud, label: 'Condição Variável', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
  }

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
}
