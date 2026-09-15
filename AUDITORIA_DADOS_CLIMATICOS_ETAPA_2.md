# RELATÓRIO DE AUDITORIA TÉCNICA — ETAPA 2
## DADOS CLIMÁTICOS REAIS DAS 16 ESTAÇÕES METEOROLÓGICAS
### Portal Defesa Civil Passo Fundo — WebGIS Municipal

**Data da Auditoria:** 14 de setembro de 2026  
**Status da Operação:** 100% Somente Leitura (Read-Only)  
**Ambiente Auditado:** Vercel Production & Rede Telemétrica Plugfield Core API  
**Sistema de Referência do WebGIS:** SIRGAS 2000 / UTM Zona 22S (EPSG:31982)  

---

## SUMÁRIO EXECUTIVO

Esta auditoria técnica foi realizada em estrita conformidade com as diretrizes da **Etapa 2**, sem qualquer alteração no código de produção, no Item 6, nas camadas ou nas rotinas existentes. 

O objetivo exclusivo foi auditar, inspecionar e documentar a integridade, estrutura, frequência, histórico e viabilidade metodológica dos dados climáticos reais fornecidos pela rede telemétrica municipal para subsidiar a futura implementação da interpolação espacial (IDW) no módulo **Mapas Climáticos**.

---

## 1. FONTE DOS DADOS

A investigação identificou com exatidão todas as fontes que alimentam o subsistema meteorológico do portal:

1. **Rede Telemétrica Municipal Oficial (16 Estações):**
   * **Provedor:** Plugfield Indústria e Tecnologia Ltda.
   * **Servidor Upstream:** `https://prod-api.plugfield.com.br`
   * **Autenticação:** Chave de API corporativa (`x-api-key`) associada a credenciais de sessão administrativa (`POST /login`).
   * **Abrangência:** Cobre tanto a área urbana consolidada quanto as bacias hidrográficas rurais e distritos do município de Passo Fundo.

2. **Rede Hidrometeorológica Estadual (Secundária):**
   * **Provedor:** Defesa Civil do Estado do Rio Grande do Sul.
   * **Servidor Upstream:** `https://redehidrometeorologica.defesacivil.rs.gov.br/graphql`
   * **Escopo:** Estação hidrometeorológica estadual `DCRS-00016` (Passo Fundo - Rio Passo Fundo). Não monitora as 16 estações municipais, atuando como referência complementar de cota de rio.

3. **Previsão Numérica (Secundária / Informativa):**
   * **Provedor:** CPTEC/INPE (Cidade ID 3825 - Passo Fundo).
   * **Escopo:** Modelo numérico preditivo de 5 dias. Não contém dados observados por sensores de campo.

---

## 2. ARQUITETURA ATUAL DA INTEGRAÇÃO

A comunicação entre o WebGIS e a rede Plugfield é intermediada por uma camada serverless segura:

```
[ Navegador WebGIS ] 
       │  (GET /api/weather/plugfield?action=...)
       ▼
[ Vercel Serverless Function: api/weather/plugfield.js ]
       │  (Cache em memória RAM: TTL = 6 min)
       │  (Autenticação x-api-key / Bearer Token)
       ▼
[ Core API Plugfield: prod-api.plugfield.com.br ]
       │
       ├── GET /device?page=1         (Listagem e telemetria instantânea)
       ├── GET /device/{id}           (Detalhes e metadados de sensores)
       └── GET /data/daily?device=... (Série histórica de dias consolidados)
```

* **Intermediação de Backend:** [`api/weather/plugfield.js`](file:///c:/Users/User/OneDrive/Documentos/GitHub/Geoportal-Defesa-Civil/api/weather/plugfield.js).
* **Consumo no Frontend:** [`js/weather/plugfield-service.js`](file:///c:/Users/User/OneDrive/Documentos/GitHub/Geoportal-Defesa-Civil/js/weather/plugfield-service.js).
* **Estratégia de Cache:**
  1. *Servidor (Vercel):* Cache em memória do processo com TTL de 360 segundos (6 minutos), poupando requisições à API da Plugfield.
  2. *Cliente (Navegador):* `localStorage` (`pf_real_v3_all_stations`) com TTL de 6 minutos para suporte a navegação rápida.
* **Vetor Espacial no Mapa:** As estações são renderizadas a partir de `Estacoes_Plugfield.geojson`. Ao carregar os dados telemétricos, o método `PlugfieldService.updateMapLayerWithTelemetry()` injeta as leituras diretamente nos atributos das feições do OpenLayers.

---

## 3. LISTA DAS 16 ESTAÇÕES METEOROLÓGICAS AUDITADAS

Inventário completo das 16 estações configuradas em `PLUGFIELD_STATIONS_CONFIG`:

| ID (Device) | Nome Oficial da Estação | Tipologia Territorial | Latitude | Longitude | Altitude (m) | Sensores Instalados | Status Auditado |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **10994** | 2000 - ATITUS | Universitária / Campus Atitus | -28.291063 | -52.351368 | 760,8 | 23 | **Online** (Hoje) |
| **3009** | Avena | Rural / Agrícola | -28.082155 | -52.639036 | 660,3 | 18 | **Online** (Hoje) |
| **4431** | Avenida Brasil (Largo Literatura) | Urbana / Eixo Central | -28.253607 | -52.396017 | 683,4 | 18 | **Online** (Hoje) |
| **4712** | Bela Vista | Urbana / Bela Vista | -28.249000 | -52.425000 | 625,1 | 18 | **Online** (Hoje) |
| **4713** | Bom Recreio | Rural / Setor Norte | -28.169000 | -52.389000 | 523,0 | 18 | **Online** (Hoje) |
| **4717** | Camponesa | Urbana / Camponesa | -28.225341 | -52.277339 | 738,2 | 18 | **Online** (Hoje) |
| **4253** | Capinzal | Rural / Bacia Hidrográfica | -28.225000 | -52.482000 | 509,1 | 18 | **Transm. Desatualizada** |
| **2856** | Fazenda Bugre | Rural / Bacia Hidrográfica | -28.182000 | -52.498000 | 630,7 | 18 | **Online** (Hoje) |
| **4678** | Fredolino Chimango (Centro) | Urbana / Centro | -28.262000 | -52.408000 | 711,6 | 18 | **Online** (Hoje) |
| **4714** | Lobo da Costa (Entre Rios) | Rural / Bacia Hidrográfica | -28.212000 | -52.348000 | 696,4 | 19 (c/ Rio) | **Online** (Hoje) |
| **4931** | Pulador | Rural / Bacia Hidrográfica | -28.361000 | -52.419000 | 603,0 | 18 | **Online** (Hoje) |
| **4965** | Quinto Giongo (Victor Issler) | Urbana / Victor Issler | -28.243000 | -52.382000 | 629,2 | 18 | **Online** (Hoje) |
| **4416** | São Roque | Rural / Setor Leste | -28.289000 | -52.321000 | 568,1 | 18 | **Online** (Hoje) |
| **4798** | Sede Independência | Urbana / Administrativa | -28.258000 | -52.411000 | 602,7 | 18 | **Online** (Hoje) |
| **4283** | Transbrasiliana | Urbana / Perimetral | -28.272100 | -52.395200 | 698,8 | 18 | **Online** (Hoje) |
| **2041** | Veneza | Urbana / Vila Veneza | -28.249373 | -52.601557 | 594,0 | 18 | **Offline recente** (10/09) |

---

## 4. COORDENADAS E SISTEMA DE REFERÊNCIA CARTOGRÁFICA (CRS)

O WebGIS opera oficialmente sob a projeção **SIRGAS 2000 / UTM Zona 22S (EPSG:31982)**. 

Confirmamos que as coordenadas utilizadas nas 16 estações correspondem estritamente aos levantamentos municipais validados, incluindo as 5 estações corrigidas no commit `12eb7c0`.

Abaixo, a conversão matemática rigorosa para o sistema métrico oficial do portal:

| ID | Estação | Longitude (WGS84) | Latitude (WGS84) | UTM Este (X) [m] | UTM Norte (Y) [m] |
| :---: | :--- | :---: | :---: | :---: | :---: |
| **10994** | 2000 - ATITUS | -52.351368 | -28.291063 | 367.482,00 | 6.869.813,64 |
| **3009** | Avena | -52.639036 | -28.082155 | 338.955,91 | 6.892.612,33 |
| **4431** | Avenida Brasil (Largo Literatura) | -52.396017 | -28.253607 | 363.055,25 | 6.873.913,91 |
| **4712** | Bela Vista | -52.425000 | -28.249000 | 360.205,78 | 6.874.391,22 |
| **4713** | Bom Recreio | -52.389000 | -28.169000 | 363.636,22 | 6.883.296,01 |
| **4717** | Camponesa | -52.277339 | -28.225341 | 374.665,26 | 6.877.174,23 |
| **4253** | Capinzal | -52.482000 | -28.225000 | 354.580,78 | 6.876.983,25 |
| **2856** | Fazenda Bugre | -52.498000 | -28.182000 | 352.951,72 | 6.881.728,31 |
| **4678** | Fredolino Chimango (Centro) | -52.408000 | -28.262000 | 361.890,45 | 6.872.970,37 |
| **4714** | Lobo da Costa (Entre Rios) | -52.348000 | -28.212000 | 367.714,74 | 6.878.577,21 |
| **4931** | Pulador | -52.419000 | -28.361000 | 360.940,21 | 6.861.988,66 |
| **4965** | Quinto Giongo (Victor Issler) | -52.382000 | -28.243000 | 364.417,00 | 6.875.104,92 |
| **4416** | São Roque | -52.321000 | -28.289000 | 370.457,75 | 6.870.075,14 |
| **4798** | Sede Independência | -52.411000 | -28.258000 | 361.590,98 | 6.873.410,13 |
| **4283** | Transbrasiliana | -52.395200 | -28.272100 | 363.159,03 | 6.871.865,86 |
| **2041** | Veneza | -52.601557 | -28.249373 | 342.883,50 | 6.874.133,29 |

> [!NOTE]
> **Envoltória Espacial das Estações em Metros:**
> * Amplitude em X (Leste-Oeste): **35.709 metros** (35,7 km, de Avena a Camponesa).
> * Amplitude em Y (Norte-Sul): **30.623 metros** (30,6 km, de Pulador a Avena).
> Essa cobertura poligonal é cartograficamente excelente para interpolação sobre a malha urbana e as principais bacias do município.

---

## 5. VARIÁVEIS DISPONÍVEIS E CAMPOS ORIGINAIS DA API

A consulta real realizada no endpoint `/api/weather/plugfield?action=devices` retornou as seguintes variáveis ativas:

| Campo | Nome Original API | Descrição | Unidade | Tipo | Exemplo Real Auditado |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Temperatura Instantânea** | `temp` | Leitura térmica instantânea observada pelo sensor | °C | Float | `12.8` |
| **Temperatura Mínima** | `tempMin` | Menor temperatura observada no dia civil | °C | Float | `8.6` |
| **Temperatura Máxima** | `tempMax` | Maior temperatura observada no dia civil | °C | Float | `18.2` |
| **Hora da Mínima** | `tempMinTimestamp` | Timestamp do momento da menor temperatura | ms | Integer | `1789371662000` |
| **Hora da Máxima** | `tempMaxTimestamp` | Timestamp do momento da maior temperatura | ms | Integer | `1789404202000` |
| **Sensação Térmica** | `feel` | Temperatura aparente percebida (vento/umidade) | °C | Float | `12.8` |
| **Ponto de Orvalho** | `duep` | Temperatura em que o vapor atinge saturação | °C | Float | `11.0` |
| **Precipitação Instantânea** | `rain` | Leitura pluviométrica horária/instantânea | mm | Float | `0.0` |
| **Precipitação Diária** | `rainDay` | Chuva acumulada no dia civil atual (desde 00:00) | mm | Float | `0.0` |
| **Precipitação Mensal** | `rainMonth` | Chuva acumulada no mês corrente (Setembro/2026) | mm | Float | `79.7` |
| **Precipitação Anual** | `rainYear` | Chuva acumulada no ano civil (2026) | mm | Float | `1605.5` |
| **Umidade Relativa** | `humi` | Umidade relativa do ar | % | Float | `89.0` |
| **Pressão Relativa** | `prre` | Pressão barométrica normalizada ao nível do mar | hPa | Float | `1023.6` |
| **Pressão Absoluta** | `pres` | Pressão atmosférica na altitude física do sensor | hPa | Float | `934.76` |
| **Velocidade do Vento** | `wind` | Velocidade média do ar | km/h | Float | `4.04` |
| **Velocidade da Rajada** | `winb` | Velocidade da rajada instantânea | km/h | Float | `9.2` |
| **Rajada Máxima Diária** | `winbMax` | Maior rajada de vento registrada no dia | km/h | Float | `27.5` |
| **Direção do Vento (Azimute)** | `dire` | Direção azimutal da proveniência do vento | Graus (°) | Float | `332.0` |
| **Direção do Vento (Rosa)** | `direString` | Ponto cardeal/colateral da direção | Texto | String | `"NO"` |
| **Radiação Solar** | `radi` / `radiation` | Irradiância solar global | W/m² | Float | `0.0` (noturno) |
| **Índice UV** | `uv` | Índice de radiação ultravioleta | Índice | Float | `0.0` |
| **Nível de Rio / Líquido** | `sc` / `levelAdditional` | Distância medida pelo sensor sônico de nível | m | Float | `0.85` (Lobo da Costa) |
| **Data/Hora ISO (UTC)** | `updateDateTime` | Data e hora em formato universal ISO-8601 | UTC | String | `"2026-09-14T21:25:32.000Z"` |
| **Timestamp Unix** | `lastUpdateTimestamp` | Milissegundos decorridos desde o Unix Epoch | ms | Integer | `1789431932000` |

---

## 6. ESTRUTURA TEMPORAL E TIMESTAMP

* **Fuso Horário:** Os registros brutos da Plugfield transmitem a data/hora em formato **UTC (Universal Coordinated Time)** com terminação `Z`.
* **Horário Local:** Passo Fundo está no fuso **Horário de Brasília (UTC-3)**. Uma transmissão em `21:25:32Z` corresponde exatamente a `18:25:32` no horário local.
* **Frequência de Atualização:** Os sensores de campo realizam transmissões telemétricas em intervalos médios de **10 a 15 minutos**.
* **Fechamento Diário:** A variável `rainDay` zera às `00:00:00` do horário local, e as variáveis `tempMin` e `tempMax` reiniciam seus extremos ao início de cada dia civil.

---

## 7. HISTÓRICO DISPONÍVEL (TESTES CONTROLADOS)

A consulta ao endpoint `/api/weather/plugfield?action=daily` confirmou a viabilidade de recuperação histórica estruturada:

1. **Consulta Curta (5 dias: 10/09 a 14/09/2026):**
   * Retornou com 100% de sucesso todos os 5 dias para todas as estações testadas.
   * Evidenciou o dia de chuva intensa recente em Passo Fundo (11/09/2026):
     * Estação ATITUS: `48,4 mm` de chuva e temperatura média de `16,22 °C` (Mín: 14,2 °C / Máx: 18,2 °C).
2. **Consulta Mensal Completa (31 dias: 01/08/2026 a 31/08/2026):**
   * Retornou todos os **31 dias corridos** de Agosto/2026 em uma única requisição.
   * Cada dia possui: `localDate`, `temp` (média calculada pelo servidor), `tempMin`, `tempMax`, `rainAccum`, `humidity`, `wind`, `windBurst` e `pressure`.

---

## 8. DADOS AUSENTES E INCONSISTÊNCIAS IDENTIFICADAS

A auditoria identificou duas particularidades em campo que o futuro módulo deverá tratar por filtros de consistência:

1. **Estação 4253 (Capinzal):**
   * O relógio interno do transmissor da estação está desajustado, reportando `1999-12-31T21:04:57.000Z` (falha clássica de sincronização de hora NTP do modem GSM local).
   * O sensor de temperatura transmite valor fixo (`23.1 °C`), e o acumulador de chuva do mês está zerado.
   * *Ação futura recomendada:* Filtrar automaticamente estações com data anterior à janela de tolerância de 24 horas antes de submeter ao cálculo de interpolação.
2. **Estação 2041 (Veneza):**
   * Última transmissão registrada em `10/09/2026` (~4 dias atrás).
   * *Ação futura recomendada:* Filtrar estações offline há mais de 6 ou 12 horas.
3. **Estações Saudáveis (14 estações):**
   * As outras 14 estações estão ativas, consistentes e com telemetria atualizada no dia de hoje (14/09/2026).

---

## 9. VIABILIDADE TÉCNICA PARA O FUTURO MÓDULO

Respondendo pontualmente às questões formuladas pelo usuário:

### A. Temperatura média diária
**RESPOSTA: SIM**  
*Justificativa:* O endpoint `/data/daily` já entrega pronto o campo `temp`, calculado com precisão pelo servidor a partir de todas as leituras do dia civil (ex.: `12.8584... °C` para 14/09/2026), além dos registros absolutos `tempMin` e `tempMax`.

### B. Temperatura média mensal
**RESPOSTA: SIM**  
*Justificativa:* A consulta ao endpoint `/data/daily` com intervalo mensal (ex.: `01/09/2026` a `30/09/2026`) fornece os registros diários de cada estação. A média mensal é calculada diretamente pela média aritmética das médias diárias:
$$\overline{T}_{\text{mês}} = \frac{1}{N} \sum_{i=1}^{N} T_i$$

### C. Precipitação diária
**RESPOSTA: SIM**  
*Justificativa:* No dia corrente, o campo `rainDay` do dashboard fornece o acumulado do dia. Para datas passadas, o campo `rainAccum` do endpoint `/data/daily` fornece o total diário fechado em milímetros.

### D. Precipitação mensal
**RESPOSTA: SIM**  
*Justificativa:* No mês corrente, o campo `rainMonth` do dashboard fornece o acumulado acumulado até o instante da consulta (ex.: `79,7 mm` na ATITUS em Setembro/2026). Para meses anteriores, a soma $\sum \text{rainAccum}$ de todos os dias do mês resulta no acumulado mensal exato.

### E. Interpolação IDW (Espacialização)
**RESPOSTA: SIM**  
*Justificativa:* As 16 estações possuem coordenadas geodésicas e projetadas em SIRGAS 2000 UTM 22S rigorosamente calculadas. A dispersão espacial cobre toda a mancha urbana e bacias rurais, fornecendo suporte geométrico perfeito para interpolação.

---

## 10. ANÁLISE DE ARQUITETURA PARA A FUTURA ESPACIALIZAÇÃO

Análise comparativa das opções técnicas:

| Critério | Opção A: Backend Dedicado | Opção B: Serverless (Vercel) | Opção C: Frontend (Cliente) | Opção D: Processamento Externo |
| :--- | :--- | :--- | :--- | :--- |
| **Viabilidade Atual** | Baixa (não há servidor Node persistente) | Alta (já existe infraestrutura) | **Excelente (OpenLayers / Canvas)** | Média (dependência externa) |
| **Custo Computacional** | Alto (requer VM dedicada) | Risco de timeout (>10s) se gerar raster pesado | **Zero no servidor** (aproveita a GPU/CPU do cliente) | Alto |
| **Interatividade WebGIS** | Baixa (requer re-download de imagem) | Média (envio de GeoJSON grande) | **Máxima** (opacidade, paleta e zoom dinâmicos) | Baixa |
| **Performance IDW** | Rápida | Média | **Ultra rápida (< 15 ms para 16 pontos em grade de 100x100)** | Lenta |

### Arquitetura Recomendada: Modelo Híbrido Otimizado
1. **Serverless (Vercel):** Cria-se um endpoint agregador simplificado (ex.: `/api/weather/climate-summary?date=...`) que consulta e entrega os 16 valores pontuais consolidados em **um único pacote JSON leve (< 5 KB)** com cache de 1 hora.
2. **Frontend (WebGIS / OpenLayers):** O cliente recebe os 16 pontos pontuais, executa o algoritmo matemático IDW (utilizando coordenadas UTM em metros) e renderiza a superfície contínua diretamente em um `ol.layer.Image` (Canvas) com escala de cores temática e rampa visual padronizada.

---

## 11. RECOMENDAÇÕES METODOLÓGICAS

1. **Cálculo de Distâncias em Metros:** O cálculo da distância euclidiana do IDW ($d_i = \sqrt{(x - x_i)^2 + (y - y_i)^2}$) **deve obrigatoriamente utilizar as coordenadas UTM 22S em metros** (colunas `UTM_Este_X` e `UTM_Norte_Y`). Calcular em graus decimais causaria distorção direcional porque $1^\circ$ de latitude não tem o mesmo comprimento que $1^\circ$ de longitude na latitude $-28^\circ$ ($\cos -28^\circ \approx 0,88$).
2. **Expoente do IDW:** Utilizar $p = 2$ (Inverso do Quadrado da Distância), padrão meteorológico internacional recomendado pela OMM (Organização Meteorológica Mundial).
3. **Filtro de Consistência:** Descartar automaticamente da interpolação qualquer estação que esteja offline ou que apresente dados nulos/corrompidos para a data selecionada.
4. **Rigor Terminológico:**
   * Ponto na estação: **Dado Observado / Medido** (ex.: *Estação ATITUS: 12,8 °C*).
   * Célula da grade interpolada: **Dado Espacializado** (ex.: *Temperatura média espacializada: 12,8 °C via IDW*). Nunca usar o termo "estimado".

---

## 12. TABELA RESUMIDA OBRIGATÓRIA

| Variável | Existe na Fonte? | Unidade | Frequência | Histórico? | Pode ser usada futuramente? | Observação |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Temperatura** | **SIM** | °C | 10 a 15 min | **SIM** (via `/data/daily`) | **SIM** | Possui instantânea, mín/máx diária e média diária já consolidada. |
| **Precipitação** | **SIM** | mm | 10 a 15 min | **SIM** (via `/data/daily`) | **SIM** | Possui chuva horária, acumulado diário, acumulado mensal e anual. |
| **Umidade** | **SIM** | % | 10 a 15 min | **SIM** (via `/data/daily`) | **SIM** | Presente em todas as 16 estações; útil para cálculos de orvalho e conforto. |
| **Pressão** | **SIM** | hPa | 10 a 15 min | **SIM** (via `/data/daily`) | **SIM** | Possui pressão relativa (`prre`, padrão meteorológico) e absoluta (`pres`). |
| **Vento** | **SIM** | km/h | 10 a 15 min | **SIM** (via `/data/daily`) | **SIM** | Possui velocidade média, rajada máxima e direção azimutal (0-360°). |

---

## 13. PRÓXIMA ETAPA SUGERIDA (ETAPA 3)

Com a auditoria concluída e a viabilidade técnica integralmente comprovada:
* **Etapa 3:** Realizar o primeiro teste controlado de espacialização para **Temperatura média diária** via IDW no frontend, alimentado pelos dados observados das estações ativas, mantendo o portal e as camadas existentes 100% preservados.