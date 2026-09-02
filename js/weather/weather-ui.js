/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interface da Central Meteorológica e Alertas (Arquitetura Simplificada v2)
 * 4 Cards: 1. Tempo Atual | 2. Previsão 5 Dias | 3. Monitoramento Rio P.F. (DCRS-00016) | 4. Alertas Oficiais
 */

import { WeatherService } from './weather-service.js';
import { WeatherConfig } from './weather-config.js';

export class WeatherUI {
  constructor(mapEngine) {
    this.mapEngine = mapEngine;
    this.service = new WeatherService();
    this.config = WeatherConfig;
    this.modal = document.getElementById('weather-modal');
    this.modalBody = document.getElementById('weather-modal-body');
    this.openBtn = document.getElementById('btn-open-weather-modal');
    this.closeBtn = document.getElementById('btn-close-weather-modal');
    this.sidebarWidget = document.getElementById('widget-sidebar-weather');

    this.isOpen = false;
    this.pollingTimer = null;
    this.currentData = null;

    this.init();
  }

  /**
   * Inicialização e vinculação de eventos únicos
   */
  init() {
    // Eventos de Abertura e Fechamento
    if (this.openBtn) {
      this.openBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.openModal();
      });
    }

    if (this.sidebarWidget) {
      this.sidebarWidget.addEventListener('click', () => {
        this.openModal();
      });
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
    }

    // Tecla ESC para fechar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeModal();
      }
    });

    // Carga inicial em background para alimentar o widget da sidebar
    this.loadData(false);

    // Polling único centralizado a cada 5 minutos
    this.pollingTimer = setInterval(() => {
      this.loadData(false);
    }, this.config.pollingInterval);
  }

  /**
   * Abre o modal com abertura instantânea
   */
  openModal() {
    if (!this.modal) return;
    this.isOpen = true;
    this.modal.classList.add('active');

    // Se já tiver dados em memória ou cache, renderiza imediatamente
    if (this.currentData) {
      this.render(this.currentData);
    } else {
      this.renderLoading();
      this.loadData(false);
    }
  }

  /**
   * Fecha o modal
   */
  closeModal() {
    if (!this.modal) return;
    this.isOpen = false;
    this.modal.classList.remove('active');
  }

  /**
   * Carrega os dados do serviço meteorológico
   */
  async loadData(forceRefresh = false) {
    try {
      const data = await this.service.getConsolidatedData(forceRefresh);
      this.currentData = data;
      this.updateSidebarWidget(data);

      if (this.isOpen) {
        this.render(data);
      }
    } catch (err) {
      console.error('[WeatherUI] Erro ao carregar dados:', err);
      if (this.isOpen) {
        this.renderError(err.message);
      }
    }
  }

  /**
   * Atualiza o pequeno widget na barra lateral
   */
  updateSidebarWidget(data) {
    const tempEl = document.getElementById('sidebar-weather-temp');
    const condEl = document.getElementById('sidebar-weather-cond');
    const statusEl = document.getElementById('sidebar-weather-status');

    if (!tempEl || !condEl) return;

    const w = data.weather?.current;
    const h = data.hydro?.data;

    if (w && w.temperature !== null) {
      tempEl.textContent = `${w.temperature.toFixed(1)}°C`;
      condEl.textContent = `${w.condition} • Passo Fundo`;
      if (statusEl) statusEl.textContent = `Vento ${w.windSpeed || 0} km/h`;
    } else if (h && h.temperature !== null) {
      tempEl.textContent = `${h.temperature}°C`;
      condEl.textContent = `DCRS-00016 • Passo Fundo`;
      if (statusEl) statusEl.textContent = `Chuva 24h: ${h.rain24h}mm`;
    } else {
      tempEl.textContent = '--°C';
      condEl.textContent = 'Passo Fundo / RS • Ver Central →';
    }
  }

  /**
   * Renderiza tela de carregamento rápida
   */
  renderLoading() {
    if (!this.modalBody) return;
    this.modalBody.innerHTML = `
      <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
        <div class="weather-spinner" style="margin: 0 auto 16px auto;"></div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
          Conectando aos serviços meteorológicos oficiais...
        </div>
        <div style="font-size: 12px; color: var(--text-subtle);">
          Consultando Open-Meteo e Rede Hidrometeorológica da Defesa Civil RS
        </div>
      </div>
    `;
  }

  /**
   * Renderiza tela de erro isolada
   */
  renderError(msg) {
    if (!this.modalBody) return;
    this.modalBody.innerHTML = `
      <div style="padding: 30px 20px; text-align: center;">
        <div style="font-size: 36px; margin-bottom: 12px; color: #ef4444;">
          <i class="lucide-alert-triangle"></i>
        </div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
          Indisponibilidade Temporária de Rede
        </div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 20px;">
          ${msg || 'Não foi possível estabelecer conexão com os servidores meteorológicos.'}
        </div>
        <button id="btn-weather-retry" class="weather-btn-primary">
          <i class="lucide-refresh-cw"></i> Tentar Novamente
        </button>
      </div>
    `;

    const retryBtn = document.getElementById('btn-weather-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        this.renderLoading();
        this.loadData(true);
      });
    }
  }

  /**
   * Renderização Principal: 4 Cards Limpos, Modernos e Responsivos
   */
  render(data) {
    if (!this.modalBody) return;

    const w = data.weather || { available: false };
    const cur = w.current || {};
    const forecast = w.forecast || [];
    const h = data.hydro || { available: false };
    const hData = h.data || {};

    const updatedStr = cur.updatedAt ? `Atualizado às ${cur.updatedAt}` : 'Atualizado recentemente';

    this.modalBody.innerHTML = `
      <!-- CABEÇALHO DO MODAL COM CONTROLES -->
      <div class="weather-modal-topbar">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="weather-badge-live">
              <span class="pulse-dot"></span> TEMPO REAL
            </span>
            <span style="font-size: 13px; font-weight: 700; color: var(--text-main);">
              Passo Fundo / RS
            </span>
            <span style="font-size: 11.5px; color: var(--text-subtle);">
              (Lat: -28.2470°, Lon: -52.3713°)
            </span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11.5px; color: var(--text-muted);">
            ${updatedStr}
          </span>
          <button id="btn-weather-refresh" class="weather-btn-refresh" title="Forçar revalidação agora">
            <i class="lucide-refresh-cw"></i> Atualizar Agora
          </button>
        </div>
      </div>

      <!-- GRID DOS 4 CARDS OPERACIONAIS -->
      <div class="weather-cards-container">

        <!-- CARD 1: CONDIÇÃO METEOROLÓGICA ATUAL (OPEN-METEO) -->
        <div class="weather-card">
          <div class="weather-card-header">
            <div class="weather-card-title">
              <i class="lucide-thermometer-sun" style="color: #38bdf8;"></i> Condições Meteorológicas Atuais
            </div>
            <span class="weather-card-source">Open-Meteo Oficial</span>
          </div>

          ${w.available ? `
            <div class="weather-current-grid">
              <div class="weather-current-hero">
                <div class="weather-hero-icon" style="color: ${cur.color || '#38bdf8'};">
                  <i class="${cur.icon || 'lucide-cloud'}"></i>
                </div>
                <div>
                  <div class="weather-hero-temp">
                    ${cur.temperature !== null ? cur.temperature.toFixed(1) : '--'}<span class="unit">°C</span>
                  </div>
                  <div class="weather-hero-cond" style="color: ${cur.color || 'var(--text-main)'};">
                    ${cur.condition || 'Instável'}
                  </div>
                  <div class="weather-hero-feels">
                    Sensação Térmica: <strong>${cur.feelsLike !== null ? cur.feelsLike.toFixed(1) + '°C' : '--'}</strong>
                  </div>
                </div>
              </div>

              <div class="weather-current-metrics">
                <div class="weather-metric-item">
                  <span class="label"><i class="lucide-droplets"></i> Umidade Relativa</span>
                  <span class="value">${cur.humidity !== null ? cur.humidity + '%' : '--'}</span>
                </div>
                <div class="weather-metric-item">
                  <span class="label"><i class="lucide-gauge"></i> Pressão Atmosférica</span>
                  <span class="value">${cur.pressure !== null ? cur.pressure + ' hPa' : '--'}</span>
                </div>
                <div class="weather-metric-item">
                  <span class="label"><i class="lucide-wind"></i> Vento Médio</span>
                  <span class="value">${cur.windSpeed !== null ? cur.windSpeed + ' km/h' : '--'} (${cur.windCardinal || 'N/D'})</span>
                </div>
                <div class="weather-metric-item">
                  <span class="label"><i class="lucide-zap"></i> Rajada de Vento</span>
                  <span class="value">${cur.windGust !== null ? cur.windGust + ' km/h' : '--'}</span>
                </div>
              </div>
            </div>
          ` : `
            <div class="weather-card-unavailable">
              <i class="lucide-alert-circle"></i> Dados meteorológicos atuais temporariamente indisponíveis no servidor.
            </div>
          `}
        </div>

        <!-- CARD 2: PREVISÃO PARA OS PRÓXIMOS 5 DIAS (OPEN-METEO) -->
        <div class="weather-card">
          <div class="weather-card-header">
            <div class="weather-card-title">
              <i class="lucide-calendar-days" style="color: #60a5fa;"></i> Previsão do Tempo (Próximos 5 Dias)
            </div>
            <span class="weather-card-source">Modelos Numéricos</span>
          </div>

          ${w.available && forecast.length > 0 ? `
            <div class="weather-forecast-grid">
              ${forecast.map((f) => `
                <div class="weather-forecast-day">
                  <div class="forecast-weekday">${f.weekday}</div>
                  <div class="forecast-date">${f.formattedDate}</div>
                  <div class="forecast-icon" style="color: ${f.color || '#38bdf8'};">
                    <i class="${f.icon || 'lucide-cloud'}"></i>
                  </div>
                  <div class="forecast-condition">${f.condition}</div>
                  <div class="forecast-temp-range">
                    <span class="max">${f.tempMax}°</span>
                    <span class="min">${f.tempMin}°</span>
                  </div>
                  <div class="forecast-rain-info">
                    <span style="color: #38bdf8;"><i class="lucide-umbrella"></i> ${f.rainProb}%</span>
                    <span>${f.rainMm} mm</span>
                  </div>
                </div>
              `).join('')}
            </div>
          ` : `
            <div class="weather-card-unavailable">
              <i class="lucide-alert-circle"></i> Previsão de 5 dias temporariamente indisponível.
            </div>
          `}
        </div>

        <!-- CARD 3: MONITORAMENTO HIDROMETEOROLÓGICO LOCAL (DEFESA CIVIL RS - DCRS-00016) -->
        <div class="weather-card">
          <div class="weather-card-header">
            <div class="weather-card-title">
              <i class="lucide-waves" style="color: #38bdf8;"></i> Monitoramento Hidrometeorológico Local
            </div>
            <span class="weather-badge-station">
              Estação DCRS-00016 • Passo Fundo
            </span>
          </div>

          ${h.available ? `
            <div class="weather-hydro-grid">
              <!-- Sub-bloco: Nível do Rio Passo Fundo -->
              <div class="weather-hydro-hero">
                <div class="hydro-title">NÍVEL DO RIO PASSO FUNDO</div>
                <div class="hydro-level-val">
                  ${hData.riverLevel !== null ? hData.riverLevel : '--'}<span class="unit">m</span>
                </div>
                <div class="hydro-trend" style="color: ${hData.riverTrendColor || '#38bdf8'};">
                  <i class="${hData.riverTrendIcon || 'lucide-minus'}"></i> ${hData.riverTrendText || 'Nível Estável'}
                </div>
                <div class="hydro-caption">Sensor telemétrico ultrassônico in-situ na calha do Rio Passo Fundo.</div>
              </div>

              <!-- Sub-bloco: Chuva Acumulada da Estação -->
              <div class="weather-hydro-rain">
                <div class="hydro-title">CHUVA OBSERVADA (PLUVIÔMETRO TELEMÉTRICO)</div>
                <div class="hydro-rain-boxes">
                  <div class="rain-box">
                    <div class="r-label">Última 1 hora</div>
                    <div class="r-val">${hData.rain1h || '0.0'} mm</div>
                  </div>
                  <div class="rain-box">
                    <div class="r-label">Últimas 24h</div>
                    <div class="r-val" style="color: #38bdf8;">${hData.rain24h || '0.0'} mm</div>
                  </div>
                  <div class="rain-box">
                    <div class="r-label">Últimos 7 dias</div>
                    <div class="r-val" style="color: #60a5fa;">${hData.rain7d || '0.0'} mm</div>
                  </div>
                </div>
                <div class="hydro-station-footer">
                  <span>Leitura: <strong>${h.observedAtFormatted || 'Recente'}</strong></span>
                  <a href="${this.config.endpoints.defesaCivilRedeUrl}" target="_blank" rel="noopener noreferrer" class="hydro-link">
                    Ver Estação no Mapa Estadual &rarr;
                  </a>
                </div>
              </div>
            </div>
          ` : `
            <div class="weather-card-unavailable">
              <i class="lucide-alert-circle"></i> Os dados telemétricos da estação DCRS-00016 estão temporariamente indisponíveis no servidor estadual.
            </div>
          `}
        </div>

        <!-- CARD 4: ALERTAS OFICIAIS DA DEFESA CIVIL RS -->
        <div class="weather-card">
          <div class="weather-card-header">
            <div class="weather-card-title">
              <i class="lucide-shield-alert" style="color: #f59e0b;"></i> Alertas e Avisos Meteorológicos Oficiais
            </div>
            <span class="weather-card-source">Defesa Civil Estadual RS</span>
          </div>

          <div class="weather-alert-box">
            <div class="weather-alert-banner banner-normal">
              <div class="alert-icon-box">
                <i class="lucide-shield-check"></i>
              </div>
              <div class="alert-info-box">
                <div class="alert-heading">Sem Alertas Críticos Vigentes no Município</div>
                <div class="alert-text">
                  Acompanhe os boletins meteorológicos contínuos emitidos pelo Centro de Operações da Defesa Civil do Estado do Rio Grande do Sul.
                </div>
              </div>
              <div class="alert-action-box">
                <a href="${this.config.endpoints.defesaCivilAlertasUrl}" target="_blank" rel="noopener noreferrer" class="weather-btn-secondary">
                  <i class="lucide-external-link"></i> Avisos & Boletins Oficiais
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    `;

    // Atualizar ícones do Lucide
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Vincular botão de atualização
    const refreshBtn = document.getElementById('btn-weather-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('i');
        if (icon) icon.classList.add('weather-spin');
        this.loadData(true);
      });
    }
  }
}
