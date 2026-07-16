# FocusFlow — Arquitetura e Decisões de Engenharia

Este documento registra as decisões técnicas de escalabilidade e performance
do FocusFlow, com foco no que foi medido, por que foi feito, e quais os
trade-offs de cada escolha.

## Visão geral do sistema

```
                 ┌──────────────────────────────┐
   Usuário  ───► │  Vercel (Next.js, região iad1)│
                 │  - Páginas (SSR/estático)     │
                 │  - API Routes (serverless)    │
                 └───────┬───────────────┬───────┘
                         │               │
              cache-aside│               │ escrita / miss
                         ▼               ▼
              ┌────────────────┐  ┌──────────────────┐
              │ Upstash Redis  │  │ Supabase (Postgres)│
              │ (us-east-1)    │  │ Auth + RLS + RPC   │
              │ cache via HTTP │  │ fonte da verdade   │
              └────────────────┘  └──────────────────┘
                         │
                         ▼
                  ┌────────────┐
                  │ Groq (LLM) │  llama-3.3-70b
                  │ geração AI │
                  └────────────┘
```

## Decisão 1 — Cache-aside com Redis nas leituras

### Problema
Sob carga (load test com 100 VUs), o endpoint `/api/health` apresentava
long tail severo: mediana de 130ms, mas P95 de 1828ms e Max de 38s. Causa:
o connection pool do Supabase free tier (~15-30 conexões) satura sob
concorrência, e requests ficam presas na fila.

### Solução
Cache-aside: a aplicação tenta o Redis primeiro; em cache miss, busca no
Postgres e popula o cache com TTL de 30s. Leituras subsequentes são servidas
da memória (Redis), sem tocar o banco.

### Resultado medido
P95 de 2130ms → 211ms (~10x). Max de 38s → 0.7s (~54x). Error rate 0.19% → 0%.
Detalhes em `load-tests/RESULTS-WITH-CACHE.md`.

### Trade-offs assumidos
- **Stale data**: o cache pode retornar dado com até 30s de defasagem. Aceitável
  para dados de leitura não-críticos (perfil, agregados, health).
- **Fail open**: toda operação com Redis está em try/catch. Se o Redis cair, o
  sistema degrada (vai direto ao Postgres, mais lento) mas não quebra. Cache é
  otimização, não fonte da verdade.

### Nota honesta sobre o /api/health
Cachear um health check é uma escolha didática, não uma recomendação de
produção. Um health check existe para reportar o estado ATUAL do sistema; se
cacheado, ele reporta o estado de até 30s atrás. Em produção real (monitor de
uptime, health check para load balancer), NÃO seria cacheado. O padrão
cache-aside aqui demonstrado se aplica corretamente a endpoints de leitura
reais como perfil do usuário, resultados de quiz agregados e conquistas.

## Decisão 2 — Upstash Redis (REST) em vez de Redis TCP tradicional

A Vercel roda em ambiente serverless: cada invocação pode ser um processo novo
e efêmero. Um client Redis tradicional (ioredis/node-redis) mantém conexão TCP
persistente — inadequado para serverless, onde abrir/fechar conexão a cada
request é lento e esgota o limite de conexões do servidor Redis.

O Upstash expõe Redis via HTTP/REST. O client `@upstash/redis` faz cada comando
como uma requisição HTTP independente, sem conexão persistente. É a escolha
correta para o modelo serverless da Vercel.

## Decisão 3 — TTL de 30 segundos

TTL curto minimiza a janela de dado desatualizado ao custo de mais cache misses.
Para o health check e dados que mudam com frequência moderada, 30s equilibra
frescor e alívio de carga. Dados mais estáveis (métodos de estudo) usariam TTL
maior (1h); dados sensíveis a consistência não seriam cacheados.

## Gargalos conhecidos e teto de escala

O cache resolve o caminho de LEITURA. Os limites reais de escala do sistema são:

1. **Groq (LLM) — teto principal**: free tier ~100k tokens/dia. Endpoints de IA
   (`/api/generate-quiz`, `/api/chat`, `/api/lesson-step`) geram conteúdo único
   por request, portanto não são cacheáveis. Este é o limitador de quantos
   usuários podem gerar conteúdo simultaneamente.
2. **Supabase free tier**: connection pool limitado. O cache alivia leituras,
   mas escritas (salvar XP, quiz results) ainda vão ao banco.

Mitigação futura: rate limiting nos endpoints de IA (protege o orçamento Groq),
cache de leituras adicionais (perfil, agregados), e observabilidade para medir
a capacidade real dos endpoints de escrita.

## Roadmap de escalabilidade

- [x] Fase A — Cache-aside no /api/health + baseline vs resultado medido
- [ ] Fase B — Cache em leituras reais (perfil, quiz results, conquistas)
- [ ] Fase C — Rate limiting nos endpoints de IA (sliding window com Redis)
- [ ] Fase D — Observabilidade (logs estruturados, métricas de latência/erro)
- [ ] Fase E — Documentação de arquitetura (este documento)
