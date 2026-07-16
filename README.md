# FocusFlow

Plataforma de micro-aprendizado com IA para estudantes. O aluno escolhe um tema,
a IA diagnostica o nível dele, monta um plano de aula, ensina passo a passo e
valida com exercícios. Cada minuto e cada acerto viram XP, minutos de estudo e
ofensiva diária — persistidos de verdade, sem sumir.

Next.js 16 · React 19 · TypeScript · Supabase · Upstash Redis · Groq (llama-3.3-70b)

## Rodando

```bash
npm install
npm run dev      # http://localhost:3000
```

Crie um `.env.local` na raiz:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GROQ_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

As duas últimas são opcionais: sem elas o cache não funciona e a app vai direto
ao Postgres — mais lenta, mas funcional.

## Scripts

| Comando | Faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção (gate da Vercel) |
| `npm run lint` | ESLint |
| `npm test` | Vitest — testes de contrato da camada de dados |

## Documentação

- **[DOCS.md](./DOCS.md)** — documentação completa: arquitetura, rotas, banco,
  auth, XP, cache, deploy e dívidas conhecidas. Comece por aqui.
- [ARCHITECTURE.md](./ARCHITECTURE.md) — decisões de escalabilidade e trade-offs
- [supabase/README.md](./supabase/README.md) — migrações e diagnóstico do banco
- [specs/](./specs/) — specs das features
