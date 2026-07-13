# Feature Specification: Persistência de XP confiável + Redesign visual 3D

**Feature Branch**: `001-xp-persistence-3d-ui`

**Created**: 2026-07-08

**Status**: Draft

**Input**: User description: "Terminar o SaaS FocusFlow: implementar a parte que falta de armazenar XP do usuário (persistência de XP/gamificação). Hoje o banco é Supabase, mas há intenção de trocar de banco no futuro — a camada de dados deve ser desacoplada para facilitar a migração. Além disso, redesenhar o layout usando Spline com animações 3D e elementos 3D interativos, para um web design bonito e polido."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - XP sempre salvo e consistente (Priority: P1)

Como estudante, toda atividade que me dá XP (sessão de estudo, quiz, lição) deve somar ao meu XP total permanentemente. Ao fechar o app, trocar de dispositivo ou recarregar a página, meu XP total, meu nível e meu histórico de XP por dia continuam corretos e idênticos em todas as telas (dashboard, perfil, progresso, sidebar).

**Why this priority**: É o núcleo da gamificação do produto — hoje parte dos fluxos não grava XP, o que quebra a confiança do usuário no sistema de recompensa e torna o produto "inacabado". Sem isso, o redesign visual não tem valor.

**Independent Test**: Completar uma atividade de cada tipo que concede XP, anotar os valores exibidos, recarregar a página e conferir que o XP total e o gráfico "XP por dia" refletem exatamente a soma das atividades.

**Acceptance Scenarios**:

1. **Given** um usuário autenticado com 100 XP, **When** ele completa uma sessão de estudo que concede 50 XP, **Then** seu XP total persistido passa a ser 150 e todas as telas exibem 150 após recarregar.
2. **Given** um usuário que completa um quiz, **When** o quiz termina, **Then** o XP ganho é gravado junto ao registro do quiz e somado ao XP total do perfil (uma única vez, sem duplicação).
3. **Given** uma falha de rede no momento de salvar o XP, **When** a gravação falha, **Then** o usuário é informado e o sistema tenta salvar novamente sem duplicar o ganho.
4. **Given** o mesmo usuário logado em dois dispositivos, **When** ele ganha XP em um deles, **Then** o outro exibe o total atualizado ao recarregar (fonte de verdade única no servidor).

---

### User Story 2 - Camada de dados desacoplada (Priority: P2)

Como mantenedor do produto, todo acesso a dados (perfil, XP, streak, quizzes, amigos, chat) passa por uma camada única de repositório da aplicação, de modo que trocar o provedor de banco de dados no futuro exija alterar apenas essa camada — sem tocar em telas ou componentes.

**Why this priority**: O dono do produto pretende migrar de provedor de banco. Sem o desacoplamento, a migração futura exigiria reescrever todas as telas; com ele, vira uma troca de implementação isolada. Deve ser feito junto/antes da consolidação do XP para não retrabalhar.

**Independent Test**: Inspecionar o código: nenhuma tela ou componente importa o cliente do banco diretamente; todos os acessos passam pelos módulos da camada de dados. Um "repositório fake" em memória consegue rodar os fluxos principais em teste.

**Acceptance Scenarios**:

1. **Given** a base de código refatorada, **When** se busca por importações diretas do cliente de banco fora da camada de dados, **Then** nenhuma ocorrência é encontrada em páginas/componentes.
2. **Given** a camada de dados com contratos definidos (interfaces), **When** a implementação do provedor é substituída por outra, **Then** as telas continuam funcionando sem alteração.

---

### User Story 3 - Redesign visual com 3D interativo (Priority: P3)

Como visitante e como usuário, a experiência visual do FocusFlow é bonita e memorável: a página inicial (landing) tem uma cena 3D interativa que reage ao mouse/toque, e o app (dashboard e telas internas) recebe um refinamento visual coeso — elementos 3D de destaque, microanimações e polimento de layout — mantendo a leveza e a legibilidade para estudo.

**Why this priority**: Diferencial de marketing e percepção de qualidade ("parecer perfeito"). Depende de o produto estar funcionalmente completo (P1) para valer a pena; pode ser entregue de forma incremental por tela.

**Independent Test**: Abrir a landing page e interagir com a cena 3D (mouse/toque); navegar pelo dashboard e telas internas e verificar o novo visual aplicado de forma consistente, sem travamentos perceptíveis em um notebook comum e em um celular intermediário.

**Acceptance Scenarios**:

1. **Given** um visitante na landing page, **When** a página carrega, **Then** uma cena 3D interativa é exibida e responde ao movimento do cursor/toque.
2. **Given** um dispositivo de baixo desempenho ou conexão lenta, **When** a cena 3D não pode carregar rapidamente, **Then** um fallback visual estático elegante é exibido e a página permanece utilizável.
3. **Given** um usuário navegando pelo app, **When** ele transita entre telas, **Then** o visual (cores, cartões, tipografia, animações) é coeso com a nova identidade e a navegação continua fluida.
4. **Given** um usuário com preferência de movimento reduzido no sistema operacional, **When** ele usa o app, **Then** animações intensas são reduzidas ou desativadas.

---

### Edge Cases

- O que acontece se a gravação de XP falhar no meio de uma sessão concluída? (o ganho não pode se perder silenciosamente nem ser aplicado duas vezes)
- Como o sistema trata duas atividades concluídas quase simultaneamente (ex.: duas abas abertas)? O total deve refletir a soma correta, sem sobrescrever um ganho com outro (atualização atômica no servidor).
- Usuário sem perfil criado ainda (primeiro acesso) completa uma atividade — o registro de XP deve criar/inicializar o perfil em vez de falhar.
- Cena 3D em navegador sem suporte/aceleração gráfica — deve degradar para o fallback estático.
- Dados antigos de XP já gravados devem continuar válidos após a consolidação (sem zerar o progresso de ninguém).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST persistir no servidor todo XP concedido por qualquer atividade (sessão de estudo, quiz, lição), somando ao total do perfil do usuário de forma atômica e sem duplicação.
- **FR-002**: O sistema MUST manter o XP total do perfil como fonte de verdade única; todas as telas que exibem XP MUST ler desse mesmo valor persistido.
- **FR-003**: O sistema MUST registrar o histórico de ganhos de XP com data, quantidade e origem (tipo de atividade), suficiente para alimentar o gráfico "XP por dia" e as conquistas.
- **FR-004**: Em caso de falha ao salvar XP, o sistema MUST informar o usuário e permitir nova tentativa sem risco de crédito duplicado.
- **FR-005**: Todo acesso a dados da aplicação MUST passar por uma camada de repositório própria, com contratos (interfaces) independentes do provedor de banco; páginas e componentes MUST NOT acessar o cliente do banco diretamente.
- **FR-006**: A troca do provedor de banco MUST ser possível alterando apenas a implementação da camada de dados, preservando os contratos.
- **FR-007**: A landing page MUST exibir uma cena 3D interativa que responda a mouse/toque, com fallback estático quando o 3D não puder carregar ou o dispositivo não suportar.
- **FR-008**: As telas internas do app MUST receber um refinamento visual coeso (identidade, cartões, tipografia, microanimações e acentos 3D pontuais) sem prejudicar a legibilidade das áreas de estudo.
- **FR-009**: O sistema MUST respeitar a preferência de movimento reduzido do usuário, reduzindo/desativando animações intensas.
- **FR-010**: O redesign MUST manter o app utilizável em dispositivos móveis e desktops, sem degradação perceptível de fluidez nas telas de estudo.
- **FR-011**: A consolidação da persistência de XP MUST preservar os dados de XP e progresso já existentes dos usuários atuais.

### Key Entities

- **Perfil do usuário**: identidade do estudante; guarda XP total, streak (dias seguidos), minutos de estudo e preferências. XP total é a fonte de verdade exibida em todo o app.
- **Evento de XP / atividade concluída**: registro de cada ganho de XP — quando ocorreu, quanto rendeu e de qual atividade veio (sessão de estudo, quiz, lição). Alimenta o histórico diário e as conquistas.
- **Quiz realizado**: já existente; inclui o XP ganho naquele quiz e deve permanecer consistente com o total do perfil.
- **Camada de dados (repositórios)**: contratos de acesso a perfil, XP, streak, quizzes, amigos e chat; única parte do sistema que conhece o provedor de banco.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das atividades que concedem XP resultam em XP persistido: ao recarregar a página após qualquer atividade, o total exibido reflete o ganho (0 casos de XP "perdido" nos fluxos principais).
- **SC-002**: O mesmo valor de XP total aparece em todas as telas que o exibem (dashboard, perfil, progresso, sidebar) — 0 divergências.
- **SC-003**: Nenhuma tela ou componente fora da camada de dados referencia o provedor de banco diretamente (verificável por inspeção automatizada do código).
- **SC-004**: A landing page com cena 3D fica interativa em até 3 segundos em conexão banda larga comum; em dispositivos sem suporte, o fallback aparece sem tela quebrada.
- **SC-005**: Navegação e telas de estudo permanecem fluidas após o redesign (sem travamentos perceptíveis ao usuário em celular intermediário).
- **SC-006**: Usuários existentes mantêm 100% do XP e progresso acumulados após a mudança.

## Assumptions

- A troca efetiva do provedor de banco NÃO faz parte desta entrega; o escopo é desacoplar a camada de dados para viabilizar a migração futura. O Supabase permanece como provedor atual (incluindo autenticação).
- Não serão criadas novas mecânicas de gamificação (novos tipos de recompensa, loja, ranking global); o escopo é tornar confiável e consistente o XP já concebido (sessões, quizzes, conquistas, níveis exibidos).
- A cena 3D interativa principal ficará na landing page (primeira impressão/marketing); nas telas internas o 3D entra como acentos pontuais e polimento, para não comprometer desempenho nem foco do estudante. A ferramenta pretendida pelo dono do produto é o Spline (decisão registrada; detalhes técnicos ficam para a fase de plano).
- O público inclui estudantes usando celulares intermediários e computadores comuns; desempenho e fallback são requisitos, não opcionais.
- Usuários têm conexão à internet ao concluir atividades; suporte offline completo está fora do escopo (apenas tolerância a falhas momentâneas de gravação).
- Identidade visual (mascote Flow, tom lúdico em português) permanece; o redesign refina, não substitui a marca.
