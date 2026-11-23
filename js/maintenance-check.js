/**
 * Portal Defesa Civil Passo Fundo - WebGIS & App Mobile
 * Verificador Automático de Modo de Manutenção Programada
 */

(function () {
  'use strict';

  try {
    const params = new URLSearchParams(window.location.search);

    // Comandos de Bypass para o Desenvolvedor / Administrador
    if (params.get('dev') === 'true' || params.get('admin') === 'passofundo' || params.get('bypass') === 'true') {
      sessionStorage.setItem('dc_maintenance_bypass', 'true');
    } else if (params.get('dev') === 'false' || params.get('manutencao') === 'off') {
      sessionStorage.removeItem('dc_maintenance_bypass');
    }

    const isPreview = params.get('manutencao') === 'preview';
    const isBypass = sessionStorage.getItem('dc_maintenance_bypass') === 'true';

    // Buscar configuração centralizada de manutenção
    fetch('/maintenance.json?v=' + Date.now())
      .then(res => {
        if (!res.ok) return { enabled: false };
        return res.json();
      })
      .then(config => {
        const isMaintenanceActive = (config && config.enabled) || isPreview;

        if (!isMaintenanceActive) {
          return; // Portal em operação normal
        }

        // Se o desenvolvedor tem bypass ativo
        if (isBypass && !isPreview) {
          renderDevBypassBadge();
          return;
        }

        // Exibir tela oficial de manutenção
        renderMaintenanceScreen(config);
      })
      .catch(err => {
        console.warn('[MaintenanceCheck] Falha ao verificar status de manutenção:', err);
      });

  } catch (e) {
    console.warn('[MaintenanceCheck] Erro:', e);
  }

  function renderMaintenanceScreen(config) {
    // Garantir que o CSS de manutenção esteja carregado
    if (!document.getElementById('dc-maintenance-css')) {
      const link = document.createElement('link');
      link.id = 'dc-maintenance-css';
      link.rel = 'stylesheet';
      link.href = '/css/maintenance.css';
      document.head.appendChild(link);
    }

    const overlay = document.createElement('div');
    overlay.className = 'maintenance-overlay';
    overlay.id = 'dc-maintenance-overlay';

    const title = (config && config.title) || 'Portal em Atualização Programada';
    const msg = (config && config.message) || 'Estamos realizando melhorias técnicas no Geoportal da Defesa Civil de Passo Fundo.';
    const eta = (config && config.estimatedReturn) || 'Retorno previsto em breve.';
    const telDC = (config && config.emergencyContacts && config.emergencyContacts.defesaCivil) || '199';
    const telBombeiros = (config && config.emergencyContacts && config.emergencyContacts.bombeiros) || '193';
    const zap = (config && config.emergencyContacts && config.emergencyContacts.whatsapp) || '(54) 99194-0460';
    const zapLink = (config && config.emergencyContacts && config.emergencyContacts.whatsappLink) || 'https://wa.me/5554991940460';

    overlay.innerHTML = `
      <div class="maintenance-card">
        <div class="maintenance-logos">
          <img src="/assets/brasao-prefeitura.png" alt="Prefeitura de Passo Fundo" class="maintenance-logo" onerror="this.style.display='none'">
          <img src="/assets/logo-defesa-civil.jpg" alt="Defesa Civil Passo Fundo" class="maintenance-logo">
        </div>

        <div class="maintenance-badge">
          <span class="maintenance-pulse-dot"></span>
          <span>Manutenção Programada</span>
        </div>

        <h1 class="maintenance-title">${title}</h1>
        <p class="maintenance-text">${msg}</p>

        <div class="maintenance-eta">
          <span>⏱️</span>
          <span>${eta}</span>
        </div>

        <div class="maintenance-emergency-section">
          <div class="emergency-section-title">
            <span>🚨</span>
            <span>Canais Oficiais de Emergência</span>
          </div>

          <div class="maintenance-contacts-grid">
            <a href="tel:${telDC}" class="emergency-call-card defesa-civil" title="Ligar para Defesa Civil">
              <span class="emergency-call-title">DEFESA CIVIL</span>
              <span class="emergency-call-number">${telDC}</span>
              <span class="emergency-call-sub">Ligação Gratuita</span>
            </a>

            <a href="tel:${telBombeiros}" class="emergency-call-card bombeiros" title="Ligar para Bombeiros">
              <span class="emergency-call-title">BOMBEIROS</span>
              <span class="emergency-call-number">${telBombeiros}</span>
              <span class="emergency-call-sub">Emergência 24h</span>
            </a>
          </div>

          <a href="${zapLink}" target="_blank" rel="noopener noreferrer" class="maintenance-whatsapp-btn" title="Falar no WhatsApp da Defesa Civil">
            <span>💬 Plantão WhatsApp: ${zap}</span>
          </a>
        </div>

        <div class="maintenance-footer">
          <strong>Prefeitura Municipal de Passo Fundo</strong><br>
          Coordenadoria Municipal de Proteção e Defesa Civil (COMPDEC)
        </div>
      </div>
    `;

    // Inserir no DOM assim que o body estiver disponível
    if (document.body) {
      document.body.appendChild(overlay);
      hideSystemLoaders();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(overlay);
        hideSystemLoaders();
      });
    }

    document.title = 'Defesa Civil Passo Fundo — Em Manutenção';
  }

  function hideSystemLoaders() {
    const l1 = document.getElementById('loading-overlay');
    if (l1) l1.style.display = 'none';
    const l2 = document.getElementById('app-loading');
    if (l2) l2.style.display = 'none';
  }

  function renderDevBypassBadge() {
    if (document.getElementById('dev-bypass-badge')) return;

    const badge = document.createElement('div');
    badge.id = 'dev-bypass-badge';
    badge.className = 'dev-bypass-badge';
    badge.innerHTML = `
      <span>🛠️ MODO MANUTENÇÃO ATIVO NO SERVIDOR (MODO DESENVOLVEDOR)</span>
      <button class="dev-bypass-close" title="Ocultar aviso" onclick="this.parentElement.remove()">✕</button>
    `;

    if (document.body) {
      document.body.appendChild(badge);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(badge);
      });
    }
  }

})();
