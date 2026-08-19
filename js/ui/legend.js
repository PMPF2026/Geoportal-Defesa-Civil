/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Dynamic Thematic Legend Generator
 */

import { LAYERS_CONFIG, LAYER_GROUPS } from '../config/layers.config.js';

export class LegendUI {
  constructor(layerManager, containerId = 'legend-container') {
    this.layerManager = layerManager;
    this.container = document.getElementById(containerId);
    
    // Refresh legend when layers load or change visibility
    this.layerManager.onLayerLoaded(() => this.render());
  }

  /**
   * Render dynamic legend for all currently visible layers
   */
  render() {
    if (!this.container) return;

    const visibleLayers = LAYERS_CONFIG.filter(cfg => {
      const olLayer = this.layerManager.getLayer(cfg.id);
      return olLayer && olLayer.getVisible();
    });

    if (visibleLayers.length === 0) {
      this.container.innerHTML = `
        <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12.5px;">
          <i class="lucide-layers" style="font-size: 24px; margin-bottom: 8px; display: block; opacity: 0.5;"></i>
          Nenhuma camada temática está visível no momento.<br>
          Ative uma ou mais camadas no painel para visualizar a legenda.
        </div>
      `;
      return;
    }

    let html = '<div class="legend-list" style="display:flex; flex-direction:column; gap:12px;">';

    // Group visible layers by thematic group
    LAYER_GROUPS.forEach(group => {
      const groupVisibleLayers = visibleLayers.filter(l => l.group === group.id);
      if (groupVisibleLayers.length === 0) return;

      html += `
        <div class="legend-group" style="background: var(--dc-blue-card); border: 1px solid var(--dc-blue-border); border-radius: var(--radius-md); padding: 10px 12px;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: var(--text-muted); margin-bottom: 8px; letter-spacing: 0.5px;">
            ${group.title}
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
      `;

      groupVisibleLayers.forEach(layer => {
        html += this.generateLayerLegendItem(layer);
      });

      html += `
          </div>
        </div>
      `;
    });

    html += '</div>';
    this.container.innerHTML = html;
  }

  /**
   * Generates single layer legend entry HTML
   * @param {Object} layerConfig 
   * @returns {string}
   */
  generateLayerLegendItem(layerConfig) {
    // 1. Choropleth Legend Ramp (Densidade Populacional)
    if (layerConfig.isChoropleth && layerConfig.choroplethBreaks) {
      let rampHtml = `
        <div class="legend-item">
          <div style="font-size: 12px; font-weight: 600; color: var(--text-main); margin-bottom: 6px;">
            ${layerConfig.name}
          </div>
          <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 6px;">
      `;
      layerConfig.choroplethBreaks.forEach(b => {
        rampHtml += `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted);">
            <span style="display: inline-block; width: 18px; height: 12px; border-radius: 2px; background: ${b.color}; border: 1px solid rgba(255,255,255,0.2);"></span>
            <span>${b.label}</span>
          </div>
        `;
      });
      rampHtml += `</div></div>`;
      return rampHtml;
    }

    // 2. Railway Track Symbology
    if (layerConfig.isRailway) {
      return `
        <div class="legend-item" style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 24px; height: 10px; background: #1e293b; border-radius: 2px; position: relative; display: flex; align-items: center; justify-content: center;">
            <div style="width: 100%; height: 2px; background: #ffffff; border-top: 1px dashed #ffffff;"></div>
          </div>
          <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${layerConfig.name}</span>
        </div>
      `;
    }

    // 3. Point Symbology (Distritos)
    if (layerConfig.geometryType === 'Point') {
      const s = layerConfig.style || {};
      return `
        <div class="legend-item" style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 14px; height: 14px; border-radius: 50%; background: ${s.pointColor || '#dc2626'}; border: 2px solid ${s.strokeColor || '#ffffff'};"></span>
          <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${layerConfig.name}</span>
        </div>
      `;
    }

    // 4. LineString Symbology
    if (layerConfig.geometryType === 'MultiLineString' || layerConfig.geometryType === 'LineString') {
      const s = layerConfig.style || {};
      const borderStyle = s.strokeDash ? 'dashed' : 'solid';
      return `
        <div class="legend-item" style="display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 24px; height: 0px; border-top: ${s.strokeWidth || 2}px ${borderStyle} ${s.strokeColor || '#3b82f6'};"></span>
          <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${layerConfig.name}</span>
        </div>
      `;
    }

    // 5. Polygon Symbology
    const s = layerConfig.style || {};
    const borderStyle = s.strokeDash ? 'dashed' : 'solid';
    return `
      <div class="legend-item" style="display: flex; align-items: center; gap: 10px;">
        <span style="display: inline-block; width: 18px; height: 14px; border-radius: 3px; background: ${s.fillColor || 'rgba(59, 130, 246, 0.2)'}; border: ${s.strokeWidth || 1.5}px ${borderStyle} ${s.strokeColor || '#3b82f6'};"></span>
        <span style="font-size: 12px; font-weight: 600; color: var(--text-main);">${layerConfig.name}</span>
      </div>
    `;
  }
}
