# RELATÓRIO TÉCNICO OFICIAL — ETAPA 5.1
## AUDITORIA PLUVIOMÉTRICA DOS DADOS PLUGFIELD (AGOSTO/2026)
### Módulo: 🌦️ Mapas Climáticos — WebGIS Municipal de Passo Fundo / RS

**Tipo de Atividade:** Auditoria Técnica e Diagnóstico de Dados (100% Somente Leitura — Sem Espacialização / Sem IDW)  
**Período Auditado:** `01/08/2026 a 31/08/2026` (Mês Fechado — 31 dias esperados)  
**Rede de Monitoramento:** 16 Estações Meteorológicas Plugfield (`PLUGFIELD_STATIONS_CONFIG`)  
**Endpoint de Consulta:** `/api/weather/plugfield?action=daily`  
**Projeção do Geoportal:** SIRGAS 2000 / UTM Zona 22S (EPSG:31982)  

---

## 1. OBJETIVO DA AUDITORIA

Realizar um diagnóstico aprofundado, independente e rigoroso sobre o comportamento, consistência e completude dos dados de **Precipitação Pluviométrica** reportados pela rede de 16 estações telemétricas Plugfield em Passo Fundo/RS durante o mês fechado de **Agosto de 2026**.

A finalidade desta etapa é verificar tecnicamente a viabilidade, estabilidade e aptidão dos dados para uma futura espacialização geoestatística (Etapa 5.2), identificando a estrutura dos campos pluviométricos, a distinção fundamental entre **"dias sem chuva" ($0,00\text{ mm}$)** e **"dias sem dados" ($\text{ausência / null}$)**, a presença de eventos extremos e a sincronia espacial entre as estações.

---

## 2. IDENTIFICAÇÃO DOS CAMPOS PLUVIOMÉTRICOS NA ESTRUTURA DA API

A infraestrutura telemétrica da Plugfield disponibiliza informações pluviométricas em dois níveis de granularidade:

### 2.1. Endpoint Diário (`/data/daily`)
* **`rainAccum` (ou `rain`)**:
  * **Unidade:** Milímetros ($\text{mm}$).
  * **Significado Físico:** **Precipitação acumulada diária** consolidada pelo servidor telemétrico Plugfield ao longo das 24 horas da data local (`00:00:00` às `23:59:59` horário local).
  * **Comportamento Numérico:**
    * Quando ocorre precipitação no dia: número decimal positivo (ex.: $1,43\text{ mm}$, $29,92\text{ mm}$, $53,68\text{ mm}$). Resolução observada de $0,11\text{ mm}$ por pulso de báscula de pluviômetro.
    * Quando não ocorre precipitação no dia: número real $0$ (ou $0,00$).
    * Quando o servidor não coletou ou a estação esteve fora do ar: ausência de registro na lista diária ou campo não computado.
  * **Avaliação Metodológica:** É o **único campo válido e confiável para representar a precipitação diária** e reconstruir o histórico pluviométrico mensal acumulado.

### 2.2. Endpoint de Dispositivo (`/device` — Dashboard Snapshot)
* **`rainDay`**:
  * **Unidade:** Milímetros ($\text{mm}$).
  * **Significado:** Acumulado pluviométrico do dia corrente (em tempo real). Reiniciado diariamente à meia-noite pelo firmware da estação.
* **`rainMonth`**:
  * **Unidade:** Milímetros ($\text{mm}$).
  * **Significado:** Acumulado pluviométrico do **mês corrente em andamento**.
  * **Limitação Histórica Crucial:** Este campo representa o acumulado do mês *atual* (neste momento, Setembro/2026). Ele **não preserva o histórico de meses anteriores** como Agosto/2026 no snapshot do dispositivo. Portanto, **`rainMonth` não pode ser utilizado para análises de meses passados**. O total mensal de qualquer mês anterior deve ser obrigatoriamente obtido pela soma matemática dos dias válidos: $P_{mensal} = \sum P_{diaria}$.
* **`rainYear`**:
  * **Unidade:** Milímetros ($\text{mm}$).
  * **Significado:** Acumulado anual da estação (ano hidrológico/civil corrente).

---

## 3. AUDITORIA TEMPORAL E TRATAMENTO RIGOROSO DE "ZERO" VS "AUSÊNCIA"

Em climatologia e hidrologia, a distinção entre **chuva zero** e **falta de dados** é vital:
1. **$P = 0,00\text{ mm}$ (Chuva Nula):** Há registro telemétrico regular confirmando que a estação operou normalmente e o pluviômetro de báscula não registrou basculamento de água. Trata-se de um **dado válido de tempo seco**.
2. **Dado Ausente ($\text{null}$ ou ausência de dia):** Falha de transmissão, bateria descarregada ou relógio dessincronizado. Trata-se de uma **lacuna de amostragem**, jamais devendo ser preenchida com $0$ ou médias artificiais.

**Resultados da Auditoria Temporal das 16 Estações em Agosto/2026:**
* **Total de dias esperados:** 31 dias ($01/08$ a $31/08$).
* **Registros Duplicados:** $0$ duplicidades detectadas por `deviceId + localDate`.
* **15 Estações:** Apresentaram **31 registros válidos para os 31 dias do mês** ($100,00\%$ de completude temporal).
* **1 Estação (Capinzal - 4253):** Apresentou $0$ registros válidos ($0,00\%$ de completude temporal) em decorrência de falha no relógio RTC.

---

## 4. TABELA OBRIGATÓRIA: DIAGNÓSTICO PLUVIOMÉTRICO DAS 16 ESTAÇÕES (AGOSTO/2026)

| Estação | ID | Dias Esperados | Dias Válidos | Dias c/ Chuva ($>0$) | Dias Secos ($=0$) | Dias Sem Dados | Total Acumulado Mensal ($\text{mm}$) | Máxima Diária ($\text{mm}$) | Data da Máx. Diária | Situação de Aptidão |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **2000 - ATITUS** | 10994 | 31 | 31 | 21 | 10 | 0 | **189,20** | 53,68 | 12/08/2026 | **A — APROVADA** |
| **Avena** | 3009 | 31 | 31 | 14 | 17 | 0 | **167,10** | 45,00 | 31/08/2026 | **A — APROVADA** |
| **Av. Brasil (Largo Literatura)** | 4431 | 31 | 31 | 18 | 13 | 0 | **178,20** | 46,53 | 12/08/2026 | **A — APROVADA** |
| **Bela Vista** | 4712 | 31 | 31 | 20 | 11 | 0 | **155,10** | 44,66 | 06/08/2026 | **A — APROVADA** |
| **Bom Recreio** | 4713 | 31 | 31 | 23 | 8 | 0 | **195,47** | 54,34 | 12/08/2026 | **A — APROVADA** |
| **Camponesa** | 4717 | 31 | 31 | 22 | 9 | 0 | **187,00** | 46,97 | 12/08/2026 | **A — APROVADA** |
| **Capinzal** | 4253 | 31 | 0 | 0 | 0 | 31 | **0,00** | 0,00 | — | **C — NÃO APTA** |
| **Fazenda Bugre** | 2856 | 31 | 31 | 17 | 14 | 0 | **148,20** | 37,50 | 31/08/2026 | **A — APROVADA** |
| **Fredolino Chimango (Centro)** | 4678 | 31 | 31 | 19 | 12 | 0 | **174,57** | 44,88 | 12/08/2026 | **A — APROVADA** |
| **Lobo da Costa (Entre Rios)** | 4714 | 31 | 31 | 21 | 10 | 0 | **176,33** | 45,98 | 12/08/2026 | **A — APROVADA** |
| **Pulador** | 4931 | 31 | 31 | 21 | 10 | 0 | **148,72** | 39,93 | 12/08/2026 | **A — APROVADA** |
| **Quinto Giongo (Victor Issler)** | 4965 | 31 | 31 | 23 | 8 | 0 | **179,63** | 40,81 | 12/08/2026 | **A — APROVADA** |
| **São Roque** | 4416 | 31 | 31 | 23 | 8 | 0 | **168,85** | 58,74 | 12/08/2026 | **A — APROVADA** |
| **Sede Independência** | 4798 | 31 | 31 | 22 | 9 | 0 | **180,73** | 67,10 | 12/08/2026 | **A — APROVADA** |
| **Transbrasiliana** | 4283 | 31 | 31 | 19 | 12 | 0 | **167,31** | 37,51 | 06/08/2026 | **A — APROVADA** |
| **Veneza** | 2041 | 31 | 31 | 19 | 12 | 0 | **173,40** | 50,10 | 12/08/2026 | **A — APROVADA** |

---

## 5. SEGUNDA TABELA: MATRIZ DIÁRIA COMPLETA DE PRECIPITAÇÃO (VALORES EM mm)

Abaixo é apresentada a série diária completa das 16 estações durante todos os 31 dias de Agosto de 2026.  
*(Convenção: valores numéricos em $\text{mm}$; `0,00` = dia sem chuva comprovado por registro válido; `—` = dia sem dado).*

| Data | ATITUS (10994) | Avena (3009) | Av. Brasil (4431) | Bela Vista (4712) | Bom Recreio (4713) | Camponesa (4717) | Capinzal (4253) | Fazenda Bugre (2856) | Fredolino (4678) | Lobo Costa (4714) | Pulador (4931) | Quinto Giongo (4965) | São Roque (4416) | Sede Indep. (4798) | Transbrasiliana (4283) | Veneza (2041) |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **01/08** | 1,43 | 1,50 | 1,43 | 1,32 | 0,44 | 0,88 | — | 2,10 | 1,43 | 1,32 | 0,99 | 1,43 | 1,65 | 1,10 | 1,54 | 2,40 |
| **02/08** | 0,22 | 0,30 | 0,00 | 0,11 | 0,11 | 0,22 | — | 0,00 | 0,11 | 0,11 | 0,11 | 0,11 | 0,11 | 0,00 | 0,11 | 0,90 |
| **03/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,11 | 0,11 | — | 0,30 | 0,00 | 0,00 | 0,00 | 0,11 | 0,33 | 0,00 | 0,00 | 0,00 |
| **04/08** | 2,64 | 2,10 | 3,19 | 3,19 | 0,44 | 2,97 | — | 1,80 | 3,41 | 2,75 | 1,10 | 3,96 | 0,55 | 0,55 | 3,19 | 1,50 |
| **05/08** | 0,33 | 0,00 | 0,66 | 0,11 | 0,00 | 0,33 | — | 0,90 | 0,11 | 0,44 | 0,22 | 0,22 | 0,22 | 0,11 | 0,00 | 0,00 |
| **06/08** | 29,92 | 40,20 | 30,36 | **44,66** | 32,67 | 36,19 | — | 35,70 | 28,38 | 30,69 | 28,60 | 33,88 | 23,98 | 28,27 | **37,51** | 30,90 |
| **07/08** | 0,44 | 0,00 | 0,44 | 0,22 | 0,22 | 0,44 | — | 0,30 | 0,33 | 0,55 | 0,33 | 0,55 | 0,22 | 0,44 | 0,44 | 0,30 |
| **08/08** | 6,05 | 3,00 | 4,84 | 4,18 | 1,76 | 2,75 | — | 1,20 | 3,63 | 3,63 | 1,43 | 2,86 | 1,76 | 1,87 | 2,97 | 1,20 |
| **09/08** | 0,44 | 0,30 | 0,22 | 0,33 | 0,22 | 0,33 | — | 0,30 | 0,22 | 0,22 | 0,22 | 0,22 | 0,22 | 0,33 | 0,33 | 2,10 |
| **10/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,30 |
| **11/08** | 11,55 | 14,40 | 12,98 | 13,86 | 10,67 | 14,30 | — | 12,00 | 11,99 | 12,32 | 10,56 | 13,97 | 9,68 | 11,22 | 16,61 | 10,50 |
| **12/08** | **53,68** | 4,50 | **46,53** | 11,88 | **54,34** | **46,97** | — | 2,40 | **44,88** | **45,98** | **39,93** | **40,81** | **58,74** | **67,10** | 32,78 | **50,10** |
| **13/08** | 5,94 | 0,00 | 11,77 | 0,99 | 21,67 | 7,70 | — | 1,20 | 10,01 | 11,44 | 1,76 | 12,87 | 4,07 | 4,07 | 2,64 | 2,40 |
| **14/08** | 2,20 | 5,70 | 2,20 | 5,06 | 0,55 | 2,64 | — | 6,00 | 2,20 | 2,53 | 1,21 | 2,75 | 0,44 | 0,66 | 2,97 | 2,40 |
| **15/08** | 1,10 | 0,30 | 1,43 | 0,55 | 2,31 | 0,88 | — | 0,00 | 0,99 | 1,54 | 0,55 | 1,21 | 0,00 | 0,11 | 1,10 | 0,90 |
| **16/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **17/08** | 0,11 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **18/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **19/08** | 3,08 | 0,00 | 2,20 | 0,44 | 0,33 | 4,95 | — | 0,00 | 4,29 | 1,76 | 1,43 | 1,54 | 1,54 | 0,66 | 0,66 | 0,60 |
| **20/08** | 11,55 | 12,90 | 10,67 | 12,32 | 10,45 | 12,87 | — | 13,80 | 11,11 | 10,89 | 10,45 | 11,22 | 10,67 | 10,23 | 10,34 | 11,70 |
| **21/08** | 0,55 | 0,00 | 0,66 | 0,55 | 0,11 | 0,99 | — | 0,60 | 0,55 | 0,99 | 0,33 | 0,66 | 0,22 | 1,21 | 0,66 | 0,60 |
| **22/08** | 0,11 | 0,00 | 0,00 | 0,22 | 0,11 | 0,22 | — | 0,00 | 0,00 | 0,11 | 0,22 | 0,11 | 0,22 | 0,11 | 0,22 | 0,00 |
| **23/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,11 | 0,00 | — | 0,00 | 0,00 | 0,11 | 0,00 | 0,11 | 0,11 | 0,22 | 0,00 | 0,00 |
| **24/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **25/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **26/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,11 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,11 | 0,11 | 0,11 | 0,00 | 0,00 |
| **27/08** | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,11 | — | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 | 0,00 |
| **28/08** | 0,00 | 0,00 | 0,00 | 0,00 | 4,73 | 0,00 | — | 0,00 | 0,00 | 0,00 | 0,66 | 0,00 | 4,95 | 8,14 | 0,00 | 0,00 |
| **29/08** | 20,90 | 21,00 | 15,73 | 19,25 | 17,38 | 13,09 | — | 18,30 | 18,26 | 15,07 | 13,20 | 14,41 | 17,60 | 18,92 | 15,40 | 14,10 |
| **30/08** | 15,40 | 15,90 | 13,31 | 9,13 | 22,55 | 13,75 | — | 13,80 | 13,53 | 13,97 | 14,52 | 14,52 | 13,09 | 9,02 | 16,61 | 16,50 |
| **31/08** | 21,56 | **45,00** | 19,58 | 26,73 | 14,08 | 24,31 | — | **37,50** | 19,14 | 19,91 | 20,90 | 22,00 | 18,37 | 16,28 | 21,23 | 24,00 |
| **TOTAL** | **189,20** | **167,10** | **178,20** | **155,10** | **195,47** | **187,00** | **0,00** | **148,20** | **174,57** | **176,33** | **148,72** | **179,63** | **168,85** | **180,73** | **167,31** | **173,40** |

---

## 6. DIAGNÓSTICO DE EVENTOS EXTREMOS E SINCRONIA ESPACIAL

A matriz diária revela com extrema clareza a passagem de sistemas meteorológicos reais e frentes frias sobre o município de Passo Fundo:

1. **Episódio 1 — 06 de Agosto de 2026 (Frente fria generalizada):**
   * Todas as estações registraram precipitação de intensidade moderada a forte: variando de $23,98\text{ mm}$ (São Roque) a $44,66\text{ mm}$ (Bela Vista) e $40,20\text{ mm}$ (Avena).
   * Indica perfeita coerência espacial sinótica sobre todo o território municipal.
2. **Episódio 2 — 11 e 12 de Agosto de 2026 (Maior Evento Pluviométrico do Mês):**
   * No dia 11/08, chuva pré-frontal de $9,6\text{ mm}$ a $16,6\text{ mm}$ em toda a rede.
   * No dia **12/08/2026**, ocorreu o pico pluviométrico mensal:
     * **Sede Independência:** $67,10\text{ mm}$ (maior acumulado diário individual da rede em agosto);
     * **São Roque:** $58,74\text{ mm}$;
     * **Bom Recreio:** $54,34\text{ mm}$;
     * **ATITUS:** $53,68\text{ mm}$;
     * **Veneza:** $50,10\text{ mm}$;
     * **Camponesa:** $46,97\text{ mm}$;
     * **Lobo da Costa:** $45,98\text{ mm}$;
     * **Fredolino Chimango / Centro:** $44,88\text{ mm}$.
   * **Observação de variabilidade:** As estações Fazenda Bugre ($2,40\text{ mm}$) e Avena ($4,50\text{ mm}$), localizadas nos setores rurais periféricos, registraram menor volume no núcleo convectivo daquele dia, compensado por precipitações mais expressivas nos dias 30 e 31/08.
3. **Episódio 3 — 29 a 31 de Agosto de 2026 (Encerramento de mês com acumulados expressivos):**
   * Três dias consecutivos com chuva generalizada em todas as 15 estações ativas ($13\text{ mm}$ a $45\text{ mm}$ diários).
4. **Período Estável e Seco (16/08 a 18/08 e 24/08 a 27/08):**
   * Sequências de dias ensolarados com $0,00\text{ mm}$ registrados simultaneamente por praticamente todas as estações, comprovando excelente resposta dos sensores na ausência de chuva.

---

## 7. ANÁLISE DETALHADA: VENEZA (2041) E CAPINZAL (4253)

### 7.1. Estação Veneza (ID 2041)
* **Status Pluviométrico em Agosto/2026:** **100% REGULAR E ÍNTEGRO.**
* **Dias Válidos:** $31/31$ dias.
* **Completude Temporal:** $100,00\%$.
* **Dias com Chuva:** 19 dias ($>0$).
* **Dias sem Chuva:** 12 dias ($=0,00\text{ mm}$).
* **Dias sem Dados:** 0 dias.
* **Total Acumulado Mensal:** $173,40\text{ mm}$.
* **Máxima Diária:** $50,10\text{ mm}$ no dia 12/08/2026.
* **Conclusão:** O problema de silenciamento de Veneza em setembro/2026 não afetou de nenhuma maneira seu histórico de agosto. Está **100% Apta** para integrar futuras análises e espacializações de Agosto/2026.

### 7.2. Estação Capinzal (ID 4253)
* **Status Pluviométrico em Agosto/2026:** **INOPERANTE.**
* **Causa Raiz:** O firmware da estação segue transmitindo carimbos com ano 1999 (falha de hardware RTC). O endpoint diário para o período `01/08/2026 a 31/08/2026` não possui registros indexados.
* **Dias Válidos:** $0/31$ dias ($0,00\%$).
* **Conclusão:** **Classificada como "C — NÃO APTA" para espacialização.** Não deve ser removida do cadastro do portal nem ter seu status alterado na Central Meteorológica, devendo apenas ser excluída logicamente de cálculos geoestatísticos até regularização do seu relógio físico.

---

## 8. CLASSIFICAÇÃO GERAL DE APTIDÃO

* **Categoria A — APROVADAS PARA ESPACIALIZAÇÃO (15 Estações):**
  1. 10994 — 2000 - ATITUS ($189,20\text{ mm}$)
  2. 3009 — Avena ($167,10\text{ mm}$)
  3. 4431 — Av. Brasil / Largo Literatura ($178,20\text{ mm}$)
  4. 4712 — Bela Vista ($155,10\text{ mm}$)
  5. 4713 — Bom Recreio ($195,47\text{ mm}$)
  6. 4717 — Camponesa ($187,00\text{ mm}$)
  7. 2856 — Fazenda Bugre ($148,20\text{ mm}$)
  8. 4678 — Fredolino Chimango / Centro ($174,57\text{ mm}$)
  9. 4714 — Lobo da Costa / Entre Rios ($176,33\text{ mm}$)
  10. 4931 — Pulador ($148,72\text{ mm}$)
  11. 4965 — Quinto Giongo / Victor Issler ($179,63\text{ mm}$)
  12. 4416 — São Roque ($168,85\text{ mm}$)
  13. 4798 — Sede Independência ($180,73\text{ mm}$)
  14. 4283 — Transbrasiliana ($167,31\text{ mm}$)
  15. 2041 — Veneza ($173,40\text{ mm}$)
  * *Média Municipal Acumulada em Agosto/2026:* **$172,69\text{ mm}$** (amplitude de $148,20\text{ mm}$ no Pulador a $195,47\text{ mm}$ no Bom Recreio, demonstrando excepcional homogeneidade pluviométrica em escala mensal).
* **Categoria B — APROVADAS COM RESSALVAS (0 Estações):**
  * Nenhuma estação apresentou lacunas parciais em agosto.
* **Categoria C — NÃO APTAS (1 Estação):**
  * 4253 — Capinzal ($0/31$ dias válidos).

---

## 9. RECOMENDAÇÃO METODOLÓGICA PARA A ETAPA 5.2

Respondendo pontualmente às 8 questões técnicas levantadas:

1. **Qual campo deverá representar a precipitação diária?**  
   O campo `rainAccum` (ou `rain`) do endpoint `/api/weather/plugfield?action=daily`. Trata-se do acumulado das 24 horas consolidadas pelo servidor telemétrico.
2. **Qual campo deverá representar a precipitação acumulada mensal?**  
   A **soma direta dos valores diários válidos**: $P_{mensal} = \sum_{i=1}^{N} P_{diaria,i}$. Não deve ser utilizado o campo `rainMonth` do snapshot, pois ele reflete o mês corrente e não os meses fechados do histórico.
3. **Os dados diários são completos?**  
   **Sim, extraordinariamente completos.** 15 das 16 estações possuem 100% dos 31 dias de agosto auditados, com registro explícito de chuva e de ausência de chuva ($0,00\text{ mm}$).
4. **Quantas estações possuem dados suficientes?**  
   **Exatamente 15 estações.**
5. **Qual critério de completude seria recomendado para chuva mensal?**  
   Diferente da temperatura (onde 90% pode ser aceitável para estimar médias), **em precipitação acumulada qualquer dia faltante subtrai volume físico de água**. Recomenda-se para precipitação mensal um limiar rigoroso de **95% de completude** (ao menos 30 de 31 dias válidos). No caso de Agosto/2026, todas as 15 estações aptas atingiram **100% de completude**, superando com folga o critério.
6. **Há necessidade de tratamento de eventos extremos?**  
   O valor máximo registrado ($67,10\text{ mm}$ na Sede Independência em 12/08) foi acompanhado por valores de $50\text{ a }58\text{ mm}$ nas estações vizinhas (São Roque, Bom Recreio, ATITUS, Veneza). Portanto, **não se trata de ruído instrumental ou anomalia espúria, mas de um evento hidrometeorológico real de chuva intensa**. Não deve sofrer corte ou suavização artificial.
7. **É tecnicamente adequado utilizar IDW para precipitação?**  
   **Sim, com considerações:**
   * Para **precipitação acumulada mensal**, o IDW ($p=2$) é excelente, pois a escala temporal mensal atenua a descontinuidade espacial de células convectivas isoladas, gerando superfícies contínuas coerentes com a topografia e gradientes regionais.
   * Para **precipitação diária**, o IDW é adequado em dias de chuva frontal generalizada (como 06/08, 12/08 ou 31/08). Em dias de pancadas convectivas isoladas de verão, deve ser considerado o efeito "olho de boi" (*bull's-eye*), inerente ao IDW sem covariáveis.
8. **Há limitações antes da espacialização?**  
   A principal diretriz cartográfica é a **legenda de chuva**, que deve utilizar escala pluviométrica clássica (tons de verde a azul escuro e violeta, conforme convenção meteorológica internacional), evitando a paleta térmica de temperatura (azul a vermelho).

---

## 10. CONFIRMAÇÃO DE PRESERVAÇÃO E TESTES DE REGRESSÃO

1. **Nenhuma Interpolação Pluviométrica Executada:** Nenhuma camada, raster, grid ou Canvas de precipitação foi criado nesta Etapa 5.1, conforme determinação expressa do usuário.
2. **Integridade do Portal e Camadas Existentes:**
   * **Temperatura Média Diária (14/09/2026):** Permanece 100% funcional no modal e no mapa.
   * **Temperatura Média Mensal (Agosto/2026):** Permanece 100% funcional no modal e no mapa.
   * **Item 6, Central Meteorológica, APIs e Ferramentas:** 100% intactos e inalterados.
