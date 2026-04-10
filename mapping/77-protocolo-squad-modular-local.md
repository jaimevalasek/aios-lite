# Protocolo Local — Squad Modular AIOS Lite

Objetivo: fixar um protocolo único para o LLM entender como o AIOS Lite deve estruturar squads, agentes, skills, MCPs, subagentes, genomas e persistência local/cloud.

## 1. Camadas do sistema

### Rules / agents.md
- Arquivo curto e não executor.
- Funciona como manifesto da squad.
- Deve explicar:
  - missão da squad
  - limites
  - convenções
  - skills disponíveis
  - MCPs disponíveis
  - quando usar subagentes
  - formato de saída
  - regras de revisão

Arquivo sugerido:
- `agents/{squad-slug}/agents.md`

### Agentes executores
- São permanentes e operacionais.
- Executam trabalho real.
- Exemplos:
  - `agents/{squad-slug}/orquestrador.md`
  - `agents/{squad-slug}/roteirista-viral.md`
  - `agents/{squad-slug}/copywriter-de-titulos.md`

### Skills
- Representam capacidades reutilizáveis.
- Não são agentes.
- Devem ser ativadas sob demanda.
- Exemplos:
  - estruturar roteiro
  - copy de retenção
  - análise de hook
  - síntese editorial

### MCPs
- Representam acesso a fontes externas e dinâmicas.
- Não são inteligência.
- Devem ser usados via contrato claro.
- Exemplos:
  - filesystem
  - web-search
  - context7
  - makopy

### Subagentes
- São temporários.
- Servem para investigação, exploração, comparação e paralelismo.
- Não devem virar parte permanente da squad por padrão.

### Genoma
- É camada cognitiva.
- Define como pensar, que lentes usar, que tensões considerar e que repertório priorizar.
- Não substitui skill.
- Não substitui agente.
- Atua sobre squad e agentes.

## 2. Regra central de progressive disclosure

O sistema não deve carregar tudo de uma vez.

Regras:
- `agents.md` da squad deve ser curto.
- Skills devem ser consultadas sob demanda.
- MCPs devem ser usados apenas quando houver necessidade externa concreta.
- Subagentes devem ser acionados apenas quando a tarefa exigir investigação isolada ou paralelismo.
- O agente executor não deve carregar documentação longa por padrão.

Isso é parte central do protocolo, não um detalhe opcional.

## 3. Estrutura mínima local de uma squad

- `agents/{squad-slug}/agents.md`
- `agents/{squad-slug}/orquestrador.md`
- `agents/{squad-slug}/{executor}.md`
- `agents/{squad-slug}/squad.manifest.json`
- `.aios-lite/squads/{slug}.md`
- `output/{squad-slug}/`
- `aios-logs/{squad-slug}/`
- `media/{squad-slug}/`

## 4. Papel de cada artefato

### `agents/{squad-slug}/agents.md`
- manifesto textual da squad
- curto
- legível por humano e LLM

### `agents/{squad-slug}/squad.manifest.json`
- contrato estruturado da squad
- legível por sistema
- usado por:
  - runtime SQLite
  - dashboard
  - export/import
  - sync
  - aioslite.com

### `.aios-lite/squads/{slug}.md`
- resumo humano e metadata simples
- ponte com o resto do AIOS Lite

## 5. Persistência local

### Texto
- Tudo textual deve ser persistido no SQLite local do projeto.
- Banco sugerido:
  - `.aios-lite/runtime/aios.sqlite`

Inclui:
- tasks
- agent runs
- events
- artifacts textuais
- manifestos indexados
- outputs HTML
- markdown
- logs
- snapshots JSON

### Mídia
- Toda mídia deve ficar em:
  - `media/`
- Preferência:
  - `media/{squad-slug}/`

No banco, guardar apenas metadata da mídia:
- tipo
- caminho
- tamanho
- origem
- task
- squad
- agente

## 6. Regra para squads cloud

Squads podem ser:
- criadas localmente no AIOS Lite
- publicadas no `aioslite.com`
- privadas por padrão
- compartilhadas por share-link quando necessário
- importadas em outro projeto

O contrato principal de export/import deve se apoiar em `squad.manifest.json`.

## 7. Modelo conceitual da squad

Uma squad deve ser entendida como:

- manifesto (`agents.md`)
- executores permanentes
- skills reutilizáveis
- MCPs declarados
- política de subagentes
- genomas vinculados
- manifest JSON
- runtime SQLite

Não modelar squad apenas como pasta com agentes.

## 8. Diretriz para o Agent Squad

Quando o `@squad` criar uma nova squad, ele deve gerar:

1. missão clara
2. limites da squad
3. `agents.md` curto
4. executores permanentes
5. lista de skills da squad
6. lista de MCPs e justificativas
7. política de subagentes
8. regras de saída
9. regras de revisão
10. `squad.manifest.json`

## 9. Regras de uso de skills, arquivos e MCPs

### Skills
- usar sob demanda
- ativar quando a tarefa exigir uma capacidade específica
- não embutir tudo no prompt do agente

### Arquivos especializados
- carregar apenas quando necessários
- evitar despejar documentação longa na ativação

### MCPs
- usar quando houver necessidade de dados externos ou dinâmicos
- preferir fluxo padronizado

### Subagentes
- usar quando for melhor explorar sem poluir o contexto principal

## 10. Princípio de arquitetura

Rules explicam.
Skills capacitam.
MCPs conectam.
Subagentes investigam.
Executores entregam.
Genomas orientam a forma de pensar.

## 11. JSON base sugerido

```json
{
  "schemaVersion": "1.0.0",
  "slug": "youtube-creator",
  "name": "Youtube Creator",
  "mission": "Criar ativos editoriais e de conteúdo para YouTube.",
  "goal": "Gerar roteiros, títulos, descrições e prompts de thumbnail.",
  "visibility": "private",
  "aiosLiteCompatibility": "^1.1.0",
  "rules": {
    "outputsDir": "output/youtube-creator",
    "logsDir": "aios-logs/youtube-creator",
    "mediaDir": "media/youtube-creator"
  },
  "skills": [],
  "mcps": [],
  "subagents": {
    "allowed": true,
    "when": []
  },
  "executors": [],
  "genomes": []
}
```

## 12. Nota operacional

Este arquivo é memória/protocolo local.
Ele serve para orientar:
- implementações futuras do AIOS Lite
- evolução do `@squad`
- persistência para runtime/dashboard/cloud

Ele não substitui a documentação oficial versionada do framework.
