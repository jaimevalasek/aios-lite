---
title: "`system:publish --build` só protegia o que era compilado — o TS de runtime viajava legível, e um teste pinava isso como esperado"
scope: src/commands/store-system.js, src/parser.js, tests/store-system.test.js
src: "AIOSON supervised session: auditoria do pacote --build antes de publicar no Play — o coletor real embarcava 61 .ts legíveis (todo o backend) mais relatórios de QA e config de assistentes de IA"
---

# `system:publish --build` só protegia o que era compilado

A lane `--build` prometia "fonte excluído": tirava `src/`, embarcava `dist/` e
passava terser no `.js`. Mas um app split-stack roda o backend direto de
TypeScript (`"start": "tsx server/server.ts"`) — não existe saída compilada, e
`server/**/*.ts` entrava no pacote **verbatim** (tipos, comentários, nomes).
Pior: `tests/store-system.test.js` pinava `files['server/server.ts'] === 'export {}'`,
então a suíte verde certificava o vazamento.

Sinais que passaram batido:

- o nome do teste dizia "retain TypeScript server runtime **without source**" —
  o runtime ERA o fonte;
- o `--dry-run` do publish não listava arquivo nenhum (só o do `system:package`,
  que roda em modo fonte) — ninguém enxergava o pacote antes do upload;
- `--build` não estava em `BOOLEAN_FLAGS`: `system:publish --build ./app`
  engolia o diretório como valor da flag e publicava o CWD.

Regras que ficaram:

1. **Runtime ≠ compilado.** Tudo que roda no cliente é candidato a proteção,
   inclusive `.ts` executado por `tsx`. `module.stripTypeScriptTypes` (Node
   >= 22.13) tira os tipos, o mesmo terser faz o mangling, e o arquivo volta sob
   o MESMO caminho `.ts` — JS puro é TS válido, o `start` não muda.
2. **Fonte cru é erro, não aviso.** O que não dá pra proteger derruba o publish
   com o caminho (`--allow-raw-source` é a decisão explícita do dono).
3. **Pacote auditável antes do upload.** `--dry-run` lista tudo — meça o pacote
   com o coletor real, não com a intenção do código.
4. **Lixo de dev não é runtime.** `reports/`, `aios-qa*`, `.opencode/`,
   `.qwen/`, `.agents/`, testes e CI ficam fora.
5. Quando um teste pina um conteúdo exato, pergunte o que ele está certificando:
   aqui certificava o oposto da promessa do comando.
