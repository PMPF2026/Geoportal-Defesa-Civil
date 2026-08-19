/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Map Export & Situation Report Generator (PDF / Print)
 */

import { formatDateTime } from '../utils/formatters.js';
import { Notification } from '../ui/notification.js';
import { LAYERS_CONFIG } from '../config/layers.config.js';

export class ExportReportTool {
  constructor(mapEngine, layerManager, statsEngine) {
    this.mapEngine = mapEngine;
    this.map = mapEngine.getOlMap();
    this.layerManager = layerManager;
    this.statsEngine = statsEngine;

    this.initControls();
  }

  initControls() {
    const exportMapBtn = document.getElementById('btn-export-map-png');
    const reportBtn = document.getElementById('btn-generate-report');

    if (exportMapBtn) {
      exportMapBtn.addEventListener('click', () => {
        this.exportMapPng();
      });
    }

    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        this.generateSituationReport();
      });
    }
  }

  /**
   * Captures map canvas into a high-resolution PNG image
   */
  exportMapPng() {
    Notification.info('Preparando imagem do mapa em alta resolução...');

    this.map.once('rendercomplete', () => {
      const mapCanvas = document.createElement('canvas');
      const size = this.map.getSize();
      mapCanvas.width = size[0];
      mapCanvas.height = size[1];
      const mapContext = mapCanvas.getContext('2d');

      // Draw all OL canvas layers onto composite canvas
      Array.prototype.forEach.call(
        this.map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
        (canvas) => {
          if (canvas.width > 0) {
            const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
            mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
            let transform = canvas.style.transform;
            let matrix;
            if (transform) {
              matrix = transform
                .match(/^matrix\(([^\(]*)\)$/)[1]
                .split(',')
                .map(Number);
            } else {
              matrix = [
                parseFloat(canvas.style.width) / canvas.width,
                0,
                0,
                parseFloat(canvas.style.height) / canvas.height,
                0,
                0
              ];
            }
            CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
            mapContext.drawImage(canvas, 0, 0);
          }
        }
      );

      // Reset transform and draw watermark / footer header
      mapContext.setTransform(1, 0, 0, 1, 0, 0);
      mapContext.fillStyle = 'rgba(15, 23, 42, 0.85)';
      mapContext.fillRect(10, size[1] - 38, 420, 28);
      mapContext.strokeStyle = '#ff7800';
      mapContext.lineWidth = 1.5;
      mapContext.strokeRect(10, size[1] - 38, 420, 28);

      mapContext.fillStyle = '#ffffff';
      mapContext.font = 'bold 11px Inter, sans-serif';
      mapContext.fillText('DEFESA CIVIL DE PASSO FUNDO/RS - WEBGIS', 20, size[1] - 20);
      mapContext.fillStyle = '#94a3b8';
      mapContext.font = '10px Inter, sans-serif';
      mapContext.fillText(`Gerado em: ${formatDateTime()}`, 275, size[1] - 20);

      // Download file
      const dataUrl = mapCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `WebGIS_DefesaCivil_PassoFundo_${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      Notification.success('Imagem do mapa exportada com sucesso!');
    });

    this.map.renderSync();
  }

  /**
   * Generates a complete Defesa Civil printable situation report
   */
  async generateSituationReport() {
    Notification.info('Gerando Boletim de Situação da Defesa Civil...');

    const stats = await this.statsEngine.getConsolidatedStats();
    const activeLayers = LAYERS_CONFIG.filter(c => {
      const l = this.layerManager.getLayer(c.id);
      return l && l.getVisible();
    }).map(c => c.name);

    const reportWindow = window.open('', '_blank', 'width=900,height=800');
    if (!reportWindow) {
      Notification.warning('Permita popups no navegador para visualizar o relatório.');
      return;
    }

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Boletim de Situação - Defesa Civil Passo Fundo/RS</title>
        <link rel="icon" type="image/jpeg" href="assets/logo-defesa-civil.jpg">
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
          .header { border-bottom: 3px solid #ff7800; padding-bottom: 16px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 24px; font-size: 13px; }
          .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          .kpi-table th, .kpi-table td { border: 1px solid #cbd5e1; padding: 10px 14px; font-size: 13px; }
          .kpi-table th { background: #0f172a; color: #fff; text-align: left; }
          .kpi-table tr:nth-child(even) { background: #f1f5f9; }
          .badge-alert { color: #dc2626; font-weight: bold; background: #fee2e2; padding: 2px 8px; border-radius: 4px; }
          .footer { margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between; }
          @media print {
            .no-print { display: none; }
            body { margin: 15mm; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 16px; text-align: right;">
          <button onclick="window.print()" style="background: #ff7800; color: #fff; border: none; padding: 10px 20px; font-weight: bold; border-radius: 4px; cursor: pointer;">
            Imprimir / Salvar em PDF
          </button>
        </div>

        <div class="header">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="assets/logo-defesa-civil.jpg" alt="Logo Defesa Civil Passo Fundo" style="width: 64px; height: 64px; object-fit: contain; border-radius: 50%; border: 2px solid #ff7800;" />
            <div>
              <div class="title">PREFEITURA MUNICIPAL DE PASSO FUNDO / RS</div>
              <div style="font-size:15px; font-weight:700; color:#ff7800; margin-top:2px;">COORDENADORIA MUNICIPAL DE DEFESA CIVIL</div>
              <div class="subtitle">PORTAL GEOESPACIAL E SISTEMA DE APOIO À DECISÃO - WEBGIS</div>
            </div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #64748b;">
            <strong>Data de Emissão:</strong><br>${formatDateTime()}
          </div>
        </div>

        <div class="meta-box">
          <strong>Síntese Operacional:</strong> Este documento consolida os indicadores espaciais e territoriais processados em tempo real a partir da base cartográfica oficial e camadas de risco hidrológico do Município de Passo Fundo / RS.
        </div>

        <h3 style="color:#0f172a; margin-bottom:10px;">1. Indicadores Territoriais e Demográficos Oficiais</h3>
        <table class="kpi-table">
          <tr>
            <th>Indicador</th>
            <th>Valor Registrado</th>
            <th>Fonte / Metadado</th>
          </tr>
          <tr>
            <td><strong>População Municipal Total</strong></td>
            <td><strong>${stats.totalPop.toLocaleString('pt-BR')} habitantes</strong></td>
            <td>Censo Demográfico IBGE 2022</td>
          </tr>
          <tr>
            <td><strong>Total de Domicílios</strong></td>
            <td>${stats.totalDomicilios.toLocaleString('pt-BR')} domicílios</td>
            <td>Censo Demográfico IBGE 2022</td>
          </tr>
          <tr>
            <td><strong>Área Territorial do Município</strong></td>
            <td>${stats.totalAreaKm2.toLocaleString('pt-BR')} km²</td>
            <td>IBGE / Limite Territorial</td>
          </tr>
          <tr>
            <td><strong>Densidade Demográfica Média</strong></td>
            <td>${stats.avgDensity.toLocaleString('pt-BR')} hab/km²</td>
            <td>Cálculo Setorial</td>
          </tr>
          <tr>
            <td><strong>Bairros / Regiões Cadastrados</strong></td>
            <td>${stats.bairrosCount} regiões urbanas</td>
            <td>Base Cartográfica Municipal</td>
          </tr>
          <tr>
            <td><strong>Distritos Municipais</strong></td>
            <td>${stats.distritosCount} distritos (Sede, Bela Vista, Bom Recreio, etc.)</td>
            <td>Base Cartográfica Municipal</td>
          </tr>
          <tr>
            <td><strong>Setores Censitários</strong></td>
            <td>${stats.setoresCount} setores</td>
            <td>Malha Setorial IBGE</td>
          </tr>
        </table>

        <h3 style="color:#0f172a; margin-bottom:10px;">2. Infraestrutura e Hidrografia</h3>
        <table class="kpi-table">
          <tr>
            <th>Elemento Geoespacial</th>
            <th>Extensão Linear</th>
            <th>Observação</th>
          </tr>
          <tr>
            <td><strong>Malha Hídrica (Rios e Arroios)</strong></td>
            <td>${stats.hidroKm.toLocaleString('pt-BR')} km</td>
            <td>3.739 trechos hidrográficos mapeados</td>
          </tr>
          <tr>
            <td><strong>Malha Viária Urbana</strong></td>
            <td>${stats.viariaKm.toLocaleString('pt-BR')} km</td>
            <td>11.595 trechos de vias municipais</td>
          </tr>
          <tr>
            <td><strong>Estradas Municipais (Interior)</strong></td>
            <td>${stats.estradasMunicipaisKm.toLocaleString('pt-BR')} km</td>
            <td>164 trechos de estradas rurais</td>
          </tr>
          <tr>
            <td><strong>Rodovias Estaduais (ERS)</strong></td>
            <td>${stats.rodoviaEstadualKm.toLocaleString('pt-BR')} km</td>
            <td>ERS-135, ERS-324 e acessos</td>
          </tr>
          <tr>
            <td><strong>Rodovias Federais (BR)</strong></td>
            <td>${stats.rodoviaFederalKm.toLocaleString('pt-BR')} km</td>
            <td>BR-285, BR-153 e ramais</td>
          </tr>
          <tr>
            <td><strong>Ferrovia</strong></td>
            <td>${stats.ferroviaKm.toLocaleString('pt-BR')} km</td>
            <td>Linha Férrea ALL / Rumo</td>
          </tr>
        </table>

        <h3 style="color:#0f172a; margin-bottom:10px;">3. Monitoramento de Risco e Enchentes</h3>
        <table class="kpi-table">
          <tr>
            <th>Camada de Risco</th>
            <th>Dimensão</th>
            <th>Status Institucional</th>
          </tr>
          <tr>
            <td><strong>Área de Inundação - Enchente 2024</strong></td>
            <td><strong>${stats.floodAreaKm2.toLocaleString('pt-BR')} km² (${stats.floodAreaHa.toLocaleString('pt-BR')} ha)</strong></td>
            <td><span class="badge-alert">DECRETO DE EMERGÊNCIA (ADA 03/09/2024)</span></td>
          </tr>
        </table>

        <div style="font-size:12px; margin-top:20px;">
          <strong>Camadas Ativas na Sessão:</strong> ${activeLayers.join(', ')}
        </div>

        <div class="footer">
          <span>Defesa Civil - Passo Fundo / RS | Telefone de Emergência: 199</span>
          <span>WebGIS Institucional de Gestão de Riscos</span>
        </div>
      </body>
      </html>
    `);

    reportWindow.document.close();
  }
}
