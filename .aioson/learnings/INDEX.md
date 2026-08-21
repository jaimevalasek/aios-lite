# Project Learnings

- [O `$PWD` de um hook não é a raiz do projeto](gotchas/hook-cwd-is-not-the-project-root.md) — hooks descobrem a raiz subindo até um `.aioson/` **com entrada de projeto**; os que escrevem viram no-op fora de projeto e nunca criam store
- [Uma função passada ao `page.evaluate` não enxerga o módulo que a declarou](gotchas/page-evaluate-sees-no-module-scope.md) — sondas de browser recebem tudo por argumento; a suíte re-executa a sonda serializada num realm isolado e o Playwright resolve do projeto primeiro (`playwright-loader`)
- [Arquivo rastreado sob regra de `.gitignore` faz `git add -- <caminho>` recusar tudo](gotchas/tracked-but-ignored-files-break-git-add.md) — stage em duas faixas (`add -u` para rastreados), erro do git sem o ruído de LF/CRLF, `trackedIgnored` medido em update/setup/commit:prepare; e o detector de segredo aprende descritor, locale no basename e símbolo sob `token`
