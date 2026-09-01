// Vercel Serverless Function: Rede Hidrometeorológica da Defesa Civil do Estado do RS
// Estação Principal: DCRS-00016 — Passo Fundo/RS

export default async function handler(req, res) {
  // CORS & Cache Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = `
    query Tags_data {
      tags_data(clients: ["casa-militar-defesa-civil-rs"]) {
        qualle_meteorologia {
          codigo
          name {
            prefix
            general
            local
          }
          show
          timestamp
          position {
            bacia
            latitude
            longitude
            regiao
            altitude
            filtros {
              outros {
                crepdec {
                  nome { value }
                  codigo { value }
                }
              }
            }
          }
          data {
            rio {
              rio_nome { value }
              rio_nivel { value }
              rio_nivel_tendencia { value }
              rio_area_drenagem { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            chuva {
              acumulado {
                min005 { value }
                h001 { value }
                h003 { value }
                h006 { value }
                h012 { value }
                h024 { value }
                h168 { value }
              }
              homologacao {
                relacao { valido { value } }
              }
            }
            pressaoatmos {
              atual { value }
              historico {
                diaanterior { media { value } }
                diaatual { media { value } }
              }
              tendencia { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            senstermica {
              atual { value }
              historico {
                diaatual { media { value } }
                diaanterior { media { value } }
              }
              tendencia { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            radiacaosolar {
              atual { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            temperatura {
              atual { value }
              historico {
                diaanterior { media { value } }
                diaatual {
                  media { value }
                  maxima { value }
                  minima { value }
                }
              }
              tendencia { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            umidade {
              atual { value }
              historico {
                diaanterior { media { value } }
                diaatual { media { value } }
              }
              tendencia { value }
              homologacao {
                relacao { valido { value } }
              }
            }
            vento {
              direcao { value }
              velocidade_maxima { value }
              velocidade_media { value }
              homologacao {
                relacao { valido { value } }
              }
            }
          }
          type
          resource {
            estacao {
              estado {
                manutencao { value }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch('https://redehidrometeorologica.defesacivil.rs.gov.br/graphql', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Portal-Defesa-Civil-Passo-Fundo',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Defesa Civil RS GraphQL responded with status ${response.status}`,
        available: false
      });
    }

    const payload = await response.json();
    const stations = payload?.data?.tags_data?.qualle_meteorologia || [];
    const st = stations.find(s => s.codigo === 'DCRS-00016') || stations.find(s => (s.name?.general || '').includes('Passo Fundo'));

    if (!st) {
      return res.status(404).json({
        error: 'Estação DCRS-00016 (Passo Fundo) não encontrada no payload da Defesa Civil RS',
        available: false,
        totalStations: stations.length
      });
    }

    const d = st.data || {};
    const pos = st.position || {};
    const name = st.name || {};
    const tempObj = d.temperatura || {};
    const tempHist = tempObj.historico?.diaatual || {};
    const umidObj = d.umidade || {};
    const presObj = d.pressaoatmos || {};
    const sensObj = d.senstermica || {};
    const radObj = d.radiacaosolar || {};
    const ventoObj = d.vento || {};
    const chuvaObj = d.chuva?.acumulado || {};
    const rioObj = d.rio || {};

    const deg = ventoObj.direcao?.value ?? null;
    let cardinal = 'N/D';
    if (deg !== null && !isNaN(deg)) {
      const cards = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
      const idx = Math.round(deg / 22.5) % 16;
      cardinal = cards[idx] || 'N/D';
    }

    const manutencao = st.resource?.estacao?.estado?.manutencao?.value;
    const statusStr = manutencao ? 'maintenance' : 'operational';

    const normalized = {
      source: 'Rede Hidrometeorológica da Defesa Civil do Estado do Rio Grande do Sul',
      station: {
        id: st.codigo || 'DCRS-00016',
        name: name.general || 'Passo Fundo',
        municipality: 'Passo Fundo/RS',
        basin: pos.bacia || 'RS - Rio Passo Fundo',
        region: pos.regiao || 'Noroeste Rio-grandense',
        crepdec: '2ª CREPDEC (Passo Fundo)',
        latitude: pos.latitude ?? -28.246999740600586,
        longitude: pos.longitude ?? -52.371299743652344,
        altitude: pos.altitude ?? null,
        status: statusStr,
        type: st.type || 'HidroMeteo'
      },
      observedAt: st.timestamp || null,
      retrievedAt: new Date().toISOString(),
      available: true,
      data: {
        temperature: tempObj.atual?.value ?? null,
        temperatureMin: tempHist.minima?.value ?? null,
        temperatureMax: tempHist.maxima?.value ?? null,
        temperatureAvg: tempHist.media?.value ?? null,
        temperatureTrend: tempObj.tendencia?.value ?? null,
        humidity: umidObj.atual?.value ?? null,
        humidityTrend: umidObj.tendencia?.value ?? null,
        pressure: presObj.atual?.value ?? null,
        pressureTrend: presObj.tendencia?.value ?? null,
        feelsLike: sensObj.atual?.value ?? null,
        feelsLikeTrend: sensObj.tendencia?.value ?? null,
        solarRadiation: radObj.atual?.value ?? null,
        windSpeed: ventoObj.velocidade_media?.value ?? null,
        windGust: ventoObj.velocidade_maxima?.value ?? null,
        windDirection: deg,
        windDirectionCardinal: cardinal,
        rain5min: chuvaObj.min005?.value ?? null,
        rain1h: chuvaObj.h001?.value ?? null,
        rain3h: chuvaObj.h003?.value ?? null,
        rain6h: chuvaObj.h006?.value ?? null,
        rain12h: chuvaObj.h012?.value ?? null,
        rain24h: chuvaObj.h024?.value ?? null,
        rain7d: chuvaObj.h168?.value ?? null,
        riverLevel: rioObj.rio_nivel?.value ?? null,
        riverTrend: rioObj.rio_nivel_tendencia?.value ?? null,
        riverDrainageArea: rioObj.rio_area_drenagem?.value ?? null
      }
    };

    return res.status(200).json(normalized);
  } catch (error) {
    console.error('[API defesa-civil-rs] Erro ao consultar Rede Hidrometeorológica RS:', error.message);
    return res.status(502).json({
      error: 'Falha ao conectar com a Rede Hidrometeorológica da Defesa Civil RS',
      details: error.message,
      available: false
    });
  }
}
