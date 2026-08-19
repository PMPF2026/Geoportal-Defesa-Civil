# Portal Geoespacial da Defesa Civil - Passo Fundo / RS (WebGIS)

Sistema WebGIS institucional de alta performance desenvolvido para a **Defesa Civil do Município de Passo Fundo / RS**, voltado para gestão de riscos, monitoramento de inundações/enchentes, análise espacial territorial e apoio à tomada de decisão operacional.

---

## 🏛️ Identidade e Estrutura Institucional

- **Órgão Responsável:** Coordenadoria Municipal de Defesa Civil - Prefeitura de Passo Fundo / RS
- **Datum Geodésico:** SIRGAS 2000
- **Sistema de Coordenadas Original:** UTM Fuso 22S (EPSG:31982)
- **Área Territorial do Município:** 784,41 km²
- **População Total Oficial (Censo IBGE 2022):** 206.215 habitantes
- **Telefone de Emergência:** 199 (Defesa Civil) / 193 (Corpo de Bombeiros)

---

## 🗺️ Camadas Geoespaciais Integradas (16 Camadas)

As camadas estão organizadas em 6 grupos temáticos:

### 1. Defesa Civil
- **Áreas de Enchente 2024:** Polígono da mancha de inundação do evento climático de 2024 (Decreto Estadual de Emergência 57.600/2024 / Mapeamento ADA 03/09/2024). Área: ~4,91 km² (490,9 hectares).
- **Buffer de Segurança / Entorno:** Faixa perimetral de amortecimento e segurança.

### 2. Hidrografia
- **Malha Hídrica:** Rede hidrográfica detalhada com 3.739 trechos de rios, arroios e canais fluviais (~1.708,73 km de extensão linear).
- **Bacias Hidrográficas:** Divisores e grandes bacias hidrográficas do município de Passo Fundo.

### 3. Sistema Viário
- **Rodovias Federais (BR):** Malha federal (BR-285, BR-153, etc.) com ~50,29 km.
- **Rodovias Estaduais (ERS):** Malha estadual (ERS-135, ERS-324, etc.) com ~66,86 km.
- **Estradas Municipais:** Estradas vicinais e acessos rurais do interior com ~285,29 km.
- **Malha Viária Urbana:** Arruamento urbano completo com 11.595 trechos de logradouros (~1.501,61 km).
- **Ferrovia:** Linha férrea com ~55,29 km (Concessionária ALL / Rumo).

### 4. Divisão Territorial
- **Limite Territorial de Passo Fundo:** Perímetro municipal oficial (Área: 784,41 km²).
- **Bairros e Regiões Urbanas:** 23 regiões e bairros urbanos cadastrados com população e vilas associadas.
- **Distritos de Passo Fundo:** 7 distritos municipais (Sede, Bela Vista, Bom Recreio, São Roque, Pulador, Sede Independência, Santo Antônio do Capinzal).
- **Setores Censitários (IBGE 2022):** 312 setores censitários com contagem de moradores, domicílios e renda média domiciliar.
- **Municípios do RS:** Malha dos 496 municípios do Rio Grande do Sul (carregamento sob demanda).

### 5. Planejamento Urbano
- **Limite do Plano Diretor:** Perímetro do macrozoneamento urbano e expansão municipal.

### 6. População
- **Densidade Populacional:** Mapa coroplético classificado em 5 faixas temáticas por setor censitário.

---

## ⚙️ Arquitetura do Sistema e Tecnologias

- **Motor Cartográfico:** OpenLayers 10 com renderização otimizada em Canvas e WebGL.
- **Projeções e Reprojeção On-the-Fly:** Proj4js configurado para **SIRGAS 2000 UTM Zone 22S (EPSG:31982)** para **Web Mercator (EPSG:3857)** e **WGS84 (EPSG:4326)** sem alteração dos arquivos GeoJSON originais.
- **Análise Espacial em Tempo Real:** Turf.js (buffers métricos, análise de interseção, sobreposição de polígonos).
- **Dashboard e Gráficos:** Chart.js 4 integrado ao motor estatístico dinâmico.
- **Ícones e Design System:** Lucide Icons, Tipografia Inter, Paleta Defesa Civil (Azul Marinho `#0f172a` e Laranja Segurança `#ff7800`).

---

## 🚀 Como Executar a Aplicação

### Opção 1: Execução com 1 Clique no Windows
Basta dar um duplo clique no arquivo:
```
start.bat
```
O servidor local iniciará automaticamente e abrirá a aplicação no navegador em `http://localhost:8080`.

### Opção 2: Execução via PowerShell
Execute o comando:
```powershell
powershell -ExecutionPolicy Bypass -File server.ps1
```

### Opção 3: Qualquer Servidor Web Local
Você também pode utilizar qualquer servidor web estático (por exemplo, `python -m http.server 8080`, `npx http-server`, Live Server no VS Code, IIS, Nginx, Apache).

---

## 📊 Funcionalidades Principais

1. **Controle Dinâmico de Camadas:** Ativar/desativar camadas, controle deslizante de transparência (opacidade de 0 a 100%), botão de zoom rápido para a extensão de qualquer camada.
2. **Alternador de Mapas-Base:** Google Híbrido, Google Satélite, Google Maps Ruas, Esri World Imagery, OpenStreetMap e CartoDB Dark.
3. **Legenda Cartográfica Dinâmica:** Atualiza em tempo real refletindo somente as camadas ativas na visualização.
4. **Busca Espacial Inteligente:** Autocomplete por nomes de bairros, distritos, ruas, rodovias, códigos censitários ou coordenadas geográficas (`Lat, Lon`) e UTM (`E, N`).
5. **Popups Contextuais:** Clique sobre qualquer feição para obter seus atributos oficiais formatados (população, densidade, área, comprimento, jurisdição) com botões para aproximar ou copiar.
6. **Medição Geodésica:** Ferramentas de medição de distância linear e área poligonal com cálculo geodésico e marcadores dinâmicos.
7. **Módulo de Análise Espacial:**
   - Geração de buffers métricos paramétricos (ex: 100m, 250m, 500m) em torno de cursos d'água, rodovias e áreas de risco.
   - Cruzamento espacial da mancha de inundação de 2024 com os setores censitários para cálculo da população potencialmente atingida.
8. **Dashboard de Métricas em Tempo Real:** Painel com KPIs calculados a partir dos dados reais e gráficos de distribuição demográfica e viária.
9. **Exportação e Relatório de Situação:** Captura do mapa em alta definição (PNG) e emissão do **Boletim de Situação da Defesa Civil** formatado para impressão ou exportação em PDF.
