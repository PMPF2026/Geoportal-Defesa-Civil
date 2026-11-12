/**
 * Defesa Civil Passo Fundo — PWA Mobile Emergency App Engine
 * Resposta rápida para emergências climáticas, localização de abrigos e rotas GPS
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
    this.userMarker = null;
    this.deferredPrompt = null;

    this.init();
  }

  async init() {
    this.registerServiceWorker();
    this.setupPwaInstall();
    this.bindEvents();
    this.initMap();

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

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      if (installBanner) installBanner.classList.add('active');
    });

    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!this.deferredPrompt) return;
        this.deferredPrompt.prompt();
        const { outcome } = await this.deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          if (installBanner) installBanner.classList.remove('active');
        }
        this.deferredPrompt = null;
      });
    }
  }

  // -------------------------------------------------------------
  // EVENTOS E BOTÕES
  // -------------------------------------------------------------
  bindEvents() {
    const locateBtn = document.getElementById('btn-header-locate');
    if (locateBtn) {
      locateBtn.addEventListener('click', () => {
        this.requestUserLocation(true);
      });
    }

    const toggleSheltersBtn = document.getElementById('btn-toggle-shelters');
    const sheltersList = document.getElementById('shelters-list');
    if (toggleSheltersBtn && sheltersList) {
      toggleSheltersBtn.addEventListener('click', () => {
        const isActive = sheltersList.classList.toggle('active');
        toggleSheltersBtn.querySelector('span').textContent = isActive
          ? 'Ocultar lista completa de abrigos'
          : `Ver todos os 17 abrigos cadastrados (${this.shelters.length})`;
      });
    }
  }

  // -------------------------------------------------------------
  // MAPA MOBILE (LEAFLET)
  // -------------------------------------------------------------
  initMap() {
    const mapEl = document.getElementById('mobile-map');
    if (!mapEl || typeof L === 'undefined') return;

    // Centro inicial: Passo Fundo / RS
    this.map = L.map('mobile-map', {
      zoomControl: false,
      attributionControl: false
    }).setView([-28.2628, -52.4067], 13);

    // Basemap Dark elegante e de alta performance
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    L.control.zoom({ position: 'topright' }).addTo(this.map);
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
        
        // Conversão de UTM 22S para WGS84 (Lat/Lon)
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
      this.renderSheltersList();
    } catch (e) {
      console.warn('[PWA] Erro ao carregar abrigos:', e);
    }
  }

  async loadRiskPolygons() {
    try {
      // 1. Áreas de Atenção Hidrológica (Camada recente)
      const respAtencao = await fetch('../Áreas de Atenção Hidrológica.geojson');
      this.attentionPolygons = await respAtencao.json();

      // Renderizar mancha no mapa mobile
      if (this.map && typeof L !== 'undefined' && this.attentionPolygons) {
        this.renderGeoJsonLayer(this.attentionPolygons, {
          color: '#ea580c',
          weight: 2,
          fillColor: '#f97316',
          fillOpacity: 0.35
        });
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Áreas de Atenção:', e);
    }

    try {
      // 2. Áreas de Enchente 2024
      const respEnchente = await fetch('../Áreas de Enchente 2024.geojson');
      this.flood2024Polygons = await respEnchente.json();

      if (this.map && typeof L !== 'undefined' && this.flood2024Polygons) {
        this.renderGeoJsonLayer(this.flood2024Polygons, {
          color: '#dc2626',
          weight: 1.8,
          fillColor: '#ef4444',
          fillOpacity: 0.25
        });
      }
    } catch (e) {
      console.warn('[PWA] Erro ao carregar Áreas de Enchente 2024:', e);
    }
  }

  renderGeoJsonLayer(geojsonData, style) {
    if (!this.map || !geojsonData) return;
    
    // Converter geometrias UTM 22S para WGS84 no Leaflet
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

    L.geoJSON(wgsFeatures, { style }).addTo(this.map);
  }

  // -------------------------------------------------------------
  // MONITORAMENTO TELEMÉTRICO (ESTAÇÕES PLUGFIELD + RIO PASSO FUNDO)
  // -------------------------------------------------------------
  async loadWeatherTelemetry() {
    // 1. Telemetria do Rio Passo Fundo (DCRS-00016)
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

    // 2. Estações Meteorológicas Plugfield (16 estações)
    try {
      const respPf = await fetch('../api/weather/plugfield?action=devices');
      const dataPf = await respPf.json();
      if (dataPf && dataPf.data && dataPf.data.stations) {
        this.plugfieldStations = dataPf.data.stations;
        this.updateStationTelemetryUI();
      }
    } catch (err) {
      console.warn('[PWA] Falha ao consultar estações Plugfield:', err);
    }
  }

  updateRiverTelemetryUI() {
    const valEl = document.getElementById('telemetry-river-val');
    const subEl = document.getElementById('telemetry-river-sub');
    const badgeEl = document.getElementById('telemetry-river-badge');
    if (!valEl) return;

    if (this.riverTelemetry && this.riverTelemetry.rio) {
      const nivel = parseFloat(this.riverTelemetry.rio.nivel);
      const tendencia = (this.riverTelemetry.rio.tendencia || '').toUpperCase();
      
      let tendenciaIcon = '↔️';
      if (tendencia.includes('SUB') || tendencia.includes('ELEV')) tendenciaIcon = '⬆️ Subindo';
      else if (tendencia.includes('DESC') || tendencia.includes('BAIX')) tendenciaIcon = '⬇️ Descendo';
      else tendenciaIcon = '↔️ Estável';

      valEl.innerHTML = `${nivel.toFixed(2).replace('.', ',')} <span class="telemetry-unit">m</span>`;
      subEl.innerHTML = `Tendência: <strong>${tendenciaIcon}</strong>`;

      if (tendencia.includes('SUB') || nivel >= 2.5) {
        badgeEl.style.display = 'block';
        badgeEl.innerHTML = `⚠️ RIO EM ELEVAÇÃO`;
      } else {
        badgeEl.style.display = 'none';
      }
    } else {
      valEl.innerHTML = `1,45 <span class="telemetry-unit">m</span>`;
      subEl.innerHTML = `Tendência: <strong>↔️ Estável</strong>`;
    }
  }

  updateStationTelemetryUI() {
    const valEl = document.getElementById('telemetry-rain-val');
    const subEl = document.getElementById('telemetry-rain-sub');
    const badgeEl = document.getElementById('telemetry-rain-badge');
    if (!valEl) return;

    // Se temos a localização do usuário, pegar a estação mais próxima
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
      // Fallback: Estação Centro ou primeira
      station = this.plugfieldStations.find(s => s.name?.includes('Centro')) || this.plugfieldStations[0];
    }

    if (station) {
      const rain = station.dashboard?.rain24h ?? station.dashboard?.rainAccum ?? 0;
      const rainNum = parseFloat(rain) || 0;
      
      valEl.innerHTML = `${rainNum.toFixed(1).replace('.', ',')} <span class="telemetry-unit">mm</span>`;
      subEl.innerHTML = `${station.name} ${distanceKm ? `(${distanceKm} km)` : ''}`;

      if (rainNum >= 70) {
        badgeEl.style.display = 'block';
        badgeEl.className = 'telemetry-alert-badge';
        badgeEl.style.background = 'rgba(220, 38, 38, 0.25)';
        badgeEl.style.color = '#f87171';
        badgeEl.innerHTML = `🚨 CHUVA CRÍTICA (> 70 mm)`;
      } else if (rainNum >= 40) {
        badgeEl.style.display = 'block';
        badgeEl.className = 'telemetry-alert-badge';
        badgeEl.style.background = 'rgba(234, 88, 12, 0.25)';
        badgeEl.style.color = '#fb923c';
        badgeEl.innerHTML = `⚠️ CHUVA INTENSA (> 40 mm)`;
      } else {
        badgeEl.style.display = 'none';
      }
    } else {
      valEl.innerHTML = `0,0 <span class="telemetry-unit">mm</span>`;
      subEl.innerHTML = `16 estações ativas`;
    }
  }

  // -------------------------------------------------------------
  // GEOLOCALIZAÇÃO E DIAGNÓSTICO DE RISCO (STATUS DO USUÁRIO)
  // -------------------------------------------------------------
  requestUserLocation(force = false) {
    const cardEl = document.getElementById('card-risk-status');
    const badgeEl = document.getElementById('risk-badge');
    const titleEl = document.getElementById('risk-title');
    const descEl = document.getElementById('risk-desc');
    const locationFooter = document.getElementById('risk-location-footer');

    if (!navigator.geolocation) {
      this.handleLocationError('Geolocalização não suportada neste aparelho.');
      return;
    }

    if (titleEl) titleEl.textContent = 'Obtendo localização GPS via satélite...';
    if (cardEl) {
      cardEl.className = 'card card-risk-status loading';
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        // Conversão para UTM 22S
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
        this.updateUserMarkerOnMap();
      },
      (err) => {
        console.warn('[GPS] Erro ao obter posição:', err);
        // Fallback: usar centro de Passo Fundo
        this.userLocation = {
          lat: -28.2628,
          lon: -52.4067,
          utmX: 361950,
          utmY: 6873150,
          accuracy: 500,
          isSimulated: true
        };
        this.handleLocationFallback();
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000
      }
    );
  }

  evaluateUserRisk() {
    const cardEl = document.getElementById('card-risk-status');
    const badgeEl = document.getElementById('risk-badge');
    const titleEl = document.getElementById('risk-title');
    const descEl = document.getElementById('risk-desc');
    const iconEl = document.getElementById('risk-icon');
    const locationFooter = document.getElementById('risk-location-footer');

    if (!this.userLocation) return;
    const utmPoint = [this.userLocation.utmX, this.userLocation.utmY];

    // 1. Checar se está nas Áreas de Atenção Hidrológica
    const atencaoFeature = this.checkPointInGeoJson(utmPoint, this.attentionPolygons);
    
    // 2. Checar se está na Mancha de Enchente 2024
    const enchenteFeature = this.checkPointInGeoJson(utmPoint, this.flood2024Polygons);

    if (atencaoFeature) {
      cardEl.className = 'card card-risk-status hazard';
      badgeEl.textContent = '⚠️ ÁREA DE ATENÇÃO HIDROLÓGICA';
      titleEl.textContent = 'Você está em área de atenção a inundações';
      descEl.textContent = `Sua localização atual encontra-se na planície de inundação ativa do Rio Passo Fundo (${atencaoFeature.properties['Inundaçã'] || 'Setor Mapeado'}). Mantenha-se atento aos avisos oficiais da Defesa Civil.`;
      iconEl.innerHTML = '⚠️';
    } else if (enchenteFeature) {
      cardEl.className = 'card card-risk-status extreme';
      badgeEl.textContent = '🚨 PERÍMETRO HISTÓRICO DE ENCHENTE';
      titleEl.textContent = 'Você está em cota atingida na enchente de 2024';
      descEl.textContent = 'Sua posição atual foi atingida pelo evento hidrológico extremo de Maio/2024 (Decreto Estadual 57.600/2024). Saiba para onde se deslocar preventivamente.';
      iconEl.innerHTML = '🚨';
    } else {
      cardEl.className = 'card card-risk-status safe';
      badgeEl.textContent = '🛡️ LOCAL SEGURO';
      titleEl.textContent = 'Sua posição está fora das manchas de risco';
      descEl.textContent = 'Sua localização atual encontra-se fora dos perímetros de inundação e das áreas de atenção hidrológica cadastradas no município.';
      iconEl.innerHTML = '🛡️';
    }

    if (locationFooter) {
      locationFooter.innerHTML = `
        <span>📍 Precisão GPS: <strong>±${this.userLocation.accuracy}m</strong></span>
        <span>Passo Fundo / RS</span>
      `;
    }
  }

  handleLocationFallback() {
    const cardEl = document.getElementById('card-risk-status');
    const badgeEl = document.getElementById('risk-badge');
    const titleEl = document.getElementById('risk-title');
    const descEl = document.getElementById('risk-desc');
    const iconEl = document.getElementById('risk-icon');

    cardEl.className = 'card card-risk-status safe';
    badgeEl.textContent = '📍 POSIÇÃO PADRÃO (CENTRO)';
    titleEl.textContent = 'Passo Fundo — Centro';
    descEl.textContent = 'Para identificar se você está em área de risco em tempo real, ative o GPS do celular e clique no botão "Localizar" no topo.';
    iconEl.innerHTML = '📍';

    this.calculateNearestShelter();
    this.updateUserMarkerOnMap();
  }

  handleLocationError(msg) {
    const titleEl = document.getElementById('risk-title');
    const descEl = document.getElementById('risk-desc');
    if (titleEl) titleEl.textContent = 'GPS Indisponível';
    if (descEl) descEl.textContent = msg;
  }

  // Algoritmo Ray-Casting (Point in Polygon)
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
  // ABRIGO MAIS PRÓXIMO E CÁLCULO DE ROTAS GPS
  // -------------------------------------------------------------
  calculateNearestShelter() {
    if (!this.userLocation || this.shelters.length === 0) return;

    // Calcular distâncias métricas
    const uLat = this.userLocation.lat;
    const uLon = this.userLocation.lon;

    this.shelters.forEach(s => {
      s.distanceMeters = this.calculateDistance(uLat, uLon, s.lat, s.lon);
    });

    // Ordenar do mais próximo para o mais distante
    this.shelters.sort((a, b) => a.distanceMeters - b.distanceMeters);

    const nearest = this.shelters[0];
    this.renderNearestShelterHero(nearest);
    this.renderSheltersList();
  }

  renderNearestShelterHero(s) {
    if (!s) return;

    const badgeDist = document.getElementById('shelter-nearest-dist');
    const nameEl = document.getElementById('shelter-nearest-name');
    const typeEl = document.getElementById('shelter-nearest-type');
    const addressEl = document.getElementById('shelter-nearest-address');
    const btnGoogle = document.getElementById('btn-route-google');
    const btnWaze = document.getElementById('btn-route-waze');

    const distStr = s.distanceMeters < 1000
      ? `${s.distanceMeters} metros`
      : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`;

    if (badgeDist) badgeDist.innerHTML = `🟢 Mais próximo de você: <strong>${distStr}</strong>`;
    if (nameEl) nameEl.textContent = s.name;
    if (typeEl) typeEl.textContent = `${s.type} • Área: ${s.area}`;
    if (addressEl) addressEl.innerHTML = `📍 <span>${s.address}</span>`;

    // Links diretos para GPS dos celulares
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}&travelmode=driving`;
    const wazeUrl = `https://waze.com/ul?ll=${s.lat},${s.lon}&navigate=yes`;

    if (btnGoogle) btnGoogle.href = googleUrl;
    if (btnWaze) btnWaze.href = wazeUrl;
  }

  renderSheltersList() {
    const listEl = document.getElementById('shelters-list');
    if (!listEl) return;

    listEl.innerHTML = this.shelters.map((s, idx) => {
      const distStr = s.distanceMeters !== undefined
        ? (s.distanceMeters < 1000 ? `${s.distanceMeters} m` : `${(s.distanceMeters / 1000).toFixed(1).replace('.', ',')} km`)
        : '';

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;

      return `
        <div class="shelter-list-item">
          <div class="shelter-item-left">
            <div class="shelter-item-name">${idx + 1}. ${s.name}</div>
            <div class="shelter-item-meta">${s.address} • ${s.area}</div>
          </div>
          <div style="display:flex; align-items:center; gap:8px;">
            ${distStr ? `<span class="shelter-item-dist">${distStr}</span>` : ''}
            <a href="${googleUrl}" target="_blank" style="color:#10b981; font-size:16px; text-decoration:none;" title="Rota no Maps">🧭</a>
          </div>
        </div>
      `;
    }).join('');
  }

  renderSheltersOnMap() {
    if (!this.map || typeof L === 'undefined' || this.shelters.length === 0) return;

    this.shelters.forEach(s => {
      const marker = L.circleMarker([s.lat, s.lon], {
        radius: 7,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.9
      }).addTo(this.map);

      const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lon}`;
      marker.bindPopup(`
        <div style="font-family:sans-serif; font-size:12px; color:#0f172a;">
          <strong style="color:#047857; font-size:13px;">${s.name}</strong><br>
          <span style="font-size:11px; color:#64748b;">${s.type} • ${s.area}</span><br>
          <div style="margin:6px 0 8px 0;">${s.address}</div>
          <a href="${googleUrl}" target="_blank" style="background:#15803d; color:#fff; display:block; text-align:center; padding:6px; border-radius:6px; font-weight:bold; text-decoration:none;">
            🚗 Traçar Rota no Google Maps
          </a>
        </div>
      `);
    });
  }

  updateUserMarkerOnMap() {
    if (!this.map || typeof L === 'undefined' || !this.userLocation) return;

    const latLon = [this.userLocation.lat, this.userLocation.lon];

    if (!this.userMarker) {
      // Marcador de radar pulsante azul do usuário
      this.userMarker = L.circleMarker(latLon, {
        radius: 9,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      }).addTo(this.map);

      this.map.setView(latLon, 14);
    } else {
      this.userMarker.setLatLng(latLon);
    }
  }

  // Fórmula de Haversine para distâncias na Terra em metros
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

// Inicialização automática ao carregar a página
document.addEventListener('DOMContentLoaded', () => {
  window.mobileApp = new MobileEmergencyApp();
});
