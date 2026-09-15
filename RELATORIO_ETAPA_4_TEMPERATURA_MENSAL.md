# RELATÓRIO TÉCNICO OFICIAL — ETAPA 4
## TEMPERATURA MÉDIA MENSAL ESPACIALIZADA (AGOSTO/2026)
### Módulo: 🌦️ Mapas Climáticos — WebGIS Municipal de Passo Fundo / RS

**Data de Implementação e Auditoria:** 14/09/2026 (executada em 15/09/2026)  
**Sistema de Referência Cartográfica:** SIRGAS 2000 / UTM Zona 22S — EPSG:31982  
**Método Geoestatístico:** IDW (Ponderação pelo Inverso da Distância, potência $p = 2$)  
**Status da Etapa:** Concluída com 100% de Sucesso  

---

## 1. OBJETIVO DO PRODUTO

Implementar o segundo produto climático do módulo **🌦️ Mapas Climáticos**: a **Temperatura Média Mensal Espacializada** para um mês fechado de referência (**Agosto de 2026**), integrando:
1. Leitura direta e exclusiva dos dados observados diários via endpoint oficial `/api/weather/plugfield?action=daily`;
2. Algoritmo de controle rigoroso de completude temporal com cálculo dinâmico de dias esperados ($31$ dias para agosto);
3. Aplicação do limiar mínimo de **90% de completude** ($\ge 28$ dias válidos) para elegibilidade na espacialização mensal;
4. Interpolação contínua por IDW ($p = 2$) em coordenadas métricas euclidianas no EPSG:31982;
5. Recorte espacial restrito ao Limite Territorial Municipal de Passo Fundo (algoritmo Ray-Casting);
6. Distinção conceitual categórica entre **Dados Observados**, **Média Mensal Derivada** e **Superfície Espacializada**;
7. Preservação integral do produto diário da Etapa 3 (14/09/2026) e de 100% das ferramentas e camadas pré-existentes.

---

## 2. FONTE E NATUREZA DOS DADOS

* **Endpoint Utilizado:** `/api/weather/plugfield?action=daily` (Proxy Serverless Oficial do Portal).
* **Período Consultado:** `01/08/2026` a `31/08/2026` (31 dias corridos de mês fechado).
* **Dado Diário de Referência:** Campo `temp` consolidado pelo servidor Plugfield a partir da telemetria real em campo.
* **Fórmula da Temperatura Média Mensal Derivada ($T_{mensal}$):**

$$
T_{mensal} = \frac{\sum_{i=1}^{N_{validos}} T_{diaria,i}}{N_{validos}}
$$

* **Controle de Completude:**

$$
\text{Completude} (\%) = \left( \frac{N_{validos}}{N_{esperados}} \right) \times 100 = \left( \frac{N_{validos}}{31} \right) \times 100
$$

* **Critério de Elegibilidade:**
  * Estações com $N_{validos} \ge 28$ dias ($\ge 90,0\%$): **Participam da espacialização mensal**.
  * Estações com $N_{validos} < 28$ dias ($< 90,0\%$): **Excluídas logicamente da espacialização mensal por insuficiência de dados válidos**, sem qualquer alteração em seu cadastro ou permanência no portal.

---

## 3. TABELA OBRIGATÓRIA DA AUDITORIA DAS 16 ESTAÇÕES (AGOSTO/2026)

| Estação | ID | Dias Esperados | Dias Válidos | Completude | T Média Mensal | Participa do IDW Mensal | Observações e Motivo Técnico |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Transbrasiliana** | 4283 | 31 | 31 | 100,00% | 14,94 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Capinzal** | 4253 | 31 | 0 | 0,00% | N/A | ❌ **NÃO** | **Excluída logicamente da espacialização mensal por insuficiência de dados válidos** (relógio RTC desajustado em 1999) |
| **Sede Independência** | 4798 | 31 | 31 | 100,00% | 15,11 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **São Roque** | 4416 | 31 | 31 | 100,00% | 15,40 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Avena** | 3009 | 31 | 31 | 100,00% | 15,36 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Pulador** | 4931 | 31 | 31 | 100,00% | 15,16 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Quinto Giongo (Victor Issler)** | 4965 | 31 | 31 | 100,00% | 15,25 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Fredolino Chimango (Centro)** | 4678 | 31 | 31 | 100,00% | 15,76 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Fazenda Bugre** | 2856 | 31 | 31 | 100,00% | 15,10 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Bela Vista** | 4712 | 31 | 31 | 100,00% | 15,03 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Bom Recreio** | 4713 | 31 | 31 | 100,00% | 14,97 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Lobo da Costa (Entre Rios)** | 4714 | 31 | 31 | 100,00% | 15,00 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Camponesa** | 4717 | 31 | 31 | 100,00% | 14,35 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Av. Brasil (Largo Literatura)** | 4431 | 31 | 31 | 100,00% | 15,75 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **2000 - ATITUS** | 10994 | 31 | 31 | 100,00% | 14,82 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 |
| **Veneza** | 2041 | 31 | 31 | 100,00% | 15,25 °C | ✅ **SIM** | Histórico 100% íntegro em Agosto/2026 (participa plenamente) |

---

## 4. ANÁLISE DOS CASOS ESPECÍFICOS

### 4.1. Estação Veneza (ID 2041)
* **Comportamento em Agosto/2026:** Transmitiu durante todos os 31 dias do mês, sem lacunas.
* **Média Mensal Derivada:** $15,25\text{ °C}$ (calculada a partir de 31 médias diárias válidas).
* **Completude:** $100,00\%$ ($\ge 90\%$).
* **Situação na Espacialização Mensal:** **APROVADA E PARTICIPANTE**. Demonstra a solidez metodológica do sistema: ter ficado fora do IDW diário de 14/09 (quando esteve sem comunicação) não impede sua participação justa em um mês onde operou com 100% de disponibilidade.

### 4.2. Estação Capinzal (ID 4253)
* **Comportamento em Agosto/2026:** Devido à falha de hardware no RTC interno (registros carimbados com o ano 1999), a estação retornou $0$ registros diários válidos para Agosto de 2026.
* **Completude:** $0,00\%$ ($< 90\%$).
* **Situação na Espacialização Mensal:** **Excluída logicamente da espacialização mensal por insuficiência de dados válidos.**
* **Preservação:** Permanece devidamente cadastrada no portal e visível no mapa geral, sem alteração no status da Central Meteorológica.

---

## 5. PARÂMETROS DA INTERPOLAÇÃO IDW E SUPERFÍCIE CARTOGRÁFICA

* **Método:** Ponderação pelo Inverso da Distância ao Quadrado ($p = 2$).
* **Coordenadas de Cálculo:** Métricas euclidianas no plano projetado SIRGAS 2000 / UTM Zona 22S (EPSG:31982) — distâncias calculadas em metros ($m$).
* **Resolução da Grade:** 220 colunas $\times$ 156 linhas ($\approx 207$ metros por célula raster).
* **Área de Processamento:** Caixa envolvente oficial do município de Passo Fundo ($X_{min}: 334.426,86\text{ m}$; $X_{max}: 379.940,32\text{ m}$; $Y_{min}: 6.862.610,61\text{ m}$; $Y_{max}: 6.894.945,67\text{ m}$).
* **Recorte Cartográfico:** Estrito ao polígono vetorial do limite municipal oficial (`Limite Territorial Passo Fundo.geojson`), com células externas transparentes via algoritmo de Ray-Casting.
* **Valores Extremos Observados (Base das 15 Estações em Agosto/2026):**
  * **Temperatura Média Mensal Mínima:** $14,35\text{ °C}$ (Estação Camponesa)
  * **Temperatura Média Mensal Máxima:** $15,76\text{ °C}$ (Estação Fredolino Chimango / Centro)
  * **Temperatura Média Espacial Média:** $15,22\text{ °C}$
  * **Amplitude Térmica Territorial:** $1,41\text{ °C}$
* **Rampa Cromática Utilizada:**
  * Escala climatológica contínua profissional:
    * $14,2\text{ °C}$: Azul Sereno (`#0284c7`)
    * $14,6\text{ °C}$: Teal Suave (`#0d9488`)
    * $15,1\text{ °C}$: Verde Esmeralda (`#16a34a`)
    * $15,5\text{ °C}$: Âmbar Dourado (`#eab308`)
    * $15,9\text{ °C}$: Laranja Quente (`#ea580c`)
* **Desempenho de Processamento Raster:** $< 12\text{ ms}$ no cliente.

---

## 6. INTERFACE, POPUPS E LEGENDA CARTOGRÁFICA

1. **Seleção no Modal "🌦️ Mapas Climáticos":**
   * Ao selecionar **Temperatura** e **Mensal**, o campo de mês assume por padrão `Agosto de 2026` (`2026-08`).
   * Ao clicar em "Gerar mapa", o motor processa a grade mensal e atualiza a camada no OpenLayers.
2. **Legenda Flutuante Adaptativa:**
   * Título: `Temperatura Média Mensal Espacializada`
   * Período: `Ago/2026 • 15 estações válidas`
   * Tags: `Método: IDW (p=2)`, `EPSG:31982`, `Base: Médias Mensais (≥90%)`, `Unidade: °C`
   * Gradiente contínuo com os valores reais da amplitude mensal ($14,4\text{ °C}$ a $15,8\text{ °C}$).
   * Controles de alternância de visibilidade e controle deslizante de opacidade.
3. **Popup Interativo da Superfície Espacializada:**
   * Apresenta o valor exato no pixel clicado em °C com 2 casas decimais.
   * Rótulo: `Temperatura Média Mensal Espacializada`.
   * Período: `Agosto de 2026 • Passo Fundo / RS`.
   * Base: `15 estações (médias mensais com completude ≥ 90%)`.
   * Indicação da estação mais próxima e distância em km.
   * Nota de rodapé técnica explicando que se trata de uma superfície contínua derivada de observações telemétricas.
4. **Popup das Estações Plugfield (Contextual):**
   * Quando a camada mensal está ativa e o usuário clica em uma estação participante (ex.: Veneza, ATITUS, Centro):
     * Card em destaque: **Estação Meteorológica — [NOME]**, `Temperatura média mensal: XX,XX °C`, `Período: Agosto de 2026`, `Dias válidos: 31/31`, `Completude: 100,00% (Aprovada ≥ 90%)`.
     * Nota: `Fonte: dados observados pelas estações Plugfield (Média Mensal Derivada)`.
   * Se clicar na estação Capinzal com a camada ativa:
     * Card informativo: `Estação Meteorológica — Capinzal`, `Dias válidos: 0/31 (Completude: 0%)`, `🚫 Excluída logicamente da espacialização mensal por insuficiência de dados válidos (< 90%)`.
   * Não altera o funcionamento padrão do popup das estações quando a camada climática está desativada.

---

## 7. TESTE DE REGRESSÃO: TEMPERATURA MÉDIA DIÁRIA (14/09/2026)

Após a implementação da funcionalidade mensal, foi executada a regressão completa do produto diário:
* **Parâmetros Selecionados:** Temperatura + Diário + 14/09/2026.
* **Resultado:**
  * Estações Participantes: **14 estações** (Veneza e Capinzal excluídas logicamente por ausência de dados válidos em 14/09).
  * Amplitude Térmica Diária: $12,7\text{ °C}$ a $13,9\text{ °C}$.
  * Superfície diária renderizada com sucesso, popup e legenda preservados integralmente.
* **Conclusão da Regressão:** Zero quebras e perfeita coexistência entre as escalas diária e mensal.

---

## 8. CONFIRMAÇÃO DE AUSÊNCIA DE DADOS SIMULADOS E PRESERVAÇÃO

1. **Nenhum Dado Fictício:** Todos os cálculos derivam exclusivamente de registros reais capturados no endpoint `/data/daily` da infraestrutura Plugfield.
2. **Preservação Absoluta:**
   * O Item 6 (Vulnerabilidade Social e População) permaneceu 100% intacto;
   * A Central Meteorológica e Avisos permaneceu 100% intacta;
   * O cadastro e coordenadas das 16 estações permaneceram 100% intactos;
   * Ferramentas de medição, buffer, exportação e relatórios permaneceram 100% operacionais.
