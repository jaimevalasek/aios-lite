# Cenários de Uso

> Exemplos completos e práticos de como usar o AIOS Lite em projetos reais.

---

## Cenário 1 — Landing page com formulário (MICRO)

**Projeto:** Landing page de captura de leads com formulário de e-mail.
**Stack:** HTML + Alpine.js + Tailwind + PHP simples para envio de e-mail.
**Classificação:** MICRO (1 tipo de usuário, 1 integração, sem regras complexas → 1 ponto)

### Passo 1: Instalar e configurar

```bash
mkdir landing-captura && cd landing-captura
npx aios-lite install
npx aios-lite setup:context . --defaults \
  --project-name="Landing Captura" \
  --project-type=site \
  --framework="None" \
  --framework-installed=false \
  --classification=MICRO \
  --lang=pt-BR
```

### Passo 2: Abrir Claude e ativar @setup

No arquivo CLAUDE.md, o contexto já foi lido. Digite:

```
/setup
```

**O agente confirma o contexto pré-configurado:**
```
Contexto carregado:
- Projeto: Landing Captura
- Tipo: site (MICRO)
- Framework: Nenhum detectado
- Idioma: pt-BR

Classificação MICRO confirmada (0 pts): 1 tipo de usuário, sem integrações, sem regras complexas.

Plano: @setup → @dev
Próximo passo: ative /dev e descreva o que o projeto precisa ter.
```

> **Nota:** As flags `--defaults` acima pré-preenchem o contexto sem perguntas interativas.
> Se preferir o fluxo guiado, basta rodar `npx aios-lite setup:context` sem flags — o agente
> vai fazer as perguntas e identificar o projeto a partir da sua descrição.

### Passo 3: Ativar @dev diretamente

```
/dev

Preciso de uma landing page com:
- Hero section com headline e CTA
- Formulário de captura de e-mail (nome + e-mail)
- Envio por PHP para um arquivo de log (sem banco)
- Design limpo com Tailwind
```

**O @dev entrega:**
- `index.html` com estrutura completa
- `style.css` ou classes Tailwind inline
- `submit.php` para processar o formulário
- Validação básica no frontend e backend

### Por que MICRO?

Não precisa de @analyst (domínio simples), não precisa de @architect (estrutura trivial), não precisa de @qa (sem lógica crítica a testar). O @dev tem contexto suficiente para entregar direto.

---

## Cenário 2 — API REST com autenticação (SMALL)

**Projeto:** API para gerenciar agendamentos de uma clínica médica.
**Stack:** Laravel 11 + PostgreSQL + Sanctum.
**Classificação:** SMALL (3 tipos de usuário=2pt, 2 integrações=1pt → 3 pontos)

### Passo 1: Instalar

```bash
# Laravel já está instalado e configurado
cd minha-clinica-api
npx aios-lite install
npx aios-lite setup:context . --defaults \
  --project-name="Clinica API" \
  --project-type=api \
  --framework=Laravel \
  --framework-installed=true \
  --classification=SMALL \
  --lang=pt-BR
```

### Passo 2: Verificar saúde

```bash
npx aios-lite doctor
```

### Passo 3: @setup

```
/setup
```

**O agente confirma:**
```
Contexto carregado:
- Projeto: Clinica API (SMALL)
- Framework: Laravel 11 (instalado ✓)
- Classificação: SMALL

Plano: @setup → @analyst → @architect → @dev → @qa

Próximo passo: /analyst
Objetivo: mapear pacientes, médicos, agendamentos e regras de negócio.
```

### Passo 4: @analyst — Descoberta do domínio

```
/analyst
```

**O agente faz suas 6 perguntas:**

```
1. Quem são os tipos de usuário?
```
*Você responde:* Paciente, Médico, Recepcionista

```
2. Qual o fluxo principal que gera valor?
```
*Você responde:* Paciente agenda consulta → médico confirma → recepcionista valida presença

```
3. Existe processo manual hoje?
```
*Você responde:* Sim, tudo é feito por telefone e planilha Excel

```
4. Quais são as regras de negócio críticas?
```
*Você responde:*
- Médico só pode ter 1 consulta por horário
- Cancelamento até 24h antes sem penalidade
- Paciente não pode ter 2 consultas no mesmo dia com o mesmo médico

```
5. Integrações externas?
```
*Você responde:* Envio de e-mail de confirmação (SMTP) e SMS via Twilio

```
6. Dados sensíveis?
```
*Você responde:* Dados de saúde dos pacientes (LGPD)

**O @analyst entrega** `.aios-lite/context/discovery.md`:
```markdown
## Entidades principais

| Entidade     | Atributos principais                          | Restrições                  |
|--------------|-----------------------------------------------|------------------------------|
| User         | id, name, email, role, password               | role: patient/doctor/staff   |
| Doctor       | id, user_id, crm, specialty, schedule_config  | CRM único                    |
| Patient      | id, user_id, cpf, birth_date, health_notes    | CPF único, dados LGPD        |
| Appointment  | id, doctor_id, patient_id, date, status       | 1 por médico/horário         |
| TimeSlot     | id, doctor_id, starts_at, ends_at, available  | —                            |

## Regras de negócio
- RN01: 1 consulta por médico por horário (check no create)
- RN02: Cancelamento livre até 24h antes
- RN03: 1 consulta por paciente/médico por dia

## Integrações
- SMTP (Laravel Mail) — confirmação de agendamento
- Twilio SMS — lembrete 1h antes

## Riscos
- LGPD: health_notes precisa de criptografia ou controle de acesso
- Conflito de horários: critical path, requer lock otimista
```

### Passo 5: @architect — Estrutura do projeto

```
/architect
```

**O @architect lê o discovery e entrega** `.aios-lite/context/architecture.md`:

```
Classificação: SMALL → estrutura Laravel padrão, sem sub-pastas excessivas

app/
  Actions/
    CreateAppointmentAction.php
    CancelAppointmentAction.php
  Http/
    Controllers/
      AppointmentController.php
      DoctorController.php
    Requests/
      CreateAppointmentRequest.php
  Models/
    User.php, Doctor.php, Patient.php, Appointment.php
  Policies/
    AppointmentPolicy.php
  Events/
    AppointmentCreated.php
    AppointmentCancelled.php
  Listeners/
    SendConfirmationEmail.php
    SendSmsReminder.php

database/migrations/
resources/  (apenas para erros API)
routes/api.php
tests/Feature/AppointmentTest.php
```

**Decisões técnicas:**
- Auth: Sanctum (tokens de API)
- N+1: Eager loading em todos os índices (with('doctor.user', 'patient.user'))
- Timezone: UTC no banco, conversão na camada de apresentação

### Passo 6: @dev — Implementação

```
/dev

Implemente a feature de agendamentos primeiro.
Comece pela migration, model, action e controller.
```

**O @dev implementa seguindo as convenções:**

```php
// app/Actions/CreateAppointmentAction.php
class CreateAppointmentAction
{
    public function execute(array $data): Appointment
    {
        // RN01: verificar conflito de horário
        $conflict = Appointment::where('doctor_id', $data['doctor_id'])
            ->where('date', $data['date'])
            ->where('status', '!=', 'cancelled')
            ->exists();

        if ($conflict) {
            throw new AppointmentConflictException();
        }

        // RN03: verificar duplicata paciente/médico/dia
        $duplicate = Appointment::where([
            'patient_id' => $data['patient_id'],
            'doctor_id'  => $data['doctor_id'],
        ])->whereDate('date', $data['date'])->exists();

        if ($duplicate) {
            throw new DuplicateAppointmentException();
        }

        $appointment = Appointment::create($data);
        AppointmentCreated::dispatch($appointment);
        return $appointment;
    }
}
```

### Passo 7: @qa — Testes

```
/qa

Revise a CreateAppointmentAction e escreva os testes para:
- criação com sucesso
- conflito de horário (RN01)
- duplicata paciente (RN03)
- cancelamento fora do prazo (RN02)
```

**O @qa entrega** `tests/Feature/AppointmentTest.php` com todos os casos.

---

## Cenário 3 — SaaS multi-tenant (MEDIUM)

**Projeto:** Plataforma SaaS de gestão de projetos para agências digitais.
**Stack:** Next.js 14 (App Router) + Prisma + PostgreSQL + Stripe.
**Usuários:** Admin da agência, Gerente de projeto, Cliente (visualização).
**Classificação:** MEDIUM (3 usuários=2pt, 3+ integrações=2pt, regras complexas=2pt → 6 pontos)

### Passo 1: Instalar

```bash
npx create-next-app@latest saas-agencia --typescript
cd saas-agencia
npx aios-lite install
npx aios-lite setup:context . --defaults \
  --project-name="Agency SaaS" \
  --project-type=web_app \
  --framework="Next.js" \
  --framework-installed=true \
  --classification=MEDIUM \
  --lang=pt-BR
```

### Passo 2: @setup

```
/setup
```

**O agente confirma o plano MEDIUM completo:**
```
Plano de execução:
1. /analyst   → discovery e modelagem de domínio
2. /architect → estrutura de pastas Next.js MEDIUM + decisões técnicas
3. /ux-ui     → sistema de design e componentes
4. /pm        → backlog priorizado (máx 2 páginas)
5. /orchestrator → lanes de desenvolvimento paralelo
6. /dev       → implementação por lane
7. /qa        → revisão e testes

Próximo: /analyst
```

### Passo 3: @analyst

O analista descobre:
- **Entidades:** Organization, Project, Task, User, Invoice, Subscription
- **Multi-tenancy:** Cada organização é isolada (Row-Level Security)
- **Integrações:** Stripe (billing), GitHub (integração de commits), Slack (notificações), S3 (uploads)
- **Regras:** Plano free = máx 3 projetos, Plano pro = ilimitado; cobrança proporcional por membro

### Passo 4: @architect

Para MEDIUM com Next.js App Router:

```
src/
  app/
    (auth)/login/page.tsx
    (dashboard)/
      layout.tsx              ← verifica tenant
      projects/page.tsx
      projects/[id]/page.tsx
    api/
      webhooks/stripe/route.ts
  components/
    ui/                       ← Button, Input, Modal (design system)
    features/
      projects/ProjectCard.tsx
      tasks/TaskBoard.tsx
  lib/
    db/prisma.ts
    auth/session.ts
    billing/stripe.ts
  actions/                    ← Server Actions
    project.actions.ts
    task.actions.ts
  types/
```

### Passo 5: @ux-ui

```
/ux-ui

Precisamos de:
- Dashboard principal com lista de projetos
- Board Kanban para tarefas
- Sidebar com navegação entre projetos
- Página de configurações de billing
```

**O @ux-ui entrega** `.aios-lite/context/ui-spec.md`:
- Tokens: primary=#6366F1, gray scale, radius-md=8px
- Componentes: ProjectCard, TaskCard, KanbanBoard, Sidebar, BillingModal
- Estados: loading skeleton, empty state, error state para cada componente
- Acessibilidade: foco visível, ARIA labels em boards interativos

### Passo 6: @pm

```
/pm
```

**O @pm entrega** `.aios-lite/context/prd.md` (2 páginas):

```markdown
## MVP — Sprint 1 (núcleo)

US-01: Como admin, posso criar e gerenciar projetos
  - AC: criar projeto com nome, descrição e deadline
  - AC: arquivar projeto (soft delete)
  - AC: apenas membros da organização veem os projetos

US-02: Como gerente, posso criar tarefas em um board Kanban
  - AC: colunas: To Do / In Progress / Done
  - AC: arrastar tarefa entre colunas
  - AC: atribuir tarefa a um membro

US-03: Como admin, posso convidar membros via e-mail
  - AC: link de convite com expiração de 48h
  - AC: bloquear acesso se plano free atingir limite

## Sprint 2 (monetização)

US-04: Como admin, posso gerenciar assinatura
  - AC: integração Stripe com upgrade/downgrade
  - AC: webhook de pagamento recusado bloqueia conta

## Fora do MVP
- Integração GitHub
- Notificações Slack
- Relatórios avançados
```

### Passo 7: @orchestrator

```
/orchestrator
```

Ou via CLI:
```bash
npx aios-lite parallel:init --workers=3
npx aios-lite parallel:assign --source=prd --workers=3
```

**O orquestrador cria 3 lanes:**

```
Lane 1 (@dev instância A):
  - Auth + Multi-tenancy (Organization, User, middleware)
  - US-03: Sistema de convites

Lane 2 (@dev instância B):
  - US-01: CRUD de projetos
  - US-02: Board Kanban + drag-and-drop

Lane 3 (@dev instância C):
  - US-04: Integração Stripe
  - Webhook handler
  - Página de billing
```

**Cada @dev instance** lê seu lane file:
```
Lane 1: /dev Implemente o escopo do agent-1.status.md
Lane 2: /dev Implemente o escopo do agent-2.status.md
Lane 3: /dev Implemente o escopo do agent-3.status.md
```

**Monitorar progresso:**
```bash
npx aios-lite parallel:status
```

### Passo 8: @qa

```
/qa

Revise as implementações das 3 lanes e escreva testes para:
- Isolamento de tenant (crítico)
- Fluxo de billing e webhook Stripe
- Permissões por role (admin vs gerente vs cliente)
```

---

## Cenário 4 — dApp Ethereum (MEDIUM)

**Projeto:** Marketplace de NFTs com contrato de royalties.
**Stack:** Hardhat + Solidity + Next.js + wagmi + RainbowKit.
**Classificação:** MEDIUM (múltiplos usuários, Web3 + frontend, regras de contrato complexas)

### Passo 1: Instalar

```bash
mkdir nft-marketplace && cd nft-marketplace
npx create-next-app@latest frontend --typescript
npx hardhat init  # no mesmo diretório raiz
npx aios-lite install
npx aios-lite setup:context . --defaults \
  --project-name="NFT Marketplace" \
  --project-type=dapp \
  --framework=Hardhat \
  --framework-installed=true \
  --classification=MEDIUM \
  --web3-enabled=true \
  --web3-networks=ethereum \
  --contract-framework=Hardhat \
  --wallet-provider=wagmi \
  --lang=pt-BR
```

> **Nota:** Se Hardhat e Next.js coexistem no mesmo diretório, o AIOS Lite detecta automaticamente como **monorepo** e exibe um aviso de configuração.

### Passo 2: @analyst

O analista identifica:
- **Buyer:** compra NFTs via marketplace
- **Creator:** lista NFTs com royalty configurado
- **Marketplace:** cobra fee sobre cada venda

**Entidades on-chain:**
| Entidade | Tipo | Notas |
|---|---|---|
| NFT | ERC-721 | tokenURI no IPFS |
| Listing | struct | price, seller, royaltyBps |
| Sale | event | buyer, seller, price, royalty |

**Regras críticas:**
- RN01: Royalty máximo de 10% (1000 bps)
- RN02: Reentrancy guard em todas as funções de pagamento
- RN03: Withdraw pattern para pagamentos (nunca push)

### Passo 3: @architect

**Estrutura monorepo:**
```
contracts/
  Marketplace.sol
  NFT.sol
  interfaces/IMarketplace.sol
scripts/
  deploy.js
test/
  Marketplace.test.js
frontend/
  src/
    app/
      marketplace/page.tsx
      create/page.tsx
    components/
      NFTCard.tsx
      ListingModal.tsx
    hooks/
      useMarketplace.ts  ← wagmi hooks
    lib/
      contracts.ts       ← ABIs e endereços
```

### Passo 4: @dev (contratos)

```
/dev

Implemente o contrato Marketplace.sol com:
- ERC-721 listing
- Royalties on-chain
- Reentrancy guard (OpenZeppelin)
- Withdraw pattern para pagamentos
```

**O @dev escreve:**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract Marketplace is ReentrancyGuard {
    struct Listing {
        address seller;
        uint256 price;
        uint256 royaltyBps;  // base points: 1000 = 10%
        address royaltyRecipient;
    }

    mapping(address => mapping(uint256 => Listing)) public listings;
    mapping(address => uint256) public pendingWithdrawals;  // pull pattern

    uint256 public constant MAX_ROYALTY_BPS = 1000;

    function buyNFT(address nftContract, uint256 tokenId)
        external payable nonReentrant
    {
        Listing memory listing = listings[nftContract][tokenId];
        require(msg.value >= listing.price, "Insufficient payment");

        uint256 royalty = (listing.price * listing.royaltyBps) / 10000;
        uint256 sellerAmount = listing.price - royalty;

        // Acumular (não enviar direto — evita reentrancy)
        pendingWithdrawals[listing.royaltyRecipient] += royalty;
        pendingWithdrawals[listing.seller] += sellerAmount;

        delete listings[nftContract][tokenId];
        IERC721(nftContract).safeTransferFrom(listing.seller, msg.sender, tokenId);
    }

    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
```

### Passo 5: @qa (auditoria de contrato)

```
/qa

Audite o Marketplace.sol para:
- Vulnerabilidades de reentrancy
- Integer overflow/underflow
- Access control
- Edge cases no withdraw pattern
Escreva testes Hardhat cobrindo todos os cenários críticos.
```

---

## Dicas gerais

### Quando recomeçar um agente

Se você forneceu informações incompletas, pode simplesmente reativar:
```
/analyst

Preciso adicionar uma informação: o sistema também vai ter integração com Mercado Pago
```

O agente vai incorporar a nova informação antes de gerar a entrega final.

### Quando pular um agente

- Em projetos **MICRO**, pule @analyst, @architect e @qa — vá direto ao @dev.
- Se o projeto não tem interface visual, pode pular @ux-ui mesmo em projetos SMALL.
- Se o projeto MEDIUM tem módulos pouco interdependentes, pode pular @orchestrator e usar @dev sequencialmente.

### Mudança de contexto

Se durante o desenvolvimento o projeto crescer e mudar de SMALL para MEDIUM:
```bash
npx aios-lite setup:context . --defaults --classification=MEDIUM
```

Então ative @pm e @orchestrator antes de continuar com @dev.

### Verificar estado atual

```bash
npx aios-lite doctor          # valida saúde dos arquivos
npx aios-lite context:validate # valida o project.context.md
npx aios-lite parallel:status  # progresso das lanes (MEDIUM)
```

---

## Veja também

- [Início rápido](./inicio-rapido.md)
- [Guia de agentes](./agentes.md)
- [Suporte Web3](./web3.md)
- [Orquestração paralela](../en/parallel.md)
