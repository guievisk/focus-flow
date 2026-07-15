# Load Testing Baseline — FocusFlow

Data: 2026-07-13
Endpoint: GET /api/health
Stack: Vercel (iad1) + Supabase (US East)

## Configuração do teste
- Stages: 5→20→50→100 VUs em 3m30s total
- Total de requests: 4055

## Resultados sem cache

### HTTP Request Duration
| Métrica | Valor    |
|---------|----------|
| Avg     | 738ms    |
| Median  | 303ms    |
| P90     | 502ms    |
| P95     | 2130ms   |
| Max     | 38.57s   |

### Supabase Latency (query COUNT profiles)
| Métrica | Valor    |
|---------|----------|
| Avg     | 520ms    |
| Median  | 130ms    |
| P90     | 320ms    |
| P95     | 1828ms   |
| Max     | 19s      |

### Throughput e erros
- Requests/segundo: 18.6
- Error rate: 0.19% (8 erros)
- Success rate dos checks: 98.34%

## Diagnóstico
- Long tail latency: mediana boa (130ms) mas P95 e Max são muito altos
- Causa provável: connection pool limitado do Supabase
- Sob 100 VUs concorrentes, algumas conexões ficam presas
- Solução testada a seguir: cache com Upstash Redis