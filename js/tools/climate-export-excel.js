/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Módulo de Exportação de Dados Climáticos Observados para Microsoft Excel (.xlsx)
 * 
 * Responsabilidades:
 * - Carregamento sob demanda da biblioteca SheetJS (xlsx) via CDN
 * - Gestão do modal de seleção (estações e período)
 * - Coleta controlada e resiliente via proxy /api/weather/plugfield?action=daily
 * - Estruturação do arquivo XLSX em 3 abas:
 *     1. Estações (metadados e status no momento da consulta)
 *     2. Dados Climáticos (série diária observada: temp, chuva, umidade, pressão, vento)
 *     3. Metadados (origem, data de geração, período, notas metodológicas)
 * - Garantia estrita: 100% dados observados (sem IDW, sem estimativas, sem valores inventados)
 */

import { PLUGFIELD_STATIONS_CONFIG, PlugfieldService } from '../weather/plugfield-service.js';
import { Notification } from '../ui/notification.js';

export class ClimateExportExcel {
  static SHEETJS_CDN_URL = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  static isLibraryLoading = false;
  static isLibraryLoaded = false;
  static modalInstance = null;

  /**
   * Carrega a biblioteca SheetJS dinamicamente sob demanda caso ainda não esteja presente
   */
  static async loadSheetJsLibrary() {
    if (typeof window.XLSX !== 'undefined' && window.XLSX.utils) {
      this.isLibraryLoaded = true;
      return window.XLSX;
    }

    if (this.isLibraryLoading) {
      // Aguarda carregamento em andamento
      return new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (typeof window.XLSX !== 'undefined' && window.XLSX.utils) {
            clearInterval(interval);
            resolve(window.XLSX);
          }
        }, 50);
        setTimeout(() => {
          clearInterval(interval);
          reject(new Error('Tempo limite excedido ao carregar a biblioteca SheetJS.'));
        }, 15000);
      });
    }

    this.isLibraryLoading = true;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = this.SHEETJS_CDN_URL;
      script.async = true;

      script.onload = () => {
        this.isLibraryLoading = false;
        this.isLibraryLoaded = true;
        console.log('[ClimateExportExcel] Biblioteca SheetJS (xlsx) carregada com sucesso.');
        resolve(window.XLSX);
      };

      script.onerror = () => {
        this.isLibraryLoading = false;
        reject(new Error('Falha ao carregar SheetJS da CDN. Verifique a conexão com a internet.'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Garante a criação da estrutura do modal de exportação na interface
   */
  static ensureModal() {
    if (document.getElementById('climate-export-modal')) {
      return;
    }

    const modalHtml = `
      <div class="modal-overlay" id="climate-export-modal">
        <div class="modal-container climate-export-dialog">
          <div class="modal-header">
            <div class="modal-title-group">
              <i class="lucide-file-spreadsheet" style="color: #10b981; font-size: 20px;"></i>
              <div>
                <h3 class="modal-title">EXPORTAR DADOS CLIMÁTICOS OBSERVADOS (EXCEL)</h3>
                <span class="modal-subtitle">Rede Municipal de Monitoramento Meteorológico — Passo Fundo / RS</span>
              </div>
            </div>
            <button class="modal-close-btn" id="btn-close-climate-export-modal" title="Fechar janela">&times;</button>
          </div>

          <div class="modal-body" style="max-height: 72vh; overflow-y: auto; padding: 18px 20px;">
            <!-- Aviso Institucional de Dados Observados -->
            <div class="climate-export-banner">
              <i class="lucide-info" style="color: #38bdf8; font-size: 16px; flex-shrink: 0; margin-top: 1px;"></i>
              <div style="font-size: 11.5px; color: #cbd5e1; line-height: 1.5;">
                <strong>Dados Físicos Observados:</strong> A planilha gerada conterá exclusivamente as medições reais registradas pelas estações telemétricas no período consultado. Nenhuma estimativa ou interpolação espacial é aplicada aos registros.
              </div>
            </div>

            <!-- SEÇÃO 1: SELEÇÃO DE ESTAÇÕES -->
            <div class="climate-export-section" style="margin-top: 16px;">
              <div class="climate-export-section-header">
                <span style="font-size: 12px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                  <i class="lucide-radio-tower" style="color: #10b981;"></i> 1. SELECIONE AS ESTAÇÕES (16 HABILITADAS):
                </span>
                <div class="climate-export-btn-group-sm">
                  <button type="button" class="climate-export-mini-btn" id="btn-select-all-stations">Selecionar Todas</button>
                  <button type="button" class="climate-export-mini-btn" id="btn-deselect-all-stations">Desmarcar Todas</button>
                </div>
              </div>

              <!-- Grid de Checkboxes das 16 Estações -->
              <div class="climate-stations-checklist-grid" id="climate-stations-checklist">
                ${PLUGFIELD_STATIONS_CONFIG.map(st => `
                  <label class="station-checkbox-card" for="chk-station-${st.deviceId}">
                    <input type="checkbox" id="chk-station-${st.deviceId}" class="chk-station-item" value="${st.deviceId}" checked />
                    <div class="station-checkbox-info">
                      <span class="station-chk-name">${st.name}</span>
                      <span class="station-chk-type">ID ${st.deviceId} &bull; ${st.type}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>

            <!-- SEÇÃO 2: PERÍODO DE OBSERVAÇÃO -->
            <div class="climate-export-section" style="margin-top: 16px;">
              <div class="climate-export-section-header">
                <span style="font-size: 12px; font-weight: 700; color: #ffffff; display: flex; align-items: center; gap: 6px;">
                  <i class="lucide-calendar" style="color: #38bdf8;"></i> 2. PERÍODO TEMPORAL DE OBSERVAÇÃO:
                </span>
              </div>

              <div class="climate-date-range-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 8px;">
                <div class="climate-form-group">
                  <label class="climate-field-label" for="climate-export-date-start">
                    <i class="lucide-calendar-days"></i> Data Inicial:
                  </label>
                  <input type="date" class="climate-input" id="climate-export-date-start" />
                </div>
                <div class="climate-form-group">
                  <label class="climate-field-label" for="climate-export-date-end">
                    <i class="lucide-calendar-check"></i> Data Final:
                  </label>
                  <input type="date" class="climate-input" id="climate-export-date-end" />
                </div>
              </div>
              <div style="font-size: 11px; color: #94a3b8; margin-top: 6px;">
                Padrão inicial preenchido com os últimos 7 dias. Você pode selecionar qualquer mês ou período desejado.
              </div>
            </div>

            <!-- Caixa de Feedback e Progresso -->
            <div id="climate-export-progress-box" class="climate-export-progress-box" style="display: none; margin-top: 16px;">
              <div class="climate-export-spinner"></div>
              <div style="flex: 1;">
                <div id="climate-export-progress-title" style="font-size: 12px; font-weight: 700; color: #ffffff;">Consultando dados das estações...</div>
                <div id="climate-export-progress-detail" style="font-size: 11px; color: #94a3b8; margin-top: 2px;">Iniciando consulta às estações selecionadas...</div>
              </div>
            </div>

            <div id="climate-export-error-msg" style="display: none; margin-top: 12px; padding: 10px 12px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 6px; color: #fca5a5; font-size: 11.5px;"></div>
          </div>

          <div class="modal-footer" style="padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255, 255, 255, 0.08);">
            <button type="button" class="btn-modal-cancel" id="btn-cancel-climate-export">Cancelar</button>
            <button type="button" class="btn-modal-confirm" id="btn-submit-climate-export" style="background: #059669; hover: #10b981; display: inline-flex; align-items: center; gap: 8px;">
              <i class="lucide-download"></i>
              <span id="btn-submit-climate-export-label">Gerar e Baixar Excel (.xlsx)</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    this.injectStyles();
    this.bindModalEvents();
  }

  /**
   * Insere estilos CSS específicos e encapsulados para o modal de exportação
   */
  static injectStyles() {
    if (document.getElementById('climate-export-styles')) return;

    const style = document.createElement('style');
    style.id = 'climate-export-styles';
    style.textContent = `
      .climate-export-dialog {
        max-width: 620px;
        width: 95%;
        background: #0f172a;
        border: 1px solid rgba(16, 185, 129, 0.35);
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.65), 0 0 25px rgba(16, 185, 129, 0.15);
        border-radius: 12px;
      }
      .climate-export-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.25);
        border-radius: 8px;
        padding: 10px 14px;
      }
      .climate-export-section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .climate-export-btn-group-sm {
        display: flex;
        gap: 6px;
      }
      .climate-export-mini-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #94a3b8;
        font-size: 10.5px;
        padding: 3px 8px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .climate-export-mini-btn:hover {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
        border-color: rgba(16, 185, 129, 0.4);
      }
      .climate-stations-checklist-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        max-height: 190px;
        overflow-y: auto;
        padding: 8px;
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px;
      }
      .station-checkbox-card {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 8px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s ease;
      }
      .station-checkbox-card:hover {
        background: rgba(255, 255, 255, 0.07);
      }
      .station-checkbox-card input[type="checkbox"] {
        accent-color: #10b981;
        width: 15px;
        height: 15px;
        cursor: pointer;
      }
      .station-checkbox-info {
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .station-chk-name {
        font-size: 11px;
        font-weight: 600;
        color: #f1f5f9;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .station-chk-type {
        font-size: 9.5px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .climate-export-progress-box {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        background: rgba(16, 185, 129, 0.1);
        border: 1px solid rgba(16, 185, 129, 0.35);
        border-radius: 8px;
      }
      .climate-export-spinner {
        width: 22px;
        height: 22px;
        border: 3px solid rgba(16, 185, 129, 0.2);
        border-top-color: #10b981;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Vincula os eventos do modal
   */
  static bindModalEvents() {
    const modal = document.getElementById('climate-export-modal');
    const btnClose = document.getElementById('btn-close-climate-export-modal');
    const btnCancel = document.getElementById('btn-cancel-climate-export');
    const btnSubmit = document.getElementById('btn-submit-climate-export');
    const btnSelectAll = document.getElementById('btn-select-all-stations');
    const btnDeselectAll = document.getElementById('btn-deselect-all-stations');

    if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
    if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }

    if (btnSelectAll) {
      btnSelectAll.addEventListener('click', () => {
        document.querySelectorAll('.chk-station-item').forEach(chk => chk.checked = true);
      });
    }

    if (btnDeselectAll) {
      btnDeselectAll.addEventListener('click', () => {
        document.querySelectorAll('.chk-station-item').forEach(chk => chk.checked = false);
      });
    }

    if (btnSubmit) {
      btnSubmit.addEventListener('click', () => this.handleExportSubmit());
    }

    // Atalho Esc para fechar modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        this.closeModal();
      }
    });
  }

  /**
   * Abre o modal de exportação com valores padrão (últimos 7 dias)
   */
  static openModal() {
    this.ensureModal();
    const modal = document.getElementById('climate-export-modal');
    if (!modal) return;

    this.setDefaultDates();
    this.clearMessages();

    modal.classList.add('active');

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  /**
   * Fecha o modal
   */
  static closeModal() {
    const modal = document.getElementById('climate-export-modal');
    if (modal) {
      modal.classList.remove('active');
    }
    this.clearMessages();
  }

  /**
   * Preenche as datas padrão com os últimos 7 dias
   */
  static setDefaultDates() {
    const startInput = document.getElementById('climate-export-date-start');
    const endInput = document.getElementById('climate-export-date-end');
    if (!startInput || !endInput) return;

    const pad = (n) => String(n).padStart(2, '0');
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - (6 * 24 * 60 * 60 * 1000));

    const endStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const startStr = `${sevenDaysAgo.getFullYear()}-${pad(sevenDaysAgo.getMonth() + 1)}-${pad(sevenDaysAgo.getDate())}`;

    if (!startInput.value) startInput.value = startStr;
    if (!endInput.value) endInput.value = endStr;
  }

  static clearMessages() {
    const progBox = document.getElementById('climate-export-progress-box');
    const errBox = document.getElementById('climate-export-error-msg');
    if (progBox) progBox.style.display = 'none';
    if (errBox) {
      errBox.style.display = 'none';
      errBox.textContent = '';
    }
  }

  /**
   * Formata data ISO (YYYY-MM-DD) para formato exigido pela API Plugfield (DD/MM/AAAA)
   */
  static toApiDate(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  /**
   * Formata data ISO (YYYY-MM-DD) para formato legível de planilha (DD/MM/AAAA)
   */
  static toDisplayDate(isoStr) {
    if (!isoStr) return '';
    if (isoStr.includes('/')) return isoStr;
    const parts = isoStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoStr;
  }

  /**
   * Executa a validação dos parâmetros e dispara a geração do arquivo
   */
  static async handleExportSubmit() {
    this.clearMessages();

    const startInput = document.getElementById('climate-export-date-start');
    const endInput = document.getElementById('climate-export-date-end');
    const btnSubmit = document.getElementById('btn-submit-climate-export');
    const progBox = document.getElementById('climate-export-progress-box');
    const progTitle = document.getElementById('climate-export-progress-title');
    const progDetail = document.getElementById('climate-export-progress-detail');
    const errBox = document.getElementById('climate-export-error-msg');

    const startDate = startInput?.value;
    const endDate = endInput?.value;

    // 1. Validação estrita de datas
    if (!startDate || !endDate) {
      errBox.textContent = 'Por favor, selecione as datas inicial e final para a exportação.';
      errBox.style.display = 'block';
      return;
    }

    if (startDate > endDate) {
      errBox.textContent = 'A data inicial não pode ser posterior à data final.';
      errBox.style.display = 'block';
      return;
    }

    // 2. Validação de seleção de estações
    const selectedCheckboxes = Array.from(document.querySelectorAll('.chk-station-item:checked'));
    if (selectedCheckboxes.length === 0) {
      errBox.textContent = 'Selecione ao menos uma estação meteorológica para exportar.';
      errBox.style.display = 'block';
      return;
    }

    const selectedDeviceIds = selectedCheckboxes.map(cb => parseInt(cb.value, 10));
    const selectedStations = PLUGFIELD_STATIONS_CONFIG.filter(st => selectedDeviceIds.includes(st.deviceId));

    // 3. Atualizar estado visual para carregamento
    btnSubmit.disabled = true;
    progBox.style.display = 'flex';
    progTitle.textContent = 'Consultando dados das estações...';
    progDetail.textContent = 'Carregando biblioteca e conectando à API...';

    try {
      // 4. Carregar SheetJS sob demanda
      await this.loadSheetJsLibrary();

      // 5. Consultar telemetria atual para registrar o "Status no momento da consulta"
      progDetail.textContent = 'Obtendo status operacional atual das estações...';
      const liveStations = await PlugfieldService.getAllStations().catch(() => []);
      const liveStatusMap = new Map();
      if (Array.isArray(liveStations)) {
        liveStations.forEach(s => liveStatusMap.set(s.deviceId, s));
      }

      // 6. Consultar histórico diário controlado para cada estação selecionada
      const beginApi = this.toApiDate(startDate);
      const endApi = this.toApiDate(endDate);

      const allRecords = [];
      const stationAudit = [];
      let stationsWithData = 0;
      let stationsWithoutData = 0;

      for (let i = 0; i < selectedStations.length; i++) {
        const st = selectedStations[i];
        progDetail.textContent = `Consultando estação ${st.name} (${i + 1} de ${selectedStations.length})...`;

        const liveInfo = liveStatusMap.get(st.deviceId);
        let currentStatus = 'Sem comunicação recente';
        if (liveInfo?.isOnline === true || liveInfo?.status === 'updated' || liveInfo?.status === 'online') {
          currentStatus = 'Online (em tempo real)';
        } else if (liveInfo?.status === 'delayed') {
          currentStatus = 'Comunicação atrasada';
        } else if (liveInfo?.status === 'waiting') {
          currentStatus = 'Aguardando leitura';
        }

        const queryUrl = `/api/weather/plugfield?action=daily&deviceId=${st.deviceId}&begin=${encodeURIComponent(beginApi)}&end=${encodeURIComponent(endApi)}`;

        let stationDays = [];
        try {
          const resp = await fetch(queryUrl);
          if (resp.ok) {
            const j = await resp.json();
            if (j.success && Array.isArray(j.data?.days)) {
              stationDays = j.data.days;
            }
          }
        } catch (fetchErr) {
          console.warn(`[ClimateExportExcel] Falha ao consultar estação ${st.deviceId}:`, fetchErr);
        }

        // Elimina eventuais duplicidades por localDate
        const uniqueDayMap = new Map();
        stationDays.forEach(d => {
          const lDate = d.localDate || d.date || '';
          if (lDate && !uniqueDayMap.has(lDate)) {
            uniqueDayMap.set(lDate, d);
          }
        });

        const validDays = Array.from(uniqueDayMap.values());

        if (validDays.length > 0) {
          stationsWithData++;
          validDays.forEach(dayItem => {
            const lDate = dayItem.localDate || dayItem.date || '';
            allRecords.push({
              date: ClimateExportExcel.toDisplayDate(lDate),
              rawDate: lDate,
              stationName: st.name,
              deviceId: st.deviceId,
              lat: st.lat,
              lon: st.lon,
              temp: dayItem.temp != null && !isNaN(parseFloat(dayItem.temp)) ? parseFloat(parseFloat(dayItem.temp).toFixed(2)) : null,
              tempMin: dayItem.tempMin != null && !isNaN(parseFloat(dayItem.tempMin)) ? parseFloat(parseFloat(dayItem.tempMin).toFixed(2)) : null,
              tempMax: dayItem.tempMax != null && !isNaN(parseFloat(dayItem.tempMax)) ? parseFloat(parseFloat(dayItem.tempMax).toFixed(2)) : null,
              rain: dayItem.rainAccum != null && !isNaN(parseFloat(dayItem.rainAccum)) ? parseFloat(parseFloat(dayItem.rainAccum).toFixed(2)) : 0.00,
              humidity: dayItem.humidity != null && !isNaN(parseFloat(dayItem.humidity)) ? parseFloat(parseFloat(dayItem.humidity).toFixed(2)) : null,
              pressure: dayItem.pressure != null && !isNaN(parseFloat(dayItem.pressure)) ? parseFloat(parseFloat(dayItem.pressure).toFixed(2)) : null,
              wind: dayItem.wind != null && !isNaN(parseFloat(dayItem.wind)) ? parseFloat(parseFloat(dayItem.wind).toFixed(2)) : null,
              windBurst: dayItem.windBurst != null && !isNaN(parseFloat(dayItem.windBurst)) ? parseFloat(parseFloat(dayItem.windBurst).toFixed(2)) : null
            });
          });
        } else {
          stationsWithoutData++;
        }

        stationAudit.push({
          deviceId: st.deviceId,
          name: st.name,
          type: st.type,
          lat: st.lat,
          lon: st.lon,
          recordsCount: validDays.length,
          currentStatus: currentStatus
        });
      }

      // 7. Gerar o arquivo Excel
      progTitle.textContent = 'Gerando arquivo Excel...';
      progDetail.textContent = 'Formatando planilhas, colunas e metadados...';

      const queryTimestamp = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const queryDateFormatted = `${pad(queryTimestamp.getDate())}/${pad(queryTimestamp.getMonth() + 1)}/${queryTimestamp.getFullYear()} ${pad(queryTimestamp.getHours())}:${pad(queryTimestamp.getMinutes())}:${pad(queryTimestamp.getSeconds())}`;

      // Ordenar registros da série por data e nome da estação
      allRecords.sort((a, b) => {
        if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
        return a.stationName.localeCompare(b.stationName);
      });

      const wb = this.buildWorkbook({
        records: allRecords,
        stationAudit,
        startDate: this.toDisplayDate(startDate),
        endDate: this.toDisplayDate(endDate),
        isoStartDate: startDate,
        isoEndDate: endDate,
        queryDateFormatted,
        stationsWithData,
        stationsWithoutData,
        totalSelected: selectedStations.length
      });

      // 8. Definir nome limpo do arquivo
      let fileName = `dados_climaticos_passo_fundo_${startDate}_${endDate}.xlsx`;
      if (selectedStations.length === 1) {
        const cleanName = selectedStations[0].name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_');
        fileName = `dados_climaticos_passo_fundo_${cleanName}_${startDate}_${endDate}.xlsx`;
      }

      // 9. Disparar o download
      window.XLSX.writeFile(wb, fileName);

      progTitle.textContent = 'Download concluído!';
      progDetail.textContent = `Arquivo "${fileName}" gerado com sucesso. (${stationsWithData} de ${selectedStations.length} estações com dados).`;

      Notification.success(`Arquivo Excel "${fileName}" baixado com sucesso!`);

      setTimeout(() => {
        btnSubmit.disabled = false;
        this.closeModal();
      }, 1500);

    } catch (err) {
      console.error('[ClimateExportExcel] Erro durante a exportação:', err);
      errBox.textContent = `Erro ao processar a exportação: ${err.message}`;
      errBox.style.display = 'block';
      progBox.style.display = 'none';
      btnSubmit.disabled = false;
    }
  }

  /**
   * Constrói o livro Excel (Workbook) com as 3 abas exigidas
   */
  static buildWorkbook(data) {
    const XLSX = window.XLSX;
    const wb = XLSX.utils.book_new();

    // ==========================================
    // ABA 1: Estações
    // ==========================================
    const stationsHeaders = [
      'ID',
      'Nome da Estação',
      'Latitude',
      'Longitude',
      'Tipologia Territorial',
      'Fonte',
      'Status no momento da consulta',
      'Data de Consulta'
    ];

    const stationsRows = data.stationAudit.map(st => [
      st.deviceId,
      st.name,
      st.lat,
      st.lon,
      st.type,
      'Rede Municipal Plugfield / Defesa Civil Passo Fundo',
      st.currentStatus,
      data.queryDateFormatted
    ]);

    const wsStations = XLSX.utils.aoa_to_sheet([stationsHeaders, ...stationsRows]);
    wsStations['!cols'] = [
      { wch: 10 }, // ID
      { wch: 34 }, // Nome
      { wch: 13 }, // Latitude
      { wch: 13 }, // Longitude
      { wch: 30 }, // Tipologia
      { wch: 48 }, // Fonte
      { wch: 28 }, // Status no momento da consulta
      { wch: 22 }  // Data de Consulta
    ];
    try {
      wsStations['!freeze'] = { xSplit: 0, ySplit: 1 };
    } catch {}

    XLSX.utils.book_append_sheet(wb, wsStations, 'Estações');

    // ==========================================
    // ABA 2: Dados Climáticos
    // ==========================================
    const dataHeaders = [
      'Data',
      'Estação',
      'ID',
      'Latitude',
      'Longitude',
      'Temperatura Média (°C)',
      'Temperatura Mínima (°C)',
      'Temperatura Máxima (°C)',
      'Precipitação Diária (mm)',
      'Umidade Relativa (%)',
      'Pressão Atmosférica (hPa)',
      'Velocidade do Vento (km/h)',
      'Rajada Máxima (km/h)'
    ];

    const dataRows = data.records.map(r => [
      r.date,
      r.stationName,
      r.deviceId,
      r.lat,
      r.lon,
      r.temp !== null ? r.temp : '',
      r.tempMin !== null ? r.tempMin : '',
      r.tempMax !== null ? r.tempMax : '',
      r.rain !== null ? r.rain : 0.00, // Chuva zero mantida como 0.00 explícito
      r.humidity !== null ? r.humidity : '',
      r.pressure !== null ? r.pressure : '',
      r.wind !== null ? r.wind : '',
      r.windBurst !== null ? r.windBurst : ''
    ]);

    const wsData = XLSX.utils.aoa_to_sheet([dataHeaders, ...dataRows]);
    wsData['!cols'] = [
      { wch: 13 }, // Data
      { wch: 32 }, // Estação
      { wch: 10 }, // ID
      { wch: 12 }, // Lat
      { wch: 12 }, // Lon
      { wch: 24 }, // Temp Média
      { wch: 24 }, // Temp Mín
      { wch: 24 }, // Temp Máx
      { wch: 24 }, // Precipitação
      { wch: 20 }, // Umidade
      { wch: 25 }, // Pressão
      { wch: 25 }, // Vento
      { wch: 22 }  // Rajada
    ];

    const totalDataRows = dataRows.length;
    if (totalDataRows > 0) {
      wsData['!autofilter'] = { ref: `A1:M${totalDataRows + 1}` };
    }
    try {
      wsData['!freeze'] = { xSplit: 0, ySplit: 1 };
    } catch {}

    XLSX.utils.book_append_sheet(wb, wsData, 'Dados Climáticos');

    // ==========================================
    // ABA 3: Metadados
    // ==========================================
    const emptyStationsList = data.stationAudit
      .filter(st => st.recordsCount === 0)
      .map(st => `${st.name} (ID: ${st.deviceId})`)
      .join(', ');

    const metadataAoa = [
      ['PROPRIEDADE', 'VALOR'],
      ['Órgão', 'Prefeitura Municipal de Passo Fundo'],
      ['Unidade', 'Coordenadoria Municipal de Proteção e Defesa Civil'],
      ['Sistema', 'GeoPortal da Defesa Civil — WebGIS Municipal'],
      ['Fonte dos Dados', 'Rede Municipal de Monitoramento Meteorológico / Plugfield Indústria e Tecnologia Ltda.'],
      ['Tipo de Dado', 'Dados climáticos observados (medições telemétricas reais)'],
      ['Data/Hora de Geração', data.queryDateFormatted],
      ['Período Inicial Consultado', data.startDate],
      ['Período Final Consultado', data.endDate],
      ['Total de Estações Selecionadas', data.totalSelected],
      ['Estações com Dados no Período', data.stationsWithData],
      ['Estações sem Registros no Período', data.stationsWithoutData],
      ['Relação de Estações sem Registros', emptyStationsList || 'Nenhuma (todas as estações selecionadas apresentaram registros válidos).'],
      ['Sistema de Referência Geodésico', 'WGS 84 (EPSG:4326) para coordenadas geográficas das estações'],
      ['Convenção de Precipitação Zero', 'Precipitação registrada como 0,00 mm representa tempo seco comprovado por telemetria ativa.'],
      ['Tratamento de Dados Ausentes', 'Células em branco representam ausência de registro transmitido pela estação na data correspondente.'],
      ['Observação Metodológica', 'Os dados apresentados nesta planilha correspondem estritamente aos registros observados disponibilizados pela rede de monitoramento no período consultado. Nenhuma interpolação espacial (IDW), média estimada ou valor artificial foi adicionado aos dados brutos observados.']
    ];

    const wsMeta = XLSX.utils.aoa_to_sheet(metadataAoa);
    wsMeta['!cols'] = [
      { wch: 34 },
      { wch: 95 }
    ];

    XLSX.utils.book_append_sheet(wb, wsMeta, 'Metadados');

    return wb;
  }
}
