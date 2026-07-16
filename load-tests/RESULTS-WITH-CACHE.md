# Load Testing — Com Cache Redis (Upstash)

Data: 2026-07-15
Endpoint: GET /api/health
Stack: Vercel (iad1) + Supabase (US East) + Upstash Redis (us-east-1)
Padrão aplicado: cache-aside com TTL de 30s

## Configuração do teste
- Stages: 5→20→50→100 VUs em 3m30s total
- Total de iterações: 5607
- Total de checks: 16821

## Resultados com cache

### HTTP Request Duration
| Métrica | Valor     |
|---------|-----------|
| Avg     | 188ms     |
| Median  | 183ms     |
| P90     | 198ms     |
| P95     | 211ms     |
| Max     | 703ms     |

### Supabase Latency (só nas cache misses)
| Métrica | Valor  |
|---------|--------|
| Avg     | 270ms  |
| Median  | 307ms  |
| P90     | 316ms  |
| P95     | 421ms  |
| Max     | 531ms  |

### Throughput e erros
- Requests/segundo: 26.5
- Error rate: 0.00% (0 erros)
- Success rate dos checks: 100%
- Todos os 3 thresholds passaram (p95<3s, error<5%, supabase p95<2s)

## Comparação: antes vs depois

| Métrica                | Sem cache | Com cache | Ganho          |
|------------------------|-----------|-----------|----------------|
| HTTP P95               | 2130ms    | 211ms     | ~10x           |
| HTTP Max               | 38.57s    | 703ms     | ~54x           |
| Supabase P95           | 1828ms    | 421ms     | ~4x            |
| Throughput             | 18.6/s    | 26.5/s    | ~1.4x          |
| Error rate             | 0.19%     | 0.00%     | zerou          |

## Análise

O ganho maior não foi na mediana (que já era razoável), e sim no **long tail**.
O P95 e o Max despencaram porque a maioria das requests passou a ser servida
do Redis, sem tocar o Supabase. As poucas requests que ainda vão ao banco
(cache misses, a cada 30s quando o TTL expira) mantêm latência controlada
porque não competem mais em massa pelo connection pool limitado do free tier.

O `Max` caindo de 38s para 0.7s é a evidência mais clara: o gargalo de
conexões presas na fila do Supabase foi eliminado como caminho crítico.
