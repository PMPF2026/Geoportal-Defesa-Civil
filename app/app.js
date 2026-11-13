/**
 * Defesa Civil Passo Fundo — PWA Mobile Emergency App Engine
 * Arquitetura Mobile-First • Monitoramento Hidrológico • Rótulos Cartográficos nos Abrigos e Estações Pluviométricas
 */

// 1. Projeção SIRGAS 2000 UTM 22S (EPSG:31982) e WGS84
const EPSG_UTM22S = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

if (typeof proj4 !== 'undefined') {
  proj4.defs('EPSG:31982', EPSG_UTM22S);
  proj4.defs('EPSG:4326', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
}

// 2. As 3 Estações Plugfield com Sensores de Nível do Rio Passo Fundo
const RIVER_STATIONS_CONFIG = {
  4431: {
    deviceId: 4431,
    name: 'Avenida Brasil (Largo da Literatura)',
    shortName: 'Av. Brasil (Largo)',
    cardId: 'river-card-4431',
    valId: 'river-val-4431',
    timeId: 'river-time-4431',
    dotId: 'status-dot-4431',
    lat: -28.25360,
    lon: -52.39576
  },
  4714: {
    deviceId: 4714,
    name: 'Lobo da Costa (Entre Rios)',
    shortName: 'Lobo da Costa',
    cardId: 'river-card-4714',
    valId: 'river-val-4714',
    timeId: 'river-time-4714',
    dotId: 'status-dot-4714',
    lat: -28.25644,
    lon: -52.38236
  },
  4965: {
    deviceId: 4965,
    name: 'Quinto Giongo (Victor Issler)',
    shortName: 'Quinto Giongo',
    cardId: 'river-card-4965',
    valId: 'river-val-4965',
    timeId: 'river-time-4965',
    dotId: 'status-dot-4965',
    lat: -28.24178,
    lon: -52.41040
  }
};

class MobileEmergencyApp {
  constructor() {
    // Localização inicial estimada (Passo Fundo Centro) para resposta imediata sem espera
    this.userLocation = {
      lat: -28.2628,
      lon: -52.4067,
      utmX: 361950,
      utmY: 6873150,
      accuracy: 250,
      isInitial: true
    };
    this.shelters = [];
    this.attentionPolygons = null;
    this.plugfieldStations = [];
    this.riverStationsData = {};

    this.map = null;
    this.baseLayers = {};
    this.currentBaseLayer = 'osm';

    // Camadas vetoriais
    this.layerAttention = null;
    this.layerRioPassoFundo = null;
    this.layerSheltersGroup = null;
    this.layerRiverStationsGroup = null;
    this.layerWeatherStationsGroup = null;
    this.userMarker = null;
    this.userAccuracyCircle = null;

    this.deferredPrompt = null;
    this.isSheetExpanded = false;

    this.init();
  }

  async init() {
    this.registerServiceWorker();
    this.setupPwaInstall();
    this.initMap();
    this.bindEvents();

    // Carregamento simultâneo de dados
    await Promise.all([
      this.loadRiskPolygons(),
      this.loadRioPassoFundo(),
      this.loadSheltersData(),
      this.loadPlugfieldData()
    ]);

    // Diagnóstico e cálculos imediatos com dados iniciais (0ms de latência para o usuário)
    this.evaluateUserRisk();
    this.calculateNearestShelter();
    this.updateWeatherMonitoringUI();

    // Solicita localização precisa do usuário em segundo plano
    this.requestUserLocation();

    // Polling de telemetria a cada 60 segundos
    setInterval(() => {
      this.loadPlugfieldData();
    }, 60000);
  }

  // -------------------------------------------------------------
  // PWA & SERVICE WORKER
  // -------------------------------------------------------------
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker ativo:', reg.scope))
        .catch(err => console.warn('[PWA] Erro ao registrar SW:', err));
    }
  }

  setupPwaInstall() {
    const drawerInstallBtn = document.getElementById('btn-drawer-install');
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
    });

    if (drawerInstallBtn) {
      drawerInstallBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) {
          alert('O aplicativo já está instalado ou seu navegador não suporta instalação direta. Use o menu do navegador "Adicionar à tela inicial".');
          return;
        }
        this.deferredPrompt.prompt();
        await this.deferredPrompt.userChoice;
        this.deferredPrompt = null;
      });
    }
  }

  // -------------------------------------------------------------
  // MAPA LEAFLET
  // -------------------------------------------------------------
  initMap() {
    let mapEl = document.getElementById('mobile-map');
    if (!mapEl) {
      const container = document.getElementById('map-container');
      if (container) {
        mapEl = document.createElement('div');
        mapEl.id = 'mobile-map';
        mapEl.className = 'map-leaflet-stage';
        container.insertBefore(mapEl, container.firstChild);
      }
    }
    if (!mapEl || typeof L === 'undefined') return;

    this.map = L.map(mapEl, {
      zoomControl: false,
      attributionControl: false
    }).setView([-28.2628, -52.4067], 14);

    // Camada Ruas: OpenStreetMap
    this.baseLayers.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    // Camada Satélite: ESRI World Imagery
    this.baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© ESRI World Imagery'
    });

    this.baseLayers.osm.addTo(this.map);
    this.currentBaseLayer = 'osm';

    // Grupos de camadas vetoriais
    this.layerSheltersGroup = L.layerGroup().addTo(this.map);
    this.layerRiverStationsGroup = L.layerGroup().addTo(this.map);
    this.layerWeatherStationsGroup = L.layerGroup().addTo(this.map);

    // Garante que o Leaflet calcule a altura total do container
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
  }

  setBasemap(type) {
    if (!this.map) return;
    const icon = document.getElementById('icon-basemap');
    const chkSatellite = document.getElementById('chk-layer-satellite');

    if (type === 'satellite') {
      if (this.currentBaseLayer !== 'satellite') {
        this.map.removeLayer(this.baseLayers.osm);
        this.baseLayers.satellite.addTo(this.map);
        this.currentBaseLayer = 'satellite';
        if (icon) icon.textContent = '🗺️';
        if (chkSatellite) chkSatellite.checked = true;
      }
    } else {
      if (this.currentBaseLayer !== 'osm') {
        this.map.removeLayer(this.baseLayers.satellite);
        this.baseLayers.osm.addTo(this.map);
        this.currentBaseLayer = 'osm';
        if (icon) icon.textContent = '🛰️';
        if (chkSatellite) chkSatellite.checked = false;
      }
    }
  }

  // -------------------------------------------------------------
  // MONITORAMENTO HIDROLÓGICO (ESTAÇÕES PLUGFIELD)
  // -------------------------------------------------------------
  async loadPlugfieldData() {
    try {
      const resp = await fetch('/api/weather/plugfield?action=devices')
        .catch(() => fetch('../api/weather/plugfield?action=devices'));
      const data = await resp.json();

      if (!data || !data.data || !data.data.stations) {
        throw new Error('Formato de resposta inválido da API Plugfield');
      }

      this.plugfieldStations = data.data.stations;
      console.log(`[Plugfield] ${this.plugfieldStations.length} estações carregadas com sucesso`);

      // 1. Processar e exibir as 3 estações hidrológicas com destaque na barra superior
      this.updateRiverMonitoringUI();
      this.renderRiverStationsOnMap();

      // 2. Renderizar todas as estações pluviométricas no mapa com nomes e dados de chuva
      this.renderWeatherStationsOnMap();

      // 3. Processar monitoramento meteorológico (chuva) no painel expansível
      this.updateWeatherMonitoringUI();

    } catch (err) {
      console.warn('[Plugfield] Falha ao consultar rede telemétrica:', err);
      this.handleRiverStationsOffline();
    }
  }

  updateRiverMonitoringUI() {
    const liveText = document.getElementById('header-live-text');
    if (liveText) liveText.textContent = 'Ao Vivo';

    // Para cada uma das 3 estações de nível
    [4431, 4714, 4965].forEach(devId => {
      const cfg = RIVER_STATIONS_CONFIG[devId];
      if (!cfg) return;

      const cardEl = document.getElementById(cfg.cardId);
      const valEl = document.getElementById(cfg.valId);
      const timeEl = document.getElementById(cfg.timeId);
      const dotEl = document.getElementById(cfg.dotId);

      const st = this.plugfieldStations.find(s => (s.id == devId || s.deviceId == devId));

      if (st) {
        const dash = st.dashboard || {};

        // Extração do nível do sensor
        let riverLevel = null;
        if (st.riverLevel != null && !isNaN(parseFloat(st.riverLevel))) {
          riverLevel = parseFloat(st.riverLevel);
        } else if (dash.sc != null && dash.sc !== '' && !isNaN(parseFloat(dash.sc))) {
          riverLevel = parseFloat(dash.sc);
        } else if (dash.riverLevel != null && dash.riverLevel !== '' && !isNaN(parseFloat(dash.riverLevel))) {
          riverLevel = parseFloat(dash.riverLevel);
        } else if (dash.levelAdditional != null && dash.levelAdditional !== '' && !isNaN(parseFloat(dash.levelAdditional))) {
          riverLevel = parseFloat(dash.levelAdditional);
        }

        // Extração do Timestamp oficial
        const ts = st.lastUpdateTimestamp || dash.lastUpdateTimestamp || (dash.timestamp ? parseInt(dash.timestamp, 10) : null);
        let timeStr = 'Hoje';
        let isOnline = false;

        if (ts) {
          const numTs = ts < 10000000000 ? ts * 1000 : ts;
          const dt = new Date(numTs);
          const diffMin = Math.round((Date.now() - numTs) / (1000 * 60));
          const hh = String(dt.getHours()).padStart(2, '0');
          const mm = String(dt.getMinutes()).padStart(2, '0');
          timeStr = `Hoje às ${hh}:${mm}`;

          if (diffMin <= 120) {
            isOnline = true;
          }
        }

        // Armazena dados normalizados
        this.riverStationsData[devId] = {
          name: cfg.name,
          shortName: cfg.shortName,
          level: riverLevel,
          timeStr,
          isOnline,
          lat: cfg.lat,
          lon: cfg.lon
        };

        if (cardEl) cardEl.classList.remove('loading');
        if (valEl) {
          if (riverLevel !== null) {
            valEl.innerHTML = `${riverLevel.toFixed(2).replace('.', ',')} <small>m</small>`;
          } else {
            valEl.innerHTML = `<span style="font-size:12px; color:#94a3b8;">Dado indisponível</span>`;
          }
        }
        if (timeEl) timeEl.textContent = timeStr;
        if (dotEl) {
          dotEl.className = 'sensor-status-dot';
          if (isOnline) {
            dotEl.classList.add('online');
            dotEl.title = 'Sensor Online e Transmitindo';
          } else {
            dotEl.classList.add('delayed');
            dotEl.title = 'Comunicação atrasada';
          }
        }

      } else {
        if (cardEl) cardEl.classList.remove('loading');
        if (valEl) valEl.innerHTML = `<span style="font-size:11px; color:#ef4444;">Sem comunicação</span>`;
        if (timeEl) timeEl.textContent = 'Indisponível';
        if (dotEl) {
          dotEl.className = 'sensor-status-dot offline';
          dotEl.title = 'Sem comunicação';
        }
      }
    });
  }

  handleRiverStationsOffline() {
    [4431, 4714, 4965].forEach(devId => {
      const cfg = RIVER_STATIONS_CONFIG[devId];
      if (!cfg) return;
      const valEl = document.getElementById(cfg.valId);
      const timeEl = document.getElementById(cfg.timeId);
      const dotEl = document.getElementById(cfg.dotId);

      if (valEl) valEl.innerHTML = `<span style="font-size:11px; color:#f87171;">Sem comunicação</span>`;
      if (timeEl) timeEl.textContent = 'Consultando...';
      if (dotEl) {
        dotEl.className = 'sensor-status-dot delayed';
      }
    });
  }

  // Renderização das 3 Estações de Rio com Rótulos e Níveis
  renderRiverStationsOnMap() {
    if (!this.map || !this.layerRiverStationsGroup) return;
    this.layerRiverStationsGroup.clearLayers();

    [4431, 4714, 4965].forEach(devId => {
      const st = this.riverStationsData[devId] || RIVER_STATIONS_CONFIG[devId];
      if (!st) return;

      const levelText = st.level !== null && st.level !== undefined 
        ? `${st.level.toFixed(2).replace('.', ',')} m` 
        : 'Indisponível';

      const marker = L.circleMarker([st.lat, st.lon], {
        radius: 9,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95
      });

      // Rótulo permanente visível no mapa
      const shortTitle = st.shortName || st.name;
      marker.bindTooltip(
        `<span class="river-label-icon">🌊</span> <span class="river-label-text">${shortTitle}</span> <span class="river-level-tag">${levelText}</span>`,
        {
          permanent: true,
          direction: 'top',
          offset: [0, -10],
          className: 'map-badge-tooltip river-station-tooltip'
        }
      );

      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:210px;">
          <div style="color:#38bdf8; font-weight:800; font-size:12px; margin-bottom:4px;">
            🌊 SENSOR DE NÍVEL DO RIO
          </div>
          <strong style="color:#ffffff; font-size:13px;">${st.name}</strong><br>
          <div style="margin:8px 0; background:rgba(2,132,199,0.2); padding:6px 10px; border-radius:6px; border:1px solid rgba(56,189,248,0.4);">
            <span style="font-size:10.5px; color:#cbd5e1;">Nível do Rio Atual:</span><br>
            <span style="font-size:20px; font-weight:900; color:#38bdf8;">${levelText}</span>
          </div>
          <div style="font-size:10px; color:#94a3b8;">
            Sensor: Ultrassônico 10M (Plugfield)<br>
            Leitura: ${st.timeStr || 'Em tempo real'}
          </div>
        </div>
      `);

      st.marker = marker;
      this.layerRiverStationsGroup.addLayer(marker);
    });
  }

  // Renderização de TODAS as Estações Pluviométricas / Meteorológicas da Rede Plugfield com Rótulos
  renderWeatherStationsOnMap() {
    if (!this.map || !this.layerWeatherStationsGroup || this.plugfieldStations.length === 0) return;
    this.layerWeatherStationsGroup.clearLayers();

    this.plugfieldStations.forEach(st => {
      // Ignorar caso não tenha coordenadas válidas
      const lat = parseFloat(st.lat || st.latitude);
      const lon = parseFloat(st.lon || st.longitude || st.lng);
      if (isNaN(lat) || isNaN(lon)) return;

      const devId = Number(st.id || st.deviceId);
      const isRiverSensor = [4431, 4714, 4965].includes(devId);

      // Se já for uma estação fluvial, o marcador de rio já a representa
      if (isRiverSensor) return;

      const dash = st.dashboard || {};
      const rain = dash.rain24h ?? dash.rainAccum ?? dash.rain ?? 0;
      const rainNum = parseFloat(rain) || 0;
      const rainStr = `${rainNum.toFixed(1).replace('.', ',')} mm`;

      const temp = dash.temp ?? dash.temperature ?? null;
      const tempStr = temp !== null && !isNaN(parseFloat(temp)) ? `${parseFloat(temp).toFixed(1).replace('.', ',')} °C` : '';

      const marker = L.circleMarker([lat, lon], {
        radius: 7,
        fillColor: '#0ea5e9',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.95
      });

      // Rótulo permanente com nome da estação e acumulado de chuva
      const cleanName = (st.name || `Estação ${devId}`).replace(/\s*\([^)]*\)/, ''); // versão compacta
      marker.bindTooltip(
        `<span class="station-label-icon">🌧️</span> <span class="station-label-text">${cleanName}</span> <span class="rain-val-tag">${rainStr}</span>`,
        {
          permanent: true,
          direction: 'bottom',
          offset: [0, 9],
          className: 'map-badge-tooltip weather-station-tooltip'
        }
      );

      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:210px;">
          <div style="color:#38bdf8; font-weight:800; font-size:12px; margin-bottom:4px;">
            🌧️ ESTAÇÃO METEOROLÓGICA PLUGFIELD
          </div>
          <strong style="color:#ffffff; font-size:13px;">${st.name}</strong><br>
          <span style="font-size:10.5px; color:#94a3b8;">${st.type || 'Estação Telemétrica Municipal'}</span>
          <div style="margin:8px 0; background:rgba(14,165,233,0.15); padding:8px 10px; border-radius:6px; border:1px solid rgba(56,189,248,0.3);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:11px; color:#cbd5e1;">Precipitação Recente:</span>
              <strong style="font-size:15px; color:#38bdf8;">${rainStr}</strong>
            </div>
            ${tempStr ? `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
              <span style="font-size:11px; color:#cbd5e1;">Temperatura:</span>
              <strong style="font-size:13px; color:#f8fafc;">${tempStr}</strong>
            </div>` : ''}
          </div>
          <div style="font-size:10px; color:#94a3b8;">
            Sensor: Telemétrico Municipal (Plugfield)<br>
            ID do Dispositivo: ${devId}
          </div>
        </div>
      `);

      this.layerWeatherStationsGroup.addLayer(marker);
    });
  }

  // -------------------------------------------------------------
  // MONITORAMENTO METEOROLÓGICO (CHUVA)
  // -------------------------------------------------------------
  updateWeatherMonitoringUI() {
    const rainValEl = document.getElementById('weather-nearest-rain');
    const rainNameEl = document.getElementById('weather-nearest-name');
    const activeCountEl = document.getElementById('weather-active-count');
    const lastUpdateEl = document.getElementById('weather-last-update');

    if (!rainValEl || this.plugfieldStations.length === 0) return;

    if (activeCountEl) {
      activeCountEl.textContent = `${this.plugfieldStations.length} Estações`;
    }

    // Identificar a estação mais próxima da posição do usuário
    let nearestSt = null;
    let minDist = Infinity;

    if (this.userLocation) {
      for (const st of this.plugfieldStations) {
        const d = this.calculateDistance(this.userLocation.lat, this.userLocation.lon, st.lat, st.lon);
        if (d < minDist) {
          minDist = d;
          nearestSt = st;
        }
      }
    } else {
      // Fallback: Centro (Fredolino Chimango)
      nearestSt = this.plugfieldStations.find(s => (s.name && s.name.includes('Centro'))) || this.plugfieldStations[0];
    }

    if (nearestSt) {
      const dash = nearestSt.dashboard || {};
      const rain = dash.rain24h ?? dash.rainAccum ?? dash.rain ?? 0;
      const rainNum = parseFloat(rain) || 0;
      const distStr = minDist !== Infinity ? ` (${(minDist / 1000).toFixed(1).replace('.', ',')} km de você)` : '';

      rainValEl.innerHTML = `${rainNum.toFixed(1).replace('.', ',')} <small>mm</small>`;
      if (rainNameEl) rainNameEl.textContent = `${nearestSt.name}${distStr}`;
      if (lastUpdateEl) {
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        lastUpdateEl.textContent = `Hoje às ${hh}:${mm}`;
      }
    }
  }

  // -------------------------------------------------------------
  // CARREGAMENTO DOS ABRIGOS E ÁREAS DE RISCO
  // -------------------------------------------------------------
  async loadSheltersData() {
    try {
      const url1 = encodeURI('/Abrigos da Defesa Civil.geojson');
      const url2 = encodeURI('../Abrigos da Defesa Civil.geojson');
      const resp = await fetch(url1).catch(() => fetch(url2));
      const data = await resp.json();

      this.shelters = (data.features || []).map(f => {
        const props = f.properties || {};
        const coords = f.geometry ? f.geometry.coordinates : [0, 0];
        let lon = 0, lat = 0;
        if (typeof proj4 !== 'undefined' && coords[0] > 1000) {
          const pt = proj4('EPSG:31982', 'EPSG:4326', [coords[0], coords[1]]);
          lon = pt[0];
          lat = pt[1];
        }
        return {
          id: props['ID'] || 'Abrigo',
          name: props['Nome'] || 'Abrigo da Defesa Civil',
          type: props['Tipo'] || 'CENTRO DE ACOLHIMENTO',
          area: props['Área de Alojamento'] || 'N/D',
          address: props['Endereço'] || 'Passo Fundo / RS',
          utmX: coords[0],
          utmY: coords[1],
          lat,
          lon
        };
      });

      this.renderSheltersOnMap();
      this.calculateNearestShelter();

    } catch (e) {
      console.warn('[PWA] Erro ao carregar abrigos:', e);
    }
  }

  async loadRiskPolygons() {
    try {
      const url1 = encodeURI('/Áreas de Atenção Hidrológica.geojson');
      const url2 = encodeURI('../Áreas de Atenção Hidrológica.geojson');
      const respAtencao = await fetch(url1).catch(() => fetch(url2));
      this.attentionPolygons = await respAtencao.json();

      if (this.map && this.attentionPolygons) {
        this.layerAttention = this.createGeoJsonLayer(
          this.attentionPolygons,
          { color: '#ea580c', weight: 2.2, fillColor: '#f97316', fillOpacity: 0.42 },
          'Área de Atenção Hidrológica'
        ).addTo(this.map);
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Áreas de Atenção Hidrológica:', e);
    }
  }

  async loadRioPassoFundo() {
    try {
      const url1 = encodeURI('/Rio Passo Fundo.geojson');
      const url2 = encodeURI('../Rio Passo Fundo.geojson');
      const resp = await fetch(url1).catch(() => fetch(url2));
      const data = await resp.json();

      if (this.map && data) {
        this.layerRioPassoFundo = this.createGeoJsonLayer(
          data,
          {
            color: '#0284c7',
            weight: 3.2,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          },
          'Rio Passo Fundo (Calha Principal)'
        ).addTo(this.map);
        console.log('[PWA] Camada do Rio Passo Fundo carregada com sucesso.');
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Rio Passo Fundo:', e);
    }
  }

  createGeoJsonLayer(geojsonData, style, label) {
    const wgsFeatures = {
      type: 'FeatureCollection',
      features: (geojsonData.features || []).map(f => {
        const geom = f.geometry;
        if (!geom) return f;
        let newCoords = null;
        if (geom.type === 'MultiPolygon') {
          newCoords = geom.coordinates.map(poly =>
            poly.map(ring => ring.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]])))
          );
        } else if (geom.type === 'Polygon') {
          newCoords = geom.coordinates.map(ring =>
            ring.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]]))
          );
        } else if (geom.type === 'MultiLineString') {
          newCoords = geom.coordinates.map(line =>
            line.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]]))
          );
        } else if (geom.type === 'LineString') {
          newCoords = geom.coordinates.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]]));
        }
        return { ...f, geometry: { ...geom, coordinates: newCoords } };
      })
    };

    return L.geoJSON(wgsFeatures, {
      style,
      onEachFeature: (feature, layer) => {
        const title = feature.properties ? (feature.properties['Inundaçã'] || feature.properties['Nome'] || label) : label;
        layer.bindTooltip(title, { sticky: true });
      }
    });
  }

  // Renderização dos Abrigos com Rótulos Permanentes e Popup Completo
  renderSheltersOnMap() {
    if (!this.map || !this.layerSheltersGroup || this.shelters.length === 0) return;
    this.layerSheltersGroup.clearLayers();

    this.shelters.forEach((s) => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 8,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95
      });

      // Rótulo permanente visível com o nome do abrigo
      marker.bindTooltip(
        `<span class="shelter-label-icon">🏠</span> <span class="shelter-label-text">${s.name}</span>`,
        {
          permanent: true,
          direction: 'top',
          offset: [0, -9],
          className: 'map-badge-tooltip shelter-tooltip'
        }
      );

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
      const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

      marker.bindPopup(`
        <div style="font-family:sans-serif; min-width:210px;">
          <div style="color:#10b981; font-weight:800; font-size:11px; margin-bottom:2px;">
            🏠 ABRIGO OFICIAL DA DEFESA CIVIL
          </div>
          <strong style="color:#34d399; font-size:13px;">${s.name}</strong><br>
          <span style="font-size:10.5px; color:#94a3b8;">${s.type} • ${s.area}</span>
          <div style="margin:6px 0 8px 0; font-size:11px; color:#cbd5e1;">📍 ${s.address}</div>
          <div style="display:flex; gap:6px;">
            <a href="${googleUrl}" target="_blank" style="flex:1; background:#15803d; color:#fff; text-align:center; padding:6px; border-radius:6px; font-weight:bold; text-decoration:none; font-size:11px;">
              🗺️ Maps
            </a>
            <a href="${wazeUrl}" target="_blank" style="flex:1; background:#0284c7; color:#fff; text-align:center; padding:6px; border-radius:6px; font-weight:bold; text-decoration:none; font-size:11px;">
              🚙 Waze
            </a>
          </div>
        </div>
      `);

      this.layerSheltersGroup.addLayer(marker);
    });
  }

  // -------------------------------------------------------------
  // LOCALIZAÇÃO GPS DO USUÁRIO & DIAGNÓSTICO DE RISCO
  // -------------------------------------------------------------
  requestUserLocation(forceCenter = false) {
    const pill = document.getElementById('user-risk-pill');
    const pillTitle = document.getElementById('risk-pill-title');
    const pillDesc = document.getElementById('risk-pill-desc');

    if (!navigator.geolocation) {
      if (pillTitle) pillTitle.textContent = 'GPS Indisponível';
      if (pillDesc) pillDesc.textContent = 'Posição estimada no Centro de Passo Fundo';
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);
        let utmX = 0, utmY = 0;
        if (typeof proj4 !== 'undefined') {
          const pt = proj4('EPSG:4326', 'EPSG:31982', [lon, lat]);
          utmX = pt[0];
          utmY = pt[1];
        }

        this.userLocation = { lat, lon, utmX, utmY, accuracy, isInitial: false };
        console.log('[GPS] Posição obtida:', this.userLocation);

        this.evaluateUserRisk();
        this.calculateNearestShelter();
        this.updateWeatherMonitoringUI();
        this.updateUserMarkerOnMap(forceCenter);
      },
      (err) => {
        console.warn('[GPS] Erro ou permissão negada:', err);
        this.evaluateUserRisk();
        this.calculateNearestShelter();
        this.updateUserMarkerOnMap(false);
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
    );
  }

  evaluateUserRisk() {
    const pill = document.getElementById('user-risk-pill');
    const pillIcon = document.getElementById('risk-pill-icon');
    const pillTitle = document.getElementById('risk-pill-title');
    const pillDesc = document.getElementById('risk-pill-desc');

    if (!this.userLocation || !pill) return;

    const utmPoint = [this.userLocation.utmX, this.userLocation.utmY];
    const atencaoFeature = this.checkPointInGeoJson(utmPoint, this.attentionPolygons);

    if (atencaoFeature) {
      pill.className = 'map-status-pill status-hazard';
      pillIcon.textContent = '⚠️';
      pillTitle.textContent = 'Atenção: Área de Atenção Hidrológica!';
      pillDesc.textContent = `${atencaoFeature.properties['Inundaçã'] || atencaoFeature.properties['Nome'] || 'Planície com risco hidrológico cadastrado'}`;
    } else {
      pill.className = 'map-status-pill status-safe';
      pillIcon.textContent = '🛡️';
      pillTitle.textContent = 'Você está em Local Seguro';
      pillDesc.textContent = `Fora das áreas de atenção hidrológica (±${this.userLocation.accuracy}m)`;
    }
  }

  checkPointInGeoJson(utmPoint, geojsonData) {
    if (!geojsonData || !geojsonData.features) return null;
    const x = utmPoint[0], y = utmPoint[1];

    for (const f of geojsonData.features) {
      const geom = f.geometry;
      if (!geom) continue;

      if (geom.type === 'Polygon') {
        if (this.isPointInRing(x, y, geom.coordinates[0])) return f;
      } else if (geom.type === 'MultiPolygon') {
        for (const poly of geom.coordinates) {
          if (this.isPointInRing(x, y, poly[0])) return f;
        }
      }
    }
    return null;
  }

  isPointInRing(x, y, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  updateUserMarkerOnMap(forceCenter = false) {
    if (!this.map || !this.userLocation) return;
    const latLon = [this.userLocation.lat, this.userLocation.lon];

    if (!this.userMarker) {
      this.userAccuracyCircle = L.circle(latLon, {
        radius: this.userLocation.accuracy || 20,
        fillColor: '#38bdf8',
        fillOpacity: 0.18,
        stroke: false
      }).addTo(this.map);

      this.userMarker = L.circleMarker(latLon, {
        radius: 9,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(this.map);

      this.map.setView(latLon, 15);
    } else {
      this.userMarker.setLatLng(latLon);
      if (this.userAccuracyCircle) {
        this.userAccuracyCircle.setLatLng(latLon);
        this.userAccuracyCircle.setRadius(this.userLocation.accuracy || 20);
      }
      if (forceCenter) {
        this.map.setView(latLon, 16, { animate: true });
      }
    }
  }

  // -------------------------------------------------------------
  // ABRIGO MAIS PRÓXIMO & BOTTOM SHEET
  // -------------------------------------------------------------
  calculateNearestShelter() {
    if (!this.userLocation || this.shelters.length === 0) return;
    const uLat = this.userLocation.lat;
    const uLon = this.userLocation.lon;

    this.shelters.forEach(s => {
      s.distanceMeters = this.calculateDistance(uLat, uLon, s.lat, s.lon);
    });

    this.shelters.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const nearest = this.shelters[0];

    this.renderNearestShelterUI(nearest);
    this.renderSheltersListInSheet();
  }

  renderNearestShelterUI(s) {
    if (!s) return;
    const distText = document.getElementById('sheet-nearest-dist-text');
    const nameEl = document.getElementById('sheet-nearest-name');
    const btnGmaps = document.getElementById('btn-nav-gmaps');
    const btnWaze = document.getElementById('btn-nav-waze');

    const distStr = s.distanceMeters < 1000
      ? `${s.distanceMeters} metros de você`
      : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km de você`;

    if (distText) distText.textContent = `Mais próximo: ${distStr}`;
    if (nameEl) nameEl.textContent = s.name;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

    if (btnGmaps) btnGmaps.href = googleUrl;
    if (btnWaze) btnWaze.href = wazeUrl;
  }

  renderSheltersListInSheet(filterQuery = '') {
    const listEl = document.getElementById('sheet-shelters-list');
    if (!listEl) return;

    const query = filterQuery.toLowerCase().trim();
    const filtered = this.shelters.filter(s => {
      return !query || s.name.toLowerCase().includes(query) || s.address.toLowerCase().includes(query);
    });

    listEl.innerHTML = filtered.map((s, idx) => {
      const distStr = s.distanceMeters !== undefined
        ? (s.distanceMeters < 1000 ? `${s.distanceMeters} m` : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`)
        : '';
      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;

      return `
        <div class="shelter-row-item" data-idx="${idx}" data-lat="${s.lat}" data-lon="${s.lon}">
          <div class="shelter-info-col">
            <span class="shelter-name-row">${s.name}</span>
            <span class="shelter-addr-row">${s.address}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            ${distStr ? `<span class="shelter-dist-pill">${distStr}</span>` : ''}
            <a href="${googleUrl}" target="_blank" style="text-decoration:none; font-size:15px; color:#10b981;" title="Abrir no Maps">🧭</a>
          </div>
        </div>
      `;
    }).join('');

    // Clique em qualquer abrigo da lista: foca no mapa
    listEl.querySelectorAll('.shelter-row-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (e.target.closest('a')) return;
        const lat = parseFloat(item.getAttribute('data-lat'));
        const lon = parseFloat(item.getAttribute('data-lon'));
        if (this.map && !isNaN(lat) && !isNaN(lon)) {
          this.map.setView([lat, lon], 16, { animate: true });
          this.toggleBottomSheet(false);
        }
      });
    });
  }

  // -------------------------------------------------------------
  // EVENTOS E FERRAMENTAS LATERAIS
  // -------------------------------------------------------------
  bindEvents() {
    // 1. Alternar Bottom Sheet (Compacto / Expandido)
    const sheetDragZone = document.getElementById('sheet-drag-zone');
    const sheetToggleBtn = document.getElementById('btn-toggle-expand-sheet');
    if (sheetDragZone) sheetDragZone.addEventListener('click', () => this.toggleBottomSheet());
    if (sheetToggleBtn) sheetToggleBtn.addEventListener('click', () => this.toggleBottomSheet());

    // 2. Busca de Abrigos
    const searchInput = document.getElementById('input-search-shelters');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.renderSheltersListInSheet(e.target.value);
      });
    }

    // 3. Ferramentas da Lateral Direita
    // GPS
    const toolGps = document.getElementById('tool-gps');
    const btnQuickGps = document.getElementById('btn-quick-gps');
    if (toolGps) toolGps.addEventListener('click', () => this.requestUserLocation(true));
    if (btnQuickGps) btnQuickGps.addEventListener('click', () => this.requestUserLocation(true));

    // Camadas
    const toolLayers = document.getElementById('tool-layers');
    const popupLayers = document.getElementById('popup-layers');
    const btnCloseLayers = document.getElementById('btn-close-layers');
    if (toolLayers && popupLayers) {
      toolLayers.addEventListener('click', () => {
        popupLayers.style.display = popupLayers.style.display === 'none' ? 'block' : 'none';
        const popupLegend = document.getElementById('popup-legend');
        if (popupLegend) popupLegend.style.display = 'none';
      });
    }
    if (btnCloseLayers && popupLayers) {
      btnCloseLayers.addEventListener('click', () => {
        popupLayers.style.display = 'none';
      });
    }

    // Checkboxes de Camadas
    const chkSatellite = document.getElementById('chk-layer-satellite');
    if (chkSatellite) {
      chkSatellite.addEventListener('change', (e) => {
        this.setBasemap(e.target.checked ? 'satellite' : 'osm');
      });
    }

    const chkAttention = document.getElementById('chk-layer-attention');
    if (chkAttention) {
      chkAttention.addEventListener('change', (e) => {
        if (!this.map || !this.layerAttention) return;
        if (e.target.checked) this.map.addLayer(this.layerAttention);
        else this.map.removeLayer(this.layerAttention);
      });
    }

    const chkRio = document.getElementById('chk-layer-rio');
    if (chkRio) {
      chkRio.addEventListener('change', (e) => {
        if (!this.map || !this.layerRioPassoFundo) return;
        if (e.target.checked) this.map.addLayer(this.layerRioPassoFundo);
        else this.map.removeLayer(this.layerRioPassoFundo);
      });
    }

    const chkShelters = document.getElementById('chk-layer-shelters');
    if (chkShelters) {
      chkShelters.addEventListener('change', (e) => {
        if (!this.map || !this.layerSheltersGroup) return;
        if (e.target.checked) this.map.addLayer(this.layerSheltersGroup);
        else this.map.removeLayer(this.layerSheltersGroup);
      });
    }

    const chkStations = document.getElementById('chk-layer-stations');
    if (chkStations) {
      chkStations.addEventListener('change', (e) => {
        if (!this.map || !this.layerRiverStationsGroup) return;
        if (e.target.checked) this.map.addLayer(this.layerRiverStationsGroup);
        else this.map.removeLayer(this.layerRiverStationsGroup);
      });
    }

    const chkWeather = document.getElementById('chk-layer-weather');
    if (chkWeather) {
      chkWeather.addEventListener('change', (e) => {
        if (!this.map || !this.layerWeatherStationsGroup) return;
        if (e.target.checked) this.map.addLayer(this.layerWeatherStationsGroup);
        else this.map.removeLayer(this.layerWeatherStationsGroup);
      });
    }

    // Legenda
    const toolLegend = document.getElementById('tool-legend');
    const popupLegend = document.getElementById('popup-legend');
    const btnCloseLegend = document.getElementById('btn-close-legend');
    if (toolLegend && popupLegend) {
      toolLegend.addEventListener('click', () => {
        popupLegend.style.display = popupLegend.style.display === 'none' ? 'block' : 'none';
        if (popupLayers) popupLayers.style.display = 'none';
      });
    }
    if (btnCloseLegend && popupLegend) {
      btnCloseLegend.addEventListener('click', () => {
        popupLegend.style.display = 'none';
      });
    }

    // Zoom Leaflet
    const toolZoomIn = document.getElementById('tool-zoom-in');
    const toolZoomOut = document.getElementById('tool-zoom-out');
    if (toolZoomIn) toolZoomIn.addEventListener('click', () => {
      if (this.map) this.map.zoomIn();
    });
    if (toolZoomOut) toolZoomOut.addEventListener('click', () => {
      if (this.map) this.map.zoomOut();
    });

    // Expandir Mapa em Tela Cheia
    const toolFullscreen = document.getElementById('tool-fullscreen-map');
    const btnRestore = document.getElementById('btn-restore-panels');
    const viewport = document.getElementById('app-viewport');
    if (toolFullscreen && viewport) {
      toolFullscreen.addEventListener('click', () => {
        viewport.classList.add('fullscreen-active');
        setTimeout(() => {
          if (this.map) this.map.invalidateSize();
        }, 350);
      });
    }
    if (btnRestore && viewport) {
      btnRestore.addEventListener('click', () => {
        viewport.classList.remove('fullscreen-active');
        setTimeout(() => {
          if (this.map) this.map.invalidateSize();
        }, 350);
      });
    }

    // 4. Ferramentas da Lateral Esquerda
    // Atalho Abrigos
    const toolShelters = document.getElementById('tool-shelters');
    if (toolShelters) {
      toolShelters.addEventListener('click', () => {
        if (this.shelters.length > 0 && this.map) {
          const nearest = this.shelters[0];
          this.map.setView([nearest.lat, nearest.lon], 16, { animate: true });
        }
        this.toggleBottomSheet(true);
      });
    }

    // Atalho Áreas de Risco
    const toolRiskAreas = document.getElementById('tool-risk-areas');
    if (toolRiskAreas) {
      toolRiskAreas.addEventListener('click', () => {
        if (this.layerAttention && this.map) {
          const bounds = this.layerAttention.getBounds();
          if (bounds.isValid()) this.map.fitBounds(bounds, { padding: [20, 20], animate: true });
        }
      });
    }

    // Atalho Chuva: Liga a camada de estações pluviométricas e expande dados
    const toolWeather = document.getElementById('tool-weather');
    if (toolWeather) {
      toolWeather.addEventListener('click', () => {
        if (this.map && this.layerWeatherStationsGroup) {
          if (!this.map.hasLayer(this.layerWeatherStationsGroup)) {
            this.map.addLayer(this.layerWeatherStationsGroup);
            const chk = document.getElementById('chk-layer-weather');
            if (chk) chk.checked = true;
          }
        }
        this.toggleBottomSheet(true);
      });
    }

    // 5. Clique nos 3 Cards do Rio para focar no mapa e abrir popup
    [4431, 4714, 4965].forEach(devId => {
      const cfg = RIVER_STATIONS_CONFIG[devId];
      const card = document.getElementById(cfg.cardId);
      if (card) {
        card.addEventListener('click', () => {
          const st = this.riverStationsData[devId] || cfg;
          if (this.map && st.lat && st.lon) {
            this.map.setView([st.lat, st.lon], 16, { animate: true });
            if (st.marker) {
              setTimeout(() => st.marker.openPopup(), 250);
            }
          }
        });
      }
    });

    // 6. Menu Lateral (Drawer)
    const btnToggleDrawer = document.getElementById('btn-toggle-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    const sideDrawer = document.getElementById('side-drawer');

    const openDrawer = () => {
      if (sideDrawer) sideDrawer.classList.add('active');
      if (drawerBackdrop) drawerBackdrop.classList.add('active');
    };

    const closeDrawer = () => {
      if (sideDrawer) sideDrawer.classList.remove('active');
      if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    };

    if (btnToggleDrawer) btnToggleDrawer.addEventListener('click', openDrawer);
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
  }

  toggleBottomSheet(forceState = null) {
    const sheet = document.getElementById('bottom-sheet');
    const toggleText = document.getElementById('sheet-toggle-text');
    if (!sheet) return;

    if (forceState !== null) {
      this.isSheetExpanded = forceState;
    } else {
      this.isSheetExpanded = !this.isSheetExpanded;
    }

    if (this.isSheetExpanded) {
      sheet.classList.remove('collapsed');
      sheet.classList.add('expanded');
      if (toggleText) toggleText.textContent = 'Recolher';
    } else {
      sheet.classList.remove('expanded');
      sheet.classList.add('collapsed');
      if (toggleText) toggleText.textContent = 'Ver Mais';
    }

    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 350);
  }

  // Fórmula de Haversine para distâncias em metros
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const phi1 = lat1 * Math.PI / 180;
    const phi2 = lat2 * Math.PI / 180;
    const deltaPhi = (lat2 - lat1) * Math.PI / 180;
    const deltaLambda = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileEmergencyApp();
});
