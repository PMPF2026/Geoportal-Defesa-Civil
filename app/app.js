/**
 * Defesa Civil Passo Fundo — PWA Mobile Emergency App Engine
 * Resposta rápida para emergências climáticas, localização de abrigos e rotas GPS
 * Versão Full-Screen Map HUD + Bottom Sheet + Side Drawer
 */

// 1. Definições de Projeção SIRGAS 2000 UTM 22S (EPSG:31982) e WGS84
const EPSG_UTM22S = '+proj=utm +zone=22 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs';

if (typeof proj4 !== 'undefined') {
  proj4.defs('EPSG:31982', EPSG_UTM22S);
  proj4.defs('EPSG:4326', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');
}

class MobileEmergencyApp {
  constructor() {
    this.userLocation = null; // { lat, lon, utmX, utmY, accuracy }
    this.shelters = [];
    this.attentionPolygons = null;
    this.flood2024Polygons = null;
    this.plugfieldStations = [];
    this.riverTelemetry = null;
    
    this.map = null;
    this.baseLayers = {};
    this.currentBaseLayer = 'osm';
    this.userMarker = null;
    this.userAccuracyCircle = null;
    this.shelterMarkers = [];
    this.deferredPrompt = null;

    this.init();
  }

  async init() {
    this.registerServiceWorker();
    this.setupPwaInstall();
    this.initMap();
    this.bindEvents();

    // Carregar bases de dados e telemetrias em paralelo
    await Promise.all([
      this.loadSheltersData(),
      this.loadRiskPolygons(),
      this.loadWeatherTelemetry()
    ]);

    // Solicitar GPS do usuário
    this.requestUserLocation();
  }

  // -------------------------------------------------------------
  // REGISTRO DO SERVICE WORKER (PWA)
  // -------------------------------------------------------------
  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registrado:', reg.scope))
        .catch(err => console.warn('[PWA] Falha ao registrar SW:', err));
    }
  }

  setupPwaInstall() {
    const installBanner = document.getElementById('pwa-banner');
    const installBtn = document.getElementById('btn-pwa-install');
    const dismissBtn = document.getElementById('btn-pwa-dismiss');
    const drawerInstallBtn = document.getElementById('btn-drawer-install-app');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBanner) installBanner.style.display = 'flex';
    });

    const triggerInstall = async () => {
      if (!this.deferredPrompt) {
        alert('O aplicativo já está instalado ou seu navegador não suporta instalação direta. No Chrome/Safari, use o menu "Adicionar à tela inicial".');
        return;
      }
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        if (installBanner) installBanner.style.display = 'none';
      }
      this.deferredPrompt = null;
    };

    if (installBtn) installBtn.addEventListener('click', triggerInstall);
    if (drawerInstallBtn) drawerInstallBtn.addEventListener('click', triggerInstall);
    if (dismissBtn) {
      dismissBtn.addEventListener('click', () => {
        if (installBanner) installBanner.style.display = 'none';
      });
    }
  }

  // -------------------------------------------------------------
  // MAPA FULL-SCREEN (LEAFLET) & CAMADAS BASE
  // -------------------------------------------------------------
  initMap() {
    const mapEl = document.getElementById('mobile-map');
    if (!mapEl || typeof L === 'undefined') return;

    // Centro inicial: Passo Fundo / RS
    this.map = L.map('mobile-map', {
      zoomControl: true,
      attributionControl: false
    }).setView([-28.2628, -52.4067], 14);

    // Camada 1: OpenStreetMap (Ruas detalhadas)
    this.baseLayers.osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    });

    // Camada 2: ESRI World Imagery (Satélite de alta resolução)
    this.baseLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: '© ESRI World Imagery'
    });

    // Adiciona OpenStreetMap como camada inicial padrão
    this.baseLayers.osm.addTo(this.map);
    this.currentBaseLayer = 'osm';
  }

  toggleBasemap() {
    if (!this.map) return;
    const iconEl = document.getElementById('basemap-icon');

    if (this.currentBaseLayer === 'osm') {
      this.map.removeLayer(this.baseLayers.osm);
      this.baseLayers.satellite.addTo(this.map);
      this.currentBaseLayer = 'satellite';
      if (iconEl) iconEl.textContent = '🗺️';
    } else {
      this.map.removeLayer(this.baseLayers.satellite);
      this.baseLayers.osm.addTo(this.map);
      this.currentBaseLayer = 'osm';
      if (iconEl) iconEl.textContent = '🛰️';
    }
  }

  // -------------------------------------------------------------
  // EVENTOS DE INTERFACE & GAVETA LATERAL
  // -------------------------------------------------------------
  bindEvents() {
    // 1. Alternar Mapa Base (Ruas / Satélite)
    const toggleMapBtn = document.getElementById('btn-toggle-basemap');
    if (toggleMapBtn) {
      toggleMapBtn.addEventListener('click', () => this.toggleBasemap());
    }

    // 2. Recentralizar GPS
    const recenterGpsBtn = document.getElementById('btn-recenter-gps');
    if (recenterGpsBtn) {
      recenterGpsBtn.addEventListener('click', () => {
        this.requestUserLocation(true);
      });
    }

    // 3. Abrir e Fechar Side Drawer
    const openDrawerBtn = document.getElementById('btn-open-drawer');
    const closeDrawerBtn = document.getElementById('btn-close-drawer');
    const drawerBackdrop = document.getElementById('drawer-backdrop');
    const sideDrawer = document.getElementById('side-drawer');
    const viewAllSheltersBtn = document.getElementById('sheet-btn-view-all');

    const openDrawer = (targetTab = null) => {
      if (sideDrawer) sideDrawer.classList.add('active');
      if (drawerBackdrop) drawerBackdrop.classList.add('active');
      if (targetTab) this.switchDrawerTab(targetTab);
    };

    const closeDrawer = () => {
      if (sideDrawer) sideDrawer.classList.remove('active');
      if (drawerBackdrop) drawerBackdrop.classList.remove('active');
    };

    if (openDrawerBtn) openDrawerBtn.addEventListener('click', () => openDrawer());
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
    if (viewAllSheltersBtn) {
      viewAllSheltersBtn.addEventListener('click', () => openDrawer('tab-abrigos'));
    }

    // 4. Abas do Drawer
    const tabBtns = document.querySelectorAll('.drawer-nav-tabs .tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        this.switchDrawerTab(targetId);
      });
    });

    // 5. Busca de Abrigos no Drawer
    const searchInput = document.getElementById('shelter-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = (e.target.value || '').toLowerCase().trim();
        this.filterSheltersList(query);
      });
    }

    // 6. Clique na Pílula de Risco para recentralizar ou expandir
    const statusPill = document.getElementById('status-pill');
    if (statusPill) {
      statusPill.addEventListener('click', () => {
        if (this.userLocation && this.map) {
          this.map.setView([this.userLocation.lat, this.userLocation.lon], 16, { animate: true });
        }
      });
    }
  }

  switchDrawerTab(tabId) {
    const tabBtns = document.querySelectorAll('.drawer-nav-tabs .tab-btn');
    const panes = document.querySelectorAll('.drawer-content .tab-pane');

    tabBtns.forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });

    panes.forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });
  }

  // -------------------------------------------------------------
  // CARREGAMENTO DOS DADOS (GEOJSON)
  // -------------------------------------------------------------
  async loadSheltersData() {
    try {
      const resp = await fetch('../Abrigos da Defesa Civil.geojson');
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
      this.renderSheltersDrawerList();
    } catch (e) {
      console.warn('[PWA] Erro ao carregar abrigos:', e);
    }
  }

  async loadRiskPolygons() {
    // 1. Áreas de Atenção Hidrológica (Camada recente em Laranja)
    try {
      const respAtencao = await fetch('../Áreas de Atenção Hidrológica.geojson');
      this.attentionPolygons = await respAtencao.json();

      if (this.map && typeof L !== 'undefined' && this.attentionPolygons) {
        this.renderGeoJsonLayer(this.attentionPolygons, {
          color: '#ea580c',
          weight: 2.2,
          fillColor: '#f97316',
          fillOpacity: 0.38
        }, 'Área de Atenção Hidrológica');
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Áreas de Atenção:', e);
    }

    // 2. Áreas de Enchente 2024 (Perímetro Histórico em Vermelho)
    try {
      const respEnchente = await fetch('../Áreas de Enchente 2024.geojson');
      this.flood2024Polygons = await respEnchente.json();

      if (this.map && typeof L !== 'undefined' && this.flood2024Polygons) {
        this.renderGeoJsonLayer(this.flood2024Polygons, {
          color: '#dc2626',
          weight: 2,
          fillColor: '#ef4444',
          fillOpacity: 0.28
        }, 'Perímetro Histórico de Enchente (2024)');
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Áreas de Enchente 2024:', e);
    }
  }

  renderGeoJsonLayer(geojsonData, style, label) {
    if (!this.map || !geojsonData) return;
    
    const wgsFeatures = {
      type: 'FeatureCollection',
      features: (geojsonData.features || []).map(f => {
        const geom = f.geometry;
        if (!geom) return f;
        
        let newCoords = null;
        if (geom.type === 'MultiPolygon') {
          newCoords = geom.coordinates.map(polygon => 
            polygon.map(ring => 
              ring.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]]))
            )
          );
        } else if (geom.type === 'Polygon') {
          newCoords = geom.coordinates.map(ring => 
            ring.map(pt => proj4('EPSG:31982', 'EPSG:4326', [pt[0], pt[1]]))
          );
        }

        return {
          ...f,
          geometry: {
            ...geom,
            coordinates: newCoords
          }
        };
      })
    };

    L.geoJSON(wgsFeatures, {
      style,
      onEachFeature: (feature, layer) => {
        const nome = feature.properties ? (feature.properties['Inundaçã'] || feature.properties['Nome'] || label) : label;
        layer.bindTooltip(nome, { sticky: true });
      }
    }).addTo(this.map);
  }

  // -------------------------------------------------------------
  // MONITORAMENTO TELEMÉTRICO (ESTAÇÕES PLUGFIELD + RIO PASSO FUNDO)
  // -------------------------------------------------------------
  async loadWeatherTelemetry() {
    // 1. Nível do Rio Passo Fundo
    try {
      const respRio = await fetch('../api/weather/defesacivil?action=telemetry&station=DCRS-00016');
      const dataRio = await respRio.json();
      if (dataRio && dataRio.data) {
        this.riverTelemetry = dataRio.data;
        this.updateRiverTelemetryUI();
      }
    } catch (err) {
      console.warn('[PWA] Falha ao consultar nível do rio:', err);
    }

    // 2. Estações Pluviométricas Plugfield (16 sensores)
    try {
      const respPf = await fetch('../api/weather/plugfield?action=devices');
      const dataPf = await respPf.json();
      if (dataPf && dataPf.data && dataPf.data.stations) {
        this.plugfieldStations = dataPf.data.stations;
        this.updateStationTelemetryUI();
        this.renderStationsDrawerList();
      }
    } catch (err) {
      console.warn('[PWA] Falha ao consultar estações Plugfield:', err);
    }
  }

  updateRiverTelemetryUI() {
    const valEl = document.getElementById('drawer-river-val');
    const trendEl = document.getElementById('drawer-river-trend');
    const badgeBox = document.getElementById('drawer-river-badge-box');
    const pillAlert = document.getElementById('telemetry-pill-alert');

    if (!valEl) return;

    if (this.riverTelemetry && this.riverTelemetry.rio) {
      const nivel = parseFloat(this.riverTelemetry.rio.nivel);
      const tendencia = (this.riverTelemetry.rio.tendencia || '').toUpperCase();
      
      let trendText = '↔️ Estável';
      if (tendencia.includes('SUB') || tendencia.includes('ELEV')) trendText = '⬆️ Subindo';
      else if (tendencia.includes('DESC') || tendencia.includes('BAIX')) trendText = '⬇️ Descendo';

      valEl.innerHTML = `${nivel.toFixed(2).replace('.', ',')} <small>m</small>`;
      if (trendEl) trendEl.innerHTML = `Tendência: <strong>${trendText}</strong>`;

      if (badgeBox) {
        if (tendencia.includes('SUB') || nivel >= 2.5) {
          badgeBox.innerHTML = `<span style="background:rgba(220,38,38,0.25); color:#f87171; font-weight:800; font-size:11px; padding:4px 8px; border-radius:6px; border:1px solid rgba(220,38,38,0.5);">⚠️ ELEVAÇÃO</span>`;
        } else {
          badgeBox.innerHTML = `<span style="background:rgba(16,185,129,0.2); color:#34d399; font-weight:700; font-size:11px; padding:4px 8px; border-radius:6px;">NORMAL</span>`;
        }
      }

      // Alerta flutuante de cabeçalho
      if (pillAlert && (tendencia.includes('SUB') || nivel >= 2.8)) {
        pillAlert.style.display = 'flex';
        pillAlert.innerHTML = `<span>🌊 Rio Passo Fundo em elevação (${nivel.toFixed(2).replace('.', ',')} m)</span>`;
      }
    }
  }

  updateStationTelemetryUI() {
    const valEl = document.getElementById('drawer-rain-val');
    const nearestNameEl = document.getElementById('drawer-station-nearest-name');
    const badgeBox = document.getElementById('drawer-rain-badge-box');
    const pillAlert = document.getElementById('telemetry-pill-alert');

    let station = null;
    let distanceKm = null;

    if (this.userLocation && this.plugfieldStations.length > 0) {
      let minDist = Infinity;
      for (const st of this.plugfieldStations) {
        const d = this.calculateDistance(this.userLocation.lat, this.userLocation.lon, st.lat, st.lon);
        if (d < minDist) {
          minDist = d;
          station = st;
          distanceKm = (d / 1000).toFixed(1).replace('.', ',');
        }
      }
    } else if (this.plugfieldStations.length > 0) {
      station = this.plugfieldStations.find(s => s.name?.includes('Centro')) || this.plugfieldStations[0];
    }

    if (station && valEl) {
      const rain = station.dashboard?.rain24h ?? station.dashboard?.rainAccum ?? 0;
      const rainNum = parseFloat(rain) || 0;

      valEl.innerHTML = `${rainNum.toFixed(1).replace('.', ',')} <small>mm</small>`;
      if (nearestNameEl) nearestNameEl.textContent = `${station.name} ${distanceKm ? `(${distanceKm} km)` : ''}`;

      if (badgeBox) {
        if (rainNum >= 70) {
          badgeBox.innerHTML = `<span style="background:rgba(220,38,38,0.25); color:#f87171; font-weight:800; font-size:11px; padding:4px 8px; border-radius:6px; border:1px solid rgba(220,38,38,0.5);">🚨 CHUVA CRÍTICA</span>`;
          if (pillAlert) {
            pillAlert.style.display = 'flex';
            pillAlert.innerHTML = `<span>🌧️ Chuva Crítica: ${rainNum.toFixed(1)} mm no setor</span>`;
          }
        } else if (rainNum >= 40) {
          badgeBox.innerHTML = `<span style="background:rgba(234,88,12,0.25); color:#fb923c; font-weight:800; font-size:11px; padding:4px 8px; border-radius:6px; border:1px solid rgba(234,88,12,0.5);">⚠️ CHUVA FORTE</span>`;
          if (pillAlert) {
            pillAlert.style.display = 'flex';
            pillAlert.innerHTML = `<span>🌧️ Chuva Forte: ${rainNum.toFixed(1)} mm no setor</span>`;
          }
        } else {
          badgeBox.innerHTML = `<span style="background:rgba(16,185,129,0.2); color:#34d399; font-weight:700; font-size:11px; padding:4px 8px; border-radius:6px;">ESTÁVEL</span>`;
        }
      }
    }
  }

  renderStationsDrawerList() {
    const listEl = document.getElementById('drawer-stations-list');
    if (!listEl || this.plugfieldStations.length === 0) return;

    listEl.innerHTML = this.plugfieldStations.map(st => {
      const rain = st.dashboard?.rain24h ?? st.dashboard?.rainAccum ?? 0;
      const rainVal = parseFloat(rain) || 0;
      return `
        <div class="station-item-row">
          <span class="station-item-name">${st.name}</span>
          <span class="station-item-rain">${rainVal.toFixed(1).replace('.', ',')} mm</span>
        </div>
      `;
    }).join('');
  }

  // -------------------------------------------------------------
  // GEOLOCALIZAÇÃO E DIAGNÓSTICO DE RISCO (STATUS DO USUÁRIO)
  // -------------------------------------------------------------
  requestUserLocation(forceAnimate = false) {
    const pillEl = document.getElementById('status-pill');
    const pillIcon = document.getElementById('pill-icon');
    const pillTitle = document.getElementById('pill-title');
    const pillDesc = document.getElementById('pill-desc');

    if (!navigator.geolocation) {
      if (pillTitle) pillTitle.textContent = 'GPS Indisponível';
      if (pillDesc) pillDesc.textContent = 'Ative a localização no navegador';
      return;
    }

    if (pillTitle) pillTitle.textContent = 'Buscando GPS...';
    if (pillEl) pillEl.className = 'status-pill status-loading';

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

        this.userLocation = { lat, lon, utmX, utmY, accuracy };
        console.log('[GPS] Localização obtida:', this.userLocation);

        this.evaluateUserRisk();
        this.updateStationTelemetryUI();
        this.calculateNearestShelter();
        this.updateUserMarkerOnMap(forceAnimate);
      },
      (err) => {
        console.warn('[GPS] Erro ao obter posição:', err);
        // Fallback: Centro de Passo Fundo
        this.userLocation = {
          lat: -28.2628,
          lon: -52.4067,
          utmX: 361950,
          utmY: 6873150,
          accuracy: 500,
          isSimulated: true
        };
        this.evaluateUserRisk();
        this.calculateNearestShelter();
        this.updateUserMarkerOnMap(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  evaluateUserRisk() {
    const pillEl = document.getElementById('status-pill');
    const pillIcon = document.getElementById('pill-icon');
    const pillTitle = document.getElementById('pill-title');
    const pillDesc = document.getElementById('pill-desc');

    if (!this.userLocation || !pillEl) return;
    const utmPoint = [this.userLocation.utmX, this.userLocation.utmY];

    const atencaoFeature = this.checkPointInGeoJson(utmPoint, this.attentionPolygons);
    const enchenteFeature = this.checkPointInGeoJson(utmPoint, this.flood2024Polygons);

    if (atencaoFeature) {
      pillEl.className = 'status-pill status-hazard';
      pillIcon.textContent = '⚠️';
      pillTitle.textContent = 'Área de Atenção Hidrológica!';
      pillDesc.textContent = `${atencaoFeature.properties['Inundaçã'] || 'Planície de inundação ativa'}`;
    } else if (enchenteFeature) {
      pillEl.className = 'status-pill status-extreme';
      pillIcon.textContent = '🚨';
      pillTitle.textContent = 'Perímetro Enchente 2024!';
      pillDesc.textContent = 'Cota atingida no evento histórico';
    } else {
      pillEl.className = 'status-pill status-safe';
      pillIcon.textContent = '🛡️';
      pillTitle.textContent = 'Você está em Local Seguro';
      pillDesc.textContent = `Fora das manchas de risco (±${this.userLocation.accuracy}m)`;
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
    this.renderNearestShelterSheet(nearest);
    this.renderSheltersDrawerList();
  }

  renderNearestShelterSheet(s) {
    if (!s) return;

    const distText = document.getElementById('sheet-dist-text');
    const nameEl = document.getElementById('sheet-shelter-name');
    const metaEl = document.getElementById('sheet-shelter-meta');
    const addressEl = document.getElementById('sheet-shelter-address');
    const btnGoogle = document.getElementById('btn-nav-google');
    const btnWaze = document.getElementById('btn-nav-waze');

    const distStr = s.distanceMeters < 1000
      ? `${s.distanceMeters} metros de você`
      : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km de você`;

    if (distText) distText.textContent = `Mais próximo: ${distStr}`;
    if (nameEl) nameEl.textContent = s.name;
    if (metaEl) metaEl.textContent = `${s.type} • Área: ${s.area}`;
    if (addressEl) addressEl.textContent = `📍 ${s.address}`;

    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

    if (btnGoogle) btnGoogle.href = googleUrl;
    if (btnWaze) btnWaze.href = wazeUrl;
  }

  // -------------------------------------------------------------
  // LISTAGEM DOS ABRIGOS NO SIDE DRAWER
  // -------------------------------------------------------------
  renderSheltersDrawerList() {
    const listEl = document.getElementById('drawer-shelters-list');
    if (!listEl) return;

    listEl.innerHTML = this.shelters.map((s, idx) => {
      const distStr = s.distanceMeters !== undefined
        ? (s.distanceMeters < 1000 ? `${s.distanceMeters} m` : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`)
        : '';

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
      const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

      return `
        <div class="drawer-shelter-card" data-idx="${idx}" data-name="${s.name.toLowerCase()}" data-address="${s.address.toLowerCase()}">
          <div class="shelter-card-top">
            <span class="shelter-card-title">${idx + 1}. ${s.name}</span>
            ${distStr ? `<span class="shelter-card-dist">${distStr}</span>` : ''}
          </div>
          <div class="shelter-card-address">${s.address}</div>
          <div class="shelter-card-actions">
            <a href="${googleUrl}" target="_blank" class="btn-shelter-route">
              <span>🚗 Maps</span>
            </a>
            <a href="${wazeUrl}" target="_blank" class="btn-shelter-route" style="color:#38bdf8; border-color:rgba(56,189,248,0.3); background:rgba(2,132,199,0.15);">
              <span>🚙 Waze</span>
            </a>
          </div>
        </div>
      `;
    }).join('');

    // Adiciona evento de clique para focar abrigo no mapa ao clicar no card
    const cards = listEl.querySelectorAll('.drawer-shelter-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('a')) return; // se clicou no link de rota deixa abrir
        const idx = parseInt(card.getAttribute('data-idx'));
        const s = this.shelters[idx];
        if (s && this.map) {
          this.map.setView([s.lat, s.lon], 16, { animate: true });
          // Fechar drawer
          const sideDrawer = document.getElementById('side-drawer');
          const drawerBackdrop = document.getElementById('drawer-backdrop');
          if (sideDrawer) sideDrawer.classList.remove('active');
          if (drawerBackdrop) drawerBackdrop.classList.remove('active');
        }
      });
    });
  }

  filterSheltersList(query) {
    const cards = document.querySelectorAll('.drawer-shelter-card');
    cards.forEach(card => {
      const name = card.getAttribute('data-name') || '';
      const address = card.getAttribute('data-address') || '';
      const matches = !query || name.includes(query) || address.includes(query);
      card.style.display = matches ? 'block' : 'none';
    });
  }

  // -------------------------------------------------------------
  // MARCADORES NO MAPA (ABRIGOS & USUÁRIO)
  // -------------------------------------------------------------
  renderSheltersOnMap() {
    if (!this.map || typeof L === 'undefined' || this.shelters.length === 0) return;

    this.shelters.forEach((s, idx) => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 8,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2.5,
        opacity: 1,
        fillOpacity: 0.95
      }).addTo(this.map);

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
      const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px; color:#f8fafc; min-width: 220px;">
          <strong style="color:#34d399; font-size:13.5px; display:block; margin-bottom:2px;">${s.name}</strong>
          <span style="font-size:11px; color:#94a3b8;">${s.type} • ${s.area}</span>
          <div style="margin:6px 0 10px 0; font-size:11px; color:#cbd5e1;">📍 ${s.address}</div>
          <div style="display:flex; gap:6px;">
            <a href="${googleUrl}" target="_blank" style="flex:1; background:#15803d; color:#fff; text-align:center; padding:6px; border-radius:6px; font-weight:bold; text-decoration:none; font-size:11px;">
              🚗 Google Maps
            </a>
            <a href="${wazeUrl}" target="_blank" style="flex:1; background:#0284c7; color:#fff; text-align:center; padding:6px; border-radius:6px; font-weight:bold; text-decoration:none; font-size:11px;">
              🚙 Waze
            </a>
          </div>
        </div>
      `);

      this.shelterMarkers.push(marker);
    });
  }

  updateUserMarkerOnMap(forceAnimate = false) {
    if (!this.map || typeof L === 'undefined' || !this.userLocation) return;

    const latLon = [this.userLocation.lat, this.userLocation.lon];

    if (!this.userMarker) {
      // Anel translúcido de precisão
      this.userAccuracyCircle = L.circle(latLon, {
        radius: this.userLocation.accuracy || 20,
        fillColor: '#38bdf8',
        fillOpacity: 0.15,
        stroke: false
      }).addTo(this.map);

      // Ponto azul do usuário
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
      if (forceAnimate) {
        this.map.setView(latLon, 16, { animate: true });
      }
    }
  }

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

// Inicialização automática ao carregar
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileEmergencyApp();
});
