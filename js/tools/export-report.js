/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Map Export & Situation Report Generator (PDF / Print)
 */

import { formatDateTime, formatNumber, formatArea } from '../utils/formatters.js';
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
              const match = transform.match(/^matrix\(([^\(]*)\)$/);
              if (match) matrix = match[1].split(',').map(Number);
            }
            if (!matrix) {
              matrix = [
                parseFloat(canvas.style.width) / canvas.width || 1,
                0,
                0,
                parseFloat(canvas.style.height) / canvas.height || 1,
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
   * Captures map snapshot for inline report embedding
   * @returns {Promise<string|null>}
   */
  async captureMapDataUrl() {
    return new Promise((resolve) => {
      this.map.once('rendercomplete', () => {
        try {
          const mapCanvas = document.createElement('canvas');
          const size = this.map.getSize();
          mapCanvas.width = size[0];
          mapCanvas.height = size[1];
          const mapContext = mapCanvas.getContext('2d');

          Array.prototype.forEach.call(
            this.map.getViewport().querySelectorAll('.ol-layer canvas, canvas.ol-layer'),
            (canvas) => {
              if (canvas.width > 0) {
                const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
                mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);
                let transform = canvas.style.transform;
                let matrix;
                if (transform) {
                  const match = transform.match(/^matrix\(([^\(]*)\)$/);
                  if (match) matrix = match[1].split(',').map(Number);
                }
                if (!matrix) {
                  matrix = [
                    parseFloat(canvas.style.width) / canvas.width || 1,
                    0,
                    0,
                    parseFloat(canvas.style.height) / canvas.height || 1,
                    0,
                    0
                  ];
                }
                CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
                mapContext.drawImage(canvas, 0, 0);
              }
            }
          );

          mapContext.setTransform(1, 0, 0, 1, 0, 0);
          resolve(mapCanvas.toDataURL('image/png'));
        } catch (e) {
          console.warn('[ExportReport] Não foi possível obter snapshot do mapa:', e);
          resolve(null);
        }
      });
      this.map.renderSync();
    });
  }

  /**
   * Generates a complete Defesa Civil printable situation report
   */
  async generateSituationReport() {
    Notification.info('Gerando Boletim de Situação da Defesa Civil...');

    // 1. Obter estatísticas consolidadas da base
    const stats = await this.statsEngine.getConsolidatedStats();

    // 2. Extrair métricas detalhadas da camada de residências em APP
    let totalResidencias = stats.residenciasApp || 318;
    let distMin = 9.37;
    let distMax = 100.94;
    let distMedia = 27.45;
    let countMenor10m = 2;
    let count10a20m = 72;
    let count20a30m = 128;
    let countMaior30m = 116;

    try {
      const resLayer = this.layerManager.getLayer('edificacoes_app');
      if (resLayer && resLayer.getSource()) {
        const features = resLayer.getSource().getFeatures();
        if (features.length > 0) {
          totalResidencias = features.length;
          const dists = features.map(f => parseFloat(f.get('dist_rio_m'))).filter(d => !isNaN(d));
          if (dists.length > 0) {
            distMin = Math.min(...dists);
            distMax = Math.max(...dists);
            distMedia = dists.reduce((a, b) => a + b, 0) / dists.length;
            countMenor10m = dists.filter(d => d < 10).length;
            count10a20m = dists.filter(d => d >= 10 && d < 20).length;
            count20a30m = dists.filter(d => d >= 20 && d <= 30).length;
            countMaior30m = dists.filter(d => d > 30).length;
          }
        }
      }
    } catch (e) {
      console.warn('[ExportReport] Erro ao extrair estatísticas de residências:', e);
    }

    // 3. Obter camadas ativas na sessão
    const activeLayers = LAYERS_CONFIG.filter(c => {
      const l = this.layerManager.getLayer(c.id);
      return l && l.getVisible();
    }).map(c => c.name);

    // 4. Capturar composição cartográfica do mapa
    const mapSnapshot = await this.captureMapDataUrl();

    // 5. Abrir janela do relatório
    const reportWindow = window.open('', '_blank', 'width=960,height=900');
    if (!reportWindow) {
      Notification.warning('Permita popups no navegador para visualizar o relatório.');
      return;
    }

    const dataEmissao = formatDateTime();

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Boletim de Situação e Diagnóstico Territorial - Defesa Civil Passo Fundo/RS</title>
        <link rel="icon" type="image/jpeg" href="assets/logo-defesa-civil.jpg">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; 
            margin: 35px; 
            color: #0f172a; 
            background: #ffffff; 
            line-height: 1.5;
            font-size: 13px;
          }
          
          /* Header Oficial */
          .report-header { 
            border-bottom: 3px solid #ff7800; 
            padding-bottom: 16px; 
            margin-bottom: 20px; 
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
          }
          .header-brand { display: flex; align-items: center; gap: 16px; }
          .header-logo { width: 68px; height: 68px; object-fit: contain; border-radius: 50%; border: 2px solid #ff7800; }
          .inst-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; }
          .inst-sub { font-size: 14px; font-weight: 700; color: #ff7800; margin-top: 1px; }
          .inst-dept { font-size: 11.5px; color: #475569; margin-top: 2px; }
          .meta-date { text-align: right; font-size: 12px; color: #64748b; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }

          /* Banner e Caixa Informativa */
          .meta-box { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            border-left: 4px solid #ff7800; 
            border-radius: 6px; 
            padding: 12px 14px; 
            margin-bottom: 20px; 
            font-size: 12.5px; 
            color: #334155;
          }

          /* Títulos de Seções */
          h3.section-title { 
            color: #0f172a; 
            font-size: 14.5px; 
            font-weight: 700; 
            margin: 24px 0 10px 0; 
            padding-bottom: 5px; 
            border-bottom: 1.5px solid #cbd5e1;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          h3.section-title span.badge-num {
            background: #ff7800;
            color: #fff;
            font-size: 11px;
            padding: 2px 7px;
            border-radius: 4px;
            margin-right: 6px;
          }

          /* Tabelas de Indicadores */
          .kpi-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
          .kpi-table th, .kpi-table td { border: 1px solid #cbd5e1; padding: 8px 12px; font-size: 12.5px; }
          .kpi-table th { background: #0f172a; color: #ffffff; text-align: left; font-weight: 600; font-size: 12px; letter-spacing: 0.2px; }
          .kpi-table tr:nth-child(even) { background: #f8fafc; }
          .kpi-table tr.highlight-row { background: #fff7ed; }
          .kpi-table tr.alert-row { background: #fef2f2; }

          /* Badges */
          .badge-alert { color: #b91c1c; font-weight: bold; background: #fee2e2; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #fecaca; }
          .badge-orange { color: #c2410c; font-weight: bold; background: #ffedd5; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #fed7aa; }
          .badge-blue { color: #0369a1; font-weight: bold; background: #e0f2fe; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #bae6fd; }

          /* Grade 2 Colunas */
          .grid-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; }

          /* Mapa no Relatório */
          .map-report-card {
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            overflow: hidden;
            background: #0f172a;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          }
          .map-report-img {
            width: 100%;
            height: auto;
            max-height: 480px;
            object-fit: cover;
            display: block;
          }
          .map-report-caption {
            background: #f8fafc;
            border-top: 1px solid #cbd5e1;
            padding: 8px 12px;
            font-size: 11px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }

          /* Síntese Técnica */
          .synthesis-card {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 14px 16px;
            margin-bottom: 20px;
            font-size: 12.5px;
            line-height: 1.6;
            color: #1e293b;
          }

          /* Rodapé & Assinaturas */
          .signature-box {
            margin-top: 40px;
            display: flex;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
          }
          .signature-line {
            border-top: 1px solid #0f172a;
            padding-top: 6px;
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
          }
          .signature-sub {
            font-size: 11px;
            color: #64748b;
          }

          .footer-info { 
            margin-top: 30px; 
            border-top: 1px solid #cbd5e1; 
            padding-top: 10px; 
            font-size: 11px; 
            color: #64748b; 
            display: flex; 
            justify-content: space-between; 
          }

          @media print {
            .no-print { display: none; }
            body { margin: 10mm 15mm; font-size: 12px; }
            .map-report-img { max-height: 380px; }
            .kpi-table th { background: #1e293b !important; color: #fff !important; -webkit-print-color-adjust: exact; }
            h3.section-title { page-break-after: avoid; }
            table { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <!-- Botão de Ação / Impressão -->
        <div class="no-print" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; background: #0f172a; padding: 10px 16px; border-radius: 6px; color: #fff;">
          <div>
            <strong>Boletim Oficial de Situação Territorial</strong> &bull; Pronto para exportação em PDF ou impressão
          </div>
          <div style="display: flex; gap: 10px;">
            <button onclick="window.print()" style="background: #ff7800; color: #fff; border: none; padding: 8px 18px; font-weight: 700; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
              🖨️ Imprimir / Salvar em PDF
            </button>
            <button onclick="window.close()" style="background: #334155; color: #fff; border: none; padding: 8px 14px; font-weight: 600; border-radius: 4px; cursor: pointer;">
              Fechar
            </button>
          </div>
        </div>

        <!-- 1. IDENTIFICAÇÃO INSTITUCIONAL -->
        <div class="report-header">
          <div class="header-brand">
            <img src="assets/logo-defesa-civil.jpg" alt="Logo Defesa Civil Passo Fundo" class="header-logo" />
            <div>
              <div class="inst-title">PREFEITURA MUNICIPAL DE PASSO FUNDO / RS</div>
              <div class="inst-sub">COORDENADORIA MUNICIPAL DE PROTEÇÃO E DEFESA CIVIL</div>
              <div class="inst-dept">PORTAL GEOESPACIAL E SISTEMA DE APOIO À DECISÃO OPERACIONAL (WEBGIS)</div>
            </div>
          </div>
          <div class="meta-date">
            <strong>Data / Hora de Emissão:</strong><br>${dataEmissao}<br>
            <span style="color:#0284c7; font-weight:700;">SIRGAS 2000 UTM 22S</span>
          </div>
        </div>

        <div class="meta-box">
          <strong>Finalidade do Documento:</strong> Este boletim técnico consolida em tempo real os indicadores espaciais, dados censitários e camadas cartográficas prioritárias para monitoramento preventivo, análise de riscos hidrológicos e suporte à gestão de desastres no Município de Passo Fundo / RS.
        </div>

        <!-- 2. INDICADORES TERRITORIAIS E DE RISCO -->
        <h3 class="section-title">
          <span><span class="badge-num">1</span> INDICADORES TERRITORIAIS E DE RISCO</span>
          <span class="badge-blue">BASE OFICIAL INTEGRADA</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th style="width:40%;">Indicador Geoespacial</th>
              <th style="width:30%;">Valor Registrado</th>
              <th style="width:30%;">Fonte / Metadado</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Área Territorial Oficial</strong></td>
              <td><strong>${formatNumber(stats.totalAreaKm2, 2)} km²</strong></td>
              <td>IBGE / Limite Municipal Oficial</td>
            </tr>
            <tr>
              <td><strong>População Municipal Total</strong></td>
              <td><strong>${formatNumber(stats.totalPop, 0)} habitantes</strong></td>
              <td>Censo Demográfico IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Total de Domicílios Recenseados</strong></td>
              <td>${formatNumber(stats.totalDomicilios, 0)} domicílios</td>
              <td>Censo Demográfico IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Densidade Demográfica Média</strong></td>
              <td>${formatNumber(stats.avgDensity, 1)} hab/km²</td>
              <td>Cálculo Territorial Municipal</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Residências Identificadas na Faixa de 30 metros</strong></td>
              <td><strong style="color:#ea580c;">${formatNumber(totalResidencias, 0)} residências</strong></td>
              <td>Levantamento Cadastral de Risco (Rio Passo Fundo)</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Área da Faixa de 30 metros do Rio Passo Fundo</strong></td>
              <td><strong>${formatNumber(stats.app30mHa, 2)} hectares</strong> (${formatNumber(stats.app30mHa * 10000, 0)} m²)</td>
              <td>Faixa Legal de 30m (Lei Federal 12.651/2012)</td>
            </tr>
            <tr>
              <td><strong>Extensão do Curso Principal do Rio Passo Fundo</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Mapeamento Cartográfico Hidrográfico</td>
            </tr>
            <tr class="alert-row">
              <td><strong>Área Atingida pela Enchente de 2024</strong></td>
              <td><strong style="color:#dc2626;">${formatNumber(stats.floodAreaKm2, 2)} km² (${formatNumber(stats.floodAreaHa, 2)} hectares)</strong></td>
              <td><span class="badge-alert">Decreto Emergencial 57.600/2024 (ADA)</span></td>
            </tr>
            <tr>
              <td><strong>Extensão Total da Malha Hidrográfica</strong></td>
              <td>${formatNumber(stats.hidroKm, 2)} km (${formatNumber(3739, 0)} trechos fluviais)</td>
              <td>Hidrografia Municipal de Passo Fundo</td>
            </tr>
            <tr>
              <td><strong>Extensão Total da Infraestrutura Viária</strong></td>
              <td>${formatNumber(stats.totalViasKm, 2)} km</td>
              <td>Malha Viária Urbana, Rodovias e Estradas Rurais</td>
            </tr>
          </tbody>
        </table>

        <!-- 3. RIO PASSO FUNDO — ANÁLISE HIDROLÓGICA E TERRITORIAL -->
        <h3 class="section-title">
          <span><span class="badge-num">2</span> RIO PASSO FUNDO — ANÁLISE HIDROLÓGICA E TERRITORIAL</span>
          <span class="badge-orange">CORPO HÍDRICO PRINCIPAL</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Parâmetro Hidrológico</th>
              <th>Valor / Especificação</th>
              <th>Enquadramento Legal e Técnico</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Nome do Curso D'água</strong></td>
              <td><strong>Rio Passo Fundo (Curso Principal)</strong></td>
              <td>Bacia Hidrográfica do Rio Passo Fundo / Rio da Várzea</td>
            </tr>
            <tr>
              <td><strong>Extensão Analisada no Município</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong> (17.680 metros)</td>
              <td>Vetorização contínua da calha fluvial</td>
            </tr>
            <tr>
              <td><strong>Largura da Faixa de 30 metros Considerada</strong></td>
              <td><strong>30 metros em ambas as margens</strong></td>
              <td>Art. 4º da Lei Federal 12.651/2012 (Código Florestal)</td>
            </tr>
            <tr>
              <td><strong>Área Total da Faixa de 30 metros</strong></td>
              <td><strong>${formatNumber(stats.app30mHa, 2)} hectares</strong></td>
              <td>Polígono de Proteção Permanente ao longo do curso</td>
            </tr>
            <tr>
              <td><strong>Residências Edificadas na Faixa de 30 metros</strong></td>
              <td><strong>${formatNumber(totalResidencias, 0)} edificações</strong></td>
              <td>Pontos cadastrados com menor distância linear calculada</td>
            </tr>
            <tr>
              <td><strong>Base Aerofotogramétrica / Ortofotos</strong></td>
              <td><strong>5 mosaicos de alta resolução (GSD 5cm a 10cm)</strong></td>
              <td>Levantamento de Julho de 2026 (SIRGAS 2000 UTM 22S)</td>
            </tr>
          </tbody>
        </table>

        <!-- 4. LEVANTAMENTO DE RESIDÊNCIAS NA FAIXA DE 30 METROS -->
        <h3 class="section-title">
          <span><span class="badge-num">3</span> LEVANTAMENTO DE RESIDÊNCIAS NA FAIXA DE 30 METROS</span>
          <span class="badge-orange">${totalResidencias} EDIFICAÇÕES MAPEADAS</span>
        </h3>
        <div class="grid-2col">
          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Faixa de Distância à Calha</th>
                <th>Residências</th>
                <th>Grau de Vulnerabilidade</th>
              </tr>
            </thead>
            <tbody>
              <tr class="alert-row">
                <td><strong>Menor que 10 metros</strong></td>
                <td><strong>${countMenor10m} un</strong></td>
                <td><span class="badge-alert">Risco Muito Alto (Margem Crítica)</span></td>
              </tr>
              <tr class="highlight-row">
                <td><strong>Entre 10 e 20 metros</strong></td>
                <td><strong>${count10a20m} un</strong></td>
                <td><span class="badge-orange">Risco Alto (Proximidade Direta)</span></td>
              </tr>
              <tr>
                <td><strong>Entre 20 e 30 metros</strong></td>
                <td><strong>${count20a30m} un</strong></td>
                <td><span class="badge-blue">Risco Moderado (Faixa Limítrofe)</span></td>
              </tr>
              <tr>
                <td><strong>Acima de 30 metros (Entorno)</strong></td>
                <td><strong>${countMaior30m} un</strong></td>
                <td>Faixa de Transição e Amortecimento</td>
              </tr>
              <tr>
                <td><strong>TOTAL ANALISADO</strong></td>
                <td><strong>${totalResidencias} un</strong></td>
                <td><strong>100% dos pontos inventariados</strong></td>
              </tr>
            </tbody>
          </table>

          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Métrica de Proximidade Linear</th>
                <th>Valor em Metros</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Menor Distância Registrada</strong></td>
                <td><strong style="color:#dc2626;">${formatNumber(distMin, 2)} metros</strong> (Residência ID 110)</td>
              </tr>
              <tr>
                <td><strong>Distância Média das Residências</strong></td>
                <td><strong>${formatNumber(distMedia, 2)} metros</strong></td>
              </tr>
              <tr>
                <td><strong>Maior Distância no Inventário</strong></td>
                <td>${formatNumber(distMax, 2)} metros</td>
              </tr>
              <tr>
                <td><strong>Identificação Individual</strong></td>
                <td>Numeração cadastral única (ID 1 a ${totalResidencias})</td>
              </tr>
              <tr>
                <td><strong>Camada Utilizada no WebGIS</strong></td>
                <td><code>Residências na Faixa de 30 metros (318 Pontos)</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 5. ENCHENTE 2024 — ÁREA DE IMPACTO -->
        <h3 class="section-title">
          <span><span class="badge-num">4</span> ENCHENTE 2024 — ÁREA DE IMPACTO E DIAGNÓSTICO DE VULNERABILIDADE</span>
          <span class="badge-alert">DECRETO 57.600/2024</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Parâmetro de Impacto</th>
              <th>Dimensão / Estimativa</th>
              <th>Contexto Operacional da Defesa Civil</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>Mancha de Inundação Oficial (ADA)</strong></td>
              <td><strong>${formatNumber(stats.floodAreaKm2, 2)} km²</strong> (${formatNumber(stats.floodAreaHa, 2)} hectares)</td>
              <td>Mapeamento oficial pós-evento extremo de 2024</td>
            </tr>
            <tr>
              <td><strong>Setores Censitários no Perímetro</strong></td>
              <td><strong>14 setores censitários interceptados</strong></td>
              <td>Áreas com cotas altimétricas críticas na planície de inundação</td>
            </tr>
            <tr>
              <td><strong>População Potencialmente Exposta</strong></td>
              <td><strong>~1.450 a 2.100 moradores</strong> no perímetro direto</td>
              <td>Estimativa baseada nos microdados setoriais IBGE 2022</td>
            </tr>
            <tr>
              <td><strong>Domicílios no Entorno / Risco</strong></td>
              <td><strong>~580 a 820 domicílios</strong></td>
              <td>Cruzamento espacial da mancha ADA com malha urbana</td>
            </tr>
            <tr>
              <td><strong>Bairros com Trechos Atingidos</strong></td>
              <td>Petrópolis, Vila Luiza, Lucas Araújo, São Cristóvão e áreas ribeirinhas</td>
              <td>Monitoramento preventivo prioritário nas réguas fluviométricas</td>
            </tr>
          </tbody>
        </table>

        <!-- 6. MALHA HIDROGRÁFICA MUNICIPAL -->
        <h3 class="section-title">
          <span><span class="badge-num">5</span> MALHA HIDROGRÁFICA MUNICIPAL</span>
          <span class="badge-blue">BACIAS E CURSOS D'ÁGUA</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Componente Hidrográfico</th>
              <th>Extensão Linear</th>
              <th>Detalhamento</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Total da Rede Hidrográfica Mapeada</strong></td>
              <td><strong>${formatNumber(stats.hidroKm, 2)} km</strong></td>
              <td>3.739 segmentos fluviais classificados</td>
            </tr>
            <tr>
              <td><strong>Rio Passo Fundo (Calha Principal)</strong></td>
              <td><strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Curso receptor principal da drenagem urbana</td>
            </tr>
            <tr>
              <td><strong>Arroios, Córregos e Afluentes</strong></td>
              <td><strong>${formatNumber(stats.hidroKm - stats.rioPassoFundoKm, 2)} km</strong></td>
              <td>Arroio Miranda, Arroio Santo Antônio, Arroio Jerônimo Coelho e tributários</td>
            </tr>
          </tbody>
        </table>

        <!-- 7. INFRAESTRUTURA VIÁRIA E TRANSPORTES -->
        <h3 class="section-title">
          <span><span class="badge-num">6</span> INFRAESTRUTURA VIÁRIA E MOBILIDADE</span>
          <span>MALHA DE ACESSO E EVACUAÇÃO</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Tipo de Infraestrutura</th>
              <th>Extensão Linear</th>
              <th>Importância Operacional para Emergências</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Malha Viária Urbana</strong></td>
              <td><strong>${formatNumber(stats.viariaKm, 2)} km</strong> (11.595 trechos)</td>
              <td>Acesso a bairros, rotas de socorro e atendimento primário</td>
            </tr>
            <tr>
              <td><strong>Estradas Municipais Rurais</strong></td>
              <td><strong>${formatNumber(stats.estradasMunicipaisKm, 2)} km</strong> (164 trechos)</td>
              <td>Conexão com distritos do interior e escoamento</td>
            </tr>
            <tr>
              <td><strong>Rodovias Estaduais (ERS)</strong></td>
              <td><strong>${formatNumber(stats.rodoviaEstadualKm, 2)} km</strong></td>
              <td>ERS-135, ERS-324 (rotas intermunicipais estratégicas)</td>
            </tr>
            <tr>
              <td><strong>Rodovias Federais (BR)</strong></td>
              <td><strong>${formatNumber(stats.rodoviaFederalKm, 2)} km</strong></td>
              <td>BR-285, BR-153 (eixos de transporte regional)</td>
            </tr>
            <tr>
              <td><strong>Malha Ferroviária</strong></td>
              <td><strong>${formatNumber(stats.ferroviaKm, 2)} km</strong></td>
              <td>Linha Férrea ALL / Rumo Logística</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>TOTAL DA MALHA VIÁRIA</strong></td>
              <td><strong>${formatNumber(stats.totalViasKm, 2)} km</strong></td>
              <td>Rede completa de circulação do Município de Passo Fundo</td>
            </tr>
          </tbody>
        </table>

        <!-- 8. INDICADORES DEMOGRÁFICOS DO CENSO 2022 -->
        <h3 class="section-title">
          <span><span class="badge-num">7</span> CENSO DEMOGRÁFICO & INDICADORES SETORIAIS (IBGE 2022)</span>
          <span class="badge-blue">DISTRIBUIÇÃO POPULACIONAL</span>
        </h3>
        <div class="grid-2col">
          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Top 5 Bairros Mais Populosos</th>
                <th>População (hab)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.bairrosList.slice(0, 5).map(b => `
                <tr>
                  <td><strong>${b.name}</strong></td>
                  <td>${formatNumber(b.pop, 0)} hab</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <table class="kpi-table" style="margin-bottom:0;">
            <thead>
              <tr>
                <th>Distrito Municipal</th>
                <th>População (hab)</th>
              </tr>
            </thead>
            <tbody>
              ${stats.distritosList.slice(0, 5).map(d => `
                <tr>
                  <td><strong>${d.name}</strong></td>
                  <td>${formatNumber(d.pop, 0)} hab</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 8. EXPOSIÇÃO E COBERTURA DE PROTEÇÃO (SGB x REDE DE ABRIGOS) -->
        <h3 class="section-title">
          <span><span class="badge-num">8</span> EXPOSIÇÃO E COBERTURA DE PROTEÇÃO</span>
          <span class="badge-orange">DIAGNÓSTICO SGB 2025 x REDE DE ABRIGOS</span>
        </h3>
        <table class="kpi-table">
          <thead>
            <tr>
              <th>Dimensão Analítica</th>
              <th>Total / Percentual</th>
              <th>Detalhamento Geotécnico e Operacional</th>
            </tr>
          </thead>
          <tbody>
            <tr class="alert-row">
              <td><strong>População Total em Áreas de Risco</strong></td>
              <td><strong>2.468 habitantes</strong></td>
              <td>Mapeamento oficial do Serviço Geológico do Brasil (SGB, 2025)</td>
            </tr>
            <tr class="highlight-row">
              <td><strong>Edificações Mapeadas em Risco</strong></td>
              <td><strong>617 unidades</strong> (25 setores)</td>
              <td>Área territorial delimitada de 32,95 ha (Média: 4,0 hab/edif)</td>
            </tr>
            <tr>
              <td><strong>Distribuição por Grau de Risco</strong></td>
              <td><strong>21 Alto (81,8%) | 4 Muito Alto (18,2%)</strong></td>
              <td>505 edif. em Risco Alto (R3) e 112 edif. em Risco Muito Alto (R4)</td>
            </tr>
            <tr>
              <td><strong>Distribuição por Vulnerabilidade</strong></td>
              <td><strong>16 Alta (71,3%) | 9 Média (28,7%)</strong></td>
              <td>440 edif. com vulnerabilidade construtiva e ambiental alta</td>
            </tr>
            <tr>
              <td><strong>Cobertura Geral de Abrigos (Raio de 2 km)</strong></td>
              <td><strong style="color:#16a34a;">99,8% de atendimento</strong></td>
              <td>2.464 moradores (616 edif.) contemplados no raio de 2.000m dos 17 abrigos</td>
            </tr>
            <tr>
              <td><strong>Cobertura Imediata a Pé (Raio de 1 km)</strong></td>
              <td><strong>66,3% de atendimento direto</strong></td>
              <td>1.636 moradores (409 edif.) a menos de 1.000m de um abrigo municipal</td>
            </tr>
            <tr>
              <td><strong>População Fora do Raio Imediato de 1 km</strong></td>
              <td><strong>832 moradores (33,7%)</strong></td>
              <td>208 edif. situadas entre 1 km e 2 km de deslocamento até a estrutura de acolhimento</td>
            </tr>
            <tr>
              <td><strong>Top 3 Setores Mais Críticos (IPP*)</strong></td>
              <td><strong>Ocupação Floresta, Beco Manoel Portela e Entrerios</strong></td>
              <td>Setores prioritários identificados pelo Índice de Prioridade de Proteção (IPP)</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size:11px; color:#64748b; margin-top:-6px; margin-bottom:16px;">
          *Fonte dos dados: Serviço Geológico do Brasil (SGB), 2025; Defesa Civil de Passo Fundo e demais fontes oficiais do portal.
        </div>

        <!-- 9. COMPOSIÇÃO CARTOGRÁFICA -->
        ${mapSnapshot ? `
          <h3 class="section-title">
            <span><span class="badge-num">9</span> COMPOSIÇÃO CARTOGRÁFICA DA SITUAÇÃO OPERACIONAL</span>
            <span class="badge-blue">MAPA GERADO NO MOMENTO DA EMISSÃO</span>
          </h3>
          <div class="map-report-card">
            <img src="${mapSnapshot}" alt="Composição Cartográfica WebGIS Defesa Civil Passo Fundo" class="map-report-img" />
            <div class="map-report-caption">
              <span><strong>Visualização Cartográfica:</strong> Projeção UTM Fuso 22S &bull; Datum SIRGAS 2000 (EPSG:31982)</span>
              <span><strong>Passo Fundo/RS</strong> &bull; Sistema WebGIS Defesa Civil</span>
            </div>
          </div>
        ` : ''}

        <!-- 11. SÍNTESE TÉCNICA OPERACIONAL DINÂMICA -->
        <h3 class="section-title">
          <span><span class="badge-num">11</span> SÍNTESE TÉCNICA E RECOMENDAÇÕES OPERACIONAIS</span>
          <span class="badge-orange">PARECER TÉCNICO</span>
        </h3>
        <div class="synthesis-card">
          <p>
            No território do Município de Passo Fundo / RS, com área de <strong>${formatNumber(stats.totalAreaKm2, 2)} km²</strong> e população de <strong>${formatNumber(stats.totalPop, 0)} habitantes</strong> (Censo 2022), foram cadastradas e georreferenciadas <strong>${formatNumber(totalResidencias, 0)} residências</strong> situadas no interior e entorno imediato da Faixa de 30 metros do Rio Passo Fundo.
          </p>
          <p style="margin-top:8px;">
            A análise métrica de proximidade indica que <strong>${countMenor10m} residências</strong> encontram-se a menos de 10 metros da margem do rio (menor distância aferida: <strong>${formatNumber(distMin, 2)} m</strong>, ID 110), e <strong>${count10a20m} residências</strong> situam-se na faixa crítica entre 10 e 20 metros. A distância média das edificações até a calha do rio é de <strong>${formatNumber(distMedia, 2)} metros</strong>.
          </p>
          <p style="margin-top:8px;">
            A mancha de inundação do evento extremo de 2024 totalizou <strong>${formatNumber(stats.floodAreaKm2, 2)} km² (${formatNumber(stats.floodAreaHa, 2)} hectares)</strong>, demonstrando a necessidade de manter o monitoramento contínuo das réguas hidrológicas ao longo dos <strong>${formatNumber(stats.rioPassoFundoKm, 2)} km</strong> do curso principal e dos <strong>${formatNumber(stats.hidroKm, 2)} km</strong> de malha hídrica municipal.
          </p>
          <p style="margin-top:8px;">
            A análise integrada de <strong>Exposição e Cobertura de Proteção</strong> demonstra que os <strong>25 setores de risco mapeados pelo SGB (2025)</strong>, englobando <strong>617 edificações e 2.468 moradores</strong>, contam com <strong>99,8% de cobertura da rede municipal de abrigos no raio de 2 km (2.464 moradores)</strong> e <strong>66,3% de cobertura imediata no raio de 1 km (1.636 moradores)</strong>, permitindo resposta célere em situações de contingência e evacuação.
          </p>
        </div>

        <!-- 12. INFORMAÇÕES DE CONTATO DA DEFESA CIVIL -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <strong style="color:#0f172a; font-size:12.5px;">Sede da Defesa Civil Municipal de Passo Fundo:</strong><br>
            <span style="color:#475569;">Av. Brasil Leste, 1528 - Petrópolis, Passo Fundo - RS, 99050-144</span>
          </div>
          <div style="text-align: right;">
            <strong style="color:#0f172a;">Telefone Oficial:</strong> <span style="color:#0284c7; font-weight:700;">+55 54 9194-0449</span><br>
            <span style="color:#dc2626; font-weight:700;">Emergência 24h: 199 / 193 / 192</span>
          </div>
        </div>

        <!-- 13. IDENTIFICAÇÃO DE AUTORIA TÉCNICA -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #ff7800; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 12px; color: #334155;">
          <strong style="color:#0f172a; font-size:12px; display:block; margin-bottom:2px;">Elaboração técnica:</strong>
          <strong style="color:#0f172a; font-size:12.5px;">Vagner A. Duarte – Geógrafo</strong><br>
        </div>

        <!-- 14. FONTES DOS DADOS -->
        <h3 class="section-title">
          <span><span class="badge-num">12</span> FONTES DOS DADOS E METADADOS</span>
          <span class="badge-blue">TRANSPARÊNCIA PÚBLICA</span>
        </h3>
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; font-size: 11.5px; color: #334155; line-height: 1.5;">
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Instituto Nacional de Meteorologia (INMET):</strong>
            Previsão do tempo municipal para 120 horas, avisos de tempo severo (Alertas2) e monitoramento da Estação Automática Passo Fundo (A831).
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Defesa Civil do Rio Grande do Sul:</strong>
            Alertas meteorológicos estaduais, boletins hidrometeorológicos e rede telemétrica de monitoramento.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• CPTEC / INPE:</strong>
            Modelos numéricos de previsão de tempo, radar meteorológico e imagens de satélite.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Serviço Geológico do Brasil (SGB, 2025):</strong>
            Mapeamento de Áreas de Risco Geológico e Hidrológico e Domicílios em Risco (25 setores e 1.115 domicílios inventariados).
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• IBGE — Censo Demográfico 2022:</strong>
            Malhas territoriais e informações censitárias utilizadas nas análises, quando aplicável.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Defesa Civil de Passo Fundo:</strong>
            Informações e dados temáticos relacionados à Defesa Civil, rede oficial de 17 abrigos, ZPHs, áreas de risco e decretos municipais de emergência.
          </div>
          <div style="margin-bottom: 8px;">
            <strong style="color: #0f172a;">• Prefeitura Municipal de Passo Fundo:</strong>
            Bases cartográficas, levantamentos, mapeamentos e informações geoespaciais municipais utilizadas no portal, conforme cada camada.
          </div>
          <div>
            <strong style="color: #0f172a;">• Outras fontes:</strong>
            Quando uma camada utilizar fonte diferente, indicar sua origem especificamente nos metadados ou na descrição da respectiva camada.
          </div>
        </div>

        <!-- 14. AVISO INSTITUCIONAL -->
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #2563eb; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 11px; color: #1e3a8a; line-height: 1.5;">
          <strong>Aviso:</strong> Este relatório possui caráter exclusivamente informativo e institucional. As informações apresentadas são baseadas nas fontes e bases de dados disponíveis no momento da elaboração e podem estar sujeitas a atualizações. A utilização das informações deve considerar sua fonte, escala, data de atualização e finalidade.
        </div>

        <div style="font-size:11px; color:#64748b; margin-bottom:20px;">
          <strong>Camadas Cartográficas Ativas na Emissão:</strong> ${activeLayers.join(', ') || 'Todas as camadas temáticas padrão'}.
        </div>

        <!-- CONTATOS OFICIAIS DA DEFESA CIVIL -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-left: 4px solid #ff7800; border-radius: 6px; padding: 12px 16px; margin-bottom: 24px; font-size: 11.5px; color: #334155; line-height: 1.5; page-break-inside: avoid;">
          <div style="font-weight: 800; font-size: 12.5px; color: #0f172a; margin-bottom: 8px;">
            CONTATOS — DEFESA CIVIL DE PASSO FUNDO
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <strong style="color: #ea580c; display: block; margin-bottom: 4px; font-size: 11.5px;">Defesa Civil de Passo Fundo:</strong>
              <div>📱 <strong>WhatsApp:</strong> <a href="https://wa.me/5554991940449" target="_blank" style="color: #0284c7; text-decoration: none; font-weight: 700;">(54) 99194-0449</a></div>
              <div>✉️ <strong>E-mail:</strong> <a href="mailto:defesacivil@pmpf.rs.gov.br" style="color: #0284c7; text-decoration: none;">defesacivil@pmpf.rs.gov.br</a></div>
              <div>☎️ <strong>Telefones:</strong> <a href="tel:+555433167108" style="color: #0284c7; text-decoration: none;">(54) 3316-7108</a> / <a href="tel:+555433133768" style="color: #0284c7; text-decoration: none;">(54) 3313-3768</a></div>
            </div>
            <div>
              <strong style="color: #ea580c; display: block; margin-bottom: 4px; font-size: 11.5px;">Coordenadoria de Administração e Planejamento:</strong>
              <div>✉️ <strong>E-mail:</strong> <a href="mailto:capseg@pmpf.rs.gov.br" style="color: #0284c7; text-decoration: none;">capseg@pmpf.rs.gov.br</a></div>
              <div>☎️ <strong>Telefone:</strong> <a href="tel:+555433138458" style="color: #0284c7; text-decoration: none;">(54) 3313-8458</a></div>
            </div>
          </div>
        </div>

        <!-- ASSINATURA INSTITUCIONAL -->
        <div class="signature-box">
          <div style="min-width: 320px; max-width: 380px;">
            <div class="signature-line">COORDENADORIA MUNICIPAL DE DEFESA CIVIL</div>
            <div class="signature-sub">Município de Passo Fundo / RS</div>
          </div>
        </div>

        <!-- RODAPÉ FINAL -->
        <div class="footer-info">
          <span>Defesa Civil de Passo Fundo/RS &bull; Telefone de Emergência: 199</span>
          <span>Documento emitido automaticamente pelo Portal Geoespacial WebGIS &bull; SIRGAS 2000 UTM 22S</span>
        </div>
      </body>
      </html>
    `);

    reportWindow.document.close();
    Notification.success('Boletim de Situação gerado com sucesso!');
  }
}
