/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Enhanced Contextual Feature Popup with Multi-Feature Pagination & Actions
 */

import { formatNumber, formatArea, formatDistance, escapeHtml } from '../utils/formatters.js';
import { toUTM22S } from '../utils/projection.js';
import { Notification } from './notification.js';

export class PopupUI {
  constructor(mapEngine, layerManager) {
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.popupOverlay = mapEngine.popupOverlay;
    
    this.popupContainer = document.getElementById('popup');
    this.closerBtn = document.getElementById('popup-closer');
    this.contentEl = document.getElementById('popup-content');
    
    this.featureList = [];
    this.currentIndex = 0;
    this.lastCoordinate = null;

    this.init();
  }

  init() {
    if (this.closerBtn) {
      this.closerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.close();
      });
    }
  }

  close() {
    this.mapEngine.closePopup();
    this.featureList = [];
    this.currentIndex = 0;
  }

  /**
   * Display popup for a list of features at clicked location
   * @param {Array<{feature: ol.Feature, layerConfig: Object}>} features 
   * @param {Array<number>} coordinate 
   */
  showMultiFeatures(features, coordinate) {
    if (!features || features.length === 0 || !this.contentEl) return;

    this.featureList = features;
    this.currentIndex = 0;
    this.lastCoordinate = coordinate;

    this.renderCurrentFeature();
    this.popupOverlay.setPosition(coordinate);
  }

  /**
   * Display single feature
   */
  showPopupForFeature(feature, layerConfig, coordinate) {
    this.showMultiFeatures([{ feature, layerConfig }], coordinate);
  }

  renderCurrentFeature() {
    if (this.featureList.length === 0) return;

    const currentItem = this.featureList[this.currentIndex];
    const feature = currentItem.feature;
    const layerConfig = currentItem.layerConfig || { name: feature.get('_layerName') || 'Camada' };
    const props = feature.getProperties();
    const pConfig = layerConfig.popupConfig || {};

    // 1. Determine Title
    let title = pConfig.defaultTitle || layerConfig.name;
    if (pConfig.titleField && props[pConfig.titleField]) {
      const prefix = pConfig.titlePrefix || '';
      title = `${prefix}${props[pConfig.titleField]}`;
    }

    // 2. Tag Class
    let tagClass = 'tag-defesa-civil';
    if (layerConfig.group === 'abrigos_cobertura') tagClass = 'tag-abrigos';
    if (layerConfig.group === 'hidrografia') tagClass = 'tag-hidrografia';
    if (layerConfig.group === 'sistema_viario') tagClass = 'tag-viario';
    if (layerConfig.group === 'divisao_territorial') tagClass = 'tag-territorial';
    if (layerConfig.group === 'planejamento_urbano') tagClass = 'tag-planejamento';
    if (layerConfig.group === 'populacao') tagClass = 'tag-populacao';

    // 3. Multi-feature pagination header if > 1 feature
    let paginationHtml = '';
    if (this.featureList.length > 1) {
      paginationHtml = `
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.2); padding:4px 8px; border-radius:4px; margin-bottom:6px; font-size:11px; color:var(--text-muted);">
          <span>Feição <strong>${this.currentIndex + 1}</strong> de <strong>${this.featureList.length}</strong></span>
          <div style="display:flex; gap:4px;">
            <button class="popup-nav-btn" id="btn-popup-prev" ${this.currentIndex === 0 ? 'disabled' : ''} style="background:var(--dc-blue-border); color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">&lt;</button>
            <button class="popup-nav-btn" id="btn-popup-next" ${this.currentIndex === this.featureList.length - 1 ? 'disabled' : ''} style="background:var(--dc-blue-border); color:#fff; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">&gt;</button>
          </div>
        </div>
      `;
    }

    // 4. Build Attribute Rows
    let rowsHtml = '';
    const fieldsToRender = pConfig.fields || Object.keys(props).filter(k => !k.startsWith('_') && k !== 'geometry').map(k => ({ key: k, label: k }));

    fieldsToRender.forEach(field => {
      let val = props[field.key];
      
      // Se for o campo de distância e estiver vazio, calcular sob demanda
      if ((field.key === 'dist_rio_m' || field.format === 'distance_m') && (val === undefined || val === null || val === '')) {
        const computed = this.computeDistanceToRio(feature);
        if (computed !== null) {
          val = computed;
          props['dist_rio_m'] = computed;
        }
      }

      if (val === undefined || val === null || val === '') return;

      // Destaque visual para Distância até a calha do Rio Passo Fundo (1 casa decimal)
      if (field.key === 'dist_rio_m' || field.format === 'distance_m') {
        const num = parseFloat(val);
        const distStr = !isNaN(num) ? `${formatNumber(num, 1)} m` : escapeHtml(String(val));
        rowsHtml += `
          <tr style="background: rgba(234, 88, 12, 0.15); border-left: 3px solid #ea580c;">
            <th style="color: #fdba74; font-weight: 700;">${escapeHtml(field.label)}</th>
            <td style="font-weight: 800; color: #ffffff; font-size: 13px;">
              <span style="background: #ea580c; color: #ffffff; padding: 2px 8px; border-radius: 4px; display: inline-block;">${distStr}</span>
            </td>
          </tr>
        `;
        return;
      }

      // Destaque para Faixa de Risco
      if (field.key === 'faixa_dist') {
        rowsHtml += `
          <tr style="background: rgba(245, 158, 11, 0.10);">
            <th style="color: #fcd34d; font-weight: 700;">${escapeHtml(field.label)}</th>
            <td style="font-weight: 700; color: #fef08a;">${escapeHtml(String(val))}</td>
          </tr>
        `;
        return;
      }

      let formattedVal = escapeHtml(String(val));

      if (field.format === 'number') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatNumber(num);
      } else if (field.format === 'currency') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = `R$ ${formatNumber(num, 2)}`;
      } else if (field.format === 'area') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatArea(num);
      } else if (field.format === 'distance') {
        const num = parseFloat(val);
        if (!isNaN(num)) formattedVal = formatDistance(num);
      }

      rowsHtml += `
        <tr>
          <th>${escapeHtml(field.label)}</th>
          <td>${formattedVal}</td>
        </tr>
      `;
    });

    // 5. Build HTML
    this.contentEl.innerHTML = `
      <div class="popup-header">
        ${paginationHtml}
        <div class="popup-layer-tag ${tagClass}">
          <i class="lucide-layers" style="font-size:10px;"></i>
          <span>${escapeHtml(layerConfig.name)}</span>
        </div>
        <div class="popup-title">${escapeHtml(title)}</div>
      </div>
      
      <div class="popup-body">
        <table class="popup-props-table">
          <tbody>
            ${rowsHtml || '<tr><td colspan="2" style="color:var(--text-muted);">Sem atributos adicionais.</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="popup-actions">
        ${(layerConfig.id === 'estacao_dcrs00016' || props['estacao_cod'] === 'DCRS-00016') ? `
          <button class="popup-action-btn" id="btn-popup-view-weather" style="background: rgba(2, 132, 199, 0.22); color: #38bdf8; border-color: #0284c7; font-weight:700;" title="Ver monitoramento completo na Central Meteorológica">
            <i class="lucide-activity"></i> Ver Central
          </button>
        ` : ''}
        <button class="popup-action-btn" id="btn-popup-zoom" title="Aproximar para esta feição">
          <i class="lucide-zoom-in"></i> Zoom
        </button>
        <button class="popup-action-btn" id="btn-popup-streetview" title="Visualizar no Google Street View">
          <i class="lucide-eye"></i> Street View
        </button>
        <button class="popup-action-btn" id="btn-popup-copy" title="Copiar informações para a área de transferência">
          <i class="lucide-copy"></i> Copiar
        </button>
      </div>
    `;

    // Highlight current feature
    this.mapEngine.setHighlight(feature);

    // Bind Pagination Buttons
    const prevBtn = this.contentEl.querySelector('#btn-popup-prev');
    const nextBtn = this.contentEl.querySelector('#btn-popup-next');
    if (prevBtn) {
      prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentIndex > 0) {
          this.currentIndex--;
          this.renderCurrentFeature();
        }
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.currentIndex < this.featureList.length - 1) {
          this.currentIndex++;
          this.renderCurrentFeature();
        }
      });
    }

    // Bind Action Buttons
    const weatherBtn = this.contentEl.querySelector('#btn-popup-view-weather');
    if (weatherBtn) {
      weatherBtn.addEventListener('click', () => {
        if (window.webGis && window.webGis.sidebarUI) {
          window.webGis.sidebarUI.switchTab('weather');
        } else if (window.sidebarUI) {
          window.sidebarUI.switchTab('weather');
        }
      });
    }

    const zoomBtn = this.contentEl.querySelector('#btn-popup-zoom');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => {
        const geom = feature.getGeometry();
        this.mapEngine.zoomTo(geom.getExtent(), { maxZoom: geom.getType() === 'Point' ? 16 : 15 });
      });
    }

    const svBtn = this.contentEl.querySelector('#btn-popup-streetview');
    if (svBtn) {
      svBtn.addEventListener('click', () => {
        if (this.lastCoordinate) {
          const lonLat = ol.proj.toLonLat(this.lastCoordinate);
          const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${lonLat[1]},${lonLat[0]}`;
          window.open(url, '_blank');
        }
      });
    }

    const copyBtn = this.contentEl.querySelector('#btn-popup-copy');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const summary = `${layerConfig.name} - ${title}\n` + 
          fieldsToRender.map(f => `${f.label}: ${props[f.key] || '-'}`).join('\n');
        navigator.clipboard.writeText(summary).then(() => {
          Notification.success('Atributos copiados com sucesso!');
        });
      });
    }
  }

  /**
   * Calcula a menor distância métrica (SIRGAS 2000 UTM 22S) entre o ponto da residência
   * e a geometria principal do Rio Passo Fundo
   */
  computeDistanceToRio(feature) {
    try {
      const geom = feature.getGeometry();
      if (!geom) return null;
      let ptCoord;
      if (geom.getType() === 'Point') {
        ptCoord = geom.getCoordinates();
      } else {
        const extent = geom.getExtent();
        ptCoord = [ (extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2 ];
      }
      
      const rioLayer = this.layerManager ? this.layerManager.getLayer('rio_passo_fundo') : null;
      if (!rioLayer) return null;
      const rioFeatures = rioLayer.getSource().getFeatures();
      if (!rioFeatures || rioFeatures.length === 0) return null;

      let minDist = Infinity;
      for (const rf of rioFeatures) {
        const rGeom = rf.getGeometry();
        if (rGeom && typeof rGeom.getClosestPoint === 'function') {
          const closestPt = rGeom.getClosestPoint(ptCoord);
          const d = Math.hypot(ptCoord[0] - closestPt[0], ptCoord[1] - closestPt[1]);
          if (d < minDist) {
            minDist = d;
          }
        }
      }
      return minDist !== Infinity ? Math.round(minDist * 10) / 10 : null;
    } catch (e) {
      console.warn('[PopupUI] Erro ao calcular distância geométrica até o rio:', e);
      return null;
    }
  }
}
