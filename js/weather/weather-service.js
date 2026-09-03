/**
 * Portal Defesa Civil Passo Fundo - WebGIS
 * Serviço de Integração Meteorológica (Defesa Civil RS & CPTEC/INPE)
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
                  diaanterior {
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

      const raw = stations[0];
      return this.parseDefesaCivilRSTelemetry(raw);
    } catch (err) {
      console.warn('[WeatherService] Erro ao consultar Defesa Civil RS:', err);
      return {
        success: false,
        error: err.message || 'Falha na conexão com a Rede Hidrometeorológica RS',
        timestamp: null
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
    const rio = data.rio || {};

    return {
      success: true,
      stationCode: raw.codigo || 'DCRS-00016',
      name: raw.name?.general || 'Passo Fundo',
      provider: raw.name?.provedor || 'DCRS',
      basin: raw.position?.bacia || 'RS - Rio Passo Fundo',
      lat: raw.position?.latitude != null ? parseFloat(raw.position.latitude) : -28.2470,
      lon: raw.position?.longitude != null ? parseFloat(raw.position.longitude) : -52.3713,
      altitude: raw.position?.altitude != null ? parseFloat(raw.position.altitude) : null,
      timestamp: raw.timestamp || new Date().toISOString(),

      // Métricas
      chuva: {
        min15: chuva.min015?.value != null ? parseFloat(chuva.min015.value) : 0,
        h1: chuva.h001?.value != null ? parseFloat(chuva.h001.value) : 0,
        h3: chuva.h003?.value != null ? parseFloat(chuva.h003.value) : 0,
        h6: chuva.h006?.value != null ? parseFloat(chuva.h006.value) : 0,
        h12: chuva.h012?.value != null ? parseFloat(chuva.h012.value) : 0,
        h24: chuva.h024?.value != null ? parseFloat(chuva.h024.value) : 0,
        h168: chuva.h168?.value != null ? parseFloat(chuva.h168.value) : 0
      },

      temperatura: {
        atual: temp.atual?.value != null ? parseFloat(temp.atual.value) : null,
        minima: histDia.minima?.value != null ? parseFloat(histDia.minima.value) : null,
        maxima: histDia.maxima?.value != null ? parseFloat(histDia.maxima.value) : null,
        media: histDia.media?.value != null ? parseFloat(histDia.media.value) : null
      },

      umidade: {
        atual: umidade.atual?.value != null ? parseFloat(umidade.atual.value) : null
      },

      vento: {
        velocidadeMedia: vento.velocidade_media?.value != null ? parseFloat(vento.velocidade_media.value) : null,
        velocidadeMaxima: vento.velocidade_maxima?.value != null ? parseFloat(vento.velocidade_maxima.value) : null,
        direcao: vento.direcao?.value != null ? parseFloat(vento.direcao.value) : null
      },

      pressao: {
        atual: pressao.atual?.value != null ? parseFloat(pressao.atual.value) : null,
        tendencia: pressao.tendencia?.value != null ? parseFloat(pressao.tendencia.value) : null
      },

      sensacaoTermica: {
        atual: sensacao.atual?.value != null ? parseFloat(sensacao.atual.value) : null
      },

      rio: {
        nome: rio.rio_nome?.value || 'Rio Passo Fundo',
        nivel: rio.rio_nivel?.value != null ? parseFloat(rio.rio_nivel.value) : null,
        tendencia: rio.rio_nivel_tendencia?.value != null ? parseFloat(rio.rio_nivel_tendencia.value) : 0
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
      // 1. Tenta rota serverless interna
      let response = await fetch(`${WEATHER_CONFIG.CPTEC.SERVERLESS_API}?cityId=${cityId}`).catch(() => null);

      if (response && response.ok) {
        const json = await response.json();
        if (json.success && json.forecasts) {
          return json;
        }
      }

      // 2. Fallback: Consulta direta via endpoint XML com parser de DOM
      const xmlUrl = WEATHER_CONFIG.CPTEC.XML_ENDPOINT;
      const directResp = await fetch(xmlUrl, { mode: 'cors' }).catch(() => null);

      if (directResp && directResp.ok) {
        const text = await directResp.text();
        return this.parseCptecXml(text);
      }

      // 3. Fallback via proxy público CORS seguro se necessário
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
   * Converte XML do CPTEC em estrutura JSON padronizada (5 dias)
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
