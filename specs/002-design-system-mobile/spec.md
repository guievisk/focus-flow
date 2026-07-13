# Feature Specification: Design system Tailwind v4 + responsividade mobile + polish

**Feature Branch**: `002-design-system-mobile`

**Created**: 2026-07-11

**Status**: Draft

**Depende de**: nada (independente de 001 — não toca em `lib/data/`)

## Summary

O app funciona, mas "o visual não tem nada a ver com um SaaS" e quatro páginas estão quebradas no celular. A causa é única e estrutural: **o app é estilizado com `style={{}}` inline, e estilo inline não aceita `@media`** — responsividade é fisicamente impossível nesse modelo.

Esta feature substitui o modelo de estilo por Tailwind v4 (já instalado, hoje inerte), unifica os tokens visuais num design system, e com isso destrava mobile e polish num só movimento.

## Diagnóstico (estado atual, medido)

| Evidência | Fato |
|---|---|
| `friends` — 42 `style={{}}` / 0 `className` | zero media queries |
| `methods` — 25 / 0 | zero media queries |
| `chat` — 22 / 0 | zero media queries |
| `onboarding` — 17 / 0 | zero media queries |
| `dashboard`, `progress`, `study`, `study-session`, `profile`, `page` | têm `<style>` + `@media` → **funcionam no mobile** |
| `tailwindcss@4.3.0` + `@tailwindcss/postcss` instalados | `globals.css` usa diretivas **v3** (`@tailwind base/components/utilities`); não há `tailwind.config`; **nenhum componente usa uma classe utilitária do Tailwind** — todo `className` do projeto é custom (`dash-title`, `appshell-sidebar`) |
| `npx tsc --noEmit` | limpo |
| `npx vitest run` | 17/17 passam |
| `npx eslint .` | 0 erros, **7 warnings** |

A correlação é exata: **as 4 páginas sem `@media` são exatamente as 4 que o usuário reportou quebradas no mobile.** Não é coincidência — é a definição do bug.

## User Scenarios & Testing

### User Story 1 — Design system unificado (P1)

Como usuário, abro qualquer página e vejo um produto coeso — mesma tipografia, espaçamento, raio de borda, cor e peso de card — em vez de telas que parecem de apps diferentes.

**Acceptance**

1. `app/globals.css` usa a sintaxe v4 (`@import "tailwindcss"`) e declara os tokens atuais (`--p`, `--bg`, `--ink`, …) num bloco `@theme`, expondo-os como utilitários (`bg-bg`, `text-ink`, `border-p-line`).
2. As classes utilitárias do Tailwind aparecem no CSS emitido pelo build (hoje não aparecem).
3. Os primitivos recorrentes (card de vidro, botão primário/secundário, input, título de página) existem como componente ou classe única, não recopiados por página.
4. A identidade visual atual (roxo `#9333FF` sobre fundo escuro `#0B0612`) é **preservada** — isto é unificação, não troca de marca.

### User Story 2 — Mobile nas 4 páginas quebradas (P1)

Como usuário no celular, uso `friends`, `methods`, `onboarding` e `chat` sem scroll horizontal, sem texto cortado e sem alvo de toque menor que 44px.

**Acceptance**

1. Em 375px de largura, nenhuma das 4 páginas produz scroll horizontal.
2. Grids colapsam para 1 coluna; o composer do chat fica acessível com o teclado virtual aberto.
3. Os breakpoints vêm de utilitários (`md:`, `sm:`), não de `<style>` manual por página.

### User Story 3 — Polish (P2)

1. **Favicon**: existe `app/favicon.ico` (convenção do Next 16 — o `<link rel="icon">` é injetado automaticamente). Hoje não existe nenhum ícone; a aba mostra o ícone genérico.
2. **Avatar do Google no sidebar**: a lógica **já existe** (`components/layout/Sidebar.tsx:44-48`, com fallback `profile.avatar_url → user_metadata.avatar_url → picture → inicial`). O escopo aqui é **descobrir por que não aparece** e corrigir — não reimplementar. Hipótese principal: com o schema do banco ausente (ver 001/T007), `loadProfile` falha e o perfil vem `null`; o fallback para `user_metadata` precisa ser verificado end-to-end com login Google real.

### User Story 4 — Erros (P2)

Zerar os 7 warnings de lint: 3× `react-hooks/exhaustive-deps` (`dashboard:104`, `progress:92`, `AuthContext:121`), 2× `no-unused-vars` (`AuthContext:129`), 2× `no-img-element` (`page:174`, `Sidebar:175`).

> Nota: `tsc` e os testes **já estão verdes**. "Arrumar os erros" aqui é lint + os erros de *runtime* que vêm do banco não migrado — e esses são resolvidos por 001/T007, não por esta feature.

## Requirements

- **FR-001**: `globals.css` migra para a sintaxe Tailwind v4; tokens atuais expostos via `@theme`.
- **FR-002**: `friends`, `methods`, `onboarding`, `chat` reescritas com utilitários e responsivas de 375px a desktop.
- **FR-003**: primitivos de UI compartilhados (card, botão, input, título de página).
- **FR-004**: `app/favicon.ico` presente.
- **FR-005**: avatar do Google renderiza no sidebar após login Google.
- **FR-006**: `npx eslint .` retorna 0 erros **e** 0 warnings.
- **FR-007**: `tsc` limpo e 17/17 testes continuam passando (não-regressão).

## Success Criteria

- **SC-001**: nenhuma das 4 páginas tem scroll horizontal em 375px.
- **SC-002**: zero `style={{}}` de layout (`display`, `grid*`, `flex*`, `width`, `padding`, `margin`) nas 4 páginas migradas.
- **SC-003**: `eslint` 0 erros / 0 warnings.
- **SC-004**: build passa; testes 17/17; `tsc` limpo.
- **SC-005**: identidade visual preservada (roxo sobre escuro).

## Out of Scope

- Upload de PDF → aula por IA → **feature 003** (decisão do usuário, 2026-07-11).
- Aplicar as migrações do banco → **001/T007**.
- Migrar `lib/data/` ou as telas para os repositórios → **001/US2**.

## Assumptions

- A paleta e o mascote (Flow) ficam; "não tem nada a ver com SaaS" é sobre **inconsistência e mobile**, não sobre a marca. Se a intenção for rebranding, isto vira outra spec.
- O padrão `<style>` + `@media` das páginas que hoje funcionam é substituído por utilitários, para o app ter **um** modelo de estilo e não dois.
