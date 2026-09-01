/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Central Meteorológica e Alertas — Configuração Oficial
 */

export const WEATHER_CONFIG = {
  city: {
    name: 'Passo Fundo',
    state: 'RS',
    ibgeCode: '4314100',
    cptecId: '3757',
    lat: -28.2628,
    lon: -52.4067,
    inmetStationCode: 'A831',
    inmetStationName: 'Estação Automática INMET Passo Fundo (A831)'
  },

  // Cache Timeouts in Milliseconds
  cacheTTL: {
    current: 5 * 60 * 1000,     // 5 minutes for real-time observations
    forecast: 30 * 60 * 1000,   // 30 minutes for forecasts
    alerts: 5 * 60 * 1000       // 5 minutes for active warnings
  },

  // Official Endpoints (with Serverless Proxy for CORS Resolution)
  endpoints: {
    inmetForecast: '/api/weather/inmet-forecast',
    inmetAlerts: '/api/weather/inmet-alerts',
    cptecForecastXml: '/api/weather/cptec-forecast',
    defesaCivilRsTelemetry: '/api/weather/defesa-civil-rs',
    inmetForecastDirect: 'https://apiprevmet3.inmet.gov.br/previsao/4314100',
    inmetAlertsDirect: 'https://apiprevmet3.inmet.gov.br/avisos/ativos',
    cptecForecastXmlDirect: 'https://servicos.cptec.inpe.br/XML/cidade/3757/previsao.xml',
    openMeteoTelemetry: 'https://api.open-meteo.com/v1/forecast?latitude=-28.2628&longitude=-52.4067&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,rain,wind_speed_10m,wind_gusts_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=America%2FSao_Paulo'
  },

  // Official Institutional Links
  officialLinks: [
    {
      id: 'inmet_portal',
      name: 'INMET — Instituto Nacional de Meteorologia',
      description: 'Previsão oficial, avisos meteorológicos e dados de estações',
      url: 'https://portal.inmet.gov.br/',
      type: 'Portal Oficial'
    },
    {
      id: 'inmet_alertas',
      name: 'INMET — Avisos Meteorológicos Oficiais',
      description: 'Sistema oficial de previsão de tempo severo e monitoramento climático',
      url: 'https://portal.inmet.gov.br/',
      type: 'Alertas Oficiais'
    },
    {
      id: 'defesa_civil_rs_avisos',
      name: 'Defesa Civil do Rio Grande do Sul — Avisos e Alertas',
      description: 'Alertas meteorológicos estaduais, prognósticos e avisos à população',
      url: 'https://www.defesacivil.rs.gov.br/avisos-e-alertas',
      type: 'Defesa Civil Estadual'
    },
    {
      id: 'defesa_civil_rs_boletins',
      name: 'Defesa Civil do Rio Grande do Sul — Boletins e Relatórios',
      description: 'Boletins hidrometeorológicos diários e situação das bacias',
      url: 'https://www.defesacivil.rs.gov.br/avisos-e-boletins',
      type: 'Boletins Oficiais'
    },
    {
      id: 'defesa_civil_rs_rede',
      name: 'Rede Hidrometeorológica Oficial — Defesa Civil RS',
      description: 'Telemetria em tempo real das 130 estações hidrometeorológicas do RS',
      url: 'https://redehidrometeorologica.defesacivil.rs.gov.br/Mapa',
      type: 'Rede Hidrometeorológica Estadual'
    },
    {
      id: 'defesa_civil_rs_hidro',
      name: 'Monitoramento Hidrológico — Defesa Civil RS',
      description: 'Estações telemétricas de monitoramento de rios e chuvas',
      url: 'https://www.defesacivil.rs.gov.br/estacoes-de-monitoramento-hidrologico',
      type: 'Monitoramento Hidrológico'
    },
    {
      id: 'cptec_portal',
      name: 'CPTEC / INPE — Centro de Previsão de Tempo e Estudos Climáticos',
      description: 'Previsão numérica de tempo e monitoramento climático',
      url: 'https://www.cptec.inpe.br/',
      type: 'Previsão Numérica'
    },
    {
      id: 'cptec_radar',
      name: 'Radar Meteorológico CPTEC / INPE (SIGMA)',
      description: 'Mosaico de radares meteorológicos nacionais em tempo real',
      url: 'https://sigma.cptec.inpe.br/radar/',
      type: 'Radar Meteorológico'
    }
  ],

  // Nearby Regional Monitoring Stations
  nearbyStations: [
    {
      id: 'DCRS-00016',
      name: 'Passo Fundo (DCRS-00016)',
      institution: 'Defesa Civil RS / Rede Hidrometeorológica',
      type: 'Estação Hidrometeorológica Telemétrica',
      basin: 'RS - Rio Passo Fundo',
      distanceKm: 0.0,
      lat: -28.2470,
      lon: -52.3713,
      status: 'Operacional'
    },
    {
      id: 'A831',
      name: 'Passo Fundo (A831)',
      institution: 'INMET',
      type: 'Estação Meteorológica Automática',
      distanceKm: 0.0,
      lat: -28.2308,
      lon: -52.4042,
      altitudeM: 684
    },
    {
      id: 'A832',
      name: 'Marau',
      institution: 'INMET / FEPAGRO',
      type: 'Estação Meteorológica Automática',
      distanceKm: 28.5,
      lat: -28.4489,
      lon: -52.2008,
      altitudeM: 580
    },
    {
      id: 'A834',
      name: 'Carazinho',
      institution: 'INMET',
      type: 'Estação Meteorológica Automática',
      distanceKm: 41.2,
      lat: -28.2839,
      lon: -52.7861,
      altitudeM: 609
    },
    {
      id: 'A836',
      name: 'Erechim',
      institution: 'INMET',
      type: 'Estação Meteorológica Automática',
      distanceKm: 69.4,
      lat: -27.6569,
      lon: -52.2619,
      altitudeM: 760
    },
    {
      id: 'A838',
      name: 'Soledade',
      institution: 'INMET',
      type: 'Estação Meteorológica Automática',
      distanceKm: 63.8,
      lat: -28.8181,
      lon: -52.5108,
      altitudeM: 710
    }
  ]
};
