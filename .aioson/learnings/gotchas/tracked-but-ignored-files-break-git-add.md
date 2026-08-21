---
title: Arquivo rastreado sob regra de `.gitignore` faz `git add -- <caminho>` recusar tudo
scope: src/lib/git-stage.js, src/commands/commit-prepare.js, src/installer.js, src/lib/security/staged-secret-detector.js
src: "AIOSON supervised session: commit:prepare falhou no git add com 84 caminhos e a causa estava enterrada sob 160 avisos de LF/CRLF"
---

# Arquivo rastreado sob regra de `.gitignore` faz `git add -- <caminho>` recusar tudo

O instalador grava a política de ignore do framework (`.aioson/tasks/`,
`.aioson/skills/`, `.aioson/schemas/`, `.aioson/templates/`…) no `.gitignore`
do projeto. Projetos que comitaram esses arquivos **antes** da linha existir
ficam com arquivos *rastreados-mas-ignorados*: cada `aioson update` os
reescreve, `git status` os lista como modificados, e um `git add -- <caminho>`
que inclua um deles sai com status 1 — "The following paths are ignored by one
of your .gitignore files" — e o comando inteiro é tratado como falha.

Três armadilhas empilhadas:

1. **`git status` e `git add` discordam.** Status mostra o arquivo porque é
   rastreado; `add` com pathspec explícito o recusa porque bate no ignore.
   `git add -u -- <caminho>` (modo update) não consulta ignore — é a faixa
   correta para qualquer caminho já rastreado, e ainda encena deleções.
2. **A mensagem útil vem por último.** Com `core.autocrlf=true` o git imprime
   um aviso por arquivo; o `error.message` do `execFileSync` ecoa o comando
   inteiro (milhares de chars) e só depois o stderr. Ninguém lê a linha que
   importa. Filtre os avisos de EOL, descarte o eco e mostre o status de saída.
3. **A nota em prosa não mede.** O setup já avisava "se esses arquivos já
   estavam rastreados, rode `git rm --cached`" — só quando adicionava linhas e
   sem nomear caminho nenhum. `git ls-files -ci --exclude-standard` lista
   exatamente os arquivos rastreados-e-ignorados; a saída de `update`/`setup`
   e o resultado de `commit:prepare` (`trackedIgnored`) agora nomeiam o remédio
   com os caminhos reais.

**Regra:** stage em duas faixas (`stagePaths` em `src/lib/git-stage.js`):
rastreados via `add -u --`, não rastreados via `add --`, em lotes e com retry
em `index.lock`. Operandos explícitos entram pelo motor
(`aioson commit:prepare . <caminhos...>`), nunca por `git add` cru do agente.

## O mesmo relatório, segunda metade: falso positivo de segredo

O guard de conteúdo acusava `"password_label": "Senha"` em `messages/pt-BR.json`
(next-intl não usa `i18n/` no caminho), `PLAY_LOGIN_TOKEN_LABEL = "Play login"`
em código runtime e `"token": "DashboardView"` num relatório de lint gerado
pelo próprio framework. O projeto acumulou sete `contentAllowRules` para
calar o detector — o sintoma de um gate que chora lobo. A correção é de
heurística, não de allowlist: nome de locale no basename conta como arquivo de
tradução onde quer que esteja; sufixo descritor depois do substantivo de
credencial (`_label`, `_header`, `_ttl`) não é credencial; valor-máscara ou
palavra-rótulo não é credencial; símbolo em forma de palavra sob chave `token`
vira *notice* suprimido, visível na auditoria. Uma constante `PASSWORD` com
valor literal real e um `password_reset_token` (substantivo por último)
continuam avisando.
