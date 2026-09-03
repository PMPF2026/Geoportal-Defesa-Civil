/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Serviço de Integração Meteorológica Oficial (Defesa Civil RS & CPTEC/INPE)
 */

import { WEATHER_CONFIG } from './weather-config.js';

export class WeatherService {
  /**
   * Busca dados de telemetria em tempo real da Defesa Civil RS via GraphQL
   * @param {string} stationCode Código da estação (padrão: DCRS-00016 - Passo Fundo)
   * @returns {Promise<Object>} Dados estruturados da estação
   */
  static async fetchDefesaCivilRSTelemetry(stationCode = WEATHER_CONFIG.DEFESA_CIVIL_RS.DEFAULT_STATION) {
    const query = `
      query {
        tags_data(
          clients: ["${WEATHER_CONFIG.DEFESA_CIVIL_RS.CLIENT}"]
          station: ["${stationCode}"]
        ) {
          qualle_meteorologia {
            codigo
            name {
              prefix
              general
              local
              provedor
            }
            position {
              latitude
              longitude
              altitude
              bacia
              regiao
              filtros {
                cidade {
                  value
                }
              }
            }
            timestamp
            data {
              rio {
                rio_nome { value }
                rio_nivel { value }
                rio_nivel_tendencia { value }
                rio_area_drenagem { value }
              }
              chuva {
                acumulado {
                  min015 { value }
                  h001 { value }
                  h003 { value }
                  h006 { value }
                  h012 { value }
                  h024 { value }
                  h048 { value }
                  h072 { value }
                  h096 { value }
                  h120 { value }
                  h168 { value }
                }
              }
              temperatura {
                atual { value }
                historico {
                  diaatual {
                    minima { value }
                    maxima { value }
                    media { value }
                  }
                }
              }
              umidade {
                atual { value }
              }
              vento {
                velocidade_media { value }
                velocidade_maxima { value }
                direcao { value }
              }
              pressaoatmos {
                atual { value }
                tendencia { value }
              }
              senstermica {
                atual { value }
              }
              radiacaosolar {
                atual { value }
              }
            }
          }
        }
      }
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);

      const response = await fetch(WEATHER_CONFIG.DEFESA_CIVIL_RS.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const stations = result?.data?.tags_data?.qualle_meteorologia || [];
      if (stations.length === 0) {
        throw new Error(`Estação ${stationCode} não retornou dados no momento.`);
      }

      const parsed = this.parseDefesaCivilRSTelemetry(stations[0]);
      this.recordHistoryPoint(stationCode, parsed);
      return parsed;
    } catch (err) {
      console.warn('[WeatherService] Erro ao consultar Defesa Civil RS:', err);
      return {
        success: false,
        error: err.message || 'Falha na conexão com a Rede Hidrometeorológica RS',
        timestamp: null,
        status: 'error'
      };
    }
  }

  /**
   * Normaliza os dados brutos da Defesa Civil RS
   */
  static parseDefesaCivilRSTelemetry(raw) {
    const data = raw.data || {};
    const chuva = data.chuva?.acumulado || {};
    const temp = data.temperatura || {};
    const histDia = temp.historico?.diaatual || {};
    const umidade = data.umidade || {};
    const vento = data.vento || {};
    const pressao = data.pressaoatmos || {};
    const sensacao = data.senstermica || {};
    const radiacao = data.radiacaosolar || {};
    const rio = data.rio || {};

    // Avaliação de status de atualização temporal
    let status = 'updated';
    if (raw.timestamp) {
      try {
        const diffMinutes = (Date.now() - new Date(raw.timestamp).getTime()) / (1000 * 60);
        if (diffMinutes > 120) {
          status = 'delayed';
        }
      } catch {
        status = 'updated';
      }
    }

    return {
      success: true,
      status: status, // 'updated' | 'delayed' | 'error'
      stationCode: raw.codigo || 'DCRS-00016',
      name: raw.name?.general || 'Passo Fundo',
      provider: raw.name?.provedor || 'DCRS',
      basin: raw.position?.bacia || 'RS - Rio Passo Fundo',
      region: raw.position?.regiao || 'Norte / Planalto Médio',
      lat: raw.position?.latitude != null ? parseFloat(raw.position.latitude) : -28.2470,
      lon: raw.position?.longitude != null ? parseFloat(raw.position.longitude) : -52.3713,
      altitude: raw.position?.altitude != null ? parseFloat(raw.position.altitude) : null,
      timestamp: raw.timestamp || new Date().toISOString(),

      // Métricas de Chuva Acumulada
      chuva: {
        min15: chuva.min015?.value != null ? parseFloat(chuva.min015.value) : 0,
        min30: chuva.min015?.value != null ? parseFloat(chuva.min015.value) : 0, // Mapeado no menor intervalo disponível
        h1: chuva.h001?.value != null ? parseFloat(chuva.h001.value) : 0,
        h3: chuva.h003?.value != null ? parseFloat(chuva.h003.value) : 0,
        h6: chuva.h006?.value != null ? parseFloat(chuva.h006.value) : 0,
        h12: chuva.h012?.value != null ? parseFloat(chuva.h012.value) : 0,
        h24: chuva.h024?.value != null ? parseFloat(chuva.h024.value) : 0,
        h48: chuva.h048?.value != null ? parseFloat(chuva.h048.value) : 0,
        h72: chuva.h072?.value != null ? parseFloat(chuva.h072.value) : 0,
        h96: chuva.h096?.value != null ? parseFloat(chuva.h096.value) : 0,
        h120: chuva.h120?.value != null ? parseFloat(chuva.h120.value) : 0, // 5 dias
        h168: chuva.h168?.value != null ? parseFloat(chuva.h168.value) : 0  // 7 dias
      },

      // Temperatura
      temperatura: {
        atual: temp.atual?.value != null ? parseFloat(temp.atual.value) : null,
        minima: histDia.minima?.value != null ? parseFloat(histDia.minima.value) : null,
        maxima: histDia.maxima?.value != null ? parseFloat(histDia.maxima.value) : null,
        media: histDia.media?.value != null ? parseFloat(histDia.media.value) : null
      },

      // Umidade
      umidade: {
        atual: umidade.atual?.value != null ? parseFloat(umidade.atual.value) : null
      },

      // Vento
      vento: {
        velocidadeMedia: vento.velocidade_media?.value != null ? parseFloat(vento.velocidade_media.value) : null,
        velocidadeMaxima: vento.velocidade_maxima?.value != null ? parseFloat(vento.velocidade_maxima.value) : null,
        direcao: vento.direcao?.value != null ? parseFloat(vento.direcao.value) : null
      },

      // Pressão
      pressao: {
        atual: pressao.atual?.value != null ? parseFloat(pressao.atual.value) : null,
        tendencia: pressao.tendencia?.value != null ? parseFloat(pressao.tendencia.value) : null
      },

      // Sensação Térmica
      sensacaoTermica: {
        atual: sensacao.atual?.value != null ? parseFloat(sensacao.atual.value) : null
      },

      // Radiação Solar
      radiacaoSolar: {
        atual: radiacao.atual?.value != null ? parseFloat(radiacao.atual.value) : null
      },

      // Rio Passo Fundo
      rio: {
        nome: rio.rio_nome?.value || 'Rio Passo Fundo',
        nivel: rio.rio_nivel?.value != null ? parseFloat(rio.rio_nivel.value) : null,
        tendencia: rio.rio_nivel_tendencia?.value != null ? parseFloat(rio.rio_nivel_tendencia.value) : 0,
        areaDrenagem: rio.rio_area_drenagem?.value != null ? parseFloat(rio.rio_area_drenagem.value) : null
      }
    };
  }

  /**
   * Registra leituras em série temporal local para permitir gráficos históricos contínuos
   */
  static recordHistoryPoint(stationCode, telemetryData) {
    if (!telemetryData || !telemetryData.success || !telemetryData.timestamp) return;

    try {
      const storageKey = `dcrs_history_${stationCode}`;
      let history = [];
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) history = JSON.parse(stored);
      } catch {
        history = [];
      }

      const newPoint = {
        timestamp: telemetryData.timestamp,
        chuvaH1: telemetryData.chuva?.h1 || 0,
        chuvaH24: telemetryData.chuva?.h24 || 0,
        nivelRio: telemetryData.rio?.nivel,
        temperatura: telemetryData.temperatura?.atual,
        umidade: telemetryData.umidade?.atual,
        vento: telemetryData.vento?.velocidadeMedia,
        pressao: telemetryData.pressao?.atual,
        radiacao: telemetryData.radiacaoSolar?.atual
      };

      // Evita duplicatas pelo timestamp
      const existingIdx = history.findIndex(p => p.timestamp === newPoint.timestamp);
      if (existingIdx >= 0) {
        history[existingIdx] = newPoint;
      } else {
        history.push(newPoint);
      }

      // Mantém no máximo 500 registros recentes (últimos 7 dias em leituras horárias)
      if (history.length > 500) {
        history = history.slice(-500);
      }

      localStorage.setItem(storageKey, JSON.stringify(history));
    } catch (e) {
      console.warn('[WeatherService] Não foi possível gravar histórico local:', e);
    }
  }

  /**
   * Obtém os registros históricos gravados para uma estação
   */
  static getStationHistory(stationCode = WEATHER_CONFIG.DEFESA_CIVIL_RS.DEFAULT_STATION) {
    try {
      const storageKey = `dcrs_history_${stationCode}`;
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        }
      }
    } catch {
      // Ignora erro de parsing
    }
    return [];
  }

  /**
   * Inicia Subscription via WebSocket oficial (nowcasting_unique) com fallback automático para HTTP
   * @param {string} stationCode Código da estação
   * @param {Function} onData Callback ao receber nova leitura
   * @param {Function} onError Callback de erro
   * @param {Function} onStatusChange Callback de alteração de conexão (conectado/desconectado)
   * @returns {Object} Controlador com método de encerramento
   */
  static subscribeNowcasting(stationCode = WEATHER_CONFIG.DEFESA_CIVIL_RS.DEFAULT_STATION, onData, onError, onStatusChange) {
    let ws = null;
    let fallbackInterval = null;
    let isSubscribed = false;

    const startHttpPollingFallback = () => {
      if (fallbackInterval) return;
      console.log('[WeatherService] Iniciando fallback por HTTP Polling (60s)...');
      if (onStatusChange) onStatusChange('polling');

      // Executa primeira busca imediata
      WeatherService.fetchDefesaCivilRSTelemetry(stationCode).then(data => {
        if (data.success && onData) onData(data);
      }).catch(err => {
        if (onError) onError(err);
      });

      fallbackInterval = setInterval(async () => {
        try {
          const data = await WeatherService.fetchDefesaCivilRSTelemetry(stationCode);
          if (data.success && onData) onData(data);
        } catch (err) {
          if (onError) onError(err);
        }
      }, WEATHER_CONFIG.REFRESH_INTERVAL_MS);
    };

    try {
      if (typeof WebSocket !== 'undefined' && WEATHER_CONFIG.DEFESA_CIVIL_RS.WS_ENDPOINT) {
        ws = new WebSocket(WEATHER_CONFIG.DEFESA_CIVIL_RS.WS_ENDPOINT, 'graphql-ws');

        ws.onopen = () => {
          console.log('[WeatherService] WebSocket conectado à Rede Hidrometeorológica RS.');
          if (onStatusChange) onStatusChange('connected');
          ws.send(JSON.stringify({ type: 'connection_init', payload: {} }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'connection_ack') {
              // Envia Subscription nowcasting_unique
              const subQuery = `
                subscription {
                  nowcasting_unique(
                    clients: ["${WEATHER_CONFIG.DEFESA_CIVIL_RS.CLIENT}"]
                    station: ["${stationCode}"]
                  ) {
                    qualle_meteorologia {
                      codigo
                      name { general }
                      position { latitude longitude altitude bacia }
                      timestamp
                      data {
                        rio { rio_nome { value } rio_nivel { value } rio_nivel_tendencia { value } rio_area_drenagem { value } }
                        chuva { acumulado { min015 { value } h001 { value } h003 { value } h006 { value } h012 { value } h024 { value } h048 { value } h072 { value } h096 { value } h120 { value } h168 { value } } }
                        temperatura { atual { value } historico { diaatual { minima { value } maxima { value } media { value } } } }
                        umidade { atual { value } }
                        vento { velocidade_media { value } velocidade_maxima { value } direcao { value } }
                        pressaoatmos { atual { value } tendencia { value } }
                        senstermica { atual { value } }
                        radiacaosolar { atual { value } }
                      }
                    }
                  }
                }
              `;
              ws.send(JSON.stringify({
                id: '1',
                type: 'start',
                payload: { query: subQuery }
              }));
              isSubscribed = true;
            } else if (msg.type === 'data' && msg.payload?.data?.nowcasting_unique?.qualle_meteorologia) {
              const raw = msg.payload.data.nowcasting_unique.qualle_meteorologia;
              const parsed = WeatherService.parseDefesaCivilRSTelemetry(raw);
              WeatherService.recordHistoryPoint(stationCode, parsed);
              if (onData) onData(parsed);
            }
          } catch (e) {
            console.warn('[WeatherService] Erro ao processar mensagem WebSocket:', e);
          }
        };

        ws.onerror = (err) => {
          console.warn('[WeatherService] Erro na conexão WebSocket, ativando fallback:', err);
          if (onStatusChange) onStatusChange('fallback');
          startHttpPollingFallback();
        };

        ws.onclose = () => {
          console.log('[WeatherService] WebSocket desconectado.');
          if (!isSubscribed) {
            startHttpPollingFallback();
          }
        };
      } else {
        startHttpPollingFallback();
      }
    } catch (e) {
      console.warn('[WeatherService] Falha ao inicializar WebSocket:', e);
      startHttpPollingFallback();
    }

    return {
      unsubscribe: () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          try { ws.close(); } catch {}
        }
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      }
    };
  }

  /**
   * Busca previsão meteorológica oficial do CPTEC/INPE para Passo Fundo (5 dias)
   * @param {string} cityId Código da cidade (padrão: 3825 - Passo Fundo)
   * @returns {Promise<Object>} Dados de previsão para 5 dias
   */
  static async fetchCptecForecast(cityId = WEATHER_CONFIG.CPTEC.CITY_ID) {
    try {
      let response = await fetch(`${WEATHER_CONFIG.CPTEC.SERVERLESS_API}?cityId=${cityId}`).catch(() => null);

      if (response && response.ok) {
        const json = await response.json();
        if (json.success && json.forecasts) {
          return json;
        }
      }

      const xmlUrl = WEATHER_CONFIG.CPTEC.XML_ENDPOINT;
      const directResp = await fetch(xmlUrl, { mode: 'cors' }).catch(() => null);

      if (directResp && directResp.ok) {
        const text = await directResp.text();
        return this.parseCptecXml(text);
      }

      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(xmlUrl)}`;
      const proxyResp = await fetch(proxyUrl);
      if (proxyResp.ok) {
        const text = await proxyResp.text();
        return this.parseCptecXml(text);
      }

      throw new Error('Não foi possível obter a previsão do CPTEC no momento.');
    } catch (err) {
      console.warn('[WeatherService] Erro ao consultar CPTEC/INPE:', err);
      return {
        success: false,
        error: err.message || 'Falha ao obter previsão do CPTEC',
        city: 'Passo Fundo',
        forecasts: []
      };
    }
  }

  /**
   * Converte XML do CPTEC em estrutura JSON padronizada
   */
  static parseCptecXml(xmlString) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const cityName = xmlDoc.querySelector('nome')?.textContent || 'Passo Fundo';
      const cityUf = xmlDoc.querySelector('uf')?.textContent || 'RS';
      const updateDate = xmlDoc.querySelector('atualizacao')?.textContent || '';

      const previsaoNodes = Array.from(xmlDoc.querySelectorAll('previsao')).slice(0, 7);
      const forecasts = previsaoNodes.map(node => {
        const dia = node.querySelector('dia')?.textContent || '';
        const tempo = (node.querySelector('tempo')?.textContent || 'nd').trim();
        const maxima = parseFloat(node.querySelector('maxima')?.textContent || '0');
        const minima = parseFloat(node.querySelector('minima')?.textContent || '0');
        const iuv = parseFloat(node.querySelector('iuv')?.textContent || '0');

        const conditionInfo = WEATHER_CONFIG.CONDITIONS_MAP[tempo] || {
          label: 'Condição Variável',
          icon: 'cloud',
          color: '#64748b'
        };

        return {
          date: dia,
          conditionCode: tempo,
          conditionLabel: conditionInfo.label,
          iconName: conditionInfo.icon,
          color: conditionInfo.color,
          minTemp: minima,
          maxTemp: maxima,
          iuv: iuv
        };
      });

      return {
        success: true,
        city: cityName,
        uf: cityUf,
        updatedAt: updateDate,
        forecasts: forecasts
      };
    } catch (err) {
      console.error('[WeatherService] Erro ao parsear XML CPTEC:', err);
      return {
        success: false,
        error: 'Erro no processamento dos dados do CPTEC',
        forecasts: []
      };
    }
  }
}
