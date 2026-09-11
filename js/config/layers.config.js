/**
 * Portal Defesa Civil Passo Fundo - WebGIS Institucional
 * Central Layer Registry & Advanced Cartographic Symbology Configuration
 */

export const LAYER_GROUPS = [
  {
    id: 'defesa_civil',
    title: '1. Defesa Civil & Gestão de Risco',
    iconClass: 'dc',
    iconName: 'shield-alert',
    description: 'Áreas de risco hidrológico, manchas de inundação e faixas de segurança perimetral',
    badge: 'Prioritário'
  },
  {
    id: 'abrigos_cobertura',
    title: '2. Estruturas Estratégicas de Emergência',
    iconClass: 'shelter',
    iconName: 'home',
    description: 'Abrigos municipais da Defesa Civil e raio territorial de 2 km para resposta a emergências',
    badge: 'Operacional'
  },
  {
    id: 'hidrografia',
    title: '3. Hidrografia & Recursos Hídricos',
    iconClass: 'hydro',
    iconName: 'droplet',
    description: 'Cursos d’água, rios, arroios e divisores de bacias hidrográficas municipais'
  },
  {
    id: 'sistema_viario',
    title: '4. Sistema Viário & Transporte',
    iconClass: 'roads',
    iconName: 'navigation',
    description: 'Malha viária urbana, rodovias federais/estaduais, estradas municipais, pontes e ferrovia'
  },
  {
    id: 'divisao_territorial',
    title: '5. Divisão Territorial & Limites',
    iconClass: 'territory',
    iconName: 'map-pin',
    description: 'Limite municipal, distritos, bairros, setores censitários do IBGE e RS'
  },
  {
    id: 'planejamento_urbano',
    title: '6. Planejamento & Ordenamento Urbano',
    iconClass: 'urban',
    iconName: 'building-2',
    description: 'Perímetro do plano diretor e macrozoneamento municipal'
  },
  {
    id: 'populacao',
    title: '7. População & Vulnerabilidade Social',
    iconClass: 'population',
    iconName: 'users',
    description: 'Distribuição, densidade demográfica setorial e domicílios (Censo IBGE 2022)'
  },
  {
    id: 'ortofotos',
    title: '8. Ortofotos – Levantamento Aerofotogramétrico',
    iconClass: 'ortho',
    iconName: 'camera',
    description: 'Levantamento aerofotogramétrico de alta resolução (Julho/2026 - SIRGAS 2000 UTM 22S / Web Mercator)',
    badge: 'Alta Resolução'
  },
  {
    id: 'mapeamento_sgb',
    title: '9. Mapeamento & Diagnóstico SGB',
    iconClass: 'sgb',
    iconName: 'mountain',
    description: 'Mapeamento oficial de domicílios e setores de risco geológico (Serviço Geológico do Brasil - SGB, 2025)',
    badge: 'SGB 2025'
  }
];

export const LAYERS_CONFIG = [
  // ================= 1. DEFESA CIVIL =================
  {
    id: 'sede_defesa_civil',
    name: 'Sede da Defesa Civil',
    fileName: 'Sede Defesa Civil.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'defesa_civil',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 95,
    isCore: true,
    isLazy: false,
    style: {
      isCustomIcon: true,
      iconType: 'defesa_civil_sede',
      pointColor: '#ff7800',
      pointRadius: 9.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.5,
      previewColor: '#ff7800'
    },
    popupConfig: {
      titleField: 'D. Civil',
      defaultTitle: 'SEDE DA DEFESA CIVIL',
      titlePrefix: '',
      fields: [
        { key: 'D. Civil', label: 'Identificação Oficial', defaultValue: 'Sede da Defesa Civil' },
        { key: 'Endereço', label: 'Endereço' },
        { key: 'Coord X', label: 'Coordenada UTM Este (X)', format: 'number' },
        { key: 'Coord_Y', label: 'Coordenada UTM Norte (Y)', format: 'number' },
        { key: 'crs_info', label: 'Sistema de Referência', defaultValue: 'SIRGAS 2000 / UTM Zona 22S (EPSG:31982)' }
      ]
    },
    searchable: true,
    searchFields: ['D. Civil', 'Endereço']
  },
  {
    id: 'areas_enchente_2024',
    name: 'Áreas de Enchente 2024',
    fileName: 'Áreas de Enchente 2024.geojson',
    source: 'Defesa Civil / Mapeamento Oficial',
    refDate: 'Maio/2024',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.9,
    zIndex: 65,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(239, 68, 68, 0.45)',
      strokeColor: '#dc2626',
      strokeWidth: 2.4,
      hasPattern: true, // Custom canvas hazard hatching pattern
      patternColor: 'rgba(185, 28, 28, 0.65)',
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'mun_nm',
      titlePrefix: 'Mancha de Inundação - ',
      fields: [
        { key: 'st_dec_576', label: 'Situação Decretada', badgeColor: '#dc2626' },
        { key: 'versao', label: 'Versão do Mapeamento' },
        { key: 'corede', label: 'COREDE' },
        { key: 'regiao_fun', label: 'Região Funcional' },
        { key: 'mun_nm', label: 'Município' },
        { key: 'cd_mun', label: 'Código IBGE' }
      ]
    },
    searchable: true,
    searchFields: ['mun_nm', 'st_dec_576', 'corede']
  },
  {
    id: 'app_30metros',
    name: 'Faixa de 30 metros — Rio Passo Fundo',
    fileName: 'APP_30metros.geojson',
    source: 'Prefeitura Municipal de Passo Fundo / Lei 12.651',
    refDate: '2026',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 42,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.22)',
      strokeColor: '#059669',
      strokeWidth: 1.8,
      strokeDash: [4, 4],
      previewColor: '#059669'
    },
    popupConfig: {
      titleField: 'APP 30m',
      defaultTitle: 'Faixa de 30 metros — Rio Passo Fundo',
      fields: [
        { key: 'APP 30m', label: 'Classificação Legal' },
        { key: 'AREA hec', label: 'Área da Faixa (hectares)', format: 'number' },
        { key: 'AREA m²', label: 'Área Total (m²)', format: 'number' }
      ]
    },
    searchable: false
  },
  {
    id: 'edificacoes_app',
    name: 'Residências na Faixa de 30 metros (318 pontos)',
    fileName: 'Edificações em APP.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'defesa_civil',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 85,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#ea580c',
      pointRadius: 5.5,
      strokeColor: '#ffffff',
      strokeWidth: 1.8,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Residência na Faixa de 30 metros — ID: ',
      fields: [
        { key: 'id', label: 'Identificador (ID)' },
        { key: 'Edificacoe', label: 'Tipo de Edificação' },
        { key: 'dist_rio_m', label: 'Distância até o Rio Passo Fundo', format: 'distance_m' },
        { key: 'faixa_dist', label: 'Faixa de Proximidade / Risco' }
      ]
    },
    searchable: true,
    searchFields: ['id', 'Edificacoe']
  },

  // ================= 2. ESTRUTURAS ESTRATÉGICAS DE EMERGÊNCIA =================
  {
    id: 'abrigos_defesa_civil',
    name: 'Abrigos da Defesa Civil (17 Locais)',
    fileName: 'Abrigos da Defesa Civil.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'abrigos_cobertura',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 90,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#1d4ed8',
      pointRadius: 7.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.2,
      previewColor: '#1d4ed8'
    },
    popupConfig: {
      titleField: 'Nome',
      defaultTitle: 'Abrigo da Defesa Civil',
      titlePrefix: '',
      fields: [
        { key: 'ID', label: 'Identificação' },
        { key: 'Nome', label: 'Nome do Local' },
        { key: 'Tipo', label: 'Tipo de Estrutura' },
        { key: 'Área de Alojamento', label: 'Área de Alojamento' },
        { key: 'Endereço', label: 'Endereço' },
        { key: 'Coord_X', label: 'Coordenada UTM Este (X)', format: 'number' },
        { key: 'Coord_Y', label: 'Coordenada UTM Norte (Y)', format: 'number' }
      ]
    },
    searchable: true,
    searchFields: ['ID', 'Nome', 'Tipo', 'Endereço']
  },
  {
    id: 'cobertura_abrigos_2km',
    name: 'Cobertura de Abrigos — 2 km',
    fileName: 'Cobertura de Abrigos em 2km.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'abrigos_cobertura',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 46,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(37, 99, 235, 0.22)',
      strokeColor: '#1d4ed8',
      strokeWidth: 1.8,
      previewColor: '#1d4ed8'
    },
    popupConfig: {
      defaultTitle: 'Cobertura de Abrigos — 2 km',
      fields: [
        { key: 'cobertura', label: 'Área de Cobertura', defaultValue: 'Raio territorial de 2 km (2.000 m)' },
        { key: 'finalidade', label: 'Finalidade Operacional', defaultValue: 'Área de influência e atendimento prioritário dos Abrigos da Defesa Civil' }
      ]
    },
    searchable: false
  },
  {
    id: 'zph_helicoptero',
    name: 'Zonas de Pouso de Helicóptero (ZPH)',
    fileName: 'Zonas de Pouso de Helicóptero.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'abrigos_cobertura',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 95,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#0284c7',
      pointRadius: 8.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.2,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'Nome',
      titlePrefix: 'ZPH — ',
      defaultTitle: 'Zona de Pouso de Helicóptero',
      fields: [
        { key: 'Nome', label: 'Local / Denominação' },
        { key: 'Bairro', label: 'Bairro / Região' },
        { key: 'Endereço', label: 'Endereço Completo' },
        { key: 'Tipo', label: 'Classificação Operacional' },
        { key: 'Finalidade', label: 'Finalidade Estratégica' },
        { key: 'Coord_x', label: 'Coordenada UTM Leste (X)', format: 'number' },
        { key: 'Coord_y', label: 'Coordenada UTM Norte (Y)', format: 'number' }
      ]
    },
    searchable: true,
    searchFields: ['Nome', 'Bairro', 'Endereço']
  },

  // ================= 3. HIDROGRAFIA =================
  {
    id: 'estacao_dcrs00016',
    name: 'Estação Hidrometeorológica DCRS-00016',
    fileName: 'Estacao_DCRS_00016.geojson',
    source: 'Rede Hidrometeorológica Defesa Civil RS',
    refDate: 'Tempo Real',
    group: 'hidrografia',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 96,
    isCore: true,
    isLazy: false,
    style: {
      isCustomIcon: true,
      iconType: 'estacao_hidro',
      pointColor: '#0284c7',
      pointRadius: 10.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.5,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'nome_estacao',
      defaultTitle: 'ESTAÇÃO HIDROMETEOROLÓGICA DCRS-00016',
      titlePrefix: '',
      fields: [
        { key: 'estacao_cod', label: 'Código da Estação', defaultValue: 'DCRS-00016' },
        { key: 'nome_estacao', label: 'Nome da Estação', defaultValue: 'DCRS-00016 — Passo Fundo' },
        { key: 'status_comunicacao', label: 'Status Operacional', defaultValue: 'Consultando...' },
        { key: 'nivel_rio', label: 'Nível do Rio Passo Fundo', defaultValue: 'Consultando...' },
        { key: 'tendencia_rio', label: 'Tendência do Nível', defaultValue: 'Estável' },
        { key: 'chuva_hoje', label: 'Chuva Recente (1h / 24h)', defaultValue: '--' },
        { key: 'temperatura_atual', label: 'Temperatura Atual', defaultValue: '--' },
        { key: 'rede', label: 'Rede Oficial', defaultValue: 'Rede Hidrometeorológica da Defesa Civil RS' },
        { key: 'bacia', label: 'Bacia Hidrográfica', defaultValue: 'RS - Rio Passo Fundo' },
        { key: 'municipio', label: 'Município', defaultValue: 'Passo Fundo / RS' },
        { key: 'provedor', label: 'Provedor dos Dados', defaultValue: 'DCRS' },
        { key: 'ultima_atualizacao', label: 'Última Leitura', defaultValue: 'Sem comunicação recente' }
      ]
    },
    searchable: true,
    searchFields: ['estacao_cod', 'nome_estacao']
  },
  {
    id: 'estacoes_plugfield',
    name: 'Rede Meteorológica Plugfield (16 Estações)',
    fileName: 'Estacoes_Plugfield.geojson',
    source: 'Rede Oficial Plugfield / Passo Fundo',
    refDate: 'Tempo Real',
    group: 'hidrografia',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 94,
    isCore: true,
    isLazy: false,
    style: {
      isCustomIcon: true,
      iconType: 'estacao_plugfield',
      pointColor: '#10b981',
      pointRadius: 9.0,
      strokeColor: '#ffffff',
      strokeWidth: 2.2,
      previewColor: '#10b981'
    },
    popupConfig: {
      titleField: 'nome_estacao',
      defaultTitle: 'ESTAÇÃO METEOROLÓGICA PLUGFIELD',
      titlePrefix: '',
      fields: [
        { key: 'nome_estacao', label: 'Nome da Estação' },
        { key: 'deviceId', label: 'ID do Dispositivo (Plugfield)' },
        { key: 'tipo', label: 'Classificação Territorial' },
        { key: 'status_comunicacao', label: 'Status Operacional', defaultValue: 'Consultando...' },
        { key: 'temperatura_atual', label: 'Temperatura Atual', defaultValue: '--' },
        { key: 'temperatura_min_max', label: 'Mínima / Máxima', defaultValue: '--' },
        { key: 'umidade_atual', label: 'Umidade Relativa', defaultValue: '--' },
        { key: 'chuva_hoje', label: 'Chuva Hoje (Acumulado)', defaultValue: '--' },
        { key: 'chuva_mes', label: 'Chuva no Mês', defaultValue: '--' },
        { key: 'vento_atual', label: 'Velocidade do Vento', defaultValue: '--' },
        { key: 'rajada_maxima', label: 'Rajada Máxima', defaultValue: '--' },
        { key: 'direcao_vento', label: 'Direção do Vento', defaultValue: '--' },
        { key: 'pressao_atual', label: 'Pressão Atmosférica', defaultValue: '--' },
        { key: 'nivel_rio', label: 'Nível do Rio (Sensor Sônico)', defaultValue: 'Não monitorado nesta estação' },
        { key: 'ultima_atualizacao', label: 'Última Atualização', defaultValue: 'Sem comunicação recente' },
        { key: 'provedor', label: 'Rede / Provedor', defaultValue: 'Rede Plugfield' },
        { key: 'municipio', label: 'Município', defaultValue: 'Passo Fundo / RS' }
      ]
    },
    searchable: true,
    searchFields: ['nome_estacao', 'deviceId']
  },
  {
    id: 'rio_passo_fundo',
    name: 'Rio Passo Fundo (Curso Principal)',
    fileName: 'Rio Passo Fundo.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 54,
    isCore: true,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 1.8,
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'Nome',
      defaultTitle: 'Rio Passo Fundo',
      fields: [
        { key: 'Nome', label: 'Curso Hídrico Principal' },
        { key: 'Distância', label: 'Extensão do Segmento (m)', format: 'number' },
        { key: 'Comp_total', label: 'Comprimento Total (m)', format: 'number' },
        { key: 'SubClasses', label: 'Entidade CAD/GIS' }
      ]
    },
    searchable: true,
    searchFields: ['Nome']
  },
  {
    id: 'malha_hidrica',
    name: 'Malha Hídrica (Rios e Arroios)',
    fileName: 'Malha Hídrica.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 0.95,
    zIndex: 50,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 0.8,
      isHierarchicalHydro: true, // Dynamic line width based on hydrologic stream order
      previewColor: '#0284c7'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Curso D’água / Arroio',
      fields: [
        { key: 'nome', label: 'Nome do Rio/Arroio' },
        { key: 'ordem', label: 'Ordem Hidrológica (Strahler)' },
        { key: 'larguraMed', label: 'Largura Média (m)', format: 'number' },
        { key: 'd_dentroDe', label: 'Inserção Territorial' },
        { key: 'nomeAbrev', label: 'Identificação Abreviada' }
      ]
    },
    searchable: true,
    searchFields: ['nome', 'nomeAbrev']
  },
  {
    id: 'bacias_hidrograficas',
    name: 'Bacias Hidrográficas',
    fileName: 'Bacias Hidrográfias de Passo Fundo.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 40,
    isLazy: true,
    style: {
      strokeColor: '#7c3aed',
      strokeWidth: 1.0,
      strokeDash: [6, 5],
      previewColor: '#7c3aed'
    },
    popupConfig: {
      titleField: 'Layer',
      defaultTitle: 'Divisor de Águas / Bacia',
      fields: [
        { key: 'Layer', label: 'Identificação da Bacia' },
        { key: 'SubClasses', label: 'Tipo de Entidade' },
        { key: 'EntityHand', label: 'Código Cartográfico' }
      ]
    },
    searchable: false
  },

  // ================= 3. SISTEMA VIÁRIO =================
  {
    id: 'rodovia_federal',
    name: 'Rodovia Federal (BR)',
    fileName: 'Rodovia Federal.geojson',
    source: 'DNIT / Infraestrutura Federal',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 55,
    isHighway: true,
    highwayType: 'BR',
    style: {
      strokeColor: '#dc2626',
      strokeWidth: 1.8,
      casingColor: '#ffffff',
      casingWidth: 2.8,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'codTrechoR',
      defaultTitle: 'Rodovia Federal',
      titlePrefix: 'Rodovia Federal - Trecho: ',
      fields: [
        { key: 'codTrechoR', label: 'Código do Trecho (SNV)' },
        { key: 'nome', label: 'Identificação' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_tipoTrec', label: 'Tipo de Trecho' },
        { key: 'd_revestim', label: 'Tipo de Pavimento' },
        { key: 'd_administ', label: 'Administração' }
      ]
    },
    searchable: true,
    searchFields: ['codTrechoR', 'nome']
  },
  {
    id: 'rodovia_estadual',
    name: 'Rodovia Estadual (ERS)',
    fileName: 'Rodovia Estadual.geojson',
    source: 'DAER / Governo do Estado do RS',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 53,
    isHighway: true,
    highwayType: 'ERS',
    style: {
      strokeColor: '#ea580c',
      strokeWidth: 1.4,
      casingColor: '#ffffff',
      casingWidth: 2.2,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Rodovia Estadual',
      fields: [
        { key: 'nome', label: 'Rodovia Estadual' },
        { key: 'codTrechoR', label: 'Código do Trecho (DAER)' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_tipoTrec', label: 'Tipo de Trecho' },
        { key: 'd_revestim', label: 'Revestimento' }
      ]
    },
    searchable: true,
    searchFields: ['nome', 'codTrechoR']
  },
  {
    id: 'estradas_municipais',
    name: 'Estradas Municipais (Interior)',
    fileName: 'Estradas Municipais.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.9,
    zIndex: 44,
    style: {
      strokeColor: '#d97706',
      strokeWidth: 1.0,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'd_tipoTrec',
      defaultTitle: 'Estrada Municipal',
      fields: [
        { key: 'd_tipoTrec', label: 'Tipo de Estrada' },
        { key: 'd_jurisdic', label: 'Jurisdição' },
        { key: 'd_revestim', label: 'Tipo de Revestimento' },
        { key: 'd_administ', label: 'Órgão Responsável' }
      ]
    },
    searchable: false
  },
  {
    id: 'ferrovia',
    name: 'Ferrovia (Linha Férrea)',
    fileName: 'Ferrovia.geojson',
    source: 'ANTT / Concessionaria Ferroviaria',
    refDate: '2024',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 48,
    isRailway: true,
    style: {
      strokeColor: '#0f172a',
      strokeWidth: 1.6,
      previewColor: '#0f172a'
    },
    popupConfig: {
      titleField: 'nome',
      defaultTitle: 'Malha Ferroviária',
      fields: [
        { key: 'nome', label: 'Concessionária Operadora' },
        { key: 'd_bitola', label: 'Tipo de Bitola' },
        { key: 'd_nrLinhas', label: 'Número de Linhas' },
        { key: 'd_tipoTrec', label: 'Classificação da Linha' }
      ]
    },
    searchable: true,
    searchFields: ['nome']
  },
  {
    id: 'pontes',
    name: 'Pontes',
    fileName: 'Pontes.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 58,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(217, 119, 6, 0.50)',
      strokeColor: '#b45309',
      strokeWidth: 1.8,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'id',
      defaultTitle: 'Ponte',
      titlePrefix: 'Ponte — ID: ',
      fields: [
        { key: 'id', label: 'Identificador (ID)' },
        { key: 'Pontes', label: 'Tipo de Estrutura' },
        { key: 'AREA', label: 'Área da Estrutura (m²)', format: 'number' }
      ]
    },
    searchable: true,
    searchFields: ['id', 'Pontes']
  },
  {
    id: 'malha_viaria',
    name: 'Malha Viária Urbana (Ruas)',
    fileName: 'Malha Viária.geojson',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: '2026',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.65,
    zIndex: 35,
    isLazy: true,
    minZoom: 14, // Scale-dependent visibility to prevent viewport clogging
    style: {
      strokeColor: '#64748b',
      strokeWidth: 0.9,
      previewColor: '#64748b'
    },
    popupConfig: {
      titleField: 'NM_LOG',
      defaultTitle: 'Logradouro Urbano',
      fields: [
        { key: 'NM_LOG', label: 'Nome da Rua/Avenida' },
        { key: 'NM_TIP_LOG', label: 'Tipo de Logradouro' },
        { key: 'TOT_RES', label: 'Residências no Trecho', format: 'number' },
        { key: 'TOT_GERAL', label: 'Total de Edificações', format: 'number' },
        { key: 'CD_SETOR', label: 'Setor Censitário IBGE' },
        { key: 'CD_QUADRA', label: 'Quadra' }
      ]
    },
    searchable: true,
    searchFields: ['NM_LOG', 'NM_TIP_LOG']
  },

  // ================= 4. DIVISÃO TERRITORIAL =================
  {
    id: 'limite_territorial',
    name: 'Limite Territorial Passo Fundo',
    fileName: 'Limite Territorial Passo Fundo.geojson',
    source: 'IBGE - Malha Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 20,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(0, 0, 0, 0)',
      strokeColor: '#B71C1C',
      strokeWidth: 2.592,
      strokeDash: [8, 5],
      previewColor: '#B71C1C'
    },
    popupConfig: {
      titleField: 'NM_MUN',
      defaultTitle: 'Município de Passo Fundo',
      fields: [
        { key: 'NM_MUN', label: 'Município' },
        { key: 'SIGLA_UF', label: 'Unidade Federativa' },
        { key: 'AREA_KM2', label: 'Área Territorial Oficial (km²)', format: 'number' },
        { key: 'CD_MUN', label: 'Código IBGE Oficial' },
        { key: 'NM_RGINT', label: 'Região Intermediária' }
      ]
    },
    searchable: true,
    searchFields: ['NM_MUN']
  },
  {
    id: 'bairros',
    name: 'Bairros e Regiões Urbanas',
    fileName: 'Bairros Passo Fundo.geojson',
    source: 'Prefeitura Municipal / IBGE Censo 2022',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.82,
    zIndex: 30,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.08)',
      strokeColor: '#059669',
      strokeWidth: 1.0,
      showCentroidLabels: true,
      minLabelZoom: 12,
      previewColor: '#059669'
    },
    popupConfig: {
      titleField: 'Descri____',
      defaultTitle: 'Bairro / Região Urbana',
      fields: [
        { key: 'Name', label: 'Identificador' },
        { key: 'Descri____', label: 'Região / Bairro' },
        { key: 'Pop_2022', label: 'População Estimada (2022)', format: 'number' },
        { key: 'Variaca(%)', label: 'Variação Populacional (%)', format: 'number' },
        { key: 'Dados', label: 'Vilas e Loteamentos Integrantes' }
      ]
    },
    searchable: true,
    searchFields: ['Name', 'Descri____', 'Dados']
  },
  {
    id: 'distritos',
    name: 'Distritos de Passo Fundo',
    fileName: 'Distritos de Passo Fundo.geojson',
    source: 'IBGE / Prefeitura Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'Point',
    defaultVisible: false,
    defaultOpacity: 1,
    zIndex: 75,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#dc2626',
      pointRadius: 7,
      strokeColor: '#ffffff',
      strokeWidth: 2.0,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'nome',
      titlePrefix: 'Distrito Municipal de ',
      fields: [
        { key: 'nome', label: 'Nome do Distrito' },
        { key: 'Pop 2022', label: 'População (Censo 2022)', format: 'number' },
        { key: 'nomeAbrev', label: 'Abreviação Oficial' }
      ]
    },
    searchable: true,
    searchFields: ['nome']
  },
  {
    id: 'setores_censitarios',
    name: 'Setores Censitários (IBGE 2022)',
    fileName: 'Setores Censitários Passo Fundo.geojson',
    source: 'IBGE - Censo Demografico 2022',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 25,
    isLazy: true,
    style: {
      fillColor: 'rgba(100, 116, 139, 0.1)',
      strokeColor: '#475569',
      strokeWidth: 0.6,
      previewColor: '#475569'
    },
    popupConfig: {
      titleField: 'CD_SETOR',
      titlePrefix: 'Setor Censitário: ',
      fields: [
        { key: 'CD_SETOR', label: 'Código do Setor IBGE' },
        { key: 'V0001', label: 'População Residente (hab)', format: 'number' },
        { key: 'V0002', label: 'Total de Domicílios', format: 'number' },
        { key: 'DENSIDADE', label: 'Densidade (hab/km²)', format: 'number' },
        { key: 'AREA_KM2', label: 'Área do Setor (km²)', format: 'number' },
        { key: 'NM_DIST', label: 'Distrito de Pertencimento' },
        { key: 'RendaV06004_Vmed_mensal_pordomic', label: 'Renda Média Domiciliar (R$)', format: 'currency' }
      ]
    },
    searchable: true,
    searchFields: ['CD_SETOR', 'NM_DIST']
  },
  {
    id: 'municipios_rs',
    name: 'Municípios do Rio Grande do Sul',
    fileName: 'Municípios do RS.geojson',
    source: 'IBGE - Malha Municipal',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 10,
    isLazy: true,
    style: {
      fillColor: 'rgba(71, 85, 105, 0.05)',
      strokeColor: '#64748b',
      strokeWidth: 0.6,
      previewColor: '#64748b'
    },
    popupConfig: {
      titleField: 'NM_MUN',
      titlePrefix: 'Município: ',
      fields: [
        { key: 'NM_MUN', label: 'Município' },
        { key: 'AREA_KM2', label: 'Área Territorial (km²)', format: 'number' },
        { key: 'CD_MUN', label: 'Código IBGE' },
        { key: 'NM_RGINT', label: 'Região Intermediária' },
        { key: 'NM_RGI', label: 'Região Imediata' }
      ]
    },
    searchable: true,
    searchFields: ['NM_MUN', 'CD_MUN']
  },

  // ================= 5. PLANEJAMENTO URBANO =================
  {
    id: 'limite_plano_diretor',
    name: 'Limite do Plano Diretor',
    fileName: 'Limite Plano Diretor.geojson',
    source: 'Plano Diretor / Prefeitura de Passo Fundo',
    refDate: '2024',
    group: 'planejamento_urbano',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.8,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(147, 51, 234, 0.12)',
      strokeColor: '#9333ea',
      strokeWidth: 1.4,
      strokeDash: [6, 6],
      previewColor: '#9333ea'
    },
    popupConfig: {
      titleField: 'Layer',
      defaultTitle: 'Perímetro do Plano Diretor',
      fields: [
        { key: 'Layer', label: 'Zoneamento / Perímetro' },
        { key: 'Linetype', label: 'Tipo de Linha' },
        { key: 'SubClasses', label: 'Classe CAD/GIS' }
      ]
    },
    searchable: false
  },

  // ================= 6. POPULAÇÃO =================
  {
    id: 'densidade_populacional',
    name: 'Densidade Populacional (Setores)',
    fileName: 'Densidade Populacional.geojson',
    source: 'IBGE - Censo Demografico 2022',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'Densidade',
    choroplethBreaks: [
      { max: 50, color: 'rgba(254, 240, 217, 0.75)', label: '< 50 hab/km² (Rural/Baixa)' },
      { max: 500, color: 'rgba(253, 204, 138, 0.75)', label: '50 - 500 hab/km² (Média-Baixa)' },
      { max: 2000, color: 'rgba(252, 141, 89, 0.75)', label: '500 - 2.000 hab/km² (Média)' },
      { max: 5000, color: 'rgba(227, 74, 51, 0.75)', label: '2.000 - 5.000 hab/km² (Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 5.000 hab/km² (Muito Alta/Adensada)' }
    ],
    style: {
      strokeColor: '#991b1b',
      strokeWidth: 0.8,
      previewColor: '#e34a33'
    },
    popupConfig: {
      titleField: 'CD_SETOR',
      titlePrefix: 'Densidade Demográfica - Setor ',
      fields: [
        { key: 'Densidade', label: 'Densidade (hab/km²)', format: 'number' },
        { key: 'v0001', label: 'População do Setor (hab)', format: 'number' },
        { key: 'AREA_KM2', label: 'Área do Setor (km²)', format: 'number' },
        { key: 'NM_DIST', label: 'Distrito' },
        { key: 'CD_SETOR', label: 'Código Setor IBGE' }
      ]
    },
    searchable: true,
    searchFields: ['CD_SETOR', 'NM_DIST']
  },
  {
    id: 'censo_pop_0a4',
    name: 'População de 0 a 4 anos (Primeira Infância)',
    fileName: 'cn22_pop03_0a4_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_0a4_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0% (Baixa proporção)' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0% (Média)' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0% (Alta)' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0% (Crítica / Vulnerabilidade)' }
    ],
    style: {
      strokeColor: '#9a3412',
      strokeWidth: 0.8,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Primeira Infância (0-4 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_0a4_tot_2', label: 'Proporção 0 a 4 anos', format: 'percent' },
        { key: 'dem.v01031', label: 'Crianças de 0 a 4 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de crianças de 0 a 4 anos (Primeira Infância) por setor censitário. Informação crítica para evacuação e resgate prioritário da Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_5a9',
    name: 'População de 5 a 9 anos (Crianças)',
    fileName: 'cn22_pop03_5a9_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_5a9_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0% (Baixa proporção)' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0% (Média)' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0% (Alta)' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0% (Crítica)' }
    ],
    style: {
      strokeColor: '#c2410c',
      strokeWidth: 0.8,
      previewColor: '#f97316'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Crianças (5-9 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_5a9_tot_2', label: 'Proporção 5 a 9 anos', format: 'percent' },
        { key: 'dem.v01032', label: 'Crianças de 5 a 9 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de crianças de 5 a 9 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_10a14',
    name: 'População de 10 a 14 anos',
    fileName: 'cn22_pop03_10a14_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_10a14_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0%' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0%' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0%' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0%' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0%' }
    ],
    style: {
      strokeColor: '#b45309',
      strokeWidth: 0.8,
      previewColor: '#d97706'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População 10-14 anos — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_10a14_tot_2', label: 'Proporção 10 a 14 anos', format: 'percent' },
        { key: 'dem.v01033', label: 'População de 10 a 14 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de residentes com 10 a 14 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_15a19',
    name: 'População de 15 a 19 anos (Jovens)',
    fileName: 'cn22_pop03_15a19_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_15a19_tot_2',
    choroplethBreaks: [
      { max: 0.04, color: 'rgba(254, 240, 217, 0.75)', label: '< 4,0%' },
      { max: 0.06, color: 'rgba(253, 204, 138, 0.75)', label: '4,0% - 6,0%' },
      { max: 0.08, color: 'rgba(252, 141, 89, 0.75)', label: '6,0% - 8,0%' },
      { max: 0.10, color: 'rgba(227, 74, 51, 0.75)', label: '8,0% - 10,0%' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10,0%' }
    ],
    style: {
      strokeColor: '#4d7c0f',
      strokeWidth: 0.8,
      previewColor: '#65a30d'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Jovens (15-19 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_15a19_tot_2', label: 'Proporção 15 a 19 anos', format: 'percent' },
        { key: 'dem.v01034', label: 'População de 15 a 19 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total de jovens de 15 a 19 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_20a59',
    name: 'População de 20 a 59 anos (Adultos)',
    fileName: 'cn22_pop03_20a59_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_20a59_tot_2',
    choroplethBreaks: [
      { max: 0.50, color: 'rgba(237, 248, 251, 0.75)', label: '< 50,0%' },
      { max: 0.55, color: 'rgba(178, 226, 226, 0.75)', label: '50,0% - 55,0%' },
      { max: 0.60, color: 'rgba(102, 194, 164, 0.75)', label: '55,0% - 60,0%' },
      { max: 0.65, color: 'rgba(44, 162, 95, 0.75)', label: '60,0% - 65,0%' },
      { max: Infinity, color: 'rgba(0, 109, 44, 0.75)', label: '> 65,0%' }
    ],
    style: {
      strokeColor: '#047857',
      strokeWidth: 0.8,
      previewColor: '#10b981'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População Adulta (20-59 anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_20a59_tot_2', label: 'Proporção 20 a 59 anos', format: 'percent' },
        { key: 'cn22_pop03_20a59_tot_1', label: 'População de 20 a 59 anos (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e total da população adulta de 20 a 59 anos por setor censitário pelo Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_pop_m60',
    name: 'População Idosa — 60 anos ou mais (Grupo Prioritário)',
    fileName: 'cn22_pop03_m60_tot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop03_m60_tot_2',
    choroplethBreaks: [
      { max: 0.12, color: 'rgba(242, 240, 247, 0.75)', label: '< 12,0% (Baixa concentração)' },
      { max: 0.18, color: 'rgba(203, 201, 226, 0.75)', label: '12,0% - 18,0% (Média)' },
      { max: 0.24, color: 'rgba(158, 154, 200, 0.75)', label: '18,0% - 24,0% (Alta)' },
      { max: 0.30, color: 'rgba(117, 107, 177, 0.75)', label: '24,0% - 30,0% (Muito Alta)' },
      { max: Infinity, color: 'rgba(84, 39, 143, 0.75)', label: '> 30,0% (Crítica / Prioritária)' }
    ],
    style: {
      strokeColor: '#581c87',
      strokeWidth: 0.8,
      previewColor: '#7c3aed'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'População Idosa (60+ anos) — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop03_m60_tot_2', label: 'Proporção 60+ anos', format: 'percent' },
        { key: 'cn22_pop03_m60_tot_1', label: 'População Idosa (60+ anos) (hab)', format: 'number' },
        { key: 'bas.v0001', label: 'População Total do Setor (hab)', format: 'number' }
      ]
    },
    description: 'Proporção e contingente de pessoas idosas (60+ anos) por setor censitário. Dado essencial para resgate prioritário e acolhimento em abrigos pela Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_densidade_2022',
    name: 'Densidade Demográfica Setorial — Censo 2022 (hab/km²)',
    fileName: 'cn22_pop04_res_tot_kmtot_2_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop04_res_tot_kmtot_2',
    choroplethBreaks: [
      { max: 500, color: 'rgba(254, 240, 217, 0.75)', label: '< 500 hab/km² (Rural/Baixa)' },
      { max: 2500, color: 'rgba(253, 204, 138, 0.75)', label: '500 - 2.500 hab/km² (Média)' },
      { max: 5000, color: 'rgba(252, 141, 89, 0.75)', label: '2.500 - 5.000 hab/km² (Alta)' },
      { max: 10000, color: 'rgba(227, 74, 51, 0.75)', label: '5.000 - 10.000 hab/km² (Muito Alta)' },
      { max: Infinity, color: 'rgba(179, 0, 0, 0.75)', label: '> 10.000 hab/km² (Adensada/Vertical)' }
    ],
    style: {
      strokeColor: '#991b1b',
      strokeWidth: 0.8,
      previewColor: '#dc2626'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Densidade Demográfica 2022 — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop04_res_tot_kmtot_2', label: 'Densidade Demográfica (hab/km²)', format: 'number' },
        { key: 'bas.v0001', label: 'População Residente (hab)', format: 'number' },
        { key: 'cn22_ter01_area_tot_0', label: 'Área Territorial do Setor (km²)', format: 'number' }
      ]
    },
    description: 'Densidade demográfica setorial em hab/km² com dados atualizados do Censo IBGE 2022.',
    searchable: true,
    searchFields: ['id']
  },
  {
    id: 'censo_renda_vulnerabilidade',
    name: 'Vulnerabilidade Social — Rendimento Médio Domiciliar (Censo 2022)',
    fileName: 'cn22_pop05_rsp_tot_0_4314100_georedus_censo_2022.geojson',
    source: 'IBGE - Censo Demográfico 2022 (Redus)',
    refDate: '2022',
    group: 'populacao',
    geometryType: 'Polygon',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 28,
    isLazy: true,
    isChoropleth: true,
    choroplethField: 'cn22_pop05_rsp_tot_0',
    choroplethBreaks: [
      { max: 2000, color: 'rgba(215, 48, 39, 0.75)', label: 'Até R$ 2.000 (Alta Vulnerabilidade Social)' },
      { max: 3000, color: 'rgba(252, 141, 89, 0.75)', label: 'R$ 2.000 - R$ 3.000 (Média-Alta Vulnerabilidade)' },
      { max: 4500, color: 'rgba(254, 224, 144, 0.75)', label: 'R$ 3.000 - R$ 4.500 (Média Vulnerabilidade)' },
      { max: 7000, color: 'rgba(145, 191, 219, 0.75)', label: 'R$ 4.500 - R$ 7.000 (Média-Baixa Vulnerabilidade)' },
      { max: Infinity, color: 'rgba(69, 117, 180, 0.75)', label: '> R$ 7.000 (Baixa Vulnerabilidade)' }
    ],
    style: {
      strokeColor: '#1e3a8a',
      strokeWidth: 0.8,
      previewColor: '#2563eb'
    },
    popupConfig: {
      titleField: 'id',
      titlePrefix: 'Vulnerabilidade / Renda — Setor ',
      fields: [
        { key: 'id', label: 'Código do Setor Censitário' },
        { key: 'cn22_pop05_rsp_tot_0', label: 'Rendimento Médio Mensal Domiciliar', format: 'currency' }
      ]
    },
    description: 'Rendimento médio mensal domiciliar por setor censitário pelo Censo IBGE 2022, indicador chave de vulnerabilidade socioeconômica para a Defesa Civil.',
    searchable: true,
    searchFields: ['id']
  },

  // ================= ORTOFOTOS – LEVANTAMENTO AEROFOTOGRAMÉTRICO =================
  {
    id: 'ortofotos_rio_passo_fundo',
    name: 'Ortofotos Rio Passo Fundo',
    fileName: 'tiles/ortofotos-rio-passo-fundo/{z}/{x}/{y}.png',
    source: 'Prefeitura Municipal de Passo Fundo / Levantamento Aerofotogramétrico',
    refDate: 'Julho/2026',
    group: 'ortofotos',
    isRaster: true,
    isXYZTiles: true,
    tileUrl: 'tiles/ortofotos-rio-passo-fundo/{z}/{x}/{y}.png',
    minZoom: 14,
    maxZoom: 18,
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 5, // Abaixo de todos os vetores (zIndex 10-75) e acima do mapa-base (zIndex 0)
    isLazy: true,
    extent: [358912.81, 6873444.83, 364489.62, 6877987.06],
    crs: 'EPSG:31982',
    date: 'Julho de 2026',
    files: [
      'Ortofotos/Orto_trecho1.tif',
      'Ortofotos/orto_trecho2.tif',
      'Ortofotos/orto_trecho3-0-0.tif',
      'Ortofotos/orto_rio passo fundo.tif',
      'Ortofotos/orto_riopf.tif'
    ],
    style: {
      previewColor: '#0891b2'
    },
    popupConfig: {
      titleField: 'name',
      defaultTitle: 'Ortofotos – Levantamento Aerofotogramétrico (Rio Passo Fundo)',
      fields: [
        { key: 'name', label: 'Camada', defaultValue: 'Ortofotos – Levantamento Aerofotogramétrico' },
        { key: 'data', label: 'Data do Levantamento', defaultValue: 'Julho de 2026' },
        { key: 'crs', label: 'Sistema de Referência', defaultValue: 'SIRGAS 2000 / UTM 22S (EPSG:31982)' },
        { key: 'gsd', label: 'Resolução Espacial (GSD)', defaultValue: '5 a 10 cm/pixel' },
        { key: 'area', label: 'Abrangência', defaultValue: 'Calha e Planície Aluvial do Rio Passo Fundo' },
        { key: 'fonte', label: 'Fonte', defaultValue: 'Prefeitura Municipal de Passo Fundo' }
      ]
    },
    searchable: false
  },
  {
    id: 'ortofoto_central',
    name: 'Ortofoto Central',
    fileName: 'tiles/orto-central/{z}/{x}/{y}.png',
    source: 'Prefeitura Municipal de Passo Fundo / Levantamento Aerofotogramétrico',
    refDate: 'Julho/2026',
    group: 'ortofotos',
    isRaster: true,
    isXYZTiles: true,
    tileUrl: 'tiles/orto-central/{z}/{x}/{y}.png',
    minZoom: 13,
    maxZoom: 19,
    defaultVisible: false,
    defaultOpacity: 1.0,
    zIndex: 5,
    isLazy: true,
    extent: [362476.98, 6873353.98, 363857.75, 6874781.79],
    crs: 'EPSG:31982',
    date: 'Julho de 2026',
    files: [
      'Ortofotos/orto_central.tif'
    ],
    style: {
      previewColor: '#0891b2'
    },
    popupConfig: {
      titleField: 'name',
      defaultTitle: 'Ortofotos – Levantamento Aerofotogramétrico (Área Central)',
      fields: [
        { key: 'name', label: 'Camada', defaultValue: 'Ortofoto Aerofotogramétrica Central' },
        { key: 'data', label: 'Data do Levantamento', defaultValue: 'Julho de 2026' },
        { key: 'crs', label: 'Sistema de Referência', defaultValue: 'SIRGAS 2000 / UTM 22S (EPSG:31982)' },
        { key: 'gsd', label: 'Resolução Espacial (GSD)', defaultValue: '5 cm/pixel' },
        { key: 'area', label: 'Abrangência', defaultValue: 'Área Central e Entorno Urbano de Passo Fundo' },
        { key: 'fonte', label: 'Fonte', defaultValue: 'Prefeitura Municipal de Passo Fundo' }
      ]
    },
    searchable: false
  },

  // ================= 9. MAPEAMENTO & DIAGNÓSTICO SGB =================
  {
    id: 'mapeamento_sgb_2025',
    name: 'Mapeamento de Áreas de Risco — Serviço Geológico do Brasil (SGB, 2025)',
    fileName: 'Mapeamento Serviço Geológico do Brasil (SGB, 2025).geojson',
    source: 'Serviço Geológico do Brasil (SGB)',
    refDate: '2025',
    group: 'mapeamento_sgb',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 0.85,
    zIndex: 60,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(234, 88, 12, 0.28)',
      strokeColor: '#ea580c',
      strokeWidth: 2.0,
      previewColor: '#ea580c'
    },
    popupConfig: {
      titleField: 'NUM_SETOR',
      titlePrefix: 'Setor de Risco: ',
      defaultTitle: 'Setor de Risco Geológico (SGB 2025)',
      fields: [
        { key: 'NUM_SETOR', label: 'Código Oficial do Setor' },
        { key: 'LOCAL', label: 'Localização / Bairros' },
        { key: 'GRAU_RISCO', label: 'Grau de Risco Geológico' },
        { key: 'GRAU_VULNE', label: 'Grau de Vulnerabilidade' },
        { key: 'NUM_EDIF', label: 'Edificações em Risco', format: 'number' },
        { key: 'NUM_PESS', label: 'População Estimada em Risco', format: 'number' },
        { key: 'SITUACAO_01', label: 'Histórico / Situação' },
        { key: 'DESCRICAO', label: 'Diagnóstico Técnico de Campo' },
        { key: 'fonte', label: 'Órgão Responsável', defaultValue: 'Serviço Geológico do Brasil (SGB)' },
        { key: 'ano', label: 'Ano do Mapeamento', defaultValue: '2025' }
      ]
    },
    searchable: true,
    searchFields: ['NUM_SETOR', 'LOCAL', 'GRAU_RISCO', 'DESCRICAO']
  },
  {
    id: 'domicilios_risco_sgb_2025',
    name: 'Domicílios em Área de Risco — Serviço Geológico do Brasil (SGB), 2025',
    fileName: 'Domicilios em Área de Risco (SGB, 2025).geojson',
    source: 'Serviço Geológico do Brasil (SGB)',
    refDate: '2025',
    group: 'mapeamento_sgb',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 80,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#f97316',
      pointRadius: 4.8,
      strokeColor: '#ffffff',
      strokeWidth: 1.5,
      previewColor: '#f97316'
    },
    popupConfig: {
      titleField: 'fid',
      titlePrefix: 'Domicílio em Área de Risco — ID: ',
      defaultTitle: 'Domicílio em Área de Risco (SGB 2025)',
      fields: [
        { key: 'fid', label: 'Identificador do Domicílio (FID)' },
        { key: 'COD_MUN', label: 'Código IBGE do Município' },
        { key: 'COD_ESPECI', label: 'Classificação do Domicílio', defaultValue: '1 (Particular Ocupado)' },
        { key: 'NV_GEO_COO', label: 'Nível de Precisão Georreferenciada', defaultValue: '1 (Alta Precisão)' },
        { key: 'UF', label: 'Unidade Federativa (UF)' },
        { key: 'fonte', label: 'Órgão Responsável', defaultValue: 'Serviço Geológico do Brasil (SGB)' },
        { key: 'ano', label: 'Ano do Mapeamento', defaultValue: '2025' }
      ]
    },
    searchable: true,
    searchFields: ['fid', 'COD_MUN', 'UF']
  }
];

/**
 * Predefined Quick Operational Map Scenarios / Presets
 */
export const OPERATIONAL_PRESETS = [
  {
    id: 'preset_ortofoto',
    name: '🛰️ Ortofotos & Rio Passo Fundo',
    description: 'Ortofotos de alta resolução combinadas com o curso do Rio Passo Fundo, Faixa de 30 metros e 318 residências',
    activeLayers: ['ortofotos_rio_passo_fundo', 'ortofoto_central', 'rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'areas_enchente_2024', 'limite_territorial']
  },
  {
    id: 'preset_app_risco',
    name: '🌊 Faixa de 30 metros & Rio Passo Fundo',
    description: 'Foco no Rio Passo Fundo, faixa de Faixa de 30 metros e 318 residências mapeadas',
    activeLayers: ['rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'areas_enchente_2024', 'bairros', 'limite_territorial']
  },
  {
    id: 'preset_defesa_civil',
    name: '🚨 Cenário de Risco & Enchentes',
    description: 'Foco em mancha de inundação 2024, Faixa de 30 metros, abrigos de emergência e sua cobertura de 2 km, malha hídrica e bairros',
    activeLayers: ['areas_enchente_2024', 'app_30metros', 'cobertura_abrigos_2km', 'edificacoes_app', 'abrigos_defesa_civil', 'malha_hidrica', 'bairros', 'distritos', 'limite_territorial']
  },
  {
    id: 'preset_logistica',
    name: '🚚 Cenário de Acessos & Logística Viária',
    description: 'Foco em rodovias federais/estaduais, estradas municipais, ferrovia, pontes e limites',
    activeLayers: ['rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'pontes', 'limite_territorial', 'distritos']
  },
  {
    id: 'preset_demografico',
    name: '👥 Cenário Demográfico & Social',
    description: 'Foco em densidade populacional, setores censitários e bairros',
    activeLayers: ['densidade_populacional', 'setores_censitarios', 'bairros', 'distritos', 'limite_territorial']
  },
  {
    id: 'preset_geral',
    name: '🏛️ Visão Geral Padrão',
    description: 'Configuração institucional inicial com camadas territoriais e de risco',
    activeLayers: ['areas_enchente_2024', 'rio_passo_fundo', 'app_30metros', 'cobertura_abrigos_2km', 'edificacoes_app', 'abrigos_defesa_civil', 'malha_hidrica', 'rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'pontes', 'limite_territorial', 'bairros', 'distritos']
  }
];
