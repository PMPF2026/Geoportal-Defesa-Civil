/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Advanced Spatial Analysis Module: Buffers, Environmental APP, Flood Exposure Matrix & CSV Export
 */

import { formatArea, formatNumber } from '../utils/formatters.js';
import { Notification } from '../ui/notification.js';

export class SpatialAnalysisTool {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;

    // Vector source and layer for displaying spatial analysis outputs
    this.analysisSource = new ol.source.Vector();
    this.analysisLayer = new ol.layer.Vector({
      source: this.analysisSource,
      zIndex: 850,
      style: new ol.style.Style({
        stroke: new ol.style.Stroke({ color: '#f59e0b', width: 2.8 }),
        fill: new ol.style.Fill({ color: 'rgba(245, 158, 11, 0.32)' })
      })
    });
    this.map.addLayer(this.analysisLayer);

    this.lastAnalysisData = null;
    this.initUI();
  }

  initUI() {
    // 1. Parametric Buffer
    const runBufferBtn = document.getElementById('btn-run-buffer');
    if (runBufferBtn) {
      runBufferBtn.addEventListener('click', () => {
        this.executeBufferAnalysis();
      });
    }

    // 2. Clear Analysis
    const clearAnalysisBtn = document.getElementById('btn-clear-analysis');
    if (clearAnalysisBtn) {
      clearAnalysisBtn.addEventListener('click', () => {
        this.clearAnalysis();
      });
    }

    // 3. Flood Disaster Cross Analysis
    const runFloodIntersectBtn = document.getElementById('btn-run-flood-intersect');
    if (runFloodIntersectBtn) {
      runFloodIntersectBtn.addEventListener('click', () => {
        this.executeFloodIntersectAnalysis();
      });
    }

    // 4. Quick Environmental APP Presets (30m, 50m, 100m)
    document.querySelectorAll('.app-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const radius = btn.getAttribute('data-radius');
        const radiusInput = document.getElementById('analysis-buffer-radius');
        const layerSelect = document.getElementById('analysis-buffer-layer');
        if (radiusInput) radiusInput.value = radius;
        if (layerSelect) layerSelect.value = 'malha_hidrica';
        this.executeBufferAnalysis();
      });
    });
  }

  /**
   * Generates a spatial buffer on selected layer features
   */
  async executeBufferAnalysis() {
    const layerSelect = document.getElementById('analysis-buffer-layer');
    const radiusInput = document.getElementById('analysis-buffer-radius');
    const resultsBox = document.getElementById('analysis-buffer-results');

    if (!layerSelect || !radiusInput) return;

    const layerId = layerSelect.value;
    const radiusMeters = parseFloat(radiusInput.value) || 100;

    Notification.info(`Processando buffer espacial de ${radiusMeters}m...`);

    try {
      await this.layerManager.loadLayerData(layerId);
      const layer = this.layerManager.getLayer(layerId);
      const features = layer.getSource().getFeatures();

      if (features.length === 0) {
        Notification.warning('A camada selecionada não possui feições carregadas.');
        return;
      }

      this.analysisSource.clear();

      const geoJsonFormat = new ol.format.GeoJSON();
      let totalBufferArea = 0;

      if (typeof turf !== 'undefined') {
        const radiusKm = radiusMeters / 1000;
        const subset = features.slice(0, 150); // limit to 150 features for smooth rendering

        subset.forEach(f => {
          const turfFeature = geoJsonFormat.writeFeatureObject(f, {
            featureProjection: 'EPSG:3857',
            dataProjection: 'EPSG:4326'
          });

          const buffered = turf.buffer(turfFeature, radiusKm, { units: 'kilometers' });
          if (buffered) {
            const olBuffered = geoJsonFormat.readFeature(buffered, {
              dataProjection: 'EPSG:4326',
              featureProjection: 'EPSG:3857'
            });
            this.analysisSource.addFeature(olBuffered);
            totalBufferArea += ol.sphere.getArea(olBuffered.getGeometry());
          }
        });
      } else {
        const extent = layer.getSource().getExtent();
        const bufferedExtent = ol.extent.buffer(extent, radiusMeters * 1.5);
        const polygon = ol.geom.Polygon.fromExtent(bufferedExtent);
        const f = new ol.Feature(polygon);
        this.analysisSource.addFeature(f);
        totalBufferArea = ol.sphere.getArea(polygon);
      }

      this.mapEngine.zoomTo(this.analysisSource.getExtent());

      if (resultsBox) {
        resultsBox.innerHTML = `
          <div style="font-weight:700; color:var(--dc-orange-primary); margin-bottom:6px; display:flex; align-items:center; gap:6px;">
            <i class="lucide-check-circle"></i> Buffer Calculado com Sucesso
          </div>
          <div class="results-metric-row">
            <span>Raio da Faixa:</span>
            <strong>${radiusMeters} metros</strong>
          </div>
          <div class="results-metric-row">
            <span>Feições Abrangidas:</span>
            <strong>${Math.min(features.length, 150)} trechos</strong>
          </div>
          <div class="results-metric-row">
            <span>Área da Faixa de Segurança:</span>
            <strong>${formatArea(totalBufferArea)}</strong>
          </div>
        `;
        resultsBox.classList.add('active');
      }

      Notification.success(`Buffer de ${radiusMeters}m gerado com sucesso!`);
    } catch (err) {
      console.error('[SpatialAnalysis] Erro no cálculo de buffer:', err);
      Notification.error('Erro ao calcular o buffer espacial.');
    }
  }

  /**
   * Calculates flood disaster intersection and affected population matrix with CSV download
   */
  async executeFloodIntersectAnalysis() {
    const resultsBox = document.getElementById('analysis-flood-results');
    Notification.info('Cruzando mancha de inundação 2024 com setores censitários e bairros...');

    try {
      await this.layerManager.loadLayerData('areas_enchente_2024');
      await this.layerManager.loadLayerData('bairros');
      await this.layerManager.loadLayerData('setores_censitarios');

      const floodLayer = this.layerManager.getLayer('areas_enchente_2024');
      const bairrosLayer = this.layerManager.getLayer('bairros');
      const setoresLayer = this.layerManager.getLayer('setores_censitarios');

      const floodFeatures = floodLayer.getSource().getFeatures();
      const bairrosFeatures = bairrosLayer.getSource().getFeatures();
      const setoresFeatures = setoresLayer.getSource().getFeatures();

      if (floodFeatures.length === 0) {
        Notification.warning('Camada de áreas de enchente não carregada.');
        return;
      }

      const floodGeom = floodFeatures[0].getGeometry();
      const floodExtent = floodGeom.getExtent();
      const floodAreaSqM = ol.sphere.getArea(floodGeom);

      // Find intersecting Bairros
      const affectedBairros = [];
      let totalPopInAffectedBairros = 0;

      bairrosFeatures.forEach(b => {
        const bGeom = b.getGeometry();
        if (ol.extent.intersects(floodExtent, bGeom.getExtent())) {
          const name = b.get('Descri____') || b.get('Name');
          const cleanName = name.replace(/^Região do Bairro\s*/i, '').replace(/<[^>]*>/g, '');
          const pop = parseInt(b.get('Pop_2022'), 10) || 0;
          affectedBairros.push({ name: cleanName, pop, rawName: name });
          totalPopInAffectedBairros += pop;
        }
      });

      // Find intersecting Census Sectors
      const affectedSectors = [];
      let estimatedPopInSectors = 0;
      let estimatedDomInSectors = 0;

      setoresFeatures.forEach(s => {
        const sGeom = s.getGeometry();
        if (ol.extent.intersects(floodExtent, sGeom.getExtent())) {
          const cd = s.get('CD_SETOR');
          const p = parseInt(s.get('V0001'), 10) || 0;
          const d = parseInt(s.get('V0002'), 10) || 0;
          const dist = s.get('NM_DIST') || 'Passo Fundo';
          affectedSectors.push({ cd, p, d, dist });
          estimatedPopInSectors += p;
          estimatedDomInSectors += d;
        }
      });

      this.lastAnalysisData = {
        floodAreaKm2: floodAreaSqM / 1000000,
        floodAreaHa: floodAreaSqM / 10000,
        affectedBairros,
        affectedSectors,
        estimatedPopInSectors,
        estimatedDomInSectors
      };

      // Highlight flood area on map
      this.analysisSource.clear();
      this.analysisSource.addFeature(floodFeatures[0].clone());
      this.mapEngine.zoomTo(floodExtent);

      if (resultsBox) {
        resultsBox.innerHTML = `
          <div style="font-weight:700; color:var(--dc-hazard-red); margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <div style="display:flex; align-items:center; gap:6px;">
              <i class="lucide-alert-triangle"></i> Diagnóstico de Impacto - Enchente 2024
            </div>
            <button id="btn-export-analysis-csv" class="mini-btn" style="color:#fff; background:var(--dc-hazard-red); border:none;" title="Baixar tabela em formato CSV">
              <i class="lucide-download"></i> CSV
            </button>
          </div>

          <div class="results-metric-row">
            <span>Mancha de Inundação:</span>
            <strong>${formatArea(floodAreaSqM)}</strong>
          </div>
          <div class="results-metric-row">
            <span>Setores Censitários no Perímetro:</span>
            <strong>${affectedSectors.length} setores</strong>
          </div>
          <div class="results-metric-row">
            <span>População Potencialmente Exposta:</span>
            <strong>${formatNumber(estimatedPopInSectors, 0)} habitantes</strong>
          </div>
          <div class="results-metric-row">
            <span>Domicílios no Entorno/Risco:</span>
            <strong>${formatNumber(estimatedDomInSectors, 0)} domicílios</strong>
          </div>
          <div class="results-metric-row">
            <span>Regiões/Bairros Atingidos:</span>
            <strong>${affectedBairros.length} regiões urbanas</strong>
          </div>

          <div style="margin-top:8px; padding-top:6px; border-top:1px dashed var(--dc-blue-border); font-size:11px; color:var(--text-muted);">
            <strong>Principais Regiões Abrangidas:</strong>
            <ul style="margin:4px 0 0 16px; list-style-type:square;">
              ${affectedBairros.slice(0, 5).map(b => `<li>${b.name} (${formatNumber(b.pop, 0)} hab)</li>`).join('')}
            </ul>
          </div>
        `;
        resultsBox.classList.add('active');

        // Bind CSV Export Button
        const csvBtn = resultsBox.querySelector('#btn-export-analysis-csv');
        if (csvBtn) {
          csvBtn.addEventListener('click', () => {
            this.exportAnalysisToCsv();
          });
        }
      }

      Notification.success('Diagnóstico de impacto processado!');
    } catch (err) {
      console.error('[SpatialAnalysis] Erro no cruzamento de enchentes:', err);
      Notification.error('Erro ao executar diagnóstico de impacto.');
    }
  }

  /**
   * Export last analysis result to CSV spreadsheet file
   */
  exportAnalysisToCsv() {
    if (!this.lastAnalysisData) return;

    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'TIPO,IDENTIFICADOR,POPULACAO_2022,DOMICILIOS,DISTRITO\n';

    this.lastAnalysisData.affectedBairros.forEach(b => {
      csvContent += `BAIRRO,"${b.name}",${b.pop},,"Passo Fundo"\n`;
    });

    this.lastAnalysisData.affectedSectors.forEach(s => {
      csvContent += `SETOR_CENSITARIO,"${s.cd}",${s.p},${s.d},"${s.dist}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DefesaCivil_PassoFundo_Impacto_Enchente_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();

    Notification.success('Planilha CSV baixada com sucesso!');
  }

  clearAnalysis() {
    this.analysisSource.clear();
    this.lastAnalysisData = null;
    const bResults = document.getElementById('analysis-buffer-results');
    const fResults = document.getElementById('analysis-flood-results');
    if (bResults) bResults.classList.remove('active');
    if (fResults) fResults.classList.remove('active');
    Notification.info('Análise espacial limpa.');
  }
}
