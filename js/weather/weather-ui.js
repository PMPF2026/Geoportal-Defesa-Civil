/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Central Meteorológica e Alertas — Interface do Usuário (UI)
 */

import { WeatherService } from './weather-service.js';
import { Notification } from '../ui/notification.js';

export class WeatherUI {
  constructor(mapEngine = null) {
    this.mapEngine = mapEngine;
    this.service = new WeatherService();
    this.modal = document.getElementById('weather-modal');
    this.chartInstances = {};
    this.weatherData = null;
    this.refreshInterval = null;

    this.init();
  }

  init() {
    this.bindEvents();
    // Silent initial background fetch
    this.loadData(false);

    // Refresh every 15 minutes automatically
    this.refreshInterval = setInterval(() => {
      this.loadData(false);
    }, 15 * 60 * 1000);
  }

  bindEvents() {
    // Open Modal button in header
    const btnOpen = document.getElementById('btn-open-weather-modal');
    if (btnOpen) {
      btnOpen.addEventListener('click', () => {
        this.openModal();
      });
    }

    // Close Modal button
    const btnClose = document.getElementById('btn-close-weather-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Close on overlay backdrop click
    if (this.modal) {
      this.modal.addEventListener('click', (e) => {
        if (e.target === this.modal) {
          this.closeModal();
        }
      });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && this.modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  openModal() {
    if (!this.modal) return;
    this.modal.classList.add('active');
    document.body.classList.add('modal-open');
    this.loadData(false);
  }

  closeModal() {
    if (!this.modal) return;
    this.modal.classList.remove('active');
    document.body.classList.remove('modal-open');
  }

  async loadData(forceRefresh = false) {
    if (forceRefresh) {
      Notification.info('Atualizando dados meteorológicos oficiais...');
    }

    try {
      this.weatherData = await this.service.getConsolidatedWeatherData(forceRefresh);
      this.render();
      this.updateSidebarWidget();
      if (forceRefresh) {
        Notification.success('Central Meteorológica atualizada com sucesso!');
      }
    } catch (err) {
      console.error('[WeatherUI] Erro ao carregar dados meteorológicos:', err);
      this.renderErrorState(err);
      if (forceRefresh) {
        Notification.error('Erro ao conectar com as fontes meteorológicas.');
      }
    }
  }

  renderErrorState(err) {
    const container = document.getElementById('weather-modal-body');
    if (!container) return;
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px; color:var(--text-main);">
        <div style="width:48px; height:48px; border-radius:50%; background:rgba(239,68,68,0.15); color:#ef4444; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto; font-size:24px;">
          <i class="lucide-alert-triangle"></i>
        </div>
        <h3 style="font-size:16px; font-weight:700; margin-bottom:8px;">Indisponibilidade Temporária de Conexão</h3>
        <p style="font-size:12.5px; color:var(--text-muted); max-width:480px; margin:0 auto 20px auto; line-height:1.5;">
          Não foi possível sincronizar no momento com os servidores de meteorologia. O sistema tentará se reconectar automaticamente em instantes.
        </p>
        <button class="mini-btn" id="btn-retry-weather" style="background:#0284c7; color:#fff; border:none; padding:8px 18px; font-weight:600; border-radius:6px; cursor:pointer;">
          <i class="lucide-refresh-cw"></i> Tentar Novamente
        </button>
      </div>
    `;
    const btnRetry = document.getElementById('btn-retry-weather');
    if (btnRetry) {
      btnRetry.addEventListener('click', () => {
        container.innerHTML = `
          <div style="text-align:center; padding:40px; color:var(--text-muted);">
            <i class="lucide-loader-2" style="font-size:32px; animation:spin 1s linear infinite; display:inline-block; margin-bottom:12px; color:#38bdf8;"></i>
            <p>Conectando às fontes oficiais do INMET, Defesa Civil RS e CPTEC/INPE...</p>
          </div>
        `;
        this.loadData(true);
      });
    }
  }

  render() {
    const container = document.getElementById('weather-modal-body');
    if (!container || !this.weatherData) return;

    const d = this.weatherData;
    const cur = d.current || {};
    const dcrs = d.dcrsStation || null;
    const st = d.operationalStatus || {};
    const f5 = d.forecast5Days || [];
    const alerts = d.alerts || [];
    const conv = d.convergence || {};

    const updatedDate = d.timestamp ? new Date(d.timestamp) : new Date();
    const updatedStr = updatedDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' de ' + updatedDate.toLocaleDateString('pt-BR');

    container.innerHTML = `
      <!-- TOP STATUS & CONTROLS -->
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="weather-badge-live">
            <span class="pulse-dot"></span>
            <span>MONITORAMENTO ATIVO — PASSO FUNDO/RS</span>
          </span>
          <span style="font-size:11.5px; color:var(--text-muted);">
            Última atualização oficial: <strong style="color:var(--text-main);">${updatedStr}</strong>
            ${d.fromCache ? '<span style="color:#f59e0b; margin-left:4px;">(Último dado oficial registrado em cache)</span>' : ''}
          </span>
        </div>

        <button class="mini-btn" id="btn-refresh-weather" style="background:#0284c7; color:#fff; border:none; padding:5px 12px; font-weight:600; cursor:pointer;">
          <i class="lucide-refresh-cw"></i> Atualizar Agora
        </button>
      </div>

      <!-- 1. STATUS METEOROLÓGICO OPERACIONAL -->
      <div class="weather-status-banner ${st.badgeClass}">
        <div>
          <div class="status-banner-title" style="color:${st.color};">
            <i class="lucide-shield-alert"></i>
            <span>STATUS OPERACIONAL: ${st.level} — ${st.title}</span>
          </div>
          <div class="status-banner-desc">${st.subtitle}</div>
          <div class="status-banner-legal">*${st.explanation}</div>
        </div>

        <div style="text-align:right; font-size:11.5px; color:var(--text-muted);">
          <div>Convergência de Modelos: <strong style="color:#38bdf8;">${conv.convergenceLevel || 'MODERADA'}</strong></div>
          <div style="font-size:10.5px; color:var(--text-subtle);">${conv.sourcesWithAdverseSignal || 0} de ${conv.sourcesConsulted || 3} fontes indicam instabilidade</div>
        </div>
      </div>

      <!-- 1.5. MONITORAMENTO HIDROMETEOROLÓGICO OFICIAL DA DEFESA CIVIL RS (DCRS-00016) -->
      <div class="dcrs-station-container" style="background:var(--bg-card, #1e293b); border:1px solid rgba(56,189,248,0.25); border-radius:var(--radius-md, 8px); padding:14px 16px; margin-bottom:16px; box-shadow:0 4px 12px rgba(0,0,0,0.15);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px; border-bottom:1px solid rgba(255,255,255,0.08); padding-bottom:10px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <div style="background:#0284c7; color:#fff; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:700; display:flex; align-items:center; gap:4px;">
              <i class="lucide-radio"></i> DCRS-00016
            </div>
            <span style="font-size:13px; font-weight:800; color:var(--text-main);">
              Rede Hidrometeorológica Oficial — Passo Fundo/RS
            </span>
            <span style="font-size:11px; color:var(--text-muted); background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">
              Bacia do Rio Passo Fundo &bull; 2ª CREPDEC
            </span>
          </div>

          ${dcrs ? `
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="dcrs-freshness-badge" style="font-size:11px; font-weight:600; color:${dcrs.freshness.color}; background:rgba(255,255,255,0.05); padding:3px 8px; border-radius:12px; border:1px solid ${dcrs.freshness.color}40; display:flex; align-items:center; gap:4px;">
                <span>${dcrs.freshness.label}</span>
                <span style="color:var(--text-muted); font-size:10.5px;">(${dcrs.freshness.text})</span>
              </span>
              <span style="font-size:11px; color:var(--text-muted);">
                Medição: <strong style="color:var(--text-main);">${dcrs.observedAtFormatted}</strong>
              </span>
            </div>
          ` : `
            <span style="font-size:11px; color:#f59e0b; font-weight:600;">
              <i class="lucide-alert-circle"></i> Estação temporariamente offline
            </span>
          `}
        </div>

        ${dcrs && dcrs.data ? `
          <!-- DCRS GRID: RIO + CHUVA + METEO -->
          <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:12px; margin-bottom:10px;">
            
            <!-- CARD 1: NÍVEL DO RIO PASSO FUNDO -->
            <div style="background:rgba(2,132,199,0.08); border:1px solid rgba(2,132,199,0.3); border-radius:6px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:11px; font-weight:700; color:#38bdf8; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:5px;">
                  <i class="lucide-waves"></i> Nível do Rio Passo Fundo
                </span>
                <span style="font-size:10.5px; color:${dcrs.data.riverTrendColor}; font-weight:700; display:flex; align-items:center; gap:3px;">
                  <i class="${dcrs.data.riverTrendIcon}"></i> ${dcrs.data.riverTrendText}
                </span>
              </div>
              <div style="font-size:22px; font-weight:800; color:var(--text-main); margin-bottom:4px;">
                ${dcrs.data.riverLevel !== null ? Number(dcrs.data.riverLevel).toFixed(2) : '--'}<span style="font-size:13px; font-weight:600; color:var(--text-muted); margin-left:3px;">m</span>
              </div>
              <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">
                Cota observada por sensor ultrassônico in-situ na calha do Rio Passo Fundo.
              </div>
            </div>

            <!-- CARD 2: CHUVA OBSERVADA (JANELAS DA ESTAÇÃO) -->
            <div style="background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.3); border-radius:6px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:11px; font-weight:700; color:#60a5fa; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:5px;">
                  <i class="lucide-cloud-rain"></i> Chuva Observada (Pluviômetro Telemétrico)
                </span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; text-align:center;">
                <div style="background:rgba(255,255,255,0.03); padding:4px 2px; border-radius:4px;">
                  <div style="font-size:10px; color:var(--text-muted);">1 hora</div>
                  <div style="font-size:13px; font-weight:700; color:var(--text-main);">${dcrs.data.rain1h !== null ? Number(dcrs.data.rain1h).toFixed(1) : '0.0'} mm</div>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:4px 2px; border-radius:4px;">
                  <div style="font-size:10px; color:var(--text-muted);">24 horas</div>
                  <div style="font-size:13px; font-weight:700; color:#38bdf8;">${dcrs.data.rain24h !== null ? Number(dcrs.data.rain24h).toFixed(1) : '0.0'} mm</div>
                </div>
                <div style="background:rgba(255,255,255,0.03); padding:4px 2px; border-radius:4px;">
                  <div style="font-size:10px; color:var(--text-muted);">Últimos 7 dias</div>
                  <div style="font-size:13px; font-weight:700; color:#60a5fa;">${dcrs.data.rain7d !== null ? Number(dcrs.data.rain7d).toFixed(1) : '0.0'} mm</div>
                </div>
              </div>
              <div style="font-size:10.5px; color:var(--text-subtle); margin-top:6px; display:flex; justify-content:space-between;">
                <span>3h: <strong>${dcrs.data.rain3h !== null ? Number(dcrs.data.rain3h).toFixed(1) : '0.0'} mm</strong></span>
                <span>6h: <strong>${dcrs.data.rain6h !== null ? Number(dcrs.data.rain6h).toFixed(1) : '0.0'} mm</strong></span>
                <span>12h: <strong>${dcrs.data.rain12h !== null ? Number(dcrs.data.rain12h).toFixed(1) : '0.0'} mm</strong></span>
              </div>
            </div>

            <!-- CARD 3: PARÂMETROS METEOROLÓGICOS IN-SITU -->
            <div style="background:rgba(245,158,11,0.06); border:1px solid rgba(245,158,11,0.25); border-radius:6px; padding:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <span style="font-size:11px; font-weight:700; color:#fbbf24; text-transform:uppercase; letter-spacing:0.5px; display:flex; align-items:center; gap:5px;">
                  <i class="lucide-gauge"></i> Sensores Atmosféricos In-Situ
                </span>
                <span style="font-size:10.5px; color:var(--text-muted);">
                  Pressão: <strong>${dcrs.data.pressure !== null ? Number(dcrs.data.pressure).toFixed(0) : '--'} hPa</strong>
                </span>
              </div>
              <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; font-size:11px;">
                <div>
                  <div style="color:var(--text-muted); font-size:10px;">Temp. Real</div>
                  <div style="font-weight:700; color:var(--text-main); font-size:13px;">${dcrs.data.temperature !== null ? Number(dcrs.data.temperature).toFixed(1) + '°C' : '--'}</div>
                </div>
                <div>
                  <div style="color:var(--text-muted); font-size:10px;">Sensação</div>
                  <div style="font-weight:700; color:#f97316; font-size:13px;">${dcrs.data.feelsLike !== null ? Number(dcrs.data.feelsLike).toFixed(1) + '°C' : '--'}</div>
                </div>
                <div>
                  <div style="color:var(--text-muted); font-size:10px;">Umidade</div>
                  <div style="font-weight:700; color:#06b6d4; font-size:13px;">${dcrs.data.humidity !== null ? Number(dcrs.data.humidity).toFixed(0) + '%' : '--'}</div>
                </div>
              </div>
              <div style="font-size:10.5px; color:var(--text-muted); margin-top:6px; display:flex; justify-content:space-between;">
                <span>Vento: <strong>${dcrs.data.windSpeed !== null ? Number(dcrs.data.windSpeed).toFixed(1) : '0'} km/h (${dcrs.data.windDirectionCardinal || 'N/D'})</strong></span>
                <span>Rajada: <strong>${dcrs.data.windGust !== null ? Number(dcrs.data.windGust).toFixed(1) : '0'} km/h</strong></span>
              </div>
            </div>

          </div>

          <div style="font-size:10.5px; color:var(--text-subtle); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <span>
              Fonte Oficial: <strong>Defesa Civil do Estado do Rio Grande do Sul — Rede Hidrometeorológica</strong> (Estação Passo Fundo DCRS-00016).
            </span>
            <a href="https://redehidrometeorologica.defesacivil.rs.gov.br/Mapa" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:none; font-weight:600;">
              Ver Rede Estadual no Mapa &rarr;
            </a>
          </div>
        ` : `
          <div style="padding:10px; font-size:12px; color:var(--text-muted); text-align:center;">
            Os dados observados da estação DCRS-00016 estão temporariamente indisponíveis no servidor estadual. As previsões e alertas continuam operando normalmente.
          </div>
        `}
      </div>

      <!-- 2. CONDIÇÕES GERAIS E TELEMETRIA MULTIFONTES -->
      <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i class="lucide-thermometer-sun" style="color:#38bdf8;"></i>
        <span>Condições Meteorológicas Gerais e Indicadores — Passo Fundo/RS</span>
      </div>

      <div class="weather-kpi-grid">
        <div class="weather-kpi-card" style="border-left: 3px solid #38bdf8;">
          <div class="weather-kpi-label">
            <span>Temperatura</span>
            <i class="lucide-thermometer" style="color:#38bdf8;"></i>
          </div>
          <div class="weather-kpi-value">${cur.temperature !== null ? cur.temperature : '--'}<span class="weather-kpi-unit">°C</span></div>
          <div class="weather-kpi-sub">${cur.conditionLabel || 'Estável'}</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #f97316;">
          <div class="weather-kpi-label">
            <span>Sensação Térmica</span>
            <i class="lucide-flame" style="color:#f97316;"></i>
          </div>
          <div class="weather-kpi-value">${cur.apparentTemperature !== null ? cur.apparentTemperature : '--'}<span class="weather-kpi-unit">°C</span></div>
          <div class="weather-kpi-sub">Aferição telemétrica</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #06b6d4;">
          <div class="weather-kpi-label">
            <span>Umidade Relativa</span>
            <i class="lucide-droplets" style="color:#06b6d4;"></i>
          </div>
          <div class="weather-kpi-value">${cur.humidity !== null ? cur.humidity : '--'}<span class="weather-kpi-unit">%</span></div>
          <div class="weather-kpi-sub">Ar atmosférico</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #2563eb;">
          <div class="weather-kpi-label">
            <span>Chuva 24h</span>
            <i class="lucide-cloud-rain" style="color:#2563eb;"></i>
          </div>
          <div class="weather-kpi-value">${cur.precipitation24h !== null ? cur.precipitation24h : '0.0'}<span class="weather-kpi-unit">mm</span></div>
          <div class="weather-kpi-sub">Acumulado 24h</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #a855f7;">
          <div class="weather-kpi-label">
            <span>Vento Atual</span>
            <i class="lucide-wind" style="color:#a855f7;"></i>
          </div>
          <div class="weather-kpi-value">${cur.windSpeed !== null ? cur.windSpeed : '--'}<span class="weather-kpi-unit">km/h</span></div>
          <div class="weather-kpi-sub">Dir: <strong>${cur.windDirectionCardinal}</strong> (${cur.windDirection || 0}°)</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #ec4899;">
          <div class="weather-kpi-label">
            <span>Rajada Máxima</span>
            <i class="lucide-gauge" style="color:#ec4899;"></i>
          </div>
          <div class="weather-kpi-value">${cur.windGust !== null ? cur.windGust : '--'}<span class="weather-kpi-unit">km/h</span></div>
          <div class="weather-kpi-sub">Pico registrado</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #10b981;">
          <div class="weather-kpi-label">
            <span>Mínima / Máxima</span>
            <i class="lucide-arrow-up-down" style="color:#10b981;"></i>
          </div>
          <div class="weather-kpi-value" style="font-size:17px;">
            <span style="color:#60a5fa;">${cur.tempMinToday !== null ? cur.tempMinToday : '--'}°</span> /
            <span style="color:#f87171;">${cur.tempMaxToday !== null ? cur.tempMaxToday : '--'}°</span>
          </div>
          <div class="weather-kpi-sub">Previsão para hoje</div>
        </div>

        <div class="weather-kpi-card" style="border-left: 3px solid #eab308;">
          <div class="weather-kpi-label">
            <span>Probab. de Chuva</span>
            <i class="lucide-umbrella" style="color:#eab308;"></i>
          </div>
          <div class="weather-kpi-value">${cur.rainProbabilityToday !== null ? cur.rainProbabilityToday : '0'}<span class="weather-kpi-unit">%</span></div>
          <div class="weather-kpi-sub">Índice pluviométrico</div>
        </div>
      </div>

      <!-- 3. ALERTAS OFICIAIS VIGENTES -->
      <div class="weather-alerts-container">
        <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:6px;">
          <div style="display:flex; align-items:center; gap:6px;">
            <i class="lucide-alert-triangle" style="color:#f97316;"></i>
            <span>Alertas e Avisos Meteorológicos Oficiais Vigentes</span>
          </div>
          <span style="font-size:11px; color:var(--text-muted);">${alerts.length} aviso(s) ativo(s) no RS</span>
        </div>

        ${(() => {
          if (alerts.length === 0) {
            return `
              <div style="background:rgba(22,163,74,0.08); border:1px solid rgba(22,163,74,0.3); border-radius:var(--radius-md); padding:14px 18px; font-size:12.5px; color:#4ade80; display:flex; align-items:center; gap:10px;">
                <i class="lucide-check-circle" style="font-size:20px; flex-shrink:0;"></i>
                <div>
                  <strong>Nenhum alerta meteorológico oficial vigente identificado para Passo Fundo.</strong>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Monitoramento contínuo das fontes oficiais do INMET e Defesa Civil RS.</div>
                </div>
              </div>
            `;
          }

          const pfAlerts = alerts.filter(a => a.isPassoFundo);
          const regAlerts = alerts.filter(a => !a.isPassoFundo);

          let html = '';

          // If no alerts for Passo Fundo, but there are regional RS alerts
          if (pfAlerts.length === 0 && regAlerts.length > 0) {
            html += `
              <div style="background:rgba(22,163,74,0.08); border:1px solid rgba(22,163,74,0.3); border-radius:var(--radius-md); padding:12px 16px; font-size:12px; color:#4ade80; display:flex; align-items:center; gap:8px; margin-bottom:10px;">
                <i class="lucide-check-circle" style="font-size:16px; flex-shrink:0;"></i>
                <div>
                  <strong>Nenhum alerta meteorológico oficial vigente identificado para Passo Fundo.</strong>
                  <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">Há outros avisos vigentes no Rio Grande do Sul que não abrangem diretamente o município:</div>
                </div>
              </div>
            `;
          }

          // Render list of alerts
          const renderCard = (a) => `
            <div class="weather-alert-card ${a.severityClass}">
              <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                  ${a.isPassoFundo ? `
                    <span class="weather-alert-badge-pf">
                      <i class="lucide-map-pin" style="font-size:11px;"></i>
                      <span>📍 PASSO FUNDO INCLUÍDO</span>
                    </span>
                  ` : `
                    <span class="weather-alert-badge-regional">
                      <i class="lucide-alert-circle" style="font-size:11px;"></i>
                      <span>⚠️ ALERTA REGIONAL — VERIFICAR ABRANGÊNCIA</span>
                    </span>
                  `}
                  <span class="weather-alert-title" style="font-size:13.5px;">
                    ${a.isPassoFundo ? 'ALERTA PARA PASSO FUNDO — ' : ''}${a.title} (${a.severity})
                  </span>
                </div>

                <div class="weather-alert-meta" style="font-size:11.5px; color:var(--text-muted); margin-bottom:6px; line-height:1.4;">
                  <div><strong>Vigência:</strong> ${a.start} até ${a.end}</div>
                  <div><strong>Área de interesse:</strong> <span style="color:var(--text-main); font-weight:600;">${a.area}</span></div>
                </div>

                <div class="weather-alert-risks" style="font-size:11.5px; color:var(--text-main); margin-bottom:4px; line-height:1.4;">
                  <strong>Riscos previstos:</strong> ${a.risks || 'Acompanhe as orientações oficiais de segurança da Defesa Civil.'}
                </div>

                <div style="font-size:11px; color:var(--text-subtle); line-height:1.4; margin-top:4px;">
                  <strong>Recomendações:</strong> ${a.recommendations || a.instructions || 'Consulte as orientações oficiais de segurança da Defesa Civil (Emergência 199 / 193).'}
                </div>

                <div style="font-size:10.5px; color:var(--text-muted); margin-top:6px; display:flex; align-items:center; gap:12px;">
                  <span>Fonte: <strong>Instituto Nacional de Meteorologia — INMET</strong></span>
                  <span>Atualizado: <strong>${updatedStr}</strong></span>
                </div>
              </div>

              <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end; flex-shrink:0;">
                <a href="${a.url || 'https://portal.inmet.gov.br/'}" target="_blank" rel="noopener noreferrer" class="mini-btn" style="background:#0284c7; color:#fff; border:none; white-space:nowrap;" title="Acessar portal oficial do INMET">
                  Portal do INMET &rarr;
                </a>
              </div>
            </div>
          `;

          html += alerts.map(renderCard).join('');

          html += `
            <div style="margin-top:6px; font-size:10.5px; color:var(--text-subtle); text-align:right;">
              Fonte: Instituto Nacional de Meteorologia — INMET &bull; Dados oficiais atualizados automaticamente.
            </div>
          `;

          return html;
        })()}
      </div>

      <!-- 4. PREVISÃO OFICIAL DE 5 DIAS (120 HORAS) -->
      <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
        <div style="display:flex; align-items:center; gap:6px;">
          <i class="lucide-calendar-days" style="color:#38bdf8;"></i>
          <span>Previsão do Tempo Oficial — Próximos 5 Dias (120 Horas)</span>
        </div>
        <span style="font-size:11px; color:var(--text-muted);">Referência: INMET / ECMWF</span>
      </div>

      <div class="forecast-5day-grid">
        ${f5.map(day => `
          <div class="forecast-day-card">
            <div class="forecast-day-header">${day.weekday} &bull; ${day.formattedDate}</div>
            <div class="forecast-day-cond"><strong>${day.condition}</strong></div>
            <div class="forecast-day-temps">
              <span class="max" title="Temperatura Máxima">${day.tempMax}°C</span>
              <span class="min" title="Temperatura Mínima">${day.tempMin}°C</span>
            </div>
            <div class="forecast-day-rain">
              <i class="lucide-cloud-rain" style="font-size:11px;"></i>
              <span>${day.precipSum} mm (${day.precipProb}%)</span>
            </div>
            <div style="font-size:10.5px; color:var(--text-subtle); margin-top:4px;">
              Vento máx: ${day.windMax || 0} km/h
            </div>
          </div>
        `).join('')}
      </div>

      <!-- 5. GRÁFICOS METEOROLÓGICOS (CHART.JS 2x2) -->
      <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i class="lucide-line-chart" style="color:#38bdf8;"></i>
        <span>Curvas e Tendências Meteorológicas (Próximos 5 Dias)</span>
      </div>

      <div class="weather-charts-grid">
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-thermometer"></i> Temperatura Mínima × Máxima (°C)</span>
          </div>
          <div class="chart-wrapper" style="height:190px;">
            <canvas id="chart-weather-temp"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-cloud-rain"></i> Precipitação Prevista Acumulada (mm)</span>
          </div>
          <div class="chart-wrapper" style="height:190px;">
            <canvas id="chart-weather-rain"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-umbrella"></i> Probabilidade de Chuva (%)</span>
          </div>
          <div class="chart-wrapper" style="height:190px;">
            <canvas id="chart-weather-prob"></canvas>
          </div>
        </div>

        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-wind"></i> Velocidade do Vento e Rajadas (km/h)</span>
          </div>
          <div class="chart-wrapper" style="height:190px;">
            <canvas id="chart-weather-wind"></canvas>
          </div>
        </div>
      </div>

      <!-- 6. MONITORAMENTO DE CHUVA, EXTREMOS E ESTAÇÕES REGIONAIS -->
      <div class="modal-grid-2col" style="margin-bottom:18px;">
        <!-- Tabela de Acumulados de Chuva -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-droplets"></i> Monitoramento de Chuva e Extremos</span>
          </div>
          <div style="padding:10px 14px;">
            <table class="weather-table">
              <thead>
                <tr>
                  <th>Janela de Monitoramento</th>
                  <th>Acumulado / Previsão</th>
                  <th>Status Operacional</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Última 1 hora</strong></td>
                  <td>${cur.precipitation1h !== null ? cur.precipitation1h + ' mm' : '0.0 mm'}</td>
                  <td><span style="color:#10b981; font-weight:700;">Normal</span></td>
                </tr>
                <tr>
                  <td><strong>Últimas 6 horas</strong></td>
                  <td>${cur.precipitation6h !== null ? cur.precipitation6h + ' mm' : '0.0 mm'}</td>
                  <td><span style="color:#10b981; font-weight:700;">Normal</span></td>
                </tr>
                <tr>
                  <td><strong>Últimas 24 horas</strong></td>
                  <td>${cur.precipitation24h !== null ? cur.precipitation24h + ' mm' : '0.0 mm'}</td>
                  <td><span style="color:${(cur.precipitation24h || 0) > 30 ? '#f97316' : '#10b981'}; font-weight:700;">${(cur.precipitation24h || 0) > 30 ? 'Atenção' : 'Estável'}</span></td>
                </tr>
                <tr>
                  <td><strong>Previsão Próximas 24h</strong></td>
                  <td><strong>${f5[0]?.precipSum || 0.0} mm</strong></td>
                  <td><span style="color:${(f5[0]?.precipSum || 0) > 30 ? '#f97316' : '#38bdf8'}; font-weight:700;">${(f5[0]?.precipSum || 0) > 30 ? 'Chuva Significativa' : 'Dentro da Média'}</span></td>
                </tr>
                <tr>
                  <td><strong>Previsão Próximas 48h</strong></td>
                  <td><strong>${Math.round(((f5[0]?.precipSum || 0) + (f5[1]?.precipSum || 0)) * 10) / 10} mm</strong></td>
                  <td>Volume acumulado em 2 dias</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Estações Meteorológicas Próximas -->
        <div class="chart-card">
          <div class="chart-card-header">
            <span class="chart-card-title"><i class="lucide-radio"></i> Estações de Monitoramento Próximas</span>
          </div>
          <div style="padding:10px 14px;">
            <table class="weather-table">
              <thead>
                <tr>
                  <th>Estação Oficial</th>
                  <th>Órgão</th>
                  <th>Distância</th>
                  <th>Altitude</th>
                </tr>
              </thead>
              <tbody>
                ${d.stations.map(st => `
                  <tr>
                    <td><strong>${st.name}</strong></td>
                    <td>${st.institution}</td>
                    <td><span style="color:#38bdf8; font-family:var(--font-mono); font-weight:700;">${st.distanceKm === 0 ? 'Sede Municipal' : st.distanceKm + ' km'}</span></td>
                    <td>${st.altitudeM} m</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- 7. RADAR METEOROLÓGICO & SATÉLITE -->
      <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i class="lucide-radar" style="color:#38bdf8;"></i>
        <span>Radar Meteorológico e Satélite em Tempo Real</span>
      </div>

      <div class="radar-cards-grid">
        <div class="radar-action-card">
          <div>
            <div class="radar-action-title">
              <i class="lucide-satellite" style="color:#38bdf8;"></i>
              <span>Radar Meteorológico CPTEC / INPE</span>
            </div>
            <div class="radar-action-desc">
              Mosaico de reflexividade em tempo real dos radares meteorológicos nacionais (Banda S e Banda C) para detecção de células de tempestade.
            </div>
          </div>
          <a href="https://sigma.cptec.inpe.br/radar/" target="_blank" rel="noopener noreferrer" class="mini-btn" style="background:#0284c7; color:#fff; border:none; text-align:center; padding:7px;">
            Abrir Radar CPTEC &rarr;
          </a>
        </div>

        <div class="radar-action-card">
          <div>
            <div class="radar-action-title">
              <i class="lucide-shield-alert" style="color:#f97316;"></i>
              <span>Monitoramento Defesa Civil RS</span>
            </div>
            <div class="radar-action-desc">
              Alertas meteorológicos estaduais, imagens de satélite GOES-16, monitoramento hidrológico de rios e boletins especiais para o RS.
            </div>
          </div>
          <a href="https://www.defesacivil.rs.gov.br/avisos-e-alertas" target="_blank" rel="noopener noreferrer" class="mini-btn" style="background:#ea580c; color:#fff; border:none; text-align:center; padding:7px;">
            Avisos Defesa Civil RS &rarr;
          </a>
        </div>

        <div class="radar-action-card">
          <div>
            <div class="radar-action-title">
              <i class="lucide-cloud-sun" style="color:#eab308;"></i>
              <span>Portal e Alertas INMET (Alertas2)</span>
            </div>
            <div class="radar-action-desc">
              Previsões numéricas para 5 dias, banco de dados meteorológicos históricos e avisos especiais de tempo severo para o Brasil.
            </div>
          </div>
          <a href="https://alertas2.inmet.gov.br/" target="_blank" rel="noopener noreferrer" class="mini-btn" style="background:#ca8a04; color:#fff; border:none; text-align:center; padding:7px;">
            Alertas2 INMET &rarr;
          </a>
        </div>
      </div>

      <!-- 8. BOLETIM METEOROLÓGICO DIÁRIO AUTOMATIZADO -->
      <div class="weather-bulletin-box">
        <div class="bulletin-header">
          <span><i class="lucide-file-text"></i> BOLETIM METEOROLÓGICO OPERACIONAL — PASSO FUNDO/RS</span>
          <span style="font-size:11px; font-weight:600; color:var(--text-muted);">Gerado às ${updatedStr}</span>
        </div>
        <p>
          Conforme as informações oficiais disponibilizadas pelo <strong>INMET</strong>, <strong>Defesa Civil do Rio Grande do Sul</strong> e <strong>CPTEC/INPE</strong>, o Município de Passo Fundo/RS apresenta no momento temperatura de <strong>${cur.temperature !== null ? cur.temperature + ' °C' : 'N/D'}</strong> (sensação de <strong>${cur.apparentTemperature !== null ? cur.apparentTemperature + ' °C' : 'N/D'}</strong>), umidade relativa do ar em <strong>${cur.humidity !== null ? cur.humidity + '%' : 'N/D'}</strong> e ventos de <strong>${cur.windSpeed !== null ? cur.windSpeed + ' km/h' : 'N/D'}</strong> (direção ${cur.windDirectionCardinal}).
        </p>
        <p style="margin-top:6px;">
          Para as próximas 24 horas, a previsão indica máxima de <strong>${f5[0]?.tempMax || '--'} °C</strong> e mínima de <strong>${f5[0]?.tempMin || '--'} °C</strong>, com precipitação prevista em <strong>${f5[0]?.precipSum || 0} mm</strong> (probabilidade de ${f5[0]?.precipProb || 0}%). No momento, constam <strong>${alerts.length} aviso(s) meteorológico(s) oficial(is)</strong> aplicáveis à região de Passo Fundo / Planalto Médio Gaúcho.
        </p>
        <div style="margin-top:8px; font-size:11px; color:var(--text-subtle);">
          *Aviso institucional: As informações meteorológicas apresentadas possuem caráter informativo e de apoio ao monitoramento e à gestão de riscos. Para situações de emergência, devem ser seguidas as orientações e alertas oficiais da Defesa Civil Municipal (199 / +55 54 9194-0449) e do Corpo de Bombeiros (193).
        </div>
      </div>

      <!-- 9. LINKS OFICIAIS -->
      <div style="font-size:12.5px; font-weight:800; color:var(--text-main); margin-bottom:8px; display:flex; align-items:center; gap:6px;">
        <i class="lucide-external-link" style="color:#38bdf8;"></i>
        <span>Portais e Fontes Oficiais de Meteorologia</span>
      </div>

      <div class="official-links-grid">
        ${d.officialLinks.map(l => `
          <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="official-link-pill" title="${l.description}">
            <div>
              <strong style="display:block;">${l.name}</strong>
              <span style="font-size:11px; color:var(--text-muted);">${l.type}</span>
            </div>
            <i class="lucide-external-link" style="font-size:13px; color:#38bdf8;"></i>
          </a>
        `).join('')}
      </div>
    `;

    // Render Charts via Chart.js
    this.renderCharts(f5);

    // Bind refresh button
    const btnRef = container.querySelector('#btn-refresh-weather');
    if (btnRef) {
      btnRef.addEventListener('click', () => {
        this.loadData(true);
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  renderCharts(forecast5Days) {
    if (!window.Chart || !forecast5Days || forecast5Days.length === 0) return;

    const labels = forecast5Days.map(d => `${d.weekday} (${d.formattedDate})`);
    const maxTemps = forecast5Days.map(d => d.tempMax);
    const minTemps = forecast5Days.map(d => d.tempMin);
    const precipSums = forecast5Days.map(d => d.precipSum);
    const precipProbs = forecast5Days.map(d => d.precipProb);
    const windSpeeds = forecast5Days.map(d => d.windMax || 0);

    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#94a3b8', font: { size: 11, family: 'Inter' } } },
        tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', titleColor: '#fff', bodyColor: '#cbd5e1' }
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
      }
    };

    // 1. Temperature Min x Max Chart
    const ctxTemp = document.getElementById('chart-weather-temp');
    if (ctxTemp) {
      if (this.chartInstances.temp) this.chartInstances.temp.destroy();
      this.chartInstances.temp = new Chart(ctxTemp, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Máxima (°C)', data: maxTemps, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.1)', tension: 0.3, fill: false },
            { label: 'Mínima (°C)', data: minTemps, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.1)', tension: 0.3, fill: false }
          ]
        },
        options: baseOptions
      });
    }

    // 2. Rain Sum Chart
    const ctxRain = document.getElementById('chart-weather-rain');
    if (ctxRain) {
      if (this.chartInstances.rain) this.chartInstances.rain.destroy();
      this.chartInstances.rain = new Chart(ctxRain, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Chuva Prevista (mm)', data: precipSums, backgroundColor: '#38bdf8', borderRadius: 4 }
          ]
        },
        options: baseOptions
      });
    }

    // 3. Rain Probability Chart
    const ctxProb = document.getElementById('chart-weather-prob');
    if (ctxProb) {
      if (this.chartInstances.prob) this.chartInstances.prob.destroy();
      this.chartInstances.prob = new Chart(ctxProb, {
        type: 'line',
        data: {
          labels,
          datasets: [
            { label: 'Probabilidade (%)', data: precipProbs, borderColor: '#eab308', backgroundColor: 'rgba(234,179,8,0.15)', tension: 0.3, fill: true }
          ]
        },
        options: { ...baseOptions, scales: { ...baseOptions.scales, y: { ...baseOptions.scales.y, max: 100, min: 0 } } }
      });
    }

    // 4. Wind Speed Chart
    const ctxWind = document.getElementById('chart-weather-wind');
    if (ctxWind) {
      if (this.chartInstances.wind) this.chartInstances.wind.destroy();
      this.chartInstances.wind = new Chart(ctxWind, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            { label: 'Vento Máximo (km/h)', data: windSpeeds, backgroundColor: '#a855f7', borderRadius: 4 }
          ]
        },
        options: baseOptions
      });
    }
  }

  /**
   * Updates small weather summary indicators on the Sidebar and Dashboard modal
   */
  updateSidebarWidget() {
    if (!this.weatherData) return;
    const cur = this.weatherData.current || {};
    const st = this.weatherData.operationalStatus || {};
    const f5 = this.weatherData.forecast5Days || [];
    const alerts = this.weatherData.alerts || [];

    // Update Sidebar elements if present
    const elTemp = document.getElementById('sidebar-weather-temp');
    const elCond = document.getElementById('sidebar-weather-cond');
    const elStatus = document.getElementById('sidebar-weather-status');
    const elAlerts = document.getElementById('sidebar-weather-alerts-count');

    if (elTemp && cur.temperature !== null) elTemp.textContent = `${cur.temperature}°C`;
    if (elCond && cur.conditionLabel) elCond.textContent = cur.conditionLabel;
    if (elStatus && st.level) {
      elStatus.textContent = st.level;
      elStatus.style.color = st.color;
    }
    if (elAlerts) {
      elAlerts.textContent = alerts.length > 0 ? `${alerts.length} alerta(s)` : 'Sem alertas';
    }
  }
}
