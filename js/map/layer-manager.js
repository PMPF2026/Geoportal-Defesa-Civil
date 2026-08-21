/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Advanced Vector Layer Manager, Symbology & Canvas Pattern Engine
 */

import { LAYERS_CONFIG, LAYER_GROUPS } from '../config/layers.config.js';
import { loadGeoJson } from '../utils/async-loader.js';
import { EPSG_UTM22S, EPSG_WEBMERCATOR } from '../utils/projection.js';

export class LayerManager {
  constructor(mapEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    
    // Map of layerId -> ol.layer.Vector
    this.layers = new Map();
    // Map of layerId -> Config Object
    this.configs = new Map();
    // Custom user-imported layers
    this.customLayers = new Map();

    // Reusable canvas patterns
    this.hazardPattern = this.createHazardPattern();

    // GeoJSON format reader configured for EPSG:31982 to EPSG:3857
    this.geoJsonFormat = new ol.format.GeoJSON({
      dataProjection: EPSG_UTM22S,
      featureProjection: EPSG_WEBMERCATOR
    });

    // Listeners for layer load events
    this.loadCallbacks = [];
  }

  /**
   * Generates a diagonal hazard stripe pattern on an offscreen canvas
   */
  createHazardPattern() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(0, 0, 16, 16);

    ctx.strokeStyle = 'rgba(185, 28, 28, 0.7)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 16);
    ctx.lineTo(16, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, -4);
    ctx.moveTo(12, 20);
    ctx.lineTo(20, 12);
    ctx.stroke();

    return ctx.createPattern(canvas, 'repeat');
  }

  /**
   * Register a callback when a layer finishes loading
   */
  onLayerLoaded(cb) {
    this.loadCallbacks.push(cb);
  }

  /**
   * Initialize all registered thematic layers
   */
  async initLayers() {
    console.log('[LayerManager] Registrando camadas temáticas institucionais...');

    for (const config of LAYERS_CONFIG) {
      this.configs.set(config.id, config);

      // Tratamento para camadas Raster / Ortofotos (Web XYZ Tiles)
      if (config.isXYZTiles || config.tileUrl) {
        const xyzSource = new ol.source.XYZ({
          url: config.tileUrl,
          minZoom: config.minZoom || 13,
          maxZoom: config.maxZoom || 19,
          crossOrigin: 'anonymous',
          wrapX: false
        });

        const rasterLayer = new ol.layer.Tile({
          source: xyzSource,
          visible: config.defaultVisible,
          opacity: config.defaultOpacity || 1,
          zIndex: config.zIndex || 5 // Acima do mapa-base (0) e estritamente abaixo de todos os vetores (10-75)
        });

        rasterLayer.set('layerId', config.id);
        rasterLayer.set('layerConfig', config);
        rasterLayer.set('isThematicLayer', true);
        rasterLayer.set('isRaster', true);

        this.map.addLayer(rasterLayer);
        this.layers.set(config.id, rasterLayer);
        continue;
      }

      // Tratamento legado para GeoTIFFs individuais diretos
      if (config.isGeoTIFF) {
        let rasterLayer;
        try {
          if (ol.source && ol.source.GeoTIFF && ol.layer && ol.layer.WebGLTile) {
            const geotiffSource = new ol.source.GeoTIFF({
              sources: config.files.map(f => ({
                url: f,
                bands: [1, 2, 3]
              })),
              convertToRGB: true,
              normalize: false
            });

            rasterLayer = new ol.layer.WebGLTile({
              source: geotiffSource,
              visible: config.defaultVisible,
              opacity: config.defaultOpacity || 1,
              zIndex: config.zIndex || 5
            });
          }
        } catch (err) {
          console.warn('[LayerManager] WebGLTile GeoTIFF fallback:', err);
        }

        if (!rasterLayer) {
          rasterLayer = new ol.layer.Group({
            visible: config.defaultVisible,
            opacity: config.defaultOpacity || 1,
            zIndex: config.zIndex || 5
          });
        }

        rasterLayer.set('layerId', config.id);
        rasterLayer.set('layerConfig', config);
        rasterLayer.set('isThematicLayer', true);
        rasterLayer.set('isRaster', true);

        this.map.addLayer(rasterLayer);
        this.layers.set(config.id, rasterLayer);
        continue;
      }

      const vectorSource = new ol.source.Vector();
      const styleFunction = this.createLayerStyle(config);

      // Create Vector Layer with optimized rendering
      const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        visible: config.defaultVisible,
        opacity: config.defaultOpacity || 1,
        zIndex: config.zIndex || 10,
        style: styleFunction,
        // High-performance image rendering mode for heavy layers
        renderMode: config.isLazy || config.id === 'malha_hidrica' ? 'image' : 'vector'
      });

      vectorLayer.set('layerId', config.id);
      vectorLayer.set('layerConfig', config);
      vectorLayer.set('isThematicLayer', true);

      this.map.addLayer(vectorLayer);
      this.layers.set(config.id, vectorLayer);

      // Eagerly load core layers (Território, Enchente 2024, Bairros, Distritos)
      if (config.defaultVisible && !config.isLazy) {
        this.loadLayerData(config.id).catch(err => {
          console.error(`[LayerManager] Falha ao carregar camada inicial ${config.id}:`, err);
        });
      }
    }
  }

  /**
   * Load GeoJSON data into layer vector source with automatic CRS reprojection
   */
  async loadLayerData(layerId, onProgress = null) {
    const config = this.configs.get(layerId);
    const layer = this.layers.get(layerId);
    if (!config || !layer) return;

    const source = layer.getSource();
    if (source.getFeatures().length > 0) {
      return layer; // Data already loaded in memory
    }

    try {
      console.log(`[LayerManager] Carregando '${config.name}' (${config.fileName})...`);
      
      const geoJsonData = await loadGeoJson(config.fileName, onProgress);
      const features = this.geoJsonFormat.readFeatures(geoJsonData);

      // Tag features with layer metadata for popup/identification
      features.forEach(f => {
        f.set('_layerId', config.id);
        f.set('_layerName', config.name);
      });

      source.addFeatures(features);
      console.log(`[LayerManager] ✓ '${config.name}' carregada com ${features.length} feições.`);

      // Dispatch callbacks
      this.loadCallbacks.forEach(cb => cb(config.id, features.length, config, features));
      return layer;
    } catch (error) {
      console.error(`[LayerManager] ✗ Erro ao carregar camada '${config.name}':`, error);
      throw error;
    }
  }

  /**
   * Toggle visibility of a thematic layer
   */
  async setLayerVisibility(layerId, visible) {
    const layer = this.layers.get(layerId);
    if (!layer) return;

    const config = this.configs.get(layerId);
    if (visible && config && !config.isRaster) {
      await this.loadLayerData(layerId);
    }
    layer.setVisible(visible);
  }

  /**
   * Set opacity of a thematic layer (0.0 to 1.0)
   */
  setLayerOpacity(layerId, opacity) {
    const layer = this.layers.get(layerId);
    if (layer) {
      layer.setOpacity(Math.max(0, Math.min(1, opacity)));
    }
  }

  /**
   * Apply an operational scenario / preset
   */
  async applyPreset(preset) {
    console.log(`[LayerManager] Aplicando cenário: ${preset.name}`);
    for (const config of LAYERS_CONFIG) {
      const shouldBeVisible = preset.activeLayers.includes(config.id);
      const cb = document.querySelector(`.layer-checkbox[data-layer-id="${config.id}"]`);
      if (cb) cb.checked = shouldBeVisible;
      await this.setLayerVisibility(config.id, shouldBeVisible);
    }
  }

  /**
   * Zoom map to extent of a specific layer
   */
  async zoomToLayer(layerId) {
    const layer = this.layers.get(layerId);
    const config = this.configs.get(layerId);
    if (!layer || !config) return;

    if (config.isRaster && config.extent) {
      const extent3857 = ol.proj.transformExtent(config.extent, 'EPSG:31982', 'EPSG:3857');
      this.mapEngine.zoomTo(extent3857);
      return;
    }

    await this.loadLayerData(layerId);
    const source = layer.getSource();
    if (source && source.getExtent) {
      const extent = source.getExtent();
      if (extent && !ol.extent.isEmpty(extent)) {
        this.mapEngine.zoomTo(extent);
      }
    }
  }

  /**
   * Create advanced cartographic styling for a layer
   */
  createLayerStyle(config) {
    const s = config.style || {};

    // 1. Defesa Civil: Áreas de Enchente com padrão de hachura diagonal de perigo
    if (config.id === 'areas_enchente_2024') {
      return new ol.style.Style({
        fill: new ol.style.Fill({
          color: this.hazardPattern || 'rgba(239, 68, 68, 0.45)'
        }),
        stroke: new ol.style.Stroke({
          color: '#dc2626',
          width: 3
        })
      });
    }

    // 2. Hidrografia: Espessura hierárquica por ordem de Strahler
    if (config.id === 'malha_hidrica') {
      return (feature) => {
        const ordem = parseInt(feature.get('ordem'), 10) || 1;
        const width = ordem >= 3 ? 1.8 : (ordem === 2 ? 1.2 : 0.8);
        const color = ordem >= 3 ? '#0284c7' : (ordem === 2 ? '#38bdf8' : '#7dd3fc');

        return new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: color,
            width: width
          })
        });
      };
    }

    // 3. Rodovias (Federal / Estadual): Dual Casing Style (Padrão Cartográfico Oficial)
    if (config.isHighway) {
      const isFederal = config.highwayType === 'BR';
      const mainColor = isFederal ? '#dc2626' : '#ea580c';
      const mainWidth = isFederal ? 2.2 : 1.8;
      const casingWidth = isFederal ? 3.6 : 3.0;

      return [
        // Linha externa (casing branco de contraste)
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: '#ffffff',
            width: casingWidth
          })
        }),
        // Linha interna principal
        new ol.style.Style({
          stroke: new ol.style.Stroke({
            color: mainColor,
            width: mainWidth
          })
        })
      ];
    }

    // 4. Ferrovia (Linha Férrea com dormentes)
    if (config.isRailway) {
      return [
        new ol.style.Style({
          stroke: new ol.style.Stroke({ color: '#1e293b', width: 2.6 })
        }),
        new ol.style.Style({
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 1.2, lineDash: [6, 6] })
        })
      ];
    }

    // 5. Distritos e Pontos Especializados (Residências em APP e Abrigos da Defesa Civil)
    if (config.id === 'edificacoes_app') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: s.pointRadius || 6,
          fill: new ol.style.Fill({ color: s.pointColor || '#ea580c' }),
          stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: 2.0 })
        })
      });
    }

    if (config.id === 'abrigos_defesa_civil') {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: s.pointRadius || 7,
          fill: new ol.style.Fill({ color: s.pointColor || '#2563eb' }),
          stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: 2.2 })
        })
      });
    }

    if (config.geometryType === 'Point') {
      return (feature, resolution) => {
        const name = feature.get('nome') || '';
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: s.pointRadius || 8,
            fill: new ol.style.Fill({ color: s.pointColor || '#dc2626' }),
            stroke: new ol.style.Stroke({ color: s.strokeColor || '#ffffff', width: 2.5 })
          }),
          text: new ol.style.Text({
            text: name,
            offsetY: -16,
            font: 'bold 12px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#0f172a', width: 3.5 }),
            backgroundFill: new ol.style.Fill({ color: 'rgba(15, 23, 42, 0.85)' }),
            padding: [3, 7, 3, 7]
          })
        });
      };
    }


    // 6. Bairros e Regiões Urbanas (com rótulos dinâmicos a partir de zoom 12)
    if (config.id === 'bairros') {
      return (feature, resolution) => {
        // resolution ~19 corresponds to zoom 13+
        const showLabel = resolution < 40;
        let textStyle = null;

        if (showLabel) {
          const rawName = feature.get('Descri____') || feature.get('Name') || '';
          const cleanName = rawName.replace(/^Região do Bairro\s*/i, '').split(' e ')[0];

          textStyle = new ol.style.Text({
            text: cleanName,
            font: 'bold 11px "Inter", sans-serif',
            fill: new ol.style.Fill({ color: '#ffffff' }),
            stroke: new ol.style.Stroke({ color: '#064e3b', width: 3 }),
            overflow: false
          });
        }

        return new ol.style.Style({
          fill: new ol.style.Fill({ color: s.fillColor || 'rgba(16, 185, 129, 0.15)' }),
          stroke: new ol.style.Stroke({ color: s.strokeColor || '#059669', width: 1.6 }),
          text: textStyle
        });
      };
    }

    // 7. Mapa Coroplético (Densidade Populacional)
    if (config.isChoropleth && config.choroplethBreaks) {
      return (feature) => {
        const val = parseFloat(feature.get(config.choroplethField)) || 0;
        let fillColor = 'rgba(254, 240, 217, 0.75)';

        for (const item of config.choroplethBreaks) {
          if (val <= item.max) {
            fillColor = item.color;
            break;
          }
        }

        return new ol.style.Style({
          fill: new ol.style.Fill({ color: fillColor }),
          stroke: new ol.style.Stroke({ color: s.strokeColor || '#991b1b', width: 0.8 })
        });
      };
    }

    // 8. Padrão genérico
    return new ol.style.Style({
      fill: s.fillColor ? new ol.style.Fill({ color: s.fillColor }) : undefined,
      stroke: new ol.style.Stroke({
        color: s.strokeColor || '#3b82f6',
        width: s.strokeWidth || 2,
        lineDash: s.strokeDash || undefined
      })
    });
  }

  /**
   * Imports and injects a custom GeoJSON layer on the fly (Drag & Drop / Operator tool)
   */
  addCustomGeoJsonLayer(layerName, geoJsonData, color = '#ff7800') {
    const customId = `custom_${Date.now()}`;
    const source = new ol.source.Vector();

    // Check if CRS is EPSG:31982 or standard WGS84
    let features;
    if (geoJsonData.crs && geoJsonData.crs.properties && geoJsonData.crs.properties.name && geoJsonData.crs.properties.name.includes('31982')) {
      features = this.geoJsonFormat.readFeatures(geoJsonData);
    } else {
      features = new ol.format.GeoJSON().readFeatures(geoJsonData, {
        dataProjection: 'EPSG:4326',
        featureProjection: 'EPSG:3857'
      });
    }

    features.forEach(f => {
      f.set('_layerId', customId);
      f.set('_layerName', layerName);
    });

    source.addFeatures(features);

    const layer = new ol.layer.Vector({
      source: source,
      zIndex: 70,
      style: new ol.style.Style({
        fill: new ol.style.Fill({ color: 'rgba(255, 120, 0, 0.25)' }),
        stroke: new ol.style.Stroke({ color: color, width: 2.5 }),
        image: new ol.style.Circle({
          radius: 7,
          fill: new ol.style.Fill({ color: color }),
          stroke: new ol.style.Stroke({ color: '#ffffff', width: 2 })
        })
      })
    });

    layer.set('layerId', customId);
    layer.set('layerName', layerName);
    layer.set('isThematicLayer', true);
    layer.set('isCustomLayer', true);

    this.map.addLayer(layer);
    this.customLayers.set(customId, layer);

    // Zoom to layer
    this.mapEngine.zoomTo(source.getExtent());

    return { id: customId, name: layerName, featureCount: features.length };
  }

  getLayer(layerId) {
    return this.layers.get(layerId) || this.customLayers.get(layerId);
  }

  getConfig(layerId) {
    return this.configs.get(layerId);
  }
}
