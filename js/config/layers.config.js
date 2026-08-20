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
    id: 'hidrografia',
    title: '2. Hidrografia & Recursos Hídricos',
    iconClass: 'hydro',
    iconName: 'droplet',
    description: 'Cursos d’água, rios, arroios e divisores de bacias hidrográficas municipais'
  },
  {
    id: 'sistema_viario',
    title: '3. Sistema Viário & Transporte',
    iconClass: 'roads',
    iconName: 'navigation',
    description: 'Malha viária urbana, rodovias federais/estaduais, estradas municipais e ferrovia'
  },
  {
    id: 'divisao_territorial',
    title: '4. Divisão Territorial & Limites',
    iconClass: 'territory',
    iconName: 'map-pin',
    description: 'Limite municipal, distritos, bairros, setores censitários do IBGE e RS'
  },
  {
    id: 'planejamento_urbano',
    title: '5. Planejamento & Ordenamento Urbano',
    iconClass: 'urban',
    iconName: 'building-2',
    description: 'Perímetro do plano diretor e macrozoneamento municipal'
  },
  {
    id: 'populacao',
    title: '6. População & Vulnerabilidade Social',
    iconClass: 'population',
    iconName: 'users',
    description: 'Distribuição, densidade demográfica setorial e domicílios (Censo IBGE 2022)'
  },
  {
    id: 'topografia',
    title: '7. Topografia & Altimetria',
    iconClass: 'topography',
    iconName: 'mountain',
    description: 'Curvas de nível altimétricas do relevo municipal com intervalo vertical de 10 metros'
  }
];

export const LAYERS_CONFIG = [
  // ================= 1. DEFESA CIVIL =================
  {
    id: 'areas_enchente_2024',
    name: 'Áreas de Enchente 2024',
    fileName: 'Áreas de Enchente 2024.geojson',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 0.9,
    zIndex: 65,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(239, 68, 68, 0.45)',
      strokeColor: '#dc2626',
      strokeWidth: 2.8,
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
    id: 'buffer_defesa_civil',
    name: 'Buffer de Segurança / Entorno',
    fileName: 'Buffer.geojson',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 45,
    isCore: false,
    isLazy: true,
    style: {
      fillColor: 'rgba(245, 158, 11, 0.22)',
      strokeColor: '#f59e0b',
      strokeWidth: 2,
      strokeDash: [6, 4],
      previewColor: '#f59e0b'
    },
    popupConfig: {
      titleField: 'NM_MUN',
      titlePrefix: 'Zona de Amortecimento - ',
      fields: [
        { key: 'NM_MUN', label: 'Município' },
        { key: 'AREA_KM2', label: 'Área Abrangida (km²)', format: 'number' },
        { key: 'CD_MUN', label: 'Código IBGE' },
        { key: 'NM_RGI', label: 'Região Geográfica Imediata' }
      ]
    },
    searchable: false
  },
  {
    id: 'app_30metros',
    name: 'APP — 30 Metros (Rio Passo Fundo)',
    fileName: 'APP_30metros.geojson',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 0.75,
    zIndex: 42,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.30)',
      strokeColor: '#059669',
      strokeWidth: 2.0,
      strokeDash: [4, 4],
      previewColor: '#059669'
    },
    popupConfig: {
      titleField: 'APP 30m',
      defaultTitle: 'Área de Preservação Permanente (APP 30m)',
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
    name: 'Residências na APP (318 Pontos)',
    fileName: 'Edificações em APP.geojson',
    group: 'defesa_civil',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 72,
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
      titleField: 'Edificacoe',
      titlePrefix: 'Residência na APP — ID: ',
      fields: [
        { key: 'id', label: 'Identificador (ID)' },
        { key: 'Edificacoe', label: 'Tipo de Edificação' }
      ]
    },
    searchable: true,
    searchFields: ['id', 'Edificacoe']
  },

  // ================= 2. HIDROGRAFIA =================
  {
    id: 'rio_passo_fundo',
    name: 'Rio Passo Fundo (Curso Principal)',
    fileName: 'Rio Passo Fundo.geojson',
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1.0,
    zIndex: 54,
    isCore: true,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 3.5,
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
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 0.95,
    zIndex: 50,
    isLazy: false,
    style: {
      strokeColor: '#0284c7',
      strokeWidth: 1.8,
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
    group: 'hidrografia',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.85,
    zIndex: 40,
    isLazy: true,
    style: {
      strokeColor: '#7c3aed',
      strokeWidth: 2.2,
      strokeDash: [8, 5],
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
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 55,
    isHighway: true,
    highwayType: 'BR',
    style: {
      strokeColor: '#dc2626',
      strokeWidth: 3.5,
      casingColor: '#ffffff',
      casingWidth: 5.5,
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
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 53,
    isHighway: true,
    highwayType: 'ERS',
    style: {
      strokeColor: '#ea580c',
      strokeWidth: 3.0,
      casingColor: '#ffffff',
      casingWidth: 4.8,
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
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 0.9,
    zIndex: 44,
    style: {
      strokeColor: '#d97706',
      strokeWidth: 2.2,
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
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 48,
    isRailway: true,
    style: {
      strokeColor: '#0f172a',
      strokeWidth: 3,
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
    id: 'malha_viaria',
    name: 'Malha Viária Urbana (Ruas)',
    fileName: 'Malha Viária.geojson',
    group: 'sistema_viario',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 35,
    isLazy: true,
    minZoom: 14, // Scale-dependent visibility to prevent viewport clogging
    style: {
      strokeColor: '#64748b',
      strokeWidth: 1.3,
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
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 20,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(0, 0, 0, 0)',
      strokeColor: '#0f172a',
      strokeWidth: 3.2,
      strokeDash: [10, 6],
      previewColor: '#0f172a'
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
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
    defaultOpacity: 0.82,
    zIndex: 30,
    isCore: true,
    isLazy: false,
    style: {
      fillColor: 'rgba(16, 185, 129, 0.15)',
      strokeColor: '#059669',
      strokeWidth: 1.6,
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
    group: 'divisao_territorial',
    geometryType: 'Point',
    defaultVisible: true,
    defaultOpacity: 1,
    zIndex: 75,
    isCore: true,
    isLazy: false,
    style: {
      pointColor: '#dc2626',
      pointRadius: 8,
      strokeColor: '#ffffff',
      strokeWidth: 2.5,
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
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.75,
    zIndex: 25,
    isLazy: true,
    style: {
      fillColor: 'rgba(100, 116, 139, 0.1)',
      strokeColor: '#475569',
      strokeWidth: 1.0,
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
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.7,
    zIndex: 10,
    isLazy: true,
    style: {
      fillColor: 'rgba(71, 85, 105, 0.05)',
      strokeColor: '#64748b',
      strokeWidth: 0.9,
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
    group: 'planejamento_urbano',
    geometryType: 'MultiPolygon',
    defaultVisible: false,
    defaultOpacity: 0.8,
    zIndex: 22,
    isLazy: true,
    style: {
      fillColor: 'rgba(147, 51, 234, 0.12)',
      strokeColor: '#9333ea',
      strokeWidth: 2.2,
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

  // ================= 7. TOPOGRAFIA =================
  {
    id: 'curvas_nivel_10m',
    name: 'Curvas de Nível (10 Metros)',
    fileName: 'Curva de Nível 10 metros.geojson',
    group: 'topografia',
    geometryType: 'MultiLineString',
    defaultVisible: false,
    defaultOpacity: 0.8,
    zIndex: 18,
    isLazy: true,
    minZoom: 13,
    style: {
      strokeColor: '#b45309',
      strokeWidth: 1.0,
      previewColor: '#b45309'
    },
    popupConfig: {
      titleField: 'ELEV',
      titlePrefix: 'Curva de Nível — Cota ',
      fields: [
        { key: 'ELEV', label: 'Altitude / Cota (m)', format: 'number' },
        { key: 'ID', label: 'Identificador Cartográfico' }
      ]
    },
    searchable: true,
    searchFields: ['ELEV']
  }
];

/**
 * Predefined Quick Operational Map Scenarios / Presets
 */
export const OPERATIONAL_PRESETS = [
  {
    id: 'preset_app_risco',
    name: '🌊 APP & Rio Passo Fundo',
    description: 'Foco no Rio Passo Fundo, faixa de APP de 30m e 318 residências mapeadas',
    activeLayers: ['rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'areas_enchente_2024', 'bairros', 'limite_territorial']
  },
  {
    id: 'preset_defesa_civil',
    name: '🚨 Cenário de Risco & Enchentes',
    description: 'Foco em mancha de inundação 2024, buffer de segurança, malha hídrica e bairros',
    activeLayers: ['areas_enchente_2024', 'buffer_defesa_civil', 'malha_hidrica', 'bairros', 'distritos', 'limite_territorial']
  },
  {
    id: 'preset_logistica',
    name: '🚚 Cenário de Acessos & Logística Viária',
    description: 'Foco em rodovias federais/estaduais, estradas municipais, ferrovia e limites',
    activeLayers: ['rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'limite_territorial', 'distritos']
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
    activeLayers: ['areas_enchente_2024', 'rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'malha_hidrica', 'rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'limite_territorial', 'bairros', 'distritos']
  }
];
