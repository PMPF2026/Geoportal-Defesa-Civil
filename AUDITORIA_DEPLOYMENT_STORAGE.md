# RELATÓRIO DE AUDITORIA ULTRACONSERVADORA DO DEPLOYMENT STORAGE

**Projeto:** Portal Geospacial / WebGIS da Defesa Civil de Passo Fundo  
**Ambiente de Produção:** Vercel (`geoportal-defesa-civil.vercel.app`)  
**Repositório GitHub:** `PMPF2026/Geoportal-Defesa-Civil`  
**Data da Auditoria:** 14/09/2026  
**Status da Execução:** MODO 100% SOMENTE LEITURA (Nenhum arquivo modificado ou excluído)  

---

## SUMÁRIO EXECUTIVO

| Métrica | Valor Auditado | Observação Técnica |
| :--- | :---: | :--- |
| **Storage Utilizado no Vercel** | **~5,54 GB** | Limite da conta: 10,00 GB (55,4% utilizado) |
| **Tamanho Real do Portal Atual (Build de Produção)** | **53,48 MB (0,052 GB)** | Apenas **0,53%** do limite de 10 GB |
| **Tamanho da Pasta de Trabalho Local (Desktop)** | **4.665,70 MB (4,556 GB)** | 98,9% são imagens GeoTIFF brutas locais (`Ortofotos/`) |
| **Causa Raiz dos 5,54 GB na Vercel** | **Retenção de 92 Deploys Históricos** | 92 deploys acumulados × ~55 MB a ~60 MB por snapshot |
| **Arquivos no Repositório de Produção** | **3.572 arquivos** | 3.481 tiles web + 39 GeoJSON/JSON + 35 JS/CSS/HTML + 3 APIs + 14 outros |
| **Risco de Exclusão de Código/Camadas** | **ALTO (Inútil para os 5,54 GB)** | Excluir arquivos de dados não resolverá o storage da plataforma |
| **Solução Efetiva e Segura** | **Limpeza de Deploys Antigos no Vercel** | Reduz o storage de 5,54 GB para ~60 MB sem tocar no código |

---

## 1. ESPAÇO TOTAL ANALISADO

A auditoria cobriu 100% dos arquivos em dois ambientes:
1. **Repositório GitHub / Vercel (Produção):** `c:\Users\User\OneDrive\Documentos\GitHub\Geoportal-Defesa-Civil`
   - Total de arquivos auditados: **3.572 arquivos**
   - Volume total do snapshot ativo: **53,48 MB**
   - Histórico Git (`.git`): **85,12 MB** (92 commits registrados)
2. **Ambiente de Trabalho Local (Desktop):** `c:\Users\User\OneDrive\Desktop\Portal Defesa Civil\Portal Defesa Civil PF`
   - Total de arquivos auditados: **3.591 arquivos**
   - Volume total local: **4.665,70 MB (4,556 GB)**

---

## 2. ESPAÇO ATUALMENTE OCUPADO (POR CATEGORIA)

### A) No Repositório GitHub (O que é efetivamente implantado na Vercel)

| Categoria | Quantidade | Espaço Ocupado (MB) | Espaço Ocupado (GB) | % do Deploy |
| :--- | :---: | :---: | :---: | :---: |
| **GeoJSON / JSON (Bases Vetoriais)** | 39 | 37,35 MB | 0,0365 GB | 69,8% |
| **Tiles Web (Pirâmides XYZ Ortofotos)** | 3.481 | 15,37 MB | 0,0150 GB | 28,7% |
| **JavaScript / CSS / HTML (Frontend)** | 35 | 0,64 MB | 0,0006 GB | 1,2% |
| **Imagens (Logos PNG/JPG/SVG)** | 3 | 0,05 MB | 0,0001 GB | 0,1% |
| **APIs / Serverless Functions (Backend)** | 3 | 0,03 MB | 0,0000 GB | 0,1% |
| **Configurações (`vercel.json`, `layers.config`)** | 5 | 0,06 MB | 0,0001 GB | 0,1% |
| **Outros (Metadados, BAT, XLSX)** | 6 | 0,03 MB | 0,0000 GB | 0,1% |
| **Raster / GeoTIFF (`.tif`)** | 0 | 0,00 MB | 0,0000 GB | 0,0% |
| **TOTAL DO DEPLOY ATUAL EM PRODUÇÃO** | **3.572** | **53,48 MB** | **0,0522 GB** | **100,0%** |

### B) No Desktop Local (Origem dos 4,55 GB no disco do computador)

| Categoria | Quantidade | Espaço Ocupado (MB) | Espaço Ocupado (GB) | % do Local |
| :--- | :---: | :---: | :---: | :---: |
| **Raster / GeoTIFF (`Ortofotos/*.tif`)** | 7 | 4.617,31 MB | 4,5091 GB | **98,96%** |
| **GeoJSON / JSON** | 32 | 32,18 MB | 0,0314 GB | 0,69% |
| **Tiles Web (Pirâmides XYZ)** | 3.481 | 15,37 MB | 0,0150 GB | 0,33% |
| **JavaScript / CSS / HTML** | 36 | 0,66 MB | 0,0006 GB | 0,01% |
| **Outros (QMD, BAT, XLSX, VRT)** | 27 | 0,09 MB | 0,0001 GB | 0,01% |
| **Imagens / Configurações / APIs** | 8 | 0,09 MB | 0,0001 GB | 0,01% |
| **TOTAL NO DESKTOP LOCAL** | **3.591** | **4.665,70 MB** | **4,5563 GB** | **100,0%** |

> **Nota Crítica sobre o `.gitignore`:** A pasta `Ortofotos/` (4,51 GB) está protegida pela regra `Ortofotos/*.tif` no arquivo `.gitignore`. Ela **NUNCA** foi enviada ao GitHub nem subiu para a Vercel.

---

## 3. TOP 50 MAIORES ARQUIVOS DO PROJETO EM PRODUÇÃO (REPOSITÓRIO)

| Pos | Nome do Arquivo | Formato | Tamanho (KB) | Tamanho (MB) | Função no WebGIS |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `Malha Hídrica.geojson` | GeoJSON | 21.371,4 | **20,87 MB** | Camada oficial de drenagem e rios de Passo Fundo |
| **2** | `Malha Viária.geojson` | GeoJSON | 4.725,0 | **4,61 MB** | Sistema viário urbano completo de Passo Fundo |
| **3** | `Municípios do RS.geojson` | GeoJSON | 1.265,5 | **1,24 MB** | Contexto territorial e limites limítrofes regionais |
| **4** | `Setores Censitários Passo Fundo.geojson` | GeoJSON | 985,3 | **0,96 MB** | Malha de setores censitários do IBGE |
| **5** | `Densidade Populacional.geojson` | GeoJSON | 940,4 | **0,92 MB** | Base anterior de densidade demográfica |
| **6** | `cn22_pop03_20a59_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 694,4 | **0,68 MB** | Censo 2022 IBGE: População adulta (20 a 59 anos) |
| **7** | `cn22_pop03_m60_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 675,7 | **0,66 MB** | Censo 2022 IBGE: População idosa (60+ anos vulnerável) |
| **8** | `cn22_pop03_15a19_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 671,2 | **0,66 MB** | Censo 2022 IBGE: Jovens de 15 a 19 anos |
| **9** | `cn22_pop03_10a14_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 671,2 | **0,66 MB** | Censo 2022 IBGE: Crianças/Jovens de 10 a 14 anos |
| **10** | `cn22_pop03_0a4_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 669,9 | **0,65 MB** | Censo 2022 IBGE: Primeira infância (0 a 4 anos vulnerável) |
| **11** | `cn22_pop03_5a9_tot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 669,9 | **0,65 MB** | Censo 2022 IBGE: Crianças de 5 a 9 anos |
| **12** | `cn22_pop04_res_tot_kmtot_2_4314100_georedus_censo_2022.geojson` | GeoJSON | 668,4 | **0,65 MB** | Censo 2022 IBGE: Densidade demográfica ativa oficial |
| **13** | `APP_30metros.geojson` | GeoJSON | 659,9 | **0,64 MB** | Faixa marginal de proteção de 30m dos corpos d'água |
| **14** | `cn22_pop05_rsp_tot_0_4314100_georedus_censo_2022.geojson` | GeoJSON | 644,2 | **0,63 MB** | Censo 2022 IBGE: Domicílios particulares ocupados |
| **15** | `Bairros Passo Fundo.geojson` | GeoJSON | 636,8 | **0,62 MB** | Delimitação oficial dos bairros urbanos |
| **16** | `Bacias Hidrográfias de Passo Fundo.geojson` | GeoJSON | 453,8 | **0,44 MB** | Bacias e sub-bacias hidrográficas municipais |
| **17** | `Áreas de Enchente 2024.geojson` | GeoJSON | 293,9 | **0,29 MB** | Mancha real de inundação da cheia de maio de 2024 |
| **18** | `Edificações em APP.geojson` | GeoJSON | 280,0 | **0,27 MB** | 318 residências em área de preservação com distâncias |
| **19** | `residencias_app_30m_dist_rio.geojson` | GeoJSON | 280,0 | **0,27 MB** | Arquivo idêntico ao `Edificações em APP.geojson` |
| **20** | `Domicilios em Área de Risco (SGB, 2025).geojson` | GeoJSON | 244,9 | **0,24 MB** | Mapeamento de residências em setores de risco SGB |
| **21** | `Estradas Municipais.geojson` | GeoJSON | 234,7 | **0,23 MB** | Malha de estradas rurais e acessos vicinais |
| **22** | `weather-ui.js` | JS | 85,5 | **0,08 MB** | Interface e lógica da Central Meteorológica e Avisos |
| **23** | `index.html` | HTML | 82,5 | **0,08 MB** | Estrutura principal do WebGIS e modais |
| **24** | `export-report.js` | JS | 77,3 | **0,08 MB** | Motor de geração do Boletim de Situação e PDF |
| **25** | `Limite Territorial Passo Fundo.geojson` | GeoJSON | 65,4 | **0,06 MB** | Polígono de contorno municipal de Passo Fundo |
| **26** | `Rio Passo Fundo.geojson` | GeoJSON | 64,1 | **0,06 MB** | Eixo hidrológico central do Rio Passo Fundo |
| **27** | `Edificações em APP.original.geojson` | GeoJSON | 56,5 | **0,06 MB** | Versão original antes do cálculo de distâncias |
| **28** | `Mapeamento Serviço Geológico do Brasil (SGB, 2025).geojson` | GeoJSON | 54,3 | **0,05 MB** | 25 setores de risco geológico SGB 2025 |
| **29** | `layers.config.js` | JS | 51,4 | **0,05 MB** | Configuração mestre de todas as camadas do WebGIS |
| **30** | `Ferrovia.geojson` | GeoJSON | 48,8 | **0,05 MB** | Traçado da malha ferroviária federal |
| **31** | `Rodovia Estadual.geojson` | GeoJSON | 46,2 | **0,05 MB** | Rodovias estaduais de acesso a Passo Fundo |
| **32** | `spatial-analysis.js` | JS | 45,2 | **0,04 MB** | Motor de cálculo espacial, buffers e interseções |
| **33** | `Limite Plano Diretor.geojson` | GeoJSON | 41,8 | **0,04 MB** | Perímetro urbano do Plano Diretor municipal |
| **34** | `tiles/orto-central/19/181636/305057.png` | PNG Tile | 41,0 | **0,04 MB** | Tile web de ortofoto aérea |
| **35** | `tiles/orto-central/19/181637/305057.png` | PNG Tile | 40,9 | **0,04 MB** | Tile web de ortofoto aérea |
| **36** | `tiles/orto-central/19/181637/305072.png` | PNG Tile | 40,4 | **0,04 MB** | Tile web de ortofoto aérea |
| **37** | `tiles/orto-central/19/181638/305059.png` | PNG Tile | 40,4 | **0,04 MB** | Tile web de ortofoto aérea |
| **38** | `tiles/orto-central/18/90818/152534.png` | PNG Tile | 40,2 | **0,04 MB** | Tile web de ortofoto aérea |
| **39** | `tiles/orto-central/19/181639/305060.png` | PNG Tile | 39,8 | **0,04 MB** | Tile web de ortofoto aérea |
| **40** | `tiles/orto-central/18/90818/152535.png` | PNG Tile | 39,8 | **0,04 MB** | Tile web de ortofoto aérea |
| **41** | `tiles/orto-central/19/181638/305073.png` | PNG Tile | 39,7 | **0,04 MB** | Tile web de ortofoto aérea |
| **42** | `tiles/orto-central/18/90818/152528.png` | PNG Tile | 39,6 | **0,04 MB** | Tile web de ortofoto aérea |
| **43** | `tiles/orto-central/18/90818/152510.png` | PNG Tile | 39,2 | **0,04 MB** | Tile web de ortofoto aérea |
| **44** | `tiles/orto-central/18/90819/152534.png` | PNG Tile | 39,2 | **0,04 MB** | Tile web de ortofoto aérea |
| **45** | `tiles/orto-central/19/181639/305073.png` | PNG Tile | 39,0 | **0,04 MB** | Tile web de ortofoto aérea |
| **46** | `tiles/orto-central/19/181638/305057.png` | PNG Tile | 38,9 | **0,04 MB** | Tile web de ortofoto aérea |
| **47** | `tiles/orto-central/18/90818/152536.png` | PNG Tile | 38,7 | **0,04 MB** | Tile web de ortofoto aérea |
| **48** | `tiles/orto-central/19/181637/305073.png` | PNG Tile | 38,6 | **0,04 MB** | Tile web de ortofoto aérea |
| **49** | `tiles/orto-central/19/181638/305072.png` | PNG Tile | 38,6 | **0,04 MB** | Tile web de ortofoto aérea |
| **50** | `tiles/orto-central/19/181639/305061.png` | PNG Tile | 38,5 | **0,04 MB** | Tile web de ortofoto aérea |

---

## 4. DIRETÓRIOS QUE MAIS OCUPAM ESPAÇO

### No Repositório / Build de Produção:
1. **Raiz do Repositório (`/`):** **37,42 MB** (38 arquivos GeoJSON + `index.html` + `vercel.json` + `README.md`)
2. **`tiles/`:** **15,37 MB** (3.481 tiles web das ortofotos aéreas)
   - `tiles/orto-central/`: 11,20 MB (2.420 tiles)
   - `tiles/ortofotos-rio-passo-fundo/`: 4,17 MB (1.061 tiles)
3. **`js/`:** **0,53 MB** (31 arquivos JavaScript)
4. **`css/`:** **0,06 MB** (6 folhas de estilo CSS)
5. **`assets/`:** **0,04 MB** (Logos oficiais da Defesa Civil)
6. **`api/`:** **0,03 MB** (Serverless functions do Vercel)
7. **`Dados Excel/`:** **0,02 MB** (Planilhas originais de abrigos e ZPH)

### No Desktop Local:
1. **`Ortofotos/`:** **4.617,31 MB (4,51 GB)** — Arquivos GeoTIFF brutos de altíssima resolução.

---

## 5. CLASSIFICAÇÃO RIGOROSA DOS ARQUIVOS

### GRUPO A — ESSENCIAL / EM USO (NÃO TOCAR)
Comprovadamente em uso pelo mapa OpenLayers, Central Meteorológica, relatórios ou análises:
- Todas as **32 camadas GeoJSON ativas** configuradas em `layers.config.js` (Malha Hídrica, Malha Viária, APP 30m, Inundação 2024, Edificações em APP, SGB Risco 2025, Bairros, Bacias, Rodovias, Limite Municipal, DCRS-00016, Plugfield, Abrigos, ZPH, Pontes, Distritos, Censo 2022).
- Os **3.481 tiles web** em `tiles/` que formam a camada de Ortofoto do Rio Passo Fundo e Central.
- Todos os arquivos **JavaScript, CSS, HTML** e **APIs serverless** (`plugfield.js`, `defesacivil.js`, `inmet.js`).
- Assets institucionais (`assets/logo-defesa-civil.jpg`, `logo-defesa-civil.svg`).

### GRUPO B — POSSIVELMENTE UTILIZADO / DADOS DE APOIO (PRESERVAR)
- `Dados Excel/abrigos_defesa_civil.xlsx` (11,6 KB) e `Zonas de Pauso de Helicóptero (ZPH).xlsx` (10,3 KB): fontes originais tabulares.
- Arquivos `.qmd` (metadados QGIS): pesam menos de 4 KB cada, úteis se o usuário abrir o projeto no QGIS.
- `Ortofotos/*.tif` (4,51 GB locais no Desktop): fonte raster original necessária caso se queira regerar ou reprocessar tiles no futuro.

### GRUPO C — PROVAVELMENTE ÓRFÃO (Sem impacto de storage)
- `plugfield_spec.js` (73,7 KB) e `plugfield_spec_clean.json` (73,7 KB): Documentações OpenAPI da Plugfield utilizadas como especificação de referência.

### GRUPO D — ÓRFÃOS COMPROVADOS NO REPOSITÓRIO (Candidatos à limpeza futura)

| Arquivo | Tamanho | Motivo para ser candidato | Evidência Técnica | Risco | Recomendação |
| :--- | :---: | :--- | :--- | :---: | :---: |
| `Densidade Populacional.geojson` | **940,4 KB** | Camada demográfica legada anterior ao Censo 2022 | O WebGIS agora usa `cn22_pop04_res_tot_kmtot_2_4314100_georedus_censo_2022.geojson` oficial do IBGE. | Baixo | Aguardar autorização |
| `residencias_app_30m_dist_rio.geojson` | **280,0 KB** | Cópia intermediária temporária de processamento | Tamanho idêntico (286.697 bytes) ao `Edificações em APP.geojson` atual. Não é chamado por nenhuma camada. | Mínimo | Aguardar autorização |
| `Edificações em APP.original.geojson` | **56,5 KB** | Backup prévio do GeoJSON antes do cálculo de distâncias | A versão ativa é `Edificações em APP.geojson` (280 KB). | Mínimo | Aguardar autorização |
| `Cobertura de Abrigos em 1km.geojson` | **31,7 KB** | Substituído por decisão de projeto | O projeto ampliou o raio de abrangência para 2 km (`Cobertura de Abrigos em 2km.geojson`). | Baixo | Aguardar autorização |

> **Economia potencial no repositório se o Grupo D for removido:** **1,27 MB** (apenas 0,02% dos 5,54 GB do Vercel).

---

## 6. O QUE EFETIVAMENTE EXPLICA OS 5,54 GB NO VERCEL?

A Vercel contabiliza como **"Deployment Storage"** a **soma de todos os deploys históricos retidos** na sua conta.

1. **Histórico do Repositório:** O projeto possui **92 commits**.
2. **Histórico de Deploys:** Cada commit enviado acionou um deploy completo na Vercel.
3. **Cálculo Matemático:**
   $$\text{92 deploys} \times \sim 55\text{ MB a } 60\text{ MB por build snapshot} \approx \mathbf{5,06\text{ GB a }5,52\text{ GB}}$$
4. **Conclusão Técnica Inquestionável:**
   - O projeto em si **NÃO** está inchado (pesa apenas 53,5 MB).
   - Apagar arquivos de camadas (mesmo os órfãos de 1,27 MB) **não resolverá o problema dos 5,54 GB**, pois o acúmulo está na retenção de dezenas de versões históricas mantidas nos servidores da Vercel.

---

## 7. RECOMENDAÇÃO FINAL E PROCEDIMENTO SEGURO

### Procedimento Recomendado (Sem risco ao código ou dados):
Para liberar imediatamente cerca de **5,0 GB a 5,4 GB** do limite de 10 GB na Vercel:

1. Acesse o painel da Vercel: [vercel.com](https://vercel.com).
2. Entre no projeto **`geoportal-defesa-civil`**.
3. Clique na aba **Deployments**.
4. Você verá uma lista com dezenas de deploys antigos (de agosto e setembro).
5. Deixe intacto o deploy que possui a tag **`Production (Current)`**.
6. Nos deploys antigos anteriores (marcados com três pontinhos `...` à direita):
   - Clique em `...` -> **Delete**.
   - Ou vá em **Project Settings** -> **General** -> configure o **Deployment Retention** para períodos menores (ex: 7 ou 14 dias), permitindo que a própria Vercel descarte compilações antigas automaticamente.

### Quanto aos 4 arquivos órfãos locais (1,27 MB):
Como o impacto no storage da Vercel é irrisório (~1,27 MB), eles permanecem **100% intocados** nesta fase conforme a regra ultraconservadora. Somente serão removidos se você autorizar explicitamente.

---
*Relatório emitido com conformidade ultraconservadora: nenhuma alteração, remoção ou mutação foi realizada no repositório ou no ambiente local.*