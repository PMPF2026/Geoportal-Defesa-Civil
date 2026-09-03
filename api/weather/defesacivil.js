/**
 * Vercel Serverless Function - Proxy GraphQL Defesa Civil RS
 * Endpoint: /api/weather/defesacivil?station=DCRS-00016
 */

module.exports = async function handler(req, res) {
  // CORS Headers limpos
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { station = 'DCRS-00016', client = 'casa-militar-defesa-civil-rs' } = req.query;

  const query = `
    query {
      tags_data(
        clients: ["${client}"]
        station: ["${station}"]
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

    const response = await fetch('https://redehidrometeorologica.defesacivil.rs.gov.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Portal-Defesa-Civil-Passo-Fundo/2.0'
      },
      body: JSON.stringify({ query }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        error: `Erro retornado pela API Defesa Civil RS: HTTP ${response.status}`
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Falha ao conectar com a API da Defesa Civil RS'
    });
  }
};
