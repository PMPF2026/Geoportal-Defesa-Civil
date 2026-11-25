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
    this.riverRefreshTimer = null;

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
        source: 'goes16',
        currentLayer: 'ir_interactive',
        name: 'Satélite GOES-16 — Tempo Real'
      },
      {
        id: 3,
        title: 'Painel 3',
        source: 'windy',
        currentLayer: 'wind',
        name: 'Windy — Vento e Rajadas'
      },
      {
        id: 4,
        title: 'Painel 4',
        source: 'rios_pf',
        currentLayer: 'live',
        name: 'Nível Rios Passo Fundo'
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
    } else {
      // Se já inicializado, atualizar dados dos rios
      this.updateLocalRiverData();
    }

    // Iniciar ciclo de atualização automática de telemetria a cada 45 segundos
    this.startRiverRefreshCycle();
  }

  close() {
    const modal = document.getElementById('situation-room-modal');
    if (modal) modal.classList.remove('active');
    this.isOpen = false;

    this.stopRiverRefreshCycle();

    if (document.fullscreenElement && this.isFullscreen) {
      document.exitFullscreen().catch(() => {});
      this.isFullscreen = false;
    }
  }

  startRiverRefreshCycle() {
    this.stopRiverRefreshCycle();
    this.riverRefreshTimer = setInterval(() => {
      if (this.isOpen) {
        this.updateLocalRiverData();
      }
    }, 45000);
  }

  stopRiverRefreshCycle() {
    if (this.riverRefreshTimer) {
      clearInterval(this.riverRefreshTimer);
      this.riverRefreshTimer = null;
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
                <option value="goes16" ${config.source === 'goes16' ? 'selected' : ''}>Satélite GOES-16 (NOAA)</option>
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
        { id: 'ir_interactive', label: '🛰️ Infravermelho (Animado)' },
        { id: 'geo_interactive', label: '🌍 GeoColor (Animado)' },
        { id: 'noaa_ir', label: '🔴 NOAA Direto IR' },
        { id: 'noaa_geo', label: '🌍 NOAA Direto GeoColor' },
        { id: 'noaa_wv', label: '💧 NOAA Vapor d\'Água' }
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
      config.currentLayer = 'ir_interactive';
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

    // Caso 1: Nível dos Rios de Passo Fundo
    if (config.source === 'rios_pf') {
      this.renderLocalRiversCard(panelId, viewContainer);
      if (spinner) spinner.classList.add('loaded');
      return;
    }

    // Caso 2: Imagem Direta de Alta Resolução da NOAA STAR (Zero bloqueios)
    if (config.source === 'goes16' && config.currentLayer.startsWith('noaa_')) {
      this.renderDirectNoaaSatelliteView(panelId, viewContainer, config.currentLayer);
      if (spinner) spinner.classList.add('loaded');
      return;
    }

    // Caso 3: Iframe Interativo (Windy, Ventusky, Radares)
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

  renderDirectNoaaSatelliteView(panelId, container, layerId) {
    let imgUrl = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ssa/13/latest.jpg';
    let title = 'Canal 13 — Infravermelho Limpo (10.3 µm)';
    let subtitle = 'Realce de Topos Frios e Convecção Profunda · NOAA STAR SSA';

    if (layerId === 'noaa_geo') {
      imgUrl = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ssa/GEOCOLOR/latest.jpg';
      title = 'GeoColor — Cores Verdadeiras & Noturno';
      subtitle = 'Visão Multiespectral em Tempo Real · NOAA STAR SSA';
    } else if (layerId === 'noaa_wv') {
      imgUrl = 'https://cdn.star.nesdis.noaa.gov/GOES16/ABI/SECTOR/ssa/09/latest.jpg';
      title = 'Canal 09 — Vapor d\'Água Nível Médio (6.9 µm)';
      subtitle = 'Correntes de Jato e Dinâmica Atmosférica · NOAA STAR SSA';
    }

    const cacheBuster = `?t=${Date.now()}`;

    container.innerHTML = `
      <div class="direct-sat-view">
        <div class="direct-sat-header-info">
          <div>
            <div class="direct-sat-title">🛰️ ${title}</div>
            <div class="direct-sat-sub">${subtitle}</div>
          </div>
          <button class="panel-action-btn" id="btn-reload-noaa-${panelId}" title="Atualizar imagem de satélite">
            🔄 Atualizar
          </button>
        </div>
        <div class="direct-sat-img-wrapper">
          <img src="${imgUrl}${cacheBuster}" alt="Satélite GOES-16 NOAA" class="direct-sat-img" id="noaa-img-${panelId}" />
        </div>
      </div>
    `;

    const reloadBtn = container.querySelector(`#btn-reload-noaa-${panelId}`);
    if (reloadBtn) {
      reloadBtn.addEventListener('click', () => {
        const img = container.querySelector(`#noaa-img-${panelId}`);
        if (img) img.src = `${imgUrl}?t=${Date.now()}`;
      });
    }
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
      // Satélite GOES-16 com animação interativa e marcador azul nativo fixo sobre Passo Fundo
      if (currentLayer === 'geo_interactive') {
        return `https://embed.windy.com/embed.html?lat=${this.lat}&lon=${this.lon}&zoom=6&level=surface&overlay=satellite&product=visible&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
      }
      // Padrão: Windy GOES-16 Infravermelho centrado no RS / Passo Fundo com marcador azul nativo
      return `https://embed.windy.com/embed.html?lat=${this.lat}&lon=${this.lon}&zoom=6&level=surface&overlay=satellite&product=satellite&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
    }

    if (source === 'radar_rs') {
      let lat = this.lat;
      let lon = this.lon;
      let zoom = 7;
      if (currentLayer === 'morro_igreja') {
        lat = -28.12; lon = -49.48; zoom = 8;
      } else if (currentLayer === 'cangucu') {
        lat = -31.39; lon = -52.68; zoom = 8;
      }
      return `https://embed.windy.com/embed.html?lat=${lat}&lon=${lon}&zoom=${zoom}&level=surface&overlay=radar&product=radar&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
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
      externalUrl = `https://www.star.nesdis.noaa.gov/goes/sector.php?sat=G16&sector=ssa`;
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
          <div style="display:flex; align-items:center; gap:8px;">
            <span class="situation-live-badge">
              <span class="situation-live-dot"></span>
              <span id="river-live-badge-txt">Plugfield Ao Vivo</span>
            </span>
            <button class="panel-action-btn" id="btn-manual-refresh-rivers" title="Atualizar leituras de telemetria">
              🔄
            </button>
          </div>
        </div>

        <div class="local-station-grid">
          <!-- 4431: Av. Brasil -->
          <div class="local-station-box station-normal" id="station-box-brasil">
            <div class="station-name">📍 Av. Brasil (Largo da Literatura)</div>
            <div class="station-level" id="station-val-brasil">-- <span class="station-unit">m</span></div>
            <div class="station-status-text" id="station-status-brasil">Consultando telemetria...</div>
            <div class="station-updated" id="station-time-brasil">Aguardando dados...</div>
          </div>

          <!-- 4714: Lobo da Costa -->
          <div class="local-station-box station-normal" id="station-box-lobo">
            <div class="station-name">📍 Lobo da Costa (Entre Rios)</div>
            <div class="station-level" id="station-val-lobo">-- <span class="station-unit">m</span></div>
            <div class="station-status-text" id="station-status-lobo">Consultando telemetria...</div>
            <div class="station-updated" id="station-time-lobo">Aguardando dados...</div>
          </div>

          <!-- 4965: Quinto Giongo -->
          <div class="local-station-box station-normal" id="station-box-quinto">
            <div class="station-name">📍 Quinto Giongo (Victor Issler)</div>
            <div class="station-level" id="station-val-quinto">-- <span class="station-unit">m</span></div>
            <div class="station-status-text" id="station-status-quinto">Consultando telemetria...</div>
            <div class="station-updated" id="station-time-quinto">Aguardando dados...</div>
          </div>

          <!-- Pluviômetros / Chuva -->
          <div class="local-station-box station-normal" id="station-box-pluv">
            <div class="station-name">📍 Precipitação Acumulada Hoje</div>
            <div class="station-level" id="station-val-pluv">-- <span class="station-unit">mm</span></div>
            <div class="station-status-text" id="station-status-pluv">Rede Pluviométrica Municipal</div>
            <div class="station-updated" id="station-time-pluv">Plugfield (16 estações)</div>
          </div>
        </div>

        <div class="local-rivers-info-footer">
          <div style="font-size: 11px; font-weight: 700; color: #f8fafc; margin-bottom: 4px; display:flex; align-items:center; gap:6px;">
            <span>ℹ️</span>
            <span>Limiares Oficiais da Defesa Civil Passo Fundo:</span>
          </div>
          <div style="font-size: 10.5px; color: #94a3b8; line-height: 1.4;">
            Normal: até 1,49 m • <strong style="color:#fbbf24;">Atenção: 1,50 m</strong> • <strong style="color:#f97316;">Alerta: 2,00 m</strong> • <strong style="color:#ef4444;">Emergência: 2,50 m</strong>. Atualização contínua via sensores ultrassônicos.
          </div>
        </div>
      </div>
    `;

    const refreshBtn = container.querySelector('#btn-manual-refresh-rivers');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.updateLocalRiverData();
      });
    }

    // Disparar busca de dados imediatamente
    this.updateLocalRiverData();
  }

  parseRiverLevel(st) {
    if (!st) return null;
    const dash = st.dashboard || {};
    const parse = (v) => {
      if (v == null || v === '') return null;
      const clean = String(v).trim().replace(',', '.');
      const num = parseFloat(clean);
      return (!isNaN(num) && isFinite(num)) ? num : null;
    };

    let lvl = parse(st.riverLevel);
    if (lvl !== null) return lvl;
    lvl = parse(dash.sc);
    if (lvl !== null) return lvl;
    lvl = parse(dash.riverLevel);
    if (lvl !== null) return lvl;
    lvl = parse(dash.levelAdditional);
    if (lvl !== null) return lvl;

    if (dash.lastSensorData && Array.isArray(dash.lastSensorData.sensorDataList)) {
      const scSensor = dash.lastSensorData.sensorDataList.find(s =>
        s.sensorCode === 'sc' || s.sensorId === 380 || (s.sensorName && /n[íi]vel|s[ôo]nico|l[íi]quido/i.test(s.sensorName))
      );
      if (scSensor && scSensor.dataValue != null && scSensor.dataValue !== '') {
        lvl = parse(scSensor.dataValue);
        if (lvl !== null) return lvl;
      }
    }
    return null;
  }

  formatTime(st) {
    if (!st) return 'Hoje';
    const dash = st.dashboard || {};
    const ts = st.lastUpdateTimestamp || dash.lastUpdateTimestamp || (dash.timestamp ? parseInt(dash.timestamp, 10) : null);
    if (ts) {
      const numTs = ts < 10000000000 ? ts * 1000 : ts;
      const dt = new Date(numTs);
      const hh = String(dt.getHours()).padStart(2, '0');
      const mm = String(dt.getMinutes()).padStart(2, '0');
      return `Leitura hoje às ${hh}:${mm}`;
    }
    if (dash.updateDateTime) {
      const dt = new Date(dash.updateDateTime);
      if (!isNaN(dt.getTime())) {
        const hh = String(dt.getHours()).padStart(2, '0');
        const mm = String(dt.getMinutes()).padStart(2, '0');
        return `Leitura hoje às ${hh}:${mm}`;
      }
    }
    return 'Hoje';
  }

  async updateLocalRiverData() {
    try {
      const resp = await fetch('/api/weather/plugfield?action=devices')
        .catch(() => fetch('../api/weather/plugfield?action=devices'))
        .catch(() => null);

      if (!resp || !resp.ok) return;

      const data = await resp.json();
      if (!data || !data.data || !Array.isArray(data.data.stations)) return;

      const stations = data.data.stations;

      // 1. Processar Estações Hidrológicas (4431, 4714, 4965)
      const riverConfigs = [
        { id: 4431, boxId: 'station-box-brasil', valId: 'station-val-brasil', statusId: 'station-status-brasil', timeId: 'station-time-brasil', name: 'Av. Brasil (Largo)' },
        { id: 4714, boxId: 'station-box-lobo', valId: 'station-val-lobo', statusId: 'station-status-lobo', timeId: 'station-time-lobo', name: 'Lobo da Costa' },
        { id: 4965, boxId: 'station-box-quinto', valId: 'station-val-quinto', statusId: 'station-status-quinto', timeId: 'station-time-quinto', name: 'Quinto Giongo' }
      ];

      for (const rc of riverConfigs) {
        let st = stations.find(s => s.id == rc.id || s.deviceId == rc.id);
        let lvl = this.parseRiverLevel(st);

        // Contingência individual se necessário
        if (lvl === null) {
          try {
            const singleResp = await fetch(`/api/weather/plugfield?action=device&deviceId=${rc.id}`);
            if (singleResp && singleResp.ok) {
              const singleData = await singleResp.json();
              if (singleData && singleData.data) {
                st = singleData.data;
                lvl = this.parseRiverLevel(st);
              }
            }
          } catch (e) {}
        }

        if (lvl !== null) {
          const valEl = document.getElementById(rc.valId);
          const boxEl = document.getElementById(rc.boxId);
          const statusEl = document.getElementById(rc.statusId);
          const timeEl = document.getElementById(rc.timeId);

          if (valEl) valEl.innerHTML = `${lvl.toFixed(2).replace('.', ',')} <span class="station-unit">m</span>`;
          if (timeEl) timeEl.textContent = this.formatTime(st);

          if (boxEl && statusEl) {
            boxEl.classList.remove('station-normal', 'station-alert', 'station-emergency');
            if (lvl >= 2.50) {
              boxEl.classList.add('station-emergency');
              statusEl.textContent = '🚨 COTA DE EMERGÊNCIA / TRANSBORDAMENTO';
            } else if (lvl >= 2.00) {
              boxEl.classList.add('station-alert');
              statusEl.textContent = '⚠️ COTA DE ALERTA DE CHEIA';
            } else if (lvl >= 1.50) {
              boxEl.classList.add('station-alert');
              statusEl.textContent = '⚠️ COTA DE ATENÇÃO HIDROLÓGICA';
            } else {
              boxEl.classList.add('station-normal');
              statusEl.textContent = 'Nível Normal de Calha';
            }
          }
        }
      }

      // 2. Processar Rede Pluviométrica (Chuva Máxima Registrada Hoje)
      let maxRain = 0;
      let maxStationName = '';
      stations.forEach(s => {
        const d = s.dashboard || {};
        const r = parseFloat(d.rainDay || d.rain);
        if (!isNaN(r) && r > maxRain) {
          maxRain = r;
          maxStationName = s.name || '';
        }
      });

      const pluvValEl = document.getElementById('station-val-pluv');
      const pluvStatusEl = document.getElementById('station-status-pluv');
      const pluvBoxEl = document.getElementById('station-box-pluv');
      const pluvTimeEl = document.getElementById('station-time-pluv');

      if (pluvValEl && maxRain > 0) {
        pluvValEl.innerHTML = `${maxRain.toFixed(1).replace('.', ',')} <span class="station-unit">mm</span>`;
        if (pluvTimeEl) pluvTimeEl.textContent = `Pico: ${maxStationName.replace(/\(.*?\)/, '').trim()}`;
        if (pluvBoxEl && pluvStatusEl) {
          pluvBoxEl.classList.remove('station-normal', 'station-alert', 'station-emergency');
          if (maxRain >= 50) {
            pluvBoxEl.classList.add('station-alert');
            pluvStatusEl.textContent = '⚠️ Precipitação Severa em Andamento';
          } else if (maxRain >= 25) {
            pluvBoxEl.classList.add('station-alert');
            pluvStatusEl.textContent = 'Chuva Forte Acumulada';
          } else {
            pluvBoxEl.classList.add('station-normal');
            pluvStatusEl.textContent = 'Chuva Fraca / Moderada';
          }
        }
      }

    } catch (e) {
      console.warn('[SituationRoom] Erro ao atualizar telemetria dos rios:', e);
    }
  }

  refreshAllPanels() {
    this.panels.forEach(config => {
      this.loadPanelContent(config.id);
    });
  }
}
