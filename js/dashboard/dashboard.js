/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Interactive Dashboard UI with Chart.js & Map Spatial Zoom Linking
 */

import { formatNumber } from '../utils/formatters.js';

export class DashboardUI {
  constructor(statsEngine, mapEngine, layerManager, popupUI) {
    this.statsEngine = statsEngine;
    this.mapEngine = mapEngine;
    this.layerManager = layerManager;
    this.popupUI = popupUI;

    this.charts = {};
    this.modalEl = document.getElementById('dashboard-modal');
    this.isRendered = false;

    this.init();
  }

  init() {
    // Open Expanded Dashboard Modal Button in Header
    const openModalBtn = document.getElementById('btn-open-dashboard-modal');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        this.openModal();
      });
    }

    // Modal Close Button
    const closeModalBtn = document.getElementById('btn-close-dashboard-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.closeModal();
      });
    }

    // Render initial sidebar dashboard
    this.render();
  }

  async render() {
    const stats = await this.statsEngine.getConsolidatedStats();
    this.updateKpiElements(stats);
    this.renderSidebarCharts(stats);
    this.isRendered = true;
  }

  openModal() {
    if (this.modalEl) {
      this.modalEl.classList.add('active');
      this.renderModalCharts();
      this.renderSheltersTable();
    }
  }

  closeModal() {
    if (this.modalEl) {
      this.modalEl.classList.remove('active');
    }
  }

  updateKpiElements(stats) {
    document.querySelectorAll('[data-kpi]').forEach(el => {
      const key = el.getAttribute('data-kpi');
      if (stats[key] !== undefined) {
        if (typeof stats[key] === 'number') {
          el.textContent = formatNumber(stats[key], key.includes('Km') || key.includes('Area') ? 2 : 0);
        } else {
          el.textContent = stats[key];
        }
      }
    });
  }

  renderSidebarCharts(stats) {
    if (typeof Chart === 'undefined') return;

    // 1. Chart: Roads Breakdown (Doughnut)
    const roadsCtx = document.getElementById('chart-roads-sidebar');
    if (roadsCtx) {
      if (this.charts.roadsSidebar) {
        this.charts.roadsSidebar.destroy();
      }
      this.charts.roadsSidebar = new Chart(roadsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Malha Urbana', 'Estradas Rurais', 'Rod. Estaduais', 'Rod. Federais', 'Ferrovia'],
          datasets: [{
            data: [stats.viariaKm, stats.estradasMunicipaisKm, stats.rodoviaEstadualKm, stats.rodoviaFederalKm, stats.ferroviaKm],
            backgroundColor: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#1e293b'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10, padding: 8 }
            }
          }
        }
      });
    }

    // 2. Chart: Population Density Histogram (Bar)
    const densCtx = document.getElementById('chart-density-sidebar');
    if (densCtx) {
      if (this.charts.densitySidebar) {
        this.charts.densitySidebar.destroy();
      }
      const b = stats.densityBuckets || { low: 18, medium: 42, high: 95, veryHigh: 105, extreme: 52 };
      this.charts.densitySidebar = new Chart(densCtx, {
        type: 'bar',
        data: {
          labels: ['<50', '50-500', '500-2k', '2k-5k', '>5k'],
          datasets: [{
            label: 'Qtd Setores',
            data: [b.low, b.medium, b.high, b.veryHigh, b.extreme],
            backgroundColor: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }
  }

  async renderModalCharts() {
    if (typeof Chart === 'undefined') return;
    const stats = await this.statsEngine.getConsolidatedStats();
    this.updateKpiElements(stats);

    // 1. Chart: Roads Breakdown (Doughnut)
    const roadsModalCtx = document.getElementById('chart-roads-modal') || document.getElementById('chart-modal-vias');
    if (roadsModalCtx) {
      if (this.charts.roadsModal) this.charts.roadsModal.destroy();
      this.charts.roadsModal = new Chart(roadsModalCtx, {
        type: 'doughnut',
        data: {
          labels: ['Malha Urbana (1.501,6 km)', 'Estradas Rurais (285,3 km)', 'Rod. Estaduais (66,9 km)', 'Rod. Federais (50,3 km)', 'Ferrovia (55,3 km)'],
          datasets: [{
            data: [stats.viariaKm, stats.estradasMunicipaisKm, stats.rodoviaEstadualKm, stats.rodoviaFederalKm, stats.ferroviaKm],
            backgroundColor: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#1e293b'],
            borderColor: '#0f172a',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: '#cbd5e1', font: { size: 11 }, boxWidth: 12, padding: 8 }
            }
          }
        }
      });
    }

    // 2. Chart: Population Density Histogram (Bar)
    const densModalCtx = document.getElementById('chart-density-modal') || document.getElementById('chart-modal-densidade');
    if (densModalCtx) {
      if (this.charts.densityModal) this.charts.densityModal.destroy();
      const b = stats.densityBuckets || { low: 18, medium: 42, high: 95, veryHigh: 105, extreme: 52 };
      this.charts.densityModal = new Chart(densModalCtx, {
        type: 'bar',
        data: {
          labels: ['<50 hab/km²', '50-500 hab/km²', '500-2.000 hab/km²', '2.000-5.000 hab/km²', '>5.000 hab/km²'],
          datasets: [{
            label: 'Qtd Setores Censitários',
            data: [b.low, b.medium, b.high, b.veryHigh, b.extreme],
            backgroundColor: ['#fef0d9', '#fdcc8a', '#fc8d59', '#e34a33', '#b30000'],
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.08)' } }
          }
        }
      });
    }

    // 3. Top 10 Bairros Mais Populosos (Bar Horizontal) with Click-to-Zoom!
    const bairrosCtx = document.getElementById('chart-bairros-modal') || document.getElementById('chart-modal-bairros');
    if (bairrosCtx) {
      if (this.charts.bairrosModal) this.charts.bairrosModal.destroy();
      const top10 = stats.bairrosList.slice(0, 10);
      this.charts.bairrosModal = new Chart(bairrosCtx, {
        type: 'bar',
        data: {
          labels: top10.map(b => b.name),
          datasets: [{
            label: 'População (Censo 2022)',
            data: top10.map(b => b.pop),
            backgroundColor: '#ff7800',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedBairro = top10[index];
              this.closeModal();
              this.zoomToBairroByName(selectedBairro.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#f8fafc', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }

    // 4. Distritos Municipais População (Bar Vertical) with Click-to-Zoom!
    const distCtx = document.getElementById('chart-distritos-modal') || document.getElementById('chart-modal-distritos');
    if (distCtx) {
      if (this.charts.distritosModal) this.charts.distritosModal.destroy();
      this.charts.distritosModal = new Chart(distCtx, {
        type: 'bar',
        data: {
          labels: stats.distritosList.map(d => d.name),
          datasets: [{
            label: 'Habitantes',
            data: stats.distritosList.map(d => d.pop),
            backgroundColor: '#0284c7',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedDistrito = stats.distritosList[index];
              this.closeModal();
              this.zoomToDistritoByName(selectedDistrito.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { display: false } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
          }
        }
      });
    }

    // 5. SGB 2025 Domicílios em Risco por Bairro (Bar Horizontal) with Click-to-Zoom!
    const sgbCtx = document.getElementById('chart-sgb-bairros-modal');
    if (sgbCtx) {
      if (this.charts.sgbModal) this.charts.sgbModal.destroy();
      const sgbList = stats.sgbTopBairros || [
        { name: "Petrópolis", count: 316 },
        { name: "São Luiz Gonzaga", count: 273 },
        { name: "Vila Santa Maria", count: 142 },
        { name: "Vera Cruz", count: 93 },
        { name: "Vila Luiza", count: 88 },
        { name: "Victor Issler", count: 64 },
        { name: "Vila Cruzeiro", count: 38 },
        { name: "Outros / Periferia", count: 31 },
        { name: "Vila Mattos", count: 26 },
        { name: "Nenê Graeff", count: 20 }
      ];
      this.charts.sgbModal = new Chart(sgbCtx, {
        type: 'bar',
        data: {
          labels: sgbList.map(b => b.name),
          datasets: [{
            label: 'Domicílios em Risco (SGB 2025)',
            data: sgbList.map(b => b.count),
            backgroundColor: '#f97316',
            borderRadius: 4
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          onClick: async (evt, elements) => {
            if (elements && elements.length > 0) {
              const index = elements[0].index;
              const selectedBairro = sgbList[index];
              this.closeModal();
              this.zoomToBairroByName(selectedBairro.name);
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                afterLabel: () => '👉 Clique para aproximar no mapa'
              }
            }
          },
          scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { ticks: { color: '#f8fafc', font: { size: 11 } }, grid: { display: false } }
          }
        }
      });
    }
  }

  async zoomToBairroByName(nameQuery) {
    await this.layerManager.loadLayerData('bairros');
    const layer = this.layerManager.getLayer('bairros');
    const features = layer.getSource().getFeatures();
    const cleanQuery = nameQuery.toLowerCase().split('/')[0].trim();

    const matched = features.find(f => {
      const desc = (f.get('Descri____') || f.get('Name') || '').toLowerCase();
      return desc.includes(cleanQuery);
    });

    if (matched) {
      this.mapEngine.setHighlight(matched);
      const geom = matched.getGeometry();
      this.mapEngine.zoomTo(geom.getExtent());
      const cfg = this.layerManager.getConfig('bairros');
      this.popupUI.showPopupForFeature(matched, cfg, ol.extent.getCenter(geom.getExtent()));
    }
  }

  async zoomToDistritoByName(distName) {
    await this.layerManager.loadLayerData('distritos');
    const layer = this.layerManager.getLayer('distritos');
    const features = layer.getSource().getFeatures();
    const cleanName = distName.replace(/\(Sede\)/i, '').trim().toLowerCase();

    const matched = features.find(f => {
      const n = (f.get('nome') || '').toLowerCase();
      return n.includes(cleanName);
    });

    if (matched) {
      this.mapEngine.setHighlight(matched);
      const geom = matched.getGeometry();
      this.mapEngine.zoomTo(geom.getExtent(), { maxZoom: 16 });
      const cfg = this.layerManager.getConfig('distritos');
      this.popupUI.showPopupForFeature(matched, cfg, geom.getCoordinates());
    }
  }

  /**
   * Renders the interactive shelters table in the expanded dashboard modal
   */
  async renderSheltersTable() {
    const tbody = document.getElementById('dash-shelters-table-body');
    if (!tbody) return;

    await this.layerManager.loadLayerData('abrigos_defesa_civil');
    const layer = this.layerManager.getLayer('abrigos_defesa_civil');
    if (!layer) return;

    const features = layer.getSource().getFeatures();
    if (!features || features.length === 0) return;

    this.shelterFeatures = features;

    const renderRows = (list) => {
      tbody.innerHTML = '';
      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:16px; color:var(--text-muted);">Nenhum abrigo localizado com o filtro informado.</td></tr>`;
        return;
      }

      list.forEach(f => {
        const props = f.getProperties();
        const tr = document.createElement('tr');
        tr.style.cssText = 'border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s; cursor:pointer;';
        tr.onmouseenter = () => tr.style.background = 'rgba(255,255,255,0.04)';
        tr.onmouseleave = () => tr.style.background = 'transparent';

        tr.innerHTML = `
          <td style="padding:7px 10px; font-weight:700; color:#38bdf8;">${props['ID'] || ''}</td>
          <td style="padding:7px 10px; font-weight:600; color:var(--text-main);">${props['Nome'] || ''}</td>
          <td style="padding:7px 10px;"><span class="badge-blue" style="font-size:10px;">${props['Tipo'] || 'ABRIGO'}</span></td>
          <td style="padding:7px 10px; color:var(--text-muted);">${props['Endereço'] || '-'}</td>
          <td style="padding:7px 10px; text-align:right; font-weight:700; color:var(--text-main);">${props['Área de Alojamento'] || '-'}</td>
          <td style="padding:7px 10px; text-align:center;">
            <button class="mini-btn btn-view-shelter-map" style="padding:3px 8px; font-size:11px;" title="Aproximar no Mapa">
              <i class="lucide-map-pin"></i> Ver
            </button>
          </td>
        `;

        const onSelect = () => {
          this.closeModal();
          this.zoomToShelterFeature(f);
        };

        tr.addEventListener('click', onSelect);
        tbody.appendChild(tr);
      });

      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    };

    renderRows(features);

    const searchInput = document.getElementById('dash-shelters-search');
    if (searchInput && !this.shelterSearchBound) {
      this.shelterSearchBound = true;
      searchInput.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        if (!q) {
          renderRows(this.shelterFeatures);
        } else {
          const filtered = this.shelterFeatures.filter(f => {
            const p = f.getProperties();
            const str = `${p['ID']} ${p['Nome']} ${p['Tipo']} ${p['Endereço']}`.toLowerCase();
            return str.includes(q);
          });
          renderRows(filtered);
        }
      });
    }
  }

  /**
   * Zooms to the selected shelter on the map, highlights it and opens popup
   */
  async zoomToShelterFeature(feature) {
    const geom = feature.getGeometry();
    if (!geom) return;

    // Ensure layer is visible
    this.layerManager.setLayerVisibility('abrigos_defesa_civil', true);
    const checkbox = document.querySelector(`input[data-layer-id="abrigos_defesa_civil"]`);
    if (checkbox) checkbox.checked = true;

    const coords = geom.getCoordinates();
    this.mapEngine.setHighlight(feature);
    this.mapEngine.getOlMap().getView().animate({
      center: coords,
      zoom: 16.5,
      duration: 700
    });

    const cfg = this.layerManager.getConfig('abrigos_defesa_civil');
    this.popupUI.showPopupForFeature(feature, cfg, coords);
  }
}
