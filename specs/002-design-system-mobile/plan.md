# Implementation Plan: Design system Tailwind v4 + responsividade mobile + polish

**Branch**: `002-design-system-mobile` | **Spec**: [spec.md](./spec.md) | **Date**: 2026-07-11

## Summary

Uma causa raiz, quatro sintomas. O app estiliza com `style={{}}` inline; estilo inline não aceita `@media`; logo `friends`, `methods`, `onboarding` e `chat` (as quatro páginas com **zero** media query) não têm como ser responsivas, e a ausência de tokens compartilhados é o que faz o visual parecer "de apps diferentes".

O plano ativa o Tailwind v4 que já está no `package.json` mas hoje é inerte, promove os tokens existentes a `@theme`, e migra as páginas de inline para utilitários. Mobile e coesão visual caem juntos.

## Technical Context

| | |
|---|---|
| **Linguagem** | TypeScript 5, React 19.2.4 |
| **Framework** | Next 16.2.6 (App Router) |
| **Estilo** | Tailwind **4.3.0** + `@tailwindcss/postcss` (instalados, inertes) |
| **UI** | framer-motion 12, lucide-react 1.16, recharts 3.8, Spline |
| **Testes** | Vitest 4.1.10 — 17/17 verdes |
| **Alvo** | Web responsiva, 375px → desktop |

### Descobertas que mudam a implementação

**Tailwind v4 não é v3 com outro nome.** Verificado em `node_modules/tailwindcss/index.css`:

- entrada é `@import "tailwindcss"` — **não** `@tailwind base/components/utilities` (o que `globals.css` usa hoje, e por isso nada é emitido);
- configuração é **CSS-first** via `@theme { --color-*: … }` — **não** existe `tailwind.config.js` (e o projeto de fato não tem um);
- um token `--color-p: #9333FF` no `@theme` gera automaticamente `bg-p`, `text-p`, `border-p`.

**Favicon no Next 16** (`node_modules/next/dist/docs/.../app-icons.md`): basta um `app/favicon.ico`; o `<link rel="icon">` é injetado no `<head>` automaticamente. Não se declara em `metadata`.

**O avatar do Google já está implementado** (`Sidebar.tsx:44-48`) com a cadeia de fallback correta. Isto é tarefa de **diagnóstico**, não de construção — ver Phase 3.

## Constitution Check

Sem constituição ratificada em `.specify/memory/constitution.md`. Nenhum princípio autoimposto violado: a feature **remove** um modelo de estilo em vez de adicionar um segundo, e não introduz dependência nova (o Tailwind já está lá).

## Phases

### Phase 1 — Fundação do design system (bloqueia todo o resto)

1. Reescrever `app/globals.css`: `@import "tailwindcss"` + `@theme` com os tokens atuais (`--color-p`, `--color-bg`, `--color-card`, `--color-ink*`, …). Manter os `@keyframes` (orb, sweep, glow-pulse) e o `.glass-card`, que são efeito de marca e não têm equivalente utilitário.
2. **Provar que o Tailwind está vivo**: build e confirmar que utilitários (`.grid`, `.md\:grid-cols-2`) aparecem no CSS emitido. Hoje não aparecem. Este é o gate — sem ele, todo o resto é reescrita no vazio.
3. Extrair primitivos em `components/ui/`: `Card`, `Button`, `Input`, `PageTitle`. (Já existem `Card.tsx` e `SweepCard.tsx` na raiz de `components/` — absorver, não duplicar.)

### Phase 2 — Migração das páginas (US2, o que o usuário vê)

Ordem por dor: **`friends` → `chat` → `methods` → `onboarding`** (42 / 22 / 25 / 17 inline styles).

Por página: trocar `style={{}}` de **layout** por utilitários com breakpoint; manter inline apenas o que é genuinamente dinâmico (ex.: `--mx/--my` do hover do glass-card, cor calculada em runtime). Validar em 375px.

Depois: converter as páginas que hoje usam `<style>` + `@media` (`dashboard`, `progress`, `study`, `study-session`, `profile`, `page`, `AppShell`) — elas **funcionam**, então são refactor de coesão, não correção de bug. Prioridade menor, mas necessárias para SC-002 (um só modelo de estilo).

### Phase 3 — Polish (US3)

- `app/favicon.ico` a partir de `public/logo.png`.
- **Avatar do Google**: reproduzir com login Google real e instrumentar. Ordem de suspeita: (a) `profiles` não existe no banco → `loadProfile` erra → `profile = null`, e aí o fallback para `user_metadata.avatar_url` precisa ser confirmado; (b) o `<img>` cru com URL `lh3.googleusercontent.com` sendo bloqueado. Se migrar para `next/image`, exige `remotePatterns` no `next.config` — **e isso mata o warning `no-img-element` de quebra**.

### Phase 4 — Erros (US4)

Os 7 warnings. Os 3 `exhaustive-deps` e os 2 `no-unused-vars` estão em `AuthContext`/`dashboard`/`progress` — código que a **001/US2** vai reescrever ao migrar para os repositórios. Corrigir aqui é seguro (são supressões/deps, não lógica), mas o `no-img-element` do `Sidebar` deve ser resolvido junto com a Phase 3, não isolado.

## Riscos

| Risco | Mitigação |
|---|---|
| Migrar tudo de inline → utilitário é uma reescrita ampla; regressão visual é fácil | Phase 1 valida o pipeline antes de qualquer reescrita; migrar **uma página por vez** com verificação visual |
| `glass-card`, orbs e Spline dependem de CSS custom | Ficam em CSS custom de propósito — Tailwind não substitui efeito de marca |
| O usuário pode querer rebranding, não unificação | Registrado como Assumption na spec; se for rebranding, vira outra spec |

## Dependências entre features

`002` é **independente de `001`**: não toca `lib/data/`, não depende do banco. Pode ser feita agora, em paralelo, mesmo com o SQL de `001/T007` ainda pendente.

Exceção: o diagnóstico do avatar (Phase 3) pode esbarrar no banco ausente — nesse caso a causa é de `001`, e aqui só se registra o achado.

## Project Structure (delta)

```
app/
├── favicon.ico          # NOVO — convenção Next 16
└── globals.css          # REESCRITO — @import "tailwindcss" + @theme

components/
└── ui/                  # NOVO — primitivos (Card, Button, Input, PageTitle)
```

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

Nenhuma dependência nova. O Tailwind já estava instalado; a feature o torna funcional e **remove** o segundo modelo de estilo (inline + `<style>` por página), reduzindo complexidade líquida.
