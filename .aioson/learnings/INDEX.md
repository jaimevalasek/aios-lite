# Project Learnings

- [O `$PWD` de um hook não é a raiz do projeto](gotchas/hook-cwd-is-not-the-project-root.md) — hooks descobrem a raiz subindo até um `.aioson/` **com entrada de projeto**; os que escrevem viram no-op fora de projeto e nunca criam store
