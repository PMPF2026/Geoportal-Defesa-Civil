/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Downloads UI Controller: Catálogo de Dados Espaciais Temático em Accordion & Exportações (GeoJSON, CSV, KML, XLSX)
 */

import { LAYER_GROUPS, LAYERS_CONFIG } from '../config/layers.config.js';
import { Notification } from './notification.js';
import { ClimateExportExcel } from '../tools/climate-export-excel.js';

export const DOWNLOAD_THEMATIC_GROUPS = [
  {
    id: 'defesa_civil_emergencia',
    title: 'Defesa Civil & Estruturas de Emergência',
    shortTitle: 'Defesa Civil',
    iconName: 'shield-alert',
    layerIds: [
      'sede_defesa_civil',
      'abrigos_defesa_civil',
      'cobertura_abrigos_2km',
      'zph_helicoptero'
    ]
  },
  {
    id: 'risco_enchentes',
    title: 'Risco Hidrológico, Enchentes & SGB',
    shortTitle: 'Risco e Enchentes',
    iconName: 'alert-triangle',
    layerIds: [
      'areas_enchente_2024',
      'app_30metros',
      'edificacoes_app',
      'mapeamento_sgb_2025',
      'domicilios_risco_sgb_2025'
    ]
  },
  {
    id: 'hidrografia_clima',
    title: 'Hidrografia & Monitoramento Climático',
    shortTitle: 'Hidrografia',
    iconName: 'droplet',
    hasClimateExcel: true,
    layerIds: [
      'rio_passo_fundo',
      'malha_hidrica',
      'bacias_hidrograficas',
      'estacao_dcrs00016',
      'estacoes_plugfield'
    ]
  },
  {
    id: 'sistema_viario',
    title: 'Sistema Viário & Infraestrutura',
    shortTitle: 'Sistema Viário',
    iconName: 'navigation',
    layerIds: [
      'rodovia_federal',
      'rodovia_estadual',
      'estradas_municipais',
      'malha_viaria',
      'pontes',
      'ferrovia'
    ]
  },
  {
    id: 'censo_populacao',
    title: 'Censo Demográfico & População (IBGE 2022)',
    shortTitle: 'Censo e População',
    iconName: 'users',
    layerIds: [
      'setores_censitarios',
      'censo_pop_0a4',
      'censo_pop_5a9',
      'censo_pop_10a14',
      'censo_pop_15a19',
      'censo_pop_20a59',
      'censo_pop_m60',
      'censo_densidade_2022',
      'censo_renda_vulnerabilidade'
    ]
  },
  {
    id: 'divisao_territorial',
    title: 'Divisão Territorial & Planejamento Urbano',
    shortTitle: 'Divisão Territorial',
    iconName: 'map-pin',
    layerIds: [
      'limite_territorial',
      'bairros',
      'distritos',
      'limite_plano_diretor',
      'municipios_rs'
    ]
  }
];

export class DownloadsUI {
  constructor(layerManager) {
    this.layerManager = layerManager;
    this.container = document.getElementById('downloads-list-container');
    this.searchInput = document.getElementById('download-search-input');
    this.searchClearBtn = document.getElementById('download-search-clear');
    this.countBadge = document.getElementById('download-layers-count');
    this.pillsBar = document.getElementById('downloads-pills-bar');

    this.downloadableLayers = [];
    this.activeFilter = 'all';
    this.searchQuery = '';
    this.expandedGroups = new Set(); // Todos os grupos começam recolhidos por padrão (Accordion)

    this.init();
  }

  init() {
    this.prepareLayerCatalog();
    this.setupGlobalControls();
    this.setupSearch();
    this.render();
  }

  /**
   * Prepara o catálogo oficial das camadas com descrições curadas,
   * classificação temática e metadados institucionais.
   */
  prepareLayerCatalog() {
    const descriptions = {
      'sede_defesa_civil': 'Ponto de localização geográfica da Sede Oficial da Defesa Civil de Passo Fundo/RS com endereço e coordenadas UTM.',
      'abrigos_defesa_civil': '17 locais e ginásios públicos cadastrados pela Defesa Civil para acolhimento de emergência em desastres climáticos.',
      'cobertura_abrigos_2km': 'Área de influência e cobertura territorial de 2 km ao redor dos 17 abrigos da Defesa Civil.',
      'zph_helicoptero': '9 Zonas de Pouso de Helicóptero (ZPH) cadastradas para pouso de emergência e resgate aéreo da Defesa Civil.',
      'areas_enchente_2024': 'Mancha oficial de inundação do evento hidrológico extremo de Maio/2024 (Decreto Estadual 57.600/2024 - ADA).',
      'app_30metros': 'Faixa de Proteção Permanente (APP) de 30 metros ao longo do Rio Passo Fundo (Lei Federal 12.651/2012).',
      'edificacoes_app': '318 edificações residenciais e comerciais localizadas dentro da Faixa de 30 metros com distâncias métricas ao rio.',
      'mapeamento_sgb_2025': '25 polígonos de setores de risco geológico e hidrológico alto e muito alto (R3 e R4) mapeados pelo Serviço Geológico do Brasil (SGB, 2025).',
      'domicilios_risco_sgb_2025': 'Mapeamento de 1.115 domicílios em setores de risco geológico e hidrológico realizado pelo Serviço Geológico do Brasil (SGB, 2025).',
      'rio_passo_fundo': 'Traçado vetorial do curso d’água principal do Rio Passo Fundo em sua travessia pelo perímetro urbano e rural.',
      'malha_hidrica': 'Rede hidrográfica com mais de 3.600 trechos de rios, arroios e córregos de Passo Fundo com ordem de Strahler.',
      'bacias_hidrograficas': 'Divisores topográficos e delimitação das microbacias hidrográficas do município.',
      'estacao_dcrs00016': 'Estação Hidrometeorológica Telemétrica Oficial DCRS-00016 da Defesa Civil Estadual instalada no Rio Passo Fundo.',
      'estacoes_plugfield': 'Rede Municipal com 16 estações meteorológicas telemétricas Plugfield instaladas pela Defesa Civil no município.',
      'rodovia_federal': 'Eixos e trechos das rodovias federais (BR-285 e BR-153) que cruzam o território municipal (DNIT).',
      'rodovia_estadual': 'Malha rodoviária estadual asfaltada e pavimentada de Passo Fundo (ERS-135, ERS-324, ERS-153 - DAER).',
      'estradas_municipais': 'Malha de estradas vicinais e acessos rurais do interior de Passo Fundo.',
      'malha_viaria': 'Malha completa de logradouros, ruas e avenidas urbanas do município de Passo Fundo.',
      'pontes': 'Mapeamento das pontes e transposições sobre cursos d’água no sistema viário municipal.',
      'ferrovia': 'Traçado da linha férrea e malha ferroviária operacional concedida (ANTT / Rumo Logística).',
      'setores_censitarios': 'Malha territorial oficial consolidada dos 321 setores censitários do IBGE com dados demográficos, domicílios e renda (Censo 2022).',
      'censo_pop_0a4': 'Distribuição setorial da população de 0 a 4 anos (Primeira Infância) do Censo IBGE 2022.',
      'censo_pop_5a9': 'Distribuição setorial da população de 5 a 9 anos (Crianças) do Censo IBGE 2022.',
      'censo_pop_10a14': 'Distribuição setorial da população de 10 a 14 anos do Censo IBGE 2022.',
      'censo_pop_15a19': 'Distribuição setorial da população de 15 a 19 anos (Jovens) do Censo IBGE 2022.',
      'censo_pop_20a59': 'Distribuição setorial da população de 20 a 59 anos (Adultos) do Censo IBGE 2022.',
      'censo_pop_m60': 'Distribuição setorial da população idosa com 60 anos ou mais — Grupo Prioritário em Emergências (Censo IBGE 2022).',
      'censo_densidade_2022': 'Densidade demográfica setorial calculada em habitantes por km² (Censo IBGE 2022).',
      'censo_renda_vulnerabilidade': 'Vulnerabilidade Social e Rendimento Médio Domiciliar per capita por setor censitário (Censo IBGE 2022).',
      'limite_territorial': 'Polígono oficial do limite territorial e administrativo do município de Passo Fundo (IBGE 2022).',
      'bairros': 'Delimitação das regiões urbanas, vilas e bairros municipais com população residente do Censo 2022.',
      'distritos': 'Sedes dos distritos municipais de Passo Fundo (Sede, São Roque, Bom Recreio, Bela Vista, Capinzal, Sede Independência e Pulador).',
      'limite_plano_diretor': 'Perímetro e zoneamento urbano oficial do Plano Diretor Municipal de Passo Fundo.',
      'municipios_rs': 'Malha territorial dos 7 municípios limítrofes que fazem fronteira com Passo Fundo (IBGE).'
    };

    const layerMetaMap = {};
    DOWNLOAD_THEMATIC_GROUPS.forEach(group => {
      group.layerIds.forEach(id => {
        layerMetaMap[id] = {
          groupId: group.id,
          groupTitle: group.title
        };
      });
    });

    this.downloadableLayers = LAYERS_CONFIG
      .filter(l => !l.isRaster && l.fileName && l.fileName.endsWith('.geojson'))
      .map(l => {
        const meta = layerMetaMap[l.id] || { groupId: 'outros', groupTitle: 'Outros' };
        const geom = this.getGeometryInfo(l.geometryType);
        return {
          ...l,
          thematicGroupId: meta.groupId,
          thematicGroupTitle: meta.groupTitle,
          description: descriptions[l.id] || l.description || `Dados geoespaciais vetoriais da camada ${l.name}.`,
          geomIcon: geom.icon,
          geomLabel: geom.label
        };
      });
  }

  getGeometryInfo(geomType) {
    if (geomType === 'Point' || geomType === 'MultiPoint') {
      return { icon: 'map-pin', label: 'Ponto' };
    }
    if (geomType === 'LineString' || geomType === 'MultiLineString') {
      return { icon: 'spline', label: 'Linha' };
    }
    if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
      return { icon: 'hexagon', label: 'Polígono' };
    }
    return { icon: 'layers', label: 'Vetor' };
  }

  setupGlobalControls() {
    const btnExpandAll = document.getElementById('btn-expand-all-downloads');
    if (btnExpandAll) {
      btnExpandAll.addEventListener('click', () => {
        DOWNLOAD_THEMATIC_GROUPS.forEach(g => this.expandedGroups.add(g.id));
        this.render();
      });
    }

    const btnCollapseAll = document.getElementById('btn-collapse-all-downloads');
    if (btnCollapseAll) {
      btnCollapseAll.addEventListener('click', () => {
        this.expandedGroups.clear();
        this.render();
      });
    }

    if (this.pillsBar) {
      this.pillsBar.querySelectorAll('.download-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          const filter = pill.getAttribute('data-group-filter');
          this.setFilter(filter);
        });
      });
    }
  }

  setFilter(filter) {
    this.activeFilter = filter;

    if (this.pillsBar) {
      this.pillsBar.querySelectorAll('.download-pill').forEach(p => {
        const match = p.getAttribute('data-group-filter') === filter;
        p.classList.toggle('active', match);
      });
    }

    if (filter !== 'all') {
      this.expandedGroups.add(filter);
    }

    this.render();
  }

  setupSearch() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('input', (e) => {
      this.searchQuery = (e.target.value || '').toLowerCase().trim();
      this.render();
    });

    if (this.searchClearBtn) {
      this.searchClearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.searchQuery = '';
        this.render();
      });
    }
  }

  render() {
    if (!this.container) return;

    // Atualiza contadores nas pills temáticas
    let totalAllItems = this.downloadableLayers.length + 1; // 34 vetores + 1 Excel climático
    const pillCountAll = document.getElementById('pill-count-all');
    if (pillCountAll) {
      pillCountAll.textContent = totalAllItems;
    }

    DOWNLOAD_THEMATIC_GROUPS.forEach(g => {
      const pillCountEl = document.getElementById(`pill-count-${g.id}`);
      if (pillCountEl) {
        const countInGroup = this.downloadableLayers.filter(l => l.thematicGroupId === g.id).length + (g.hasClimateExcel ? 1 : 0);
        pillCountEl.textContent = countInGroup;
      }
    });

    // Filtro por busca
    let filteredLayers = this.downloadableLayers;
    if (this.searchQuery) {
      filteredLayers = this.downloadableLayers.filter(l => {
        const text = `${l.name} ${l.description} ${l.thematicGroupTitle} ${l.source || ''} ${l.geomLabel}`.toLowerCase();
        return text.includes(this.searchQuery);
      });
    }

    const climateMatches = !this.searchQuery || 
      'dados climáticos observados estações meteorológicas rede municipal monitoramento plugfield excel xlsx temperatura chuva precipitação umidade vento pressão'
      .includes(this.searchQuery);

    // Contagem de itens visíveis
    let visibleTotal = 0;
    DOWNLOAD_THEMATIC_GROUPS.forEach(g => {
      if (this.activeFilter !== 'all' && this.activeFilter !== g.id) return;
      const gLayers = filteredLayers.filter(l => l.thematicGroupId === g.id);
      const gClimate = g.hasClimateExcel && climateMatches;
      visibleTotal += gLayers.length + (gClimate ? 1 : 0);
    });

    if (this.countBadge) {
      this.countBadge.textContent = visibleTotal;
    }

    if (visibleTotal === 0) {
      this.container.innerHTML = `
        <div style="text-align: center; padding: 28px 16px; color: var(--text-muted);">
          <i class="lucide-search" style="font-size: 26px; opacity: 0.4; margin-bottom: 8px; display: block;"></i>
          <p style="font-size: 13px; font-weight: 600; color: var(--text-main);">Nenhuma camada encontrada</p>
          <p style="font-size: 11px; margin-top: 4px;">Tente buscar por outro termo ou limpe o campo de busca.</p>
        </div>
      `;
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
      return;
    }

    let html = '';

    DOWNLOAD_THEMATIC_GROUPS.forEach(group => {
      if (this.activeFilter !== 'all' && this.activeFilter !== group.id) {
        return;
      }

      const groupLayers = filteredLayers.filter(l => l.thematicGroupId === group.id);
      const showClimateInGroup = group.hasClimateExcel && climateMatches;

      const groupTotal = groupLayers.length + (showClimateInGroup ? 1 : 0);
      if (this.searchQuery && groupTotal === 0) {
        return;
      }

      const isExpanded = this.searchQuery ? true : this.expandedGroups.has(group.id);
      const countText = `${groupTotal} ${groupTotal === 1 ? 'camada' : 'camadas'}`;

      html += `
        <div class="download-group-item ${isExpanded ? 'expanded' : ''}" data-group-id="${group.id}">
          <button type="button" class="download-group-header" aria-expanded="${isExpanded}">
            <div class="download-group-header-left">
              <i class="lucide-${group.iconName} download-group-icon"></i>
              <span class="download-group-title">${group.title}</span>
            </div>
            <div class="download-group-header-right">
              <span class="download-group-badge">${countText}</span>
              <i class="lucide-chevron-down download-group-chevron"></i>
            </div>
          </button>

          <div class="download-group-body" style="${isExpanded ? 'display: flex;' : 'display: none;'}">
      `;

      // Renderiza card especial se pertencer ao grupo
      if (showClimateInGroup) {
        html += this.createClimateCardHtml();
      }

      // Renderiza camadas do grupo
      groupLayers.forEach(layer => {
        html += this.createLayerCardHtml(layer);
      });

      html += `
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;

    // Bind accordion toggles
    this.container.querySelectorAll('.download-group-header').forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        const groupItem = header.closest('.download-group-item');
        if (!groupItem) return;
        const groupId = groupItem.getAttribute('data-group-id');
        const isCurrentlyExpanded = groupItem.classList.contains('expanded');

        if (isCurrentlyExpanded) {
          groupItem.classList.remove('expanded');
          groupItem.querySelector('.download-group-body').style.display = 'none';
          header.setAttribute('aria-expanded', 'false');
          this.expandedGroups.delete(groupId);
        } else {
          groupItem.classList.add('expanded');
          groupItem.querySelector('.download-group-body').style.display = 'flex';
          header.setAttribute('aria-expanded', 'true');
          this.expandedGroups.add(groupId);
        }
      });
    });

    this.bindDownloadEvents();

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  createClimateCardHtml() {
    return `
      <div class="download-card climate-featured-card" style="border: 1px solid rgba(16, 185, 129, 0.45); background: linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(6, 182, 212, 0.05) 100%);">
        <div class="download-card-header">
          <div>
            <div class="download-card-title" style="color: #34d399; display: flex; align-items: center; gap: 7px;">
              <i class="lucide-file-spreadsheet" style="color: #10b981;"></i>
              <span>Dados Climáticos Observados — Rede Municipal Plugfield</span>
            </div>
            <div class="download-card-desc" style="margin-top: 4px;">
              Dados observados pelas estações meteorológicas da Rede Municipal de Monitoramento Climático. Série histórica diária consolidada (temperatura média, mínima, máxima, precipitação acumulada, umidade, vento e pressão).
            </div>
          </div>
        </div>

        <div class="download-card-meta">
          <span class="badge-blue" style="font-size: 10px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4);">📡 16 Estações</span>
          <span>&bull;</span>
          <span><strong>Fonte:</strong> Rede Oficial Plugfield / Defesa Civil</span>
          <span>&bull;</span>
          <span><strong>Série:</strong> Diária Consolidada</span>
          <span>&bull;</span>
          <span><strong>Formato:</strong> Excel (.xlsx)</span>
        </div>

        <div class="download-btn-group" style="margin-top: 6px;">
          <button type="button" class="btn-download-format excel" id="btn-open-climate-excel-modal" style="background: rgba(16, 185, 129, 0.25); color: #34d399; border: 1px solid #059669; font-weight: 700; padding: 5px 12px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; border-radius: var(--radius-sm);" title="Baixar dados climáticos observados em planilha Excel (.xlsx)">
            <i class="lucide-file-spreadsheet"></i> Baixar Excel (.xlsx)
          </button>
        </div>
      </div>
    `;
  }

  createLayerCardHtml(layer) {
    return `
      <div class="download-card" data-layer-id="${layer.id}">
        <div class="download-card-header">
          <div>
            <div class="download-card-title">${layer.name}</div>
            <div class="download-card-desc" style="margin-top: 3px;">${layer.description}</div>
          </div>
        </div>

        <div class="download-card-meta">
          <span class="download-badge-geom">
            <i class="lucide-${layer.geomIcon}"></i> ${layer.geomLabel}
          </span>
          <span>&bull;</span>
          <span><strong>Fonte:</strong> ${layer.source || 'Prefeitura de Passo Fundo'}</span>
          <span>&bull;</span>
          <span><strong>Ref:</strong> ${layer.refDate || '2026'}</span>
          <span>&bull;</span>
          <span><strong>CRS:</strong> SIRGAS 2000 / UTM 22S</span>
        </div>

        <div class="download-btn-group">
          <button type="button" class="btn-download-format geojson" data-format="geojson" data-layer-id="${layer.id}" title="Baixar arquivo GeoJSON nativo (SIRGAS 2000 / UTM 22S)">
            <i class="lucide-download"></i> GeoJSON
          </button>
          <button type="button" class="btn-download-format csv" data-format="csv" data-layer-id="${layer.id}" title="Baixar tabela de atributos e coordenadas em CSV (Excel)">
            <i class="lucide-file-spreadsheet"></i> CSV
          </button>
          <button type="button" class="btn-download-format kml" data-format="kml" data-layer-id="${layer.id}" title="Baixar camada KML para Google Earth (WGS84)">
            <i class="lucide-globe"></i> KML
          </button>
        </div>
      </div>
    `;
  }

  bindDownloadEvents() {
    // Botão de Download de Dados Climáticos em Excel
    const btnClimateExcel = this.container.querySelector('#btn-open-climate-excel-modal');
    if (btnClimateExcel) {
      btnClimateExcel.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        ClimateExportExcel.openModal();
      });
    }

    // Botões de Formatos de Download Vetoriais
    this.container.querySelectorAll('.btn-download-format:not(#btn-open-climate-excel-modal)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const layerId = btn.getAttribute('data-layer-id');
        const format = btn.getAttribute('data-format');
        if (layerId && format) {
          this.handleDownload(layerId, format);
        }
      });
    });
  }

  async handleDownload(layerId, format) {
    const layer = this.downloadableLayers.find(l => l.id === layerId);
    if (!layer) return;

    Notification.info(`Preparando download da camada ${layer.name} (${format.toUpperCase()})...`);

    try {
      if (format === 'geojson') {
        await this.downloadDirectGeoJson(layer);
      } else if (format === 'csv') {
        await this.downloadAsCsv(layer);
      } else if (format === 'kml') {
        await this.downloadAsKml(layer);
      }
    } catch (err) {
      console.error(`[DownloadsUI] Erro ao baixar camada ${layerId}:`, err);
      Notification.error('Download temporariamente indisponível para esta camada.');
    }
  }

  getStandardFileName(layerId, extension) {
    return `${layerId}_passo_fundo.${extension}`;
  }

  /**
   * Baixa diretamente o arquivo GeoJSON original com nome padronizado
   */
  async downloadDirectGeoJson(layer) {
    const fileUrl = encodeURI(layer.fileName);
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao carregar arquivo`);
    }

    const blob = await response.blob();
    const downloadName = this.getStandardFileName(layer.id, 'geojson');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Download de "${downloadName}" concluído!`);
  }

  /**
   * Exporta os atributos da camada + coordenadas como arquivo CSV (UTF-8 BOM para Excel)
   */
  async downloadAsCsv(layer) {
    await this.layerManager.loadLayerData(layer.id);
    const olLayer = this.layerManager.getLayer(layer.id);
    if (!olLayer) throw new Error('Camada não encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feição encontrada');

    const allKeys = new Set();
    features.forEach(f => {
      const props = f.getProperties();
      Object.keys(props).forEach(k => {
        if (k !== 'geometry') allKeys.add(k);
      });
    });

    const headers = Array.from(allKeys);
    let csvContent = '\uFEFF'; // UTF-8 BOM para compatibilidade com Microsoft Excel
    csvContent += headers.map(h => `"${h.replace(/"/g, '""')}"`).join(';') + ';Coord_X_UTM;Coord_Y_UTM\n';

    features.forEach(f => {
      const props = f.getProperties();
      const geom = f.getGeometry();
      let x = '', y = '';
      if (geom) {
        if (geom.getType() === 'Point') {
          const coords = geom.getCoordinates();
          x = coords[0].toFixed(2);
          y = coords[1].toFixed(2);
        } else {
          const ext = geom.getExtent();
          const center = ol.extent.getCenter(ext);
          x = center[0].toFixed(2);
          y = center[1].toFixed(2);
        }
      }

      const row = headers.map(h => {
        const val = props[h] !== undefined && props[h] !== null ? String(props[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      row.push(x, y);
      csvContent += row.join(';') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadName = this.getStandardFileName(layer.id, 'csv');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Tabela CSV "${downloadName}" gerada com sucesso!`);
  }

  /**
   * Converte as feições OpenLayers para formato KML (WGS84 EPSG:4326 para Google Earth)
   */
  async downloadAsKml(layer) {
    await this.layerManager.loadLayerData(layer.id);
    const olLayer = this.layerManager.getLayer(layer.id);
    if (!olLayer) throw new Error('Camada não encontrada');

    const features = olLayer.getSource().getFeatures();
    if (features.length === 0) throw new Error('Nenhuma feição encontrada');

    const kmlFormat = new ol.format.KML({
      extractStyles: false,
      defaultStyle: null
    });

    const kmlString = kmlFormat.writeFeatures(features, {
      featureProjection: 'EPSG:3857',
      dataProjection: 'EPSG:4326'
    });

    const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8;' });
    const downloadName = this.getStandardFileName(layer.id, 'kml');
    this.triggerFileDownload(blob, downloadName);
    Notification.success(`Arquivo KML "${downloadName}" gerado com sucesso!`);
  }

  triggerFileDownload(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
}