# Task: Squad Export

> Empacota um squad para reutilização em outro projeto.

## Quando usar
- `@squad export <slug>`

## Processo

1. Validar o squad (rodar validate)
2. Se inválido: abortar com sugestão de correção
3. Coletar todos os arquivos do pacote:
   - .aios-lite/squads/<slug>/ (tudo)
   - NÃO incluir: output/, aios-logs/, media/ (são dados de sessão)
4. Gerar archive: `.aios-lite/squads/exports/<slug>.aios-squad.tar.gz`
5. Incluir um `import-instructions.md` no archive

## Saída
- Arquivo .tar.gz portável
- Instruções de import no chat
