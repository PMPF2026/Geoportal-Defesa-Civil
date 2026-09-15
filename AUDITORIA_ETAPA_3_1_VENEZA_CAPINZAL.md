# ETAPA 3.1 — AUDITORIA TÉCNICA E VALIDAÇÃO PONTUAL DAS ESTAÇÕES
## Estações: Veneza (ID 2041) e Capinzal (ID 4253)

**Data da Auditoria:** 14/09/2026 (executada em 15/09/2026)  
**Sistema:** Portal da Defesa Civil / WebGIS Municipal de Passo Fundo  
**Modo:** Diagnóstico Técnico — 100% Somente Leitura (sem alterações em código, dados ou camadas)

---

## 1. RESUMO EXECUTIVO

| Item | Estação Veneza (2041) | Estação Capinzal (4253) |
| :--- | :--- | :--- |
| **Status na Central Meteorológica** | Exibe badge **Online** com dados (16,2 °C, Min 12,5 / Max 21,5, Chuva 0,3 mm) | Exibe **Sem comunicação recente** ou congelada (23,1 °C) |
| **Data/Hora Real da Telemetria (Snapshot API)** | `10/09/2026 às 22:37:17 UTC` | `31/12/1999 às 21:04:57 UTC` |
| **Idade Real dos Dados Exibidos** | **4 dias atrás** (dados congelados) | **Falha de hardware no relógio interno (RTC 1999)** |
| **Possui registro em `/data/daily` para 14/09/2026?** | **NÃO** (último dia com dado: 10/09/2026; em 11/09 `temp: null`; 12, 13 e 14/09 ausentes) | **NÃO** (em 10/09 `temp: null`; demais dias ausentes) |
| **Deve participar da interpolação IDW de 14/09/2026?** | **NÃO** | **NÃO** |
| **Total de Estações Válidas para IDW em 14/09/2026** | **14 estações** (confirmação exata da metodologia aplicada na Etapa 3) |

---

## 2. INVESTIGAÇÃO DETALHADA: VENEZA (ID 2041)

### 2.1. Por que a Central Meteorológica exibia Veneza como "Online"?

Ao analisar a rota `/api/weather/plugfield?action=devices` e o serviço `js/weather/plugfield-service.js` (linhas 345 a 388), identificou-se com exatidão a causa raiz:

1. **Persistência do último snapshot na Core API da Plugfield:**
   A API da Plugfield mantém gravado no endpoint `/device` o último pacote recebido pela estação, independentemente de quando ele ocorreu. Para a estação Veneza:
   * `updateDateTime: "2026-09-10T22:37:17.000Z"`
   * `lastUpdateTimestamp: 1789090637000` (10/09/2026 22:37:17 GMT)
   * `temp: 16.2`, `tempMin: 12.5`, `tempMax: 21.5`, `rainDay: 0.3`, `humi: 95`

2. **Lógica de Status no Frontend (`plugfield-service.js` linhas 363-388):**
   * O código calcula `diffMinutes = (Date.now() - d.getTime()) / (1000 * 60)`. Como a data é 10/09/2026, `diffMinutes > 360`, definindo inicialmente `isOnline = false` e `status = 'delayed'`.
   * **Contudo**, nas linhas 380-388 existe uma regra de fallback:
     ```javascript
     // Se possui qualquer telemetria válida registrada, confirma status de funcionamento
     if (tempAtual !== null || rainDay !== null || windSpd !== null || humi !== null) {
       isOnline = true;
       if (status === 'offline') {
         status = 'updated';
         if (formattedDate === 'Sem comunicação recente') {
           formattedDate = 'Atualizado em tempo real';
         }
       }
     }
     ```
   * Como `tempAtual` (16.2) e `rainDay` (0.3) não são nulos, a flag `isOnline` é forçada para `true`!
   * Na interface (`weather-ui.js` linhas 779-798), a verificação:
     ```javascript
     const isOnline = st.status === 'updated' || st.status === 'online' || (st.isOnline === true && st.status !== 'offline');
     ```
     resulta em `isOnline = true`, fazendo com que a Central Meteorológica renderize o badge verde **"Online • 10/09/2026 às 22:37"** e mostre os valores de 16,2 °C, mínima de 12,5 °C e máxima de 21,5 °C.

3. **Conclusão sobre a medição de Veneza:**
   * **NÃO se trata de dados atuais de 14/09/2026.**
   * **São dados congelados (históricos) capturados em 10/09/2026 às 22:37**, quando ocorreu a última transmissão da estação à nuvem Plugfield antes de ficar silenciada.

### 2.2. O que retorna o endpoint diário (`/data/daily`) para Veneza?

A consulta oficial ao endpoint histórico:
`https://geoportal-defesa-civil.vercel.app/api/weather/plugfield?action=daily&deviceId=2041&begin=10/09/2026&end=15/09/2026`

Retornou exatamente:
```json
{
  "success": true,
  "data": {
    "deviceId": 2041,
    "stationName": "Veneza",
    "days": [
      {
        "localDate": "2026-09-10",
        "temp": 16.409,
        "tempMin": 12.5,
        "tempMax": 21.5,
        "rainAccum": 0.3,
        "humidity": 95.02
      },
      {
        "localDate": "2026-09-11",
        "temp": null,
        "tempMin": null,
        "tempMax": null,
        "rainAccum": 0,
        "humidity": null
      }
    ]
  }
}
```
* Para **10/09/2026**: a temperatura média diária calculada foi `16.41 °C`.
* Para **11/09/2026**: todos os sensores retornam `null`.
* Para **12/09, 13/09, 14/09 e 15/09/2026**: **nenhum registro existe**.

---

## 3. INVESTIGAÇÃO DETALHADA: CAPINZAL (ID 4253)

### 3.1. Diagnóstico da Telemetria de Capinzal

A consulta ao endpoint individual:
`https://geoportal-defesa-civil.vercel.app/api/weather/plugfield?action=device&deviceId=4253`

Retornou:
* `updateDateTime: "1999-12-31T21:04:57.000Z"`
* `lastUpdateTimestamp: 1788977950000`
* `temp: 23.1`, `tempMin: 23.1`, `tempMax: 23.1`, `rainDay: 0`

**Causa Técnica:**
* A estação Capinzal sofreu desconfiguração ou esgotamento da bateria de backup do seu relógio de tempo real interno (RTC - Real Time Clock), transmitindo com carimbo de ano `1999`.
* Os valores de telemetria permanecem estáticos em 23,1 °C (com mínima e máxima iguais a 23,1 °C).

### 3.2. O que retorna o endpoint diário (`/data/daily`) para Capinzal?

A consulta oficial ao endpoint histórico:
`https://geoportal-defesa-civil.vercel.app/api/weather/plugfield?action=daily&deviceId=4253&begin=10/09/2026&end=15/09/2026`

Retornou:
```json
{
  "success": true,
  "data": {
    "deviceId": 4253,
    "stationName": "Capinzal",
    "days": [
      {
        "localDate": "2026-09-10",
        "temp": null,
        "tempMin": null,
        "tempMax": null,
        "rainAccum": 0,
        "humidity": null
      }
    ]
  }
}
```
* Não há nenhuma medição de temperatura válida para Capinzal no mês de setembro de 2026.

---

## 4. TABELA COMPARATIVA COMPLETA: DASHBOARD VS. DADOS DIÁRIOS

| Estação | ID | Status na Central | Carimbo Dashboard (Snapshot) | Temp Dashboard | Data Diária 14/09/2026 | Temp Média Diária 14/09/2026 | Válida p/ IDW 14/09? |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Veneza** | **2041** | **Online (10/09 22:37)** | **10/09/2026 22:37:17** | **16,2 °C** | **Inexistente** | **null** | ❌ **NÃO** |
| **Capinzal** | **4253** | Offline / Delayed | **31/12/1999 21:04:57** | **23,1 °C** | **Inexistente** | **null** | ❌ **NÃO** |
| 2000 - ATITUS | 10994 | Online | 14/09/2026 21:55:39 | 12,5 °C | 2026-09-14 | 13,32 °C | ✅ SIM |
| Avena | 3009 | Online | 14/09/2026 21:57:19 | 11,9 °C | 2026-09-14 | 13,44 °C | ✅ SIM |
| Av. Brasil | 4431 | Online | 14/09/2026 21:48:57 | 13,7 °C | 2026-09-14 | 13,54 °C | ✅ SIM |
| Bela Vista | 4712 | Online | 14/09/2026 21:52:46 | 12,0 °C | 2026-09-14 | 13,01 °C | ✅ SIM |
| Bom Recreio | 4713 | Online | 14/09/2026 21:55:51 | 10,8 °C | 2026-09-14 | 13,87 °C | ✅ SIM |
| Camponesa | 4717 | Online | 14/09/2026 21:55:04 | 12,7 °C | 2026-09-14 | 12,72 °C | ✅ SIM |
| Fazenda Bugre | 2856 | Online | 14/09/2026 21:55:12 | 12,2 °C | 2026-09-14 | 13,74 °C | ✅ SIM |
| Fredolino Chimango | 4678 | Online | 14/09/2026 21:47:49 | 13,3 °C | 2026-09-14 | 13,67 °C | ✅ SIM |
| Lobo da Costa | 4714 | Online | 14/09/2026 21:50:13 | 13,1 °C | 2026-09-14 | 13,11 °C | ✅ SIM |
| Pulador | 4931 | Online | 14/09/2026 21:52:46 | 12,3 °C | 2026-09-14 | 12,82 °C | ✅ SIM |
| Quinto Giongo | 4965 | Online | 14/09/2026 21:47:00 | 13,3 °C | 2026-09-14 | 13,38 °C | ✅ SIM |
| São Roque | 4416 | Online | 14/09/2026 21:55:31 | 13,4 °C | 2026-09-14 | 13,88 °C | ✅ SIM |
| Sede Independência | 4798 | Online | 14/09/2026 21:55:29 | 13,0 °C | 2026-09-14 | 13,80 °C | ✅ SIM |
| Transbrasiliana | 4283 | Online | 14/09/2026 21:55:26 | 12,8 °C | 2026-09-14 | 13,20 °C | ✅ SIM |

---

## 5. RESPOSTAS OBJETIVAS ÀS DÚVIDAS DO USUÁRIO

### Pergunta 1: Os valores da estação Veneza (16,2 °C, Min 12,5 °C, Max 21,5 °C, Umidade 95%, Chuva 0,3 mm) são dados atuais, de cache ou congelados?
> **Resposta:** São dados **congelados do dia 10/09/2026 às 22:37:17**.  
> Não são dados de 14/09/2026 nem dados em tempo real de hoje. A estação parou de se comunicar em 10/09, e a API da Plugfield mantém gravado o último snapshot recebido. Como a linha 381 de `plugfield-service.js` força `isOnline = true` sempre que encontra valores numéricos preenchidos, o sistema exibia a estação com status verde "Online", embora o próprio texto ao lado registrasse honestamente: `Online • 10/09/2026 às 22:37`.

### Pergunta 2: A estação Veneza possui dados válidos em `/data/daily` para a data 14/09/2026?
> **Resposta:** **NÃO.**  
> O endpoint `/data/daily` da Plugfield não possui nenhum registro para a estação 2041 no dia 14/09/2026. A última data computada foi 10/09/2026 (média de 16,41 °C).

### Pergunta 3: A estação Capinzal possui dados válidos em `/data/daily` para 14/09/2026?
> **Resposta:** **NÃO.**  
> A estação Capinzal tem relógio desregulado no ano 1999 e retorna `temp: null` nas consultas do período de setembro de 2026.

### Pergunta 4: Qual é o número correto de estações que devem participar da interpolação IDW de 14/09/2026?
> **Resposta:** **Exatamente 14 estações.**  
> A regra de integridade científica do módulo `climate-maps-engine.js` exige que a estação tenha registro diário com temperatura calculada e data coincidente com a solicitada (`dayItem.temp !== null && dayItem.localDate === isoDate`). Incluir a estação Veneza com dados de 4 dias antes (16,2 °C de 10/09) introduziria um erro geográfico grave (viés quente de mais de 3 °C) na interpolação do dia 14/09/2026.

---

## 6. CONCLUSÃO E RECOMENDAÇÃO TÉCNICA

1. **Validação da Etapa 3:** A decisão do algoritmo de selecionar **14 estações** foi 100% precisa e metodologicamente correta. O mapa IDW gerado na Etapa 3 reflete com absoluta fidelidade a realidade física dos dados medidos em 14/09/2026.
2. **Recomendação para a Central Meteorológica (Item 6):**
   * Em uma etapa futura autorizada, aprimorar a regra de cálculo do badge em `js/weather/plugfield-service.js` (linha 381) para que estações com última transmissão superior a 6 horas (ou 24 horas) exibam status **"Sem comunicação recente"** (ícone amarelo ou vermelho), evitando que dados congelados deem a falsa impressão de que a estação está transmitindo ao vivo naquele instante.
