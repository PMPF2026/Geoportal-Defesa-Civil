/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Configuração da Central Meteorológica e Alertas (Arquitetura Simplificada v2)
 * Pilares: 1. Open-Meteo (Tempo & Previsão) | 2. Defesa Civil RS (DCRS-00016 & Alertas)
 */

export const WeatherConfig = {
  // Localização de Referência Oficial
  location: {
    city: 'Passo Fundo',
    state: 'RS',
    country: 'Brasil',
    latitude: -28.24700,
    longitude: -52.37130,
    timezone: 'America/Sao_Paulo'
  },

  // Cache & Polling (5 minutos)
  cacheTTL: 5 * 60 * 1000,
  cacheKey: 'geoportal_weather_v2',
  pollingInterval: 5 * 60 * 1000,

  // Endpoints dos 2 Pilares Oficiais
  endpoints: {
    // Pilar 1: Open-Meteo (Chamada direta via navegador com CORS nativo)
    openMeteo: 'https://api.open-meteo.com/v1/forecast',
    
    // Pilar 2: Defesa Civil RS (Serverless Proxy para DCRS-00016)
    defesaCivilRs: '/api/weather/defesa-civil-rs',

    // Página Institucional de Avisos da Defesa Civil RS
    defesaCivilAlertasUrl: 'https://defesacivil.rs.gov.br/avisos-e-boletins',
    defesaCivilRedeUrl: 'https://redehidrometeorologica.defesacivil.rs.gov.br/Mapa'
  },

  // Estação Telemétrica Municipal Oficial
  station: {
    code: 'DCRS-00016',
    name: 'Passo Fundo',
    type: 'HidroMeteo',
    basin: 'RS - Rio Passo Fundo',
    region: '2ª CREPDEC'
  }
};
