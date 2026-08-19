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
    if (roadsCtx && !this.charts.roadsSidebar) {
      this.charts.roadsSidebar = new Chart(roadsCtx, {
        type: 'doughnut',
        data: {
          labels: ['Malha Urbana', 'Estradas Municipais', 'Rod. Estaduais', 'Rod. Federais', 'Ferrovia'],
          datasets: [{
            data: [stats.viariaKm, stats.estradasMunicipaisKm, stats.rodoviaEstadualKm, stats.rodoviaFederalKm, stats.ferroviaKm],
            backgroundColor: ['#64748b', '#d97706', '#ea580c', '#dc2626', '#0f172a'],
            borderColor: '#1e293b',
            borderWidth: 1.5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 10 }, boxWidth: 10 }
            }
          }
        }
      });
    }

    // 2. Chart: Population Density Histogram (Bar)
    const densCtx = document.getElementById('chart-density-sidebar');
    if (densCtx && !this.charts.densitySidebar) {
      const b = stats.densityBuckets;
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

    // 1. Top 10 Bairros Mais Populosos (Bar Horizontal) with Click-to-Zoom!
    const bairrosCtx = document.getElementById('chart-bairros-modal');
    if (bairrosCtx && !this.charts.bairrosModal) {
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

    // 2. Distritos Municipais População (Bar Vertical) with Click-to-Zoom!
    const distCtx = document.getElementById('chart-distritos-modal');
    if (distCtx && !this.charts.distritosModal) {
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
}
