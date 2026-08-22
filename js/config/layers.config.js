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
    title: '2. Abrigos e Cobertura',
    iconClass: 'shelter',
    iconName: 'home',
    description: 'Abrigos municipais da Defesa Civil e raio territorial de 1 km para resposta a emergências',
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
    title: '8. Ortofotos & Imagens Aéreas',
    iconClass: 'ortho',
    iconName: 'camera',
    description: 'Levantamento aerofotogramétrico de alta resolução do Rio Passo Fundo (Julho/2026 - SIRGAS 2000 UTM 22S)'
  }
];

export const LAYERS_CONFIG = [
  // ================= 1. DEFESA CIVIL =================
  {
    id: 'areas_enchente_2024',
    name: 'Áreas de Enchente 2024',
    fileName: 'Áreas de Enchente 2024.geojson',
    source: 'Defesa Civil / Mapeamento Oficial',
    refDate: 'Maio/2024',
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
    name: 'APP — 30 Metros (Rio Passo Fundo)',
    fileName: 'APP_30metros.geojson',
    source: 'Prefeitura Municipal de Passo Fundo / Lei 12.651',
    refDate: '2026',
    group: 'defesa_civil',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
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
      titlePrefix: 'Residência na APP — ID: ',
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

  // ================= 2. ABRIGOS E COBERTURA =================
  {
    id: 'abrigos_defesa_civil',
    name: 'Abrigos da Defesa Civil (17 Locais)',
    fileName: 'Abrigos da Defesa Civil.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'abrigos_cobertura',
    geometryType: 'Point',
    defaultVisible: true,
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
    id: 'cobertura_abrigos_1km',
    name: 'Cobertura de Abrigos — 1 km',
    fileName: 'Cobertura de Abrigos em 1km.geojson',
    source: 'Defesa Civil de Passo Fundo',
    refDate: '2026',
    group: 'abrigos_cobertura',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
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
      defaultTitle: 'Cobertura de Abrigos — 1 km',
      fields: [
        { key: 'cobertura', label: 'Área de Cobertura', defaultValue: 'Raio territorial de 1 km (1.000 m)' },
        { key: 'finalidade', label: 'Finalidade Operacional', defaultValue: 'Área de influência e atendimento prioritário dos Abrigos da Defesa Civil' }
      ]
    },
    searchable: false
  },

  // ================= 3. HIDROGRAFIA =================
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
    defaultVisible: true,
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
    defaultVisible: true,
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
    defaultVisible: true,
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
      strokeColor: '#0f172a',
      strokeWidth: 1.8,
      strokeDash: [8, 5],
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
    source: 'Prefeitura Municipal / IBGE Censo 2022',
    refDate: '2022',
    group: 'divisao_territorial',
    geometryType: 'MultiPolygon',
    defaultVisible: true,
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
    defaultVisible: true,
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

  // ================= 7. ORTOFOTOS =================
  {
    id: 'ortofotos_rio_passo_fundo',
    name: 'Ortofotos Rio Passo Fundo',
    fileName: 'tiles/ortofotos-rio-passo-fundo/{z}/{x}/{y}.png',
    source: 'Prefeitura Municipal de Passo Fundo',
    refDate: 'Julho/2026',
    group: 'ortofotos',
    isRaster: true,
    isXYZTiles: true,
    tileUrl: 'tiles/ortofotos-rio-passo-fundo/{z}/{x}/{y}.png',
    minZoom: 13,
    maxZoom: 19,
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
      defaultTitle: 'Ortofotos Rio Passo Fundo',
      fields: [
        { key: 'name', label: 'Camada', defaultValue: 'Ortofoto Aerofotogramétrica' },
        { key: 'data', label: 'Data do Levantamento', defaultValue: 'Julho de 2026' },
        { key: 'crs', label: 'Sistema de Referência', defaultValue: 'SIRGAS 2000 / UTM 22S (EPSG:31982)' },
        { key: 'gsd', label: 'Resolução Espacial (GSD)', defaultValue: '5 a 10 cm/pixel' },
        { key: 'area', label: 'Abrangência', defaultValue: 'Calha e Planície Aluvial do Rio Passo Fundo' }
      ]
    },
    searchable: false
  }
];

/**
 * Predefined Quick Operational Map Scenarios / Presets
 */
export const OPERATIONAL_PRESETS = [
  {
    id: 'preset_ortofoto',
    name: '🛰️ Ortofotos & Rio Passo Fundo',
    description: 'Ortofotos de alta resolução combinadas com o curso do Rio Passo Fundo, APP de 30m e 318 residências',
    activeLayers: ['ortofotos_rio_passo_fundo', 'rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'areas_enchente_2024', 'limite_territorial']
  },
  {
    id: 'preset_app_risco',
    name: '🌊 APP & Rio Passo Fundo',
    description: 'Foco no Rio Passo Fundo, faixa de APP de 30m e 318 residências mapeadas',
    activeLayers: ['rio_passo_fundo', 'app_30metros', 'edificacoes_app', 'areas_enchente_2024', 'bairros', 'limite_territorial']
  },
  {
    id: 'preset_defesa_civil',
    name: '🚨 Cenário de Risco & Enchentes',
    description: 'Foco em mancha de inundação 2024, faixa de APP, abrigos de emergência e sua cobertura de 1 km, malha hídrica e bairros',
    activeLayers: ['areas_enchente_2024', 'app_30metros', 'cobertura_abrigos_1km', 'edificacoes_app', 'abrigos_defesa_civil', 'malha_hidrica', 'bairros', 'distritos', 'limite_territorial']
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
    activeLayers: ['areas_enchente_2024', 'rio_passo_fundo', 'app_30metros', 'cobertura_abrigos_1km', 'edificacoes_app', 'abrigos_defesa_civil', 'malha_hidrica', 'rodovia_federal', 'rodovia_estadual', 'estradas_municipais', 'ferrovia', 'pontes', 'limite_territorial', 'bairros', 'distritos']
  }
];
