# RELATÓRIO TÉCNICO OFICIAL — ETAPA 5.2
## IMPLEMENTAÇÃO DA PRECIPITAÇÃO MENSAL ESPACIALIZADA (AGOSTO/2026)
### MOTOR GEOESTATÍSTICO IDW (p=2) • SIRGAS 2000 / UTM ZONA 22S (EPSG:31982)

**Portal da Defesa Civil / WebGIS Municipal de Passo Fundo / RS**  
**Data de Execução:** 14 de Setembro de 2026  
**Status:** Implementado, Validado e Integrado com Sucesso  

---

## 1. OBJETIVO E ESCOPO DA ETAPA 5.2

A **Etapa 5.2** consolidou a implementação do terceiro produto meteorológico contínuo no módulo **🌦️ Mapas Climáticos**: a **Precipitação Acumulada Mensal Espacializada** referente a **Agosto de 2026**, utilizando dados pluviométricos reais da rede telemétrica municipal Plugfield.

Esta implementação foi conduzida sob **preservação absoluta** de todas as funcionalidades legadas do WebGIS e dos produtos climáticos precedentes:
* **Etapa 3:** Temperatura Média Diária Espacializada (14/09/2026);
* **Etapa 4:** Temperatura Média Mensal Espacializada (Agosto/2026);
* **Item 6:** Central Meteorológica, Avisos e telemetria em tempo real;
* **Camadas Geográficas:** Hidrografia, manchas de inundação, buffers e infraestrutura urbana.

---

## 2. METODOLOGIA E PARÂMETROS GEOESTATÍSTICOS

### 2.1. Formulação do IDW (Ponderação pelo Inverso do Quadrado da Distância)

A interpolação espacial contínua foi calculada pelo método determinístico do Inverso da Distância Ponderada com expoente de potência $p=2$:

$$\hat{P}(x, y) = \frac{\sum_{i=1}^{n} w_i \cdot P_i}{\sum_{i=1}^{n} w_i}, \quad w_i = \frac{1}{d_i^2}$$

Onde:
* $\hat{P}(x, y)$: Precipitação acumulada mensal interpolada na coordenada métrica $(x, y)$;
* $P_i$: Precipitação acumulada mensal observada na estação meteorológica $i$;
* $d_i$: Distância euclidiana tridimensional/bidimensional projetada (em metros) entre a célula da grade e a estação $i$;
* $n = 15$: Quantidade de estações Plugfield que atenderam aos critérios estritos de completude temporal.

### 2.2. Sistema Cartográfico e Resolução Espacial da Grade

* **Sistema de Referência Espacial:** SIRGAS 2000 / UTM Zona 22S (EPSG:31982), Meridiano Central -51°W. O cálculo de distâncias é estritamente euclidiano em metros, eliminando distorções de projeções esféricas ou geográficas.
* **Grade Raster:** $220\text{ colunas} \times 156\text{ linhas} = 34.320\text{ células}$.
* **Dimensão da Célula:** Aproximadamente $207\text{ metros} \times 207\text{ metros}$, garantindo resolução cartográfica submunicipal refinada com tempo de processamento inferior a $15\text{ ms}$.
* **Recorte Espacial (Ray-Casting):** Máscara poligonal vetorial baseada no Limite Municipal oficial de Passo Fundo (`boundary.ring`). Todas as células externas têm canal alfa zerado (100% de transparência).

### 2.3. Controle de Completude Temporal e Tratamento de Zeros

* **Período Fechado:** 01/08/2026 a 31/08/2026 (31 dias).
* **Critério de Corte Pluviométrico:** Completude temporal mínima de **95%** ($\ge 30\text{ dias válidos}$).
* **Tratamento Rigoroso de Dias Secos:** Leituras com $0\text{ mm}$ de chuva acumulada (`rainAccum === 0`) são tratadas explicitamente como **observações meteorológicas válidas de tempo seco** e somadas ao acumulado. Apenas valores `null`, `undefined` ou `NaN` caracterizam ausência de dado.

---

## 3. TABELA CONSOLIDADA DAS 16 ESTAÇÕES (AGOSTO/2026)

| ID | Estação Meteorológica | Longitude | Latitude | UTM X (m) | UTM Y (m) | Dias Válidos | Completude | Total Mensal (mm) | Situação na Interpolação |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---|
| **10994** | 2000 - ATITUS | -52.41724 | -28.24357 | 360.913 | 6.875.059 | 31/31 | 100,00% | **189,20 mm** | ✅ Participante |
| **3009** | Avena | -52.41372 | -28.32421 | 361.378 | 6.866.126 | 31/31 | 100,00% | **167,10 mm** | ✅ Participante |
| **4431** | Av. Brasil (Largo Literatura) | -52.40455 | -28.26127 | 362.185 | 6.873.118 | 31/31 | 100,00% | **178,20 mm** | ✅ Participante |
| **4712** | Bela Vista | -52.37839 | -28.24438 | 364.729 | 6.875.016 | 31/31 | 100,00% | **155,10 mm** | ✅ Participante |
| **4713** | Bom Recreio | -52.45781 | -28.32145 | 357.049 | 6.866.370 | 31/31 | 100,00% | **195,47 mm** | ✅ Participante (Máx) |
| **4717** | Camponesa | -52.41018 | -28.19799 | 361.543 | 6.880.124 | 31/31 | 100,00% | **187,00 mm** | ✅ Participante |
| **4253** | Capinzal | -52.48421 | -28.19941 | 354.281 | 6.879.839 | 0/31 | 0,00% | **0,00 mm** | 🚫 Excluída (< 95%) |
| **2856** | Fazenda Bugre | -52.54467 | -28.18378 | 348.330 | 6.881.498 | 31/31 | 100,00% | **148,20 mm** | ✅ Participante (Mín) |
| **4678** | Fredolino Chimango (Centro) | -52.40879 | -28.25732 | 361.764 | 6.873.551 | 31/31 | 100,00% | **174,57 mm** | ✅ Participante |
| **4714** | Lobo da Costa | -52.42194 | -28.27218 | 360.493 | 6.871.890 | 31/31 | 100,00% | **176,33 mm** | ✅ Participante |
| **4931** | Pulador | -52.46332 | -28.38477 | 356.598 | 6.859.336 | 31/31 | 100,00% | **148,72 mm** | ✅ Participante |
| **4965** | Quinto Giongo (Victor Issler) | -52.38914 | -28.27891 | 363.725 | 6.871.186 | 31/31 | 100,00% | **179,63 mm** | ✅ Participante |
| **4416** | São Roque | -52.44318 | -28.26123 | 358.397 | 6.873.080 | 31/31 | 100,00% | **168,85 mm** | ✅ Participante |
| **4798** | Sede Independência | -52.44299 | -28.29175 | 358.461 | 6.869.697 | 31/31 | 100,00% | **180,73 mm** | ✅ Participante |
| **4283** | Transbrasiliana | -52.44686 | -28.19941 | 357.949 | 6.879.897 | 31/31 | 100,00% | **167,31 mm** | ✅ Participante |
| **2041** | Veneza | -52.36889 | -28.27472 | 365.706 | 6.871.670 | 31/31 | 100,00% | **173,40 mm** | ✅ Participante |

---

## 4. ANÁLISE ESTATÍSTICA E COMPORTAMENTO ESPACIAL

* **Estações Participantes:** 15 de 16 estações ($93,75\%$ da rede).
* **Completude Temporal das Participantes:** 100% (31 de 31 dias válidos).
* **Mínimo Observado:** $148,20\text{ mm}$ (Fazenda Bugre, setor oeste do município).
* **Máximo Observado:** $195,47\text{ mm}$ (Bom Recreio, setor centro-sul do município).
* **Média Observada da Rede:** $172,69\text{ mm}$.
* **Amplitude Pluviométrica Municipal:** $47,27\text{ mm}$.

### 4.1. Justificativa Técnica das Estações Especiais
1. **Capinzal (ID 4253):** Apresentou $0/31\text{ dias válidos}$ no mês de Agosto de 2026 em decorrência do travamento do relógio RTC do datalogger (que estampa registros no ano 2000). A exclusão é estritamente lógica no filtro de completude temporal ($0\% < 95\%$), sem afetar o cadastro da estação ou sua visibilidade nas demais ferramentas do geoportal.
2. **Veneza (ID 2041):** Confirmou 31/31 dias válidos em Agosto com acumulado consistente de $173,40\text{ mm}$, participando ativamente da espacialização contínua do setor leste de Passo Fundo.

---

## 5. PALETA CROMÁTICA PLUVIOMÉTRICA CONTÍNUA

Para evitar conflito semântico com as rampas térmicas (onde o vermelho indica calor), a precipitação utiliza uma **paleta contínua internacional hidrológica/pluviométrica**:

| Parada ($t$) | Cor Hexadecimal | RGB | Descrição / Sensação Visual |
|:---:|:---:|:---:|:---|
| **0.00** | `#e0f2fe` | `(224, 242, 254)` | Azul Celeste Muito Claro (precipitação mínima da amplitude) |
| **0.25** | `#38bdf8` | `(56, 189, 248)` | Azul Claro Vibrante |
| **0.50** | `#0284c7` | `(2, 132, 199)` | Azul Oceano (região em torno da média municipal) |
| **0.75** | `#1e40af` | `(30, 64, 175)` | Azul Cobalto Profundo (chuva acumulada elevada) |
| **1.00** | `#6b21a8` | `(107, 33, 168)` | Violeta / Púrpura Intenso (precipitação máxima da amplitude) |

Opacidade padrão de renderização: **$85\%$**, permitindo excelente contraste cromático com o arruamento e hidrografia do mapa-base.

---

## 6. COMPONENTES VISUAIS E EXPERIÊNCIA DO USUÁRIO

1. **Painel de Controle Modal:**
   * Usuário seleciona: **Variável:** Precipitação | **Escala:** Mensal | **Mês:** Agosto de 2026 | **Método:** IDW ($p=2$).
   * Se o usuário tentar selecionar "Precipitação Diária", o sistema exibe uma notificação explicativa informando que o produto diário será liberado em etapa futura.
2. **Legenda Flutuante Interativa:**
   * Título: `🌧️ Precipitação Acumulada Mensal Espacializada`;
   * Subtítulo: `📅 Ago/2026 • 15 estações válidas`;
   * Barra contínua com o gradiente hidrológico azul/violeta;
   * Rótulos: Mínimo ($148,2\text{ mm}$), Média ($172,7\text{ mm}$), Máximo ($195,5\text{ mm}$);
   * Tags de metadados: `Método: IDW (p=2)`, `EPSG:31982`, `Base: Acumulados Mensais (≥95%)`, `Unidade: mm`;
   * Controles de alternância de visibilidade e controle deslizante de opacidade ($20\%$ a $100\%$).
3. **Popup Interativo da Superfície (Clique em qualquer ponto do município):**
   * Exibe o valor pontual interpolado em `mm` (com precisão de 1 casa decimal);
   * Exibe a distância métrica até a estação mais próxima (ex: `Estação Av. Brasil (1,4 km)`);
   * Alerta técnico de rodapé esclarecendo que se trata de uma superfície espacializada contínua por IDW, e não de uma medição física direta no ponto.
4. **Card Contextual na Estação Meteorológica:**
   * Ao clicar sobre o ícone de uma estação Plugfield com a camada pluviométrica ativa:
     * Para as 15 estações participantes: exibe o acumulado mensal derivado ($P_{\text{mensal}}$), dias válidos ($31/31$) e completude ($100,00\% \ge 95\%$);
     * Para Capinzal (4253): exibe badge de alerta destacando que a estação foi excluída logicamente da interpolação por insuficiência de dados válidos ($0/31\text{ dias}$).

---

## 7. MATRIZ DE TESTES E VERIFICAÇÃO DE REGRESSÃO

| Teste | Cenário Avaliado | Resultado | Observação |
|:---:|:---|:---:|:---|
| **T-01** | Precipitação Mensal (Agosto/2026) | ✅ APROVADO | Superfície contínua gerada com 15 estações e amplitude 148,20 a 195,47 mm. |
| **T-02** | Exclusão lógica de Capinzal | ✅ APROVADO | Capinzal excluída do cálculo sem erro de execução e com card explicativo. |
| **T-03** | Inclusão de Veneza | ✅ APROVADO | Veneza incluída com 173,40 mm e 100% de completude. |
| **T-04** | Bloqueio de Precipitação Diária | ✅ APROVADO | Notificação informativa exibida sem quebras ou travamentos. |
| **T-05** | Regressão: Temp. Média Diária (Etapa 3) | ✅ APROVADO | Data 14/09/2026 gera IDW com 14 estações e paleta térmica. |
| **T-06** | Regressão: Temp. Média Mensal (Etapa 4) | ✅ APROVADO | Agosto/2026 gera IDW com 15 estações, completude $\ge 90\%$ e paleta térmica. |
| **T-07** | Regressão: Popups e Ferramentas | ✅ APROVADO | Identificação vetorial de abrigos, hidrografia e buffers 100% preservada. |
| **T-08** | Sincronização de Repositórios | ✅ APROVADO | Desktop e GitHub sincronizados de forma espelhada. |

---

## 8. CONCLUSÃO

A **Etapa 5.2** foi concluída com êxito pleno. O Portal da Defesa Civil de Passo Fundo dispõe agora de um módulo de mapas climáticos robusto, metodologicamente fundamentado nas normas do IBGE e da OMM, operando com dados reais das 16 estações do município sob três produtos totalmente validados:
1. **Temperatura Média Diária Espacializada (IDW p=2)**
2. **Temperatura Média Mensal Espacializada (IDW p=2)**
3. **Precipitação Acumulada Mensal Espacializada (IDW p=2)**
