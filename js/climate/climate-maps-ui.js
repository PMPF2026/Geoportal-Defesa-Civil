/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Módulo: Mapas Climáticos (Interface & Protótipo Inicial)
 * 
 * Responsável pela gestão do painel modal "Mapas Climáticos",
 * seleção de variáveis (Temperatura, Precipitação), escala temporal (Diário, Mensal),
 * método de espacialização (IDW), e contagem dinâmica das estações da rede telemétrica.
 */

import { PLUGFIELD_STATIONS_CONFIG } from '../weather/plugfield-service.js';
import { Notification } from '../ui/notification.js';

export class ClimateMapsUI {
  constructor() {
    this.modal = null;
    this.openBtn = null;
    this.closeBtn = null;
    this.scaleSelect = null;
    this.dateGroup = null;
    this.monthGroup = null;
    this.generateBtn = null;
    this.stationsCountEl = null;
    this.variableSelect = null;
    this.methodSelect = null;
    this.dateInput = null;
    this.monthInput = null;
  }

  /**
   * Inicializa o módulo e vincula os elementos da interface
   */
  init() {
    this.modal = document.getElementById('climate-maps-modal');
    this.openBtn = document.getElementById('btn-open-climate-maps');
    this.closeBtn = document.getElementById('btn-close-climate-maps-modal');
    this.scaleSelect = document.getElementById('climate-scale-select');
    this.dateGroup = document.getElementById('climate-date-group');
    this.monthGroup = document.getElementById('climate-month-group');
    this.generateBtn = document.getElementById('btn-generate-climate-map');
    this.stationsCountEl = document.getElementById('climate-stations-count');
    this.variableSelect = document.getElementById('climate-variable-select');
    this.methodSelect = document.getElementById('climate-method-select');
    this.dateInput = document.getElementById('climate-date-input');
    this.monthInput = document.getElementById('climate-month-input');

    if (!this.modal || !this.openBtn) {
      console.warn('[ClimateMapsUI] Elementos da interface de Mapas Climáticos não encontrados no DOM.');
      return;
    }

    this.bindEvents();
    this.updateStationsCount();
    this.setDefaultDates();

    console.log('[ClimateMapsUI] Módulo de Mapas Climáticos inicializado com sucesso.');
  }

  /**
   * Registra os eventos de interação do usuário
   */
  bindEvents() {
    // Abrir modal
    this.openBtn.addEventListener('click', () => {
      this.open();
    });

    // Fechar pelo botão 'x'
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close();
      });
    }

    // Fechar ao clicar no overlay escuro de fundo
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Alternância dinâmica de escala temporal: Diário x Mensal
    if (this.scaleSelect && this.dateGroup && this.monthGroup) {
      this.scaleSelect.addEventListener('change', () => {
        const isMonthly = this.scaleSelect.value === 'mensal';
        if (isMonthly) {
          this.dateGroup.style.display = 'none';
          this.monthGroup.style.display = 'flex';
        } else {
          this.dateGroup.style.display = 'flex';
          this.monthGroup.style.display = 'none';
        }
      });
    }

    // Ação do botão "Gerar mapa"
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => {
        this.handleGenerateMap();
      });
    }
  }

  /**
   * Abre o modal
   */
  open() {
    if (this.modal) {
      this.modal.classList.add('active');
      this.updateStationsCount();
      
      // Atualiza os ícones Lucide no interior do modal se necessário
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  }

  /**
   * Fecha o modal
   */
  close() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  }

  /**
   * Verifica se o modal está visível
   */
  isOpen() {
    return this.modal ? this.modal.classList.contains('active') : false;
  }

  /**
   * Atualiza a contagem dinâmica de estações a partir da base oficial carregada
   */
  updateStationsCount() {
    if (!this.stationsCountEl) return;
    const count = Array.isArray(PLUGFIELD_STATIONS_CONFIG) ? PLUGFIELD_STATIONS_CONFIG.length : 16;
    this.stationsCountEl.textContent = `${count} estações`;
  }

  /**
   * Define valores padrão de data e mês com base na data local atual
   */
  setDefaultDates() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    if (this.dateInput && !this.dateInput.value) {
      this.dateInput.value = `${yyyy}-${mm}-${dd}`;
    }

    if (this.monthInput && !this.monthInput.value) {
      this.monthInput.value = `${yyyy}-${mm}`;
    }
  }

  /**
   * Manipulador do clique no botão "Gerar mapa"
   * Na etapa 1 (Protótipo), valida os parâmetros e informa o usuário que a interpolação real
   * está em fase de preparação, sem bloquear ou executar cálculos pesados prematuramente.
   */
  handleGenerateMap() {
    const variable = this.variableSelect ? this.variableSelect.options[this.variableSelect.selectedIndex].text : 'Temperatura';
    const scale = this.scaleSelect ? this.scaleSelect.options[this.scaleSelect.selectedIndex].text : 'Diário';
    const method = this.methodSelect ? this.methodSelect.options[this.methodSelect.selectedIndex].text : 'IDW';
    const periodValue = this.scaleSelect?.value === 'mensal' ? this.monthInput?.value : this.dateInput?.value;

    // Mensagem informativa institucional padronizada
    Notification.info(
      `Protótipo "Mapas Climáticos": Parâmetros selecionados (${variable} • ${scale}: ${periodValue} via ${method}). A rotina de interpolação geoestatística será conectada na próxima fase.`,
      5500
    );

    // Estrutura de evento / callback preparada para a futura integração com IDW
    const climatePayload = {
      variable: this.variableSelect?.value || 'temperatura',
      variableLabel: variable,
      scale: this.scaleSelect?.value || 'diario',
      scaleLabel: scale,
      period: periodValue,
      method: this.methodSelect?.value || 'idw',
      methodLabel: method,
      stationsAvailable: Array.isArray(PLUGFIELD_STATIONS_CONFIG) ? PLUGFIELD_STATIONS_CONFIG.length : 16,
      timestamp: new Date().toISOString()
    };

    console.log('[ClimateMapsUI] Estrutura preparada para interpolação:', climatePayload);

    // Dispara evento customizado para que outros módulos possam escutar futuramente se desejado
    window.dispatchEvent(new CustomEvent('climatemaps:generate-requested', { detail: climatePayload }));
  }
}